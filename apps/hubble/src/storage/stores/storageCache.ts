import {
  getStorageUnitExpiry,
  getStorageUnitType,
  HubError,
  HubEvent,
  isMergeMessageHubEvent,
  isMergeOnChainHubEvent,
  isMergeUsernameProofHubEvent,
  isPruneMessageHubEvent,
  isRevokeMessageHubEvent,
  isStorageRentOnChainEvent,
  Message,
  OnChainEventType,
  StorageRentOnChainEvent,
  StorageUnitType,
  toFarcasterTime,
} from "@farcaster/hub-nodejs";
import { err, ok } from "neverthrow";
import RocksDB from "../db/rocksdb.js";
import { FID_BYTES, OnChainEventPostfix, RootPrefix, UserMessagePostfix, UserPostfix } from "../db/types.js";
import { logger } from "../../utils/logger.js";
import { makeFidKey, makeMessagePrimaryKey, makeTsHash, typeToSetPostfix } from "../db/message.js";
import { bytesCompare, getFarcasterTime, HubAsyncResult } from "@farcaster/core";
import { forEachOnChainEvent } from "../db/onChainEvent.js";
import { addProgressBar } from "../../utils/progressBars.js";

const MAX_PENDING_MESSAGE_COUNT_SCANS = 100;

const makeKey = (fid: number, set: UserMessagePostfix): string => {
  return Buffer.concat([makeFidKey(fid), Buffer.from([set])]).toString("hex");
};

const storageSlotFromEvent = (event: StorageRentOnChainEvent): StorageSlot => {
  const isLegacy = getStorageUnitType(event) === StorageUnitType.UNIT_TYPE_LEGACY;
  return {
    units: isLegacy ? 0 : event.storageRentEventBody.units,
    legacy_units: isLegacy ? event.storageRentEventBody.units : 0,
    invalidateAt: toFarcasterTime(getStorageUnitExpiry(event) * 1000).unwrapOr(0),
  };
};

const log = logger.child({ component: "StorageCache" });

export type StorageSlot = {
  legacy_units: number;
  units: number;
  invalidateAt: number;
};

export class StorageCache {
  private _db: RocksDB;
  private _counts: Map<string, number>;
  private _pendingMessageCountScans = new Map<string, Promise<number>>();

  private _earliestTsHashes: Map<string, Uint8Array>;
  private _activeStorageSlots: Map<number, StorageSlot>;

  constructor(db: RocksDB, usage?: Map<string, number>) {
    this._counts = usage ?? new Map();
    this._earliestTsHashes = new Map();
    this._activeStorageSlots = new Map();
    this._db = db;
  }

  async syncFromDb(): Promise<void> {
    log.info("starting storage cache sync");

    const start = Date.now();

    const totalFids = await this._db.countKeysAtPrefix(
      Buffer.concat([Buffer.from([RootPrefix.OnChainEvent, OnChainEventPostfix.IdRegisterByFid])]),
    );

    const progressBar = addProgressBar("Syncing storage cache", totalFids * 2);

    const time = getFarcasterTime();
    if (time.isErr()) {
      log.error({ err: time.error }, "could not obtain time");
    } else {
      await forEachOnChainEvent(this._db, OnChainEventType.EVENT_TYPE_STORAGE_RENT, (event) => {
        const existingSlot = this._activeStorageSlots.get(event.fid);
        if (isStorageRentOnChainEvent(event)) {
          const rentEventSlot = storageSlotFromEvent(event);

          if (rentEventSlot.invalidateAt < time.value) {
            return;
          }

          if (existingSlot) {
            this._activeStorageSlots.set(event.fid, {
              units: rentEventSlot.units + existingSlot.units,
              legacy_units: rentEventSlot.legacy_units + existingSlot.legacy_units,
              invalidateAt:
                existingSlot.invalidateAt < rentEventSlot.invalidateAt
                  ? existingSlot.invalidateAt
                  : rentEventSlot.invalidateAt,
            });
          } else {
            this._activeStorageSlots.set(event.fid, rentEventSlot);
          }
          progressBar?.increment();
        }
      });
    }

    progressBar?.update(progressBar?.getTotal());
    progressBar?.stop();

    this._counts = new Map();
    this._earliestTsHashes = new Map();

    // Start prepopulating the cache in the background
    if (this._db.status !== "open") {
      log.error("cannot prepopulate message counts, db is not open");
      throw new HubError("unavailable.storage_failure", "cannot prepopulate message counts, db is not open");
    }

    log.info({ timeTakenMs: Date.now() - start }, "storage cache synced");
  }

  async getMessageCount(fid: number, set: UserMessagePostfix, forceFetch = true): HubAsyncResult<number> {
    const key = makeKey(fid, set);

    const pendingPromise = this._pendingMessageCountScans.get(key);
    if (pendingPromise) {
      return ok((await pendingPromise) ?? 0);
    }

    if (this._counts.get(key) === undefined && forceFetch) {
      if (this._pendingMessageCountScans.size > MAX_PENDING_MESSAGE_COUNT_SCANS) {
        return err(new HubError("unavailable.storage_failure", "too many pending message count scans"));
      }

      const countPromise = new Promise<number>((resolve) => {
        (async () => {
          const total = await this._db.countKeysAtPrefix(makeMessagePrimaryKey(fid, set));

          // We should maybe turn this into a LRU cache, otherwise it scales by the number
          // of fids*set types.
          this._counts.set(key, total);

          resolve(total);
          this._pendingMessageCountScans.delete(key);
        })();
      });

      this._pendingMessageCountScans.set(key, countPromise);
      return ok(await countPromise);
    } else {
      return ok(this._counts.get(key) ?? 0);
    }
  }

  async clearMessageCount(fid: number, set: UserMessagePostfix): Promise<void> {
    this._counts.delete(makeKey(fid, set));
    this._earliestTsHashes.delete(makeKey(fid, set));
    await this.getMessageCount(fid, set, true);
  }

  async getCurrentStorageSlotForFid(fid: number): HubAsyncResult<StorageSlot> {
    let slot = this._activeStorageSlots.get(fid);

    if (!slot) {
      return ok({ units: 0, legacy_units: 0, invalidateAt: 0 });
    }

    const time = getFarcasterTime();

    if (time.isErr()) {
      return err(time.error);
    }

    if (slot.invalidateAt < time.value) {
      const newSlot = { units: 0, legacy_units: 0, invalidateAt: time.value + 365 * 24 * 60 * 60 };
      await forEachOnChainEvent(
        this._db,
        OnChainEventType.EVENT_TYPE_STORAGE_RENT,
        (event) => {
          if (isStorageRentOnChainEvent(event)) {
            const rentEventSlot = storageSlotFromEvent(event);
            if (rentEventSlot.invalidateAt < time.value) return;
            if (newSlot.invalidateAt > rentEventSlot.invalidateAt) {
              newSlot.invalidateAt = rentEventSlot.invalidateAt;
            }
            newSlot.units += rentEventSlot.units;
            newSlot.legacy_units += rentEventSlot.legacy_units;
          }
        },
        fid,
      );
      slot = newSlot;
      this._activeStorageSlots.set(fid, slot);
    }

    return ok(slot);
  }

  async getEarliestTsHash(fid: number, set: UserMessagePostfix): HubAsyncResult<Uint8Array | undefined> {
    const key = makeKey(fid, set);
    const messageCount = await this.getMessageCount(fid, set);
    if (messageCount.isErr()) {
      return err(messageCount.error);
    }
    if (messageCount.value === 0) {
      return ok(undefined);
    }
    const value = this._earliestTsHashes.get(key);
    if (value === undefined) {
      const prefix = makeMessagePrimaryKey(fid, set);

      let firstKey: Buffer | undefined;
      await this._db.forEachIteratorByPrefix(
        prefix,
        (key) => {
          firstKey = key as Buffer;
          return true; // Finish the iteration after the first key-value pair
        },
        { pageSize: 1 },
      );

      if (firstKey === undefined) {
        return ok(undefined);
      }

      if (firstKey && firstKey.length === 0) {
        return err(new HubError("unavailable.storage_failure", "could not read earliest message from db"));
      }

      const tsHash = Uint8Array.from(firstKey.subarray(1 + FID_BYTES + 1));
      this._earliestTsHashes.set(key, tsHash);
      return ok(tsHash);
    } else {
      return ok(value);
    }
  }

  async processEvent(event: HubEvent): HubAsyncResult<void> {
    if (isMergeMessageHubEvent(event)) {
      await this.addMessage(event.mergeMessageBody.message);
      for (const message of event.mergeMessageBody.deletedMessages) {
        await this.removeMessage(message);
      }
    } else if (isPruneMessageHubEvent(event)) {
      await this.removeMessage(event.pruneMessageBody.message);
    } else if (isRevokeMessageHubEvent(event)) {
      await this.removeMessage(event.revokeMessageBody.message);
    } else if (isMergeUsernameProofHubEvent(event)) {
      if (event.mergeUsernameProofBody.usernameProofMessage) {
        await this.addMessage(event.mergeUsernameProofBody.usernameProofMessage);
      } else if (event.mergeUsernameProofBody.deletedUsernameProofMessage) {
        await this.removeMessage(event.mergeUsernameProofBody.deletedUsernameProofMessage);
      }
    } else if (isMergeOnChainHubEvent(event) && isStorageRentOnChainEvent(event.mergeOnChainEventBody.onChainEvent)) {
      this.addRent(event.mergeOnChainEventBody.onChainEvent);
    }
    return ok(undefined);
  }

  private async addMessage(message: Message): Promise<void> {
    if (message.data !== undefined) {
      const set = typeToSetPostfix(message.data.type);
      const fid = message.data.fid;
      const key = makeKey(fid, set);
      let count = this._counts.get(key);

      if (count === undefined) {
        const msgCountResult = await this.getMessageCount(fid, set);

        if (msgCountResult.isErr()) {
          log.error({ err: msgCountResult.error }, "could not get message count");
          return;
        }
        count = msgCountResult.value;
      }

      this._counts.set(key, count + 1);

      const tsHashResult = makeTsHash(message.data.timestamp, message.hash);
      if (!tsHashResult.isOk()) {
        log.error(`error: could not make ts hash for message ${message.hash}`);
        return;
      }
      const currentEarliest = this._earliestTsHashes.get(key);
      if (currentEarliest === undefined || bytesCompare(currentEarliest, tsHashResult.value) > 0) {
        this._earliestTsHashes.set(key, tsHashResult.value);
      }
    }
  }

  private async removeMessage(message: Message): Promise<void> {
    if (message.data !== undefined) {
      const set = typeToSetPostfix(message.data.type);
      const fid = message.data.fid;
      const key = makeKey(fid, set);

      let count = this._counts.get(key);
      if (count === undefined) {
        const msgCountResult = await this.getMessageCount(fid, set);
        if (msgCountResult.isErr()) {
          log.error({ err: msgCountResult.error }, "could not get message count");
          return;
        }
        count = msgCountResult.value;
      }

      this._counts.set(key, count - 1);

      const tsHashResult = makeTsHash(message.data.timestamp, message.hash);
      if (!tsHashResult.isOk()) {
        log.error(`error: could not make ts hash for message ${message.hash}`);
        return;
      }
      const currentEarliest = this._earliestTsHashes.get(key);
      if (currentEarliest === undefined || bytesCompare(currentEarliest, tsHashResult.value) === 0) {
        this._earliestTsHashes.delete(key);
      }
    }
  }

  private addRent(event: StorageRentOnChainEvent): void {
    if (event !== undefined) {
      const existingSlot = this._activeStorageSlots.get(event.fid);
      const time = getFarcasterTime();
      if (time.isErr()) {
        log.error({ err: time.error }, "could not obtain time");
        return;
      }

      const rentEventSlot = storageSlotFromEvent(event);
      // If the storage unit has already expired, ignore
      if (rentEventSlot.invalidateAt < time.value) {
        return;
      }

      if (existingSlot) {
        this._activeStorageSlots.set(event.fid, {
          units: rentEventSlot.units + existingSlot.units,
          legacy_units: rentEventSlot.legacy_units + existingSlot.legacy_units,
          invalidateAt:
            existingSlot.invalidateAt < rentEventSlot.invalidateAt
              ? existingSlot.invalidateAt
              : rentEventSlot.invalidateAt,
        });
      } else {
        this._activeStorageSlots.set(event.fid, rentEventSlot);
      }
    }
  }
}
