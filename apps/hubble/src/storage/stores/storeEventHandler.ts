import {
  bytesIncrement,
  getStoreLimit,
  HubAsyncResult,
  HubError,
  HubEvent,
  HubResult,
  isHubError,
  isMergeMessageHubEvent,
  isMergeOnChainHubEvent,
  isMergeUsernameProofHubEvent,
  isPruneMessageHubEvent,
  isRevokeMessageHubEvent,
  makeEventId,
  MergeMessageHubEvent,
  MergeOnChainEventHubEvent,
  MergeUsernameProofHubEvent,
  PruneMessageHubEvent,
  RevokeMessageHubEvent,
  StorageUnitType,
  StoreType,
} from "@farcaster/hub-nodejs";
import AsyncLock from "async-lock";
import { err, ok, ResultAsync } from "neverthrow";
import { TypedEmitter } from "tiny-typed-emitter";
import RocksDB, { RocksDbIteratorOptions, RocksDbTransaction } from "../db/rocksdb.js";
import { RootPrefix, UserMessagePostfix, UserPostfix } from "../db/types.js";
import { StorageCache, StorageSlot } from "./storageCache.js";
import { makeTsHash, unpackTsHash } from "../db/message.js";
import {
  bytesCompare,
  CastAddMessage,
  CastRemoveMessage,
  LinkAddMessage,
  LinkRemoveMessage,
  ReactionAddMessage,
  ReactionRemoveMessage,
  UserDataAddMessage,
  VerificationAddAddressMessage,
  VerificationRemoveMessage,
} from "@farcaster/core";
import { logger } from "../../utils/logger.js";
import { rsCreateStoreEventHandler, rsGetNextEventId, RustStoreEventHandler } from "../../rustfunctions.js";

const PRUNE_TIME_LIMIT_DEFAULT = 60 * 60 * 24 * 3 * 1000; // 3 days in ms
const DEFAULT_LOCK_MAX_PENDING = 5_000;
const DEFAULT_EXECUTION_TIMEOUT = 1000; // in ms

// @ts-ignore
const STORE_TO_SET: Record<StoreType, UserMessagePostfix> = {
  [StoreType.CASTS]: UserPostfix.CastMessage,
  [StoreType.LINKS]: UserPostfix.LinkMessage,
  [StoreType.REACTIONS]: UserPostfix.ReactionMessage,
  [StoreType.USER_DATA]: UserPostfix.UserDataMessage,
  [StoreType.VERIFICATIONS]: UserPostfix.VerificationMessage,
  [StoreType.USERNAME_PROOFS]: UserPostfix.UsernameProofMessage,
};

// @ts-ignore
const SET_TO_STORE: Record<UserMessagePostfix, StoreType> = {
  [UserPostfix.CastMessage]: StoreType.CASTS,
  [UserPostfix.LinkMessage]: StoreType.LINKS,
  [UserPostfix.ReactionMessage]: StoreType.REACTIONS,
  [UserPostfix.UserDataMessage]: StoreType.USER_DATA,
  [UserPostfix.VerificationMessage]: StoreType.VERIFICATIONS,
  [UserPostfix.UsernameProofMessage]: StoreType.USERNAME_PROOFS,
};

type PrunableMessage =
  | CastAddMessage
  | CastRemoveMessage
  | ReactionAddMessage
  | ReactionRemoveMessage
  | UserDataAddMessage
  | VerificationAddAddressMessage
  | VerificationRemoveMessage
  | LinkAddMessage
  | LinkRemoveMessage;

export type StoreUsage = {
  used: number;
  earliestTimestamp: number;
  earliestHash: Uint8Array;
};

export type StoreEvents = {
  /**
   * mergeMessage is emitted when a message is merged into one of the stores. If
   * messages are deleted as part of the merge transaction (i.e. due to conflicts between
   * messages), they are emitted as part of the deletedMessages argument.
   */
  mergeMessage: (event: MergeMessageHubEvent) => void;

  /**
   * pruneMessage is emitted when a message is pruned from a store due to size
   * or time-based limits.
   */
  pruneMessage: (event: PruneMessageHubEvent) => void;

  /**
   * revokeMessage is emitted when a message is deleted because its signer has been
   * removed. Signers are removed when SignerRemove messages are merged or an fid changes
   * custody address.
   */
  revokeMessage: (event: RevokeMessageHubEvent) => void;

  /**
   * mergeUsernameProofEvent is emitted when a username proof from the fname server
   * is merged into the UserDataStore.
   */
  mergeUsernameProofEvent: (event: MergeUsernameProofHubEvent) => void;

  /**
   * mergeOnChainEvent is emitted when a on chain event is merged into the
   * OnChainEventStore.
   */
  mergeOnChainEvent: (event: MergeOnChainEventHubEvent) => void;
};

export type HubEventArgs = Omit<HubEvent, "id">;

const makeEventKey = (id?: number): Buffer => {
  const buffer = Buffer.alloc(1 + (id ? 8 : 0));
  buffer.writeUint8(RootPrefix.HubEvents, 0);
  if (id) {
    buffer.writeBigUint64BE(BigInt(id), 1);
  }
  return buffer;
};

const putEventTransaction = (txn: RocksDbTransaction, event: HubEvent): RocksDbTransaction => {
  const key = makeEventKey(event.id);
  const value = Buffer.from(HubEvent.encode(event).finish());
  return txn.put(key, value);
};

export const fidFromEvent = (event: HubEvent): number => {
  if (isMergeMessageHubEvent(event)) {
    return event.mergeMessageBody.message.data?.fid || 0;
  } else if (isMergeOnChainHubEvent(event)) {
    return event.mergeOnChainEventBody.onChainEvent.fid || 0;
  } else if (isMergeUsernameProofHubEvent(event)) {
    return event.mergeUsernameProofBody.usernameProof?.fid || 0;
  } else if (isPruneMessageHubEvent(event)) {
    return event.pruneMessageBody.message.data?.fid || 0;
  } else if (isRevokeMessageHubEvent(event)) {
    return event.revokeMessageBody.message.data?.fid || 0;
  } else {
    throw new Error("invalid hub event type for determining fid");
  }
};

export type StoreEventHandlerOptions = {
  lockMaxPending?: number | undefined;
  lockExecutionTimeout?: number | undefined;
};

class StoreEventHandler extends TypedEmitter<StoreEvents> {
  private _db: RocksDB;

  // Pointer to the rust store event handler object
  private _rustStoreEventHandler: RustStoreEventHandler;

  private _lock: AsyncLock;
  private _storageCache: StorageCache;

  constructor(db: RocksDB, options: StoreEventHandlerOptions = {}, rustEventHandler?: RustStoreEventHandler) {
    super();

    this._db = db;

    // Create default store if no options are passed
    this._rustStoreEventHandler = rustEventHandler ?? rsCreateStoreEventHandler();

    this._lock = new AsyncLock({
      maxPending: options.lockMaxPending ?? DEFAULT_LOCK_MAX_PENDING,
      maxExecutionTime: options.lockExecutionTimeout ?? DEFAULT_EXECUTION_TIMEOUT,
    });

    this._storageCache = new StorageCache(this._db);
  }

  getRustStoreEventHandler(): RustStoreEventHandler {
    return this._rustStoreEventHandler;
  }

  async getCurrentStorageSlotForFid(fid: number): HubAsyncResult<StorageSlot> {
    const slot = await this._storageCache.getCurrentStorageSlotForFid(fid);

    if (slot.isOk() && slot.value.legacy_units + slot.value.units === 0) {
      logger.debug({ fid }, "fid has no registered storage, would be pruned");
    }

    return slot;
  }

  async getUsage(fid: number, store: StoreType): HubAsyncResult<StoreUsage> {
    const set = STORE_TO_SET[store];
    if (!set) {
      return err(new HubError("bad_request.invalid_param", `invalid store type ${store}`));
    }
    const messageCount = await this.getCacheMessageCount(fid, set);
    if (messageCount.isErr()) {
      return err(messageCount.error);
    }
    const earliestTsHash = await this.getEarliestTsHash(fid, set);
    if (earliestTsHash.isErr()) {
      return err(earliestTsHash.error);
    }
    let earliestTimestamp = 0;
    let earliestHash = new Uint8Array();
    if (earliestTsHash.value !== undefined) {
      const unpackResult = unpackTsHash(earliestTsHash.value);
      if (unpackResult.isOk()) {
        [earliestTimestamp, earliestHash] = unpackResult.value;
      }
    }

    return ok({
      used: messageCount.value,
      earliestTimestamp,
      earliestHash,
    });
  }

  async getCacheMessageCount(fid: number, set: UserMessagePostfix, forceFetch = true): HubAsyncResult<number> {
    return await this._storageCache.getMessageCount(fid, set, forceFetch);
  }

  async clearCachedMessageCount(fid: number, store: StoreType): HubAsyncResult<void> {
    const set = STORE_TO_SET[store];
    if (!set) {
      return err(new HubError("bad_request.invalid_param", `invalid store type ${store}`));
    }
    await this._storageCache.clearMessageCount(fid, set);
    return ok(undefined);
  }

  async getMaxMessageCount(fid: number, set: UserMessagePostfix): HubAsyncResult<number> {
    const slot = await this.getCurrentStorageSlotForFid(fid);

    if (slot.isErr()) {
      return err(slot.error);
    }

    const storeType = SET_TO_STORE[set];
    if (!storeType) {
      return err(new HubError("bad_request.invalid_param", `invalid store type ${set}`));
    }
    return ok(
      getStoreLimit(storeType, [
        { unitType: StorageUnitType.UNIT_TYPE_LEGACY, unitSize: slot.value.legacy_units },
        { unitType: StorageUnitType.UNIT_TYPE_2024, unitSize: slot.value.units },
      ]),
    );
  }

  async getEarliestTsHash(fid: number, set: UserMessagePostfix): HubAsyncResult<Uint8Array | undefined> {
    return await this._storageCache.getEarliestTsHash(fid, set);
  }

  async syncCache(): HubAsyncResult<void> {
    return await ResultAsync.fromPromise(this._storageCache.syncFromDb(), (e) => e as HubError);
  }

  async getEvent(id: number): HubAsyncResult<HubEvent> {
    const key = makeEventKey(id);
    const result = await ResultAsync.fromPromise(this._db.get(key), (e) => e as HubError);
    return result.map((buffer) => HubEvent.decode(new Uint8Array(buffer as Buffer)));
  }

  getEventsIteratorOpts(
    options: { fromId?: number | undefined; toId?: number | undefined } = {},
  ): HubResult<RocksDbIteratorOptions> {
    const minKey = makeEventKey(options.fromId);
    const maxKey = options.toId ? ok(makeEventKey(options.toId)) : bytesIncrement(Uint8Array.from(makeEventKey()));
    if (maxKey.isErr()) {
      return err(maxKey.error);
    }
    return ok({ gte: minKey, lt: Buffer.from(maxKey.value) });
  }

  async getEvents(fromId?: number): HubAsyncResult<HubEvent[]> {
    const events: HubEvent[] = [];
    const iteratorOpts = this.getEventsIteratorOpts({ fromId });
    if (iteratorOpts.isErr()) {
      return err(iteratorOpts.error);
    }

    await this._db.forEachIteratorByOpts(iteratorOpts.value, (_key, value) => {
      const event = HubEvent.decode(Uint8Array.from(value as Buffer));
      events.push(event);
    });

    return ok(events);
  }

  async getEventsPage(
    fromId: number,
    pageSize: number,
  ): HubAsyncResult<{ events: HubEvent[]; nextPageEventId: number }> {
    const events: HubEvent[] = [];
    const iteratorOpts = this.getEventsIteratorOpts({ fromId });
    if (iteratorOpts.isErr()) {
      return err(iteratorOpts.error);
    }

    let lastEventId = fromId;
    await this._db.forEachIteratorByOpts(iteratorOpts.value, (key, value) => {
      const event = HubEvent.decode(Uint8Array.from(value as Buffer));
      events.push(event);

      if (key) {
        lastEventId = Number(key.readBigUint64BE(1));
      }

      if (events.length >= pageSize) {
        return true;
      }

      return false;
    });

    return ok({ events, nextPageEventId: lastEventId + 1 });
  }

  public async isPrunable(
    message: PrunableMessage,
    set: UserMessagePostfix,
    sizeLimit: number,
  ): HubAsyncResult<boolean> {
    const messageCount = await this.getCacheMessageCount(message.data.fid, set);
    if (messageCount.isErr()) {
      return err(messageCount.error);
    }

    const maxMessageCount = await this.getMaxMessageCount(message.data.fid, set);
    if (maxMessageCount.isErr()) {
      return err(maxMessageCount.error);
    }

    let maxCount = maxMessageCount.value;
    if (sizeLimit > 0 && sizeLimit < maxCount) {
      maxCount = sizeLimit;
    }

    if (messageCount.value < maxCount) {
      return ok(false);
    }

    const earliestTimestamp = await this.getEarliestTsHash(message.data.fid, set);
    if (earliestTimestamp.isErr()) {
      return err(earliestTimestamp.error);
    }
    const tsHash = makeTsHash(message.data.timestamp, message.hash);
    if (tsHash.isErr()) {
      return err(tsHash.error);
    }
    if (earliestTimestamp.value === undefined) {
      return ok(false);
    }
    if (bytesCompare(tsHash.value, earliestTimestamp.value) < 0) {
      return ok(true);
    } else {
      return ok(false);
    }
  }

  async commitTransaction(txn: RocksDbTransaction, eventArgs: HubEventArgs): HubAsyncResult<number> {
    return this._lock
      .acquire("commit", async () => {
        const eventId = rsGetNextEventId(this._rustStoreEventHandler);
        if (eventId.isErr()) {
          throw eventId.error;
        }
        const event = HubEvent.create({ ...eventArgs, id: eventId.value });
        // TODO: validate event
        // biome-ignore lint/style/noParameterAssign: legacy code, avoid using ignore for new code
        txn = putEventTransaction(txn, event);

        await this._db.commit(txn);

        void this._storageCache.processEvent(event);
        this.broadcastEvent(event);

        return ok(event.id);
      })
      .catch((e: Error) => {
        return err(isHubError(e) ? e : new HubError("unavailable.storage_failure", e.message));
      });
  }

  async processRustCommittedTransaction(event: HubEvent): HubAsyncResult<void> {
    void this._storageCache.processEvent(event);
    void this.broadcastEvent(event);
    return ok(undefined);
  }

  async pruneEvents(timeLimit?: number): HubAsyncResult<void> {
    const toId = makeEventId(Date.now() - (timeLimit ?? PRUNE_TIME_LIMIT_DEFAULT), 0);

    const iteratorOpts = this.getEventsIteratorOpts({ toId });

    if (iteratorOpts.isErr()) {
      return err(iteratorOpts.error);
    }

    const result = await ResultAsync.fromPromise(
      this._db.deleteAllKeysInRange(iteratorOpts.value),
      (e) => e as HubError,
    );

    return result.map((_) => {});
  }

  private broadcastEvent(event: HubEvent): HubResult<void> {
    if (isMergeMessageHubEvent(event)) {
      this.emit("mergeMessage", event);
    } else if (isPruneMessageHubEvent(event)) {
      this.emit("pruneMessage", event);
    } else if (isRevokeMessageHubEvent(event)) {
      this.emit("revokeMessage", event);
    } else if (isMergeUsernameProofHubEvent(event)) {
      this.emit("mergeUsernameProofEvent", event);
    } else if (isMergeOnChainHubEvent(event)) {
      this.emit("mergeOnChainEvent", event);
    } else {
      return err(new HubError("bad_request.invalid_param", "invalid event type"));
    }

    return ok(undefined);
  }
}

export default StoreEventHandler;
