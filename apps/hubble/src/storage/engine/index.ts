import {
  bytesCompare,
  bytesToHexString,
  bytesToUtf8String,
  CastAddMessage,
  CastId,
  CastRemoveMessage,
  FarcasterNetwork,
  fromFarcasterTime,
  getDefaultStoreLimit,
  getStoreLimits,
  hexStringToBytes,
  HubAsyncResult,
  HubError,
  HubErrorCode,
  HubEvent,
  HubResult,
  isLinkCompactStateMessage,
  isSignerOnChainEvent,
  isUserDataAddMessage,
  isUsernameProofMessage,
  isVerificationAddAddressMessage,
  LinkAddMessage,
  LinkCompactStateMessage,
  LinkRemoveMessage,
  MergeOnChainEventHubEvent,
  MergeUsernameProofHubEvent,
  Message,
  MessageType,
  OnChainEvent,
  OnChainEventResponse,
  OnChainEventType,
  Protocol,
  ReactionAddMessage,
  ReactionRemoveMessage,
  ReactionType,
  RevokeMessagesBySignerJobPayload,
  SignerEventType,
  SignerOnChainEvent,
  StorageLimit,
  StorageLimitsResponse,
  StorageUnitType,
  StoreType,
  toFarcasterTime,
  UserDataAddMessage,
  UserDataType,
  UserNameProof,
  UserNameType,
  utf8StringToBytes,
  validations,
  VerificationAddAddressMessage,
  VerificationRemoveMessage,
} from "@farcaster/hub-nodejs";
import { err, ok, ResultAsync } from "neverthrow";
import fs from "fs";
import { Worker } from "worker_threads";
import { forEachMessageBySigner, typeToSetPostfix } from "../db/message.js";
import RocksDB from "../db/rocksdb.js";
import { UserPostfix } from "../db/types.js";
import CastStore from "../stores/castStore.js";
import LinkStore from "../stores/linkStore.js";
import ReactionStore from "../stores/reactionStore.js";
import StoreEventHandler from "../stores/storeEventHandler.js";
import { DEFAULT_PAGE_SIZE, MessagesPage, PageOptions } from "../stores/types.js";
import UserDataStore from "../stores/userDataStore.js";
import VerificationStore from "../stores/verificationStore.js";
import { logger } from "../../utils/logger.js";
import { RevokeMessagesBySignerJobQueue, RevokeMessagesBySignerJobWorker } from "../jobs/revokeMessagesBySignerJob.js";
import { ensureAboveTargetFarcasterVersion } from "../../utils/versions.js";
import { type PublicClient } from "viem";
import { normalize } from "viem/ens";
import UsernameProofStore from "../stores/usernameProofStore.js";
import OnChainEventStore from "../stores/onChainEventStore.js";
import { consumeRateLimitByKey, getRateLimiterForTotalMessages, isRateLimitedByKey } from "../../utils/rateLimits.js";
import { rsValidationMethods } from "../../rustfunctions.js";
import { RateLimiterAbstract, RateLimiterMemory } from "rate-limiter-flexible";
import { TypedEmitter } from "tiny-typed-emitter";
import { FNameRegistryEventsProvider } from "../../eth/fnameRegistryEventsProvider.js";
import { statsd } from "../../utils/statsd.js";
import { L2EventsProvider } from "eth/l2EventsProvider.js";

export const NUM_VALIDATION_WORKERS = 2;

export interface ValidationWorkerData {
  l2RpcUrl: string;
  ethMainnetRpcUrl: string;
}

export interface ValidationWorkerMessageWithMessage {
  id: number;
  message: Message;
  errCode?: never;
  errMessage?: never;
}

export interface ValidationWorkerMessageWithError {
  id: number;
  message?: never;
  errCode: HubErrorCode;
  errMessage: string;
}

interface IndexedMessage {
  i: number;
  message: Message;
  fid?: number;
  limiter?: RateLimiterAbstract;
}

// The type of response that the worker sends back to the main thread
export type ValidationWorkerMessage = ValidationWorkerMessageWithMessage | ValidationWorkerMessageWithError;

const log = logger.child({
  component: "Engine",
});

export type EngineEvents = {
  duplicateUserNameProofEvent: (usernameProof: UserNameProof) => void;
  duplicateOnChainEvent: (onChainEvent: OnChainEvent) => void;
};

class Engine extends TypedEmitter<EngineEvents> {
  public eventHandler: StoreEventHandler;

  private _db: RocksDB;
  private _network: FarcasterNetwork;
  private _publicClient: PublicClient | undefined;
  private _l2PublicClient: PublicClient | undefined;
  private _fNameRegistryEventsProvider: FNameRegistryEventsProvider | undefined;
  private _l2EventsProvider: L2EventsProvider | undefined;

  private _linkStore: LinkStore;
  private _reactionStore: ReactionStore;
  private _castStore: CastStore;
  private _userDataStore: UserDataStore;
  private _verificationStore: VerificationStore;
  private _onchainEventsStore: OnChainEventStore;
  private _usernameProofStore: UsernameProofStore;

  private _validationWorkers: Worker[] | undefined;
  private _nextValidationWorker = 0;

  private _validationWorkerJobId = 0;
  private _validationWorkerPromiseMap = new Map<number, (resolve: HubResult<Message>) => void>();

  private _revokeSignerQueue: RevokeMessagesBySignerJobQueue;
  private _revokeSignerWorker: RevokeMessagesBySignerJobWorker;

  private _totalPruneSize: number;

  private _solanaVerificationsEnabled = false;

  private _fNameRetryRateLimiter = new RateLimiterMemory({ points: 60, duration: 60 }); // 60 retries per minute allowed

  constructor(
    db: RocksDB,
    network: FarcasterNetwork,
    eventHandler?: StoreEventHandler,
    publicClient?: PublicClient,
    l2PublicClient?: PublicClient,
    fNameRegistryEventsProvider?: FNameRegistryEventsProvider,
    l2EventsProvider?: L2EventsProvider,
  ) {
    super();
    this._db = db;
    this._network = network;
    this._publicClient = publicClient;
    this._l2PublicClient = l2PublicClient;
    this._fNameRegistryEventsProvider = fNameRegistryEventsProvider;
    this._l2EventsProvider = l2EventsProvider;

    this.eventHandler = eventHandler ?? new StoreEventHandler(db);

    this._linkStore = new LinkStore(db, this.eventHandler);
    this._reactionStore = new ReactionStore(db, this.eventHandler);
    this._castStore = new CastStore(db, this.eventHandler);
    this._userDataStore = new UserDataStore(db, this.eventHandler);
    this._verificationStore = new VerificationStore(db, this.eventHandler);
    this._onchainEventsStore = new OnChainEventStore(db, this.eventHandler);
    this._usernameProofStore = new UsernameProofStore(db, this.eventHandler);

    // Total set size for all stores. We should probably reduce this to just the size of the cast store.
    this._totalPruneSize =
      getDefaultStoreLimit(StoreType.CASTS, StorageUnitType.UNIT_TYPE_LEGACY) +
      getDefaultStoreLimit(StoreType.LINKS, StorageUnitType.UNIT_TYPE_LEGACY) +
      getDefaultStoreLimit(StoreType.REACTIONS, StorageUnitType.UNIT_TYPE_LEGACY) +
      getDefaultStoreLimit(StoreType.USER_DATA, StorageUnitType.UNIT_TYPE_LEGACY) +
      getDefaultStoreLimit(StoreType.USERNAME_PROOFS, StorageUnitType.UNIT_TYPE_LEGACY) +
      getDefaultStoreLimit(StoreType.VERIFICATIONS, StorageUnitType.UNIT_TYPE_LEGACY);

    log.info({ totalPruneSize: this._totalPruneSize }, "total default storage limit size");

    this._revokeSignerQueue = new RevokeMessagesBySignerJobQueue(db);
    this._revokeSignerWorker = new RevokeMessagesBySignerJobWorker(this._revokeSignerQueue, db, this);

    this.handleMergeUsernameProofEvent = this.handleMergeUsernameProofEvent.bind(this);
    this.handleMergeOnChainEvent = this.handleMergeOnChainEvent.bind(this);
  }

  async start(): Promise<void> {
    log.info("starting engine");

    this._revokeSignerWorker.start();

    if (!this._validationWorkers) {
      const workerPath = "./build/storage/engine/validation.worker.js";
      try {
        if (fs.existsSync(workerPath)) {
          this._validationWorkers = [];
          const validationWorkerHandler = (data: ValidationWorkerMessage) => {
            const { id, message, errCode, errMessage } = data;
            const resolve = this._validationWorkerPromiseMap.get(id);

            if (resolve) {
              this._validationWorkerPromiseMap.delete(id);
              if (message) {
                resolve(ok(message));
              } else {
                resolve(err(new HubError(errCode, errMessage)));
              }
            } else {
              log.warn({ id }, "validation worker promise.response not found");
            }
          };

          const workerData = this.getWorkerData();
          for (let i = 0; i < NUM_VALIDATION_WORKERS; i++) {
            const validationWorker = new Worker(workerPath, { workerData });
            validationWorker.on("message", validationWorkerHandler);
            log.info({ workerPath }, "created validation worker thread");

            this._validationWorkers.push(validationWorker);
          }
        } else {
          log.warn({ workerPath }, "validation.worker.js not found, falling back to main thread");
        }
      } catch (e) {
        log.warn({ workerPath, e }, "failed to create validation worker, falling back to main thread");
      }
    }

    this.eventHandler.on("mergeUsernameProofEvent", this.handleMergeUsernameProofEvent);
    this.eventHandler.on("mergeOnChainEvent", this.handleMergeOnChainEvent);

    await this.eventHandler.syncCache();
    log.info("engine started");
  }

  async stop(): Promise<void> {
    log.info("stopping engine");
    this.eventHandler.off("mergeUsernameProofEvent", this.handleMergeUsernameProofEvent);
    this.eventHandler.off("mergeOnChainEvent", this.handleMergeOnChainEvent);

    this._revokeSignerWorker.start();

    if (this._validationWorkers) {
      for (const worker of this._validationWorkers) {
        await worker.terminate();
      }

      this._validationWorkers = undefined;
      log.info("All validation worker threads terminated");
    }
    log.info("engine stopped");
  }

  getDb(): RocksDB {
    return this._db;
  }

  clearCaches() {
    this._onchainEventsStore.clearCaches();
  }

  get solanaVerificationsEnabled(): boolean {
    return this._solanaVerificationsEnabled;
  }

  setSolanaVerifications(enabled: boolean) {
    if (this._solanaVerificationsEnabled !== enabled) {
      this._solanaVerificationsEnabled = enabled;
      logger.info(`Solana verifications toggled to: ${enabled}`);
    }
  }

  async computeMergeResult(message: Message, i: number) {
    const fid = message.data?.fid ?? 0;
    const validatedMessage = await this.validateMessage(message);
    if (validatedMessage.isErr()) {
      return err(validatedMessage.error);
    }

    const storageSlot = await this.eventHandler.getCurrentStorageSlotForFid(fid);
    if (storageSlot.isErr()) {
      return err(storageSlot.error);
    }

    const totalUnits = storageSlot.value.legacy_units + storageSlot.value.units;
    if (totalUnits === 0) {
      return err(new HubError("bad_request.no_storage", "no storage"));
    }

    const limiter = getRateLimiterForTotalMessages(totalUnits * this._totalPruneSize);
    // const isRateLimited = await isRateLimitedByKey(`${fid}`, limiter);
    // if (isRateLimited) {
    // log.warn({ fid }, "rate limit exceeded for FID");
    // return err(new HubError("unavailable", `rate limit exceeded for FID ${fid}`));
    // }

    return ok({ i, fid, limiter, message });
  }

  async mergeMessages(messages: Message[]): Promise<Map<number, HubResult<number>>> {
    const mergeResults: Map<number, HubResult<number>> = new Map();
    const validatedMessages: IndexedMessage[] = [];

    // Validate all messages first
    await Promise.all(
      messages.map(async (message, i) => {
        // Extract the FID that this message was signed by
        // We rate limit the number of messages that can be merged per FID
        const result = await this.computeMergeResult(message, i);
        if (result.isErr()) {
          mergeResults.set(i, result);
          // Try to request on chain event if it's missing
          // if (
          //   result.error.errCode === "bad_request.no_storage" ||
          //   "bad_request.unknown_signer" ||
          //   "bad_request.missing_fid"
          // ) {
          // const fid = message.data?.fid ?? 0;
          // Don't await because we don't want to block hubs from processing new messages.
          // this._l2EventsProvider?.retryEventsForFid(fid);
          // }
        } else {
          validatedMessages.push(result.value);
        }
      }),
    );

    const results: Map<number, HubResult<number>> = await this.mergeMessagesToStore(
      validatedMessages.map((m) => m.message),
    );

    // Go over the results and update the results map
    for (const [j, result] of results.entries()) {
      const fid = validatedMessages[j]?.fid as number;
      const limiter = validatedMessages[j]?.limiter;
      if (result.isOk() && limiter) {
        consumeRateLimitByKey(`${fid}`, limiter);
      }
      mergeResults.set(validatedMessages[j]?.i as number, result);
    }

    return mergeResults;
  }

  async mergeMessage(message: Message): HubAsyncResult<number> {
    const result = await this.mergeMessages([message]);
    return result.get(0) ?? err(new HubError("unavailable", "missing result"));
  }

  async mergeMessagesToStore(messages: Message[]): Promise<Map<number, HubResult<number>>> {
    const linkMessages: IndexedMessage[] = [];
    const reactionMessages: IndexedMessage[] = [];
    const castMessages: IndexedMessage[] = [];
    const userDataMessages: IndexedMessage[] = [];
    const verificationMessages: IndexedMessage[] = [];
    const usernameProofMessages: IndexedMessage[] = [];

    const results: Map<number, HubResult<number>> = new Map();

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i] as Message;
      if (message.data?.type === MessageType.FRAME_ACTION) {
        results.set(i, err(new HubError("bad_request.validation_failure", "invalid message type")));
        continue;
      }

      // biome-ignore lint/style/noNonNullAssertion: legacy code, avoid using ignore for new code
      const setPostfix = typeToSetPostfix(message.data!.type);

      switch (setPostfix) {
        case UserPostfix.LinkCompactStateMessage:
        case UserPostfix.LinkMessage: {
          linkMessages.push({ i, message });
          break;
        }
        case UserPostfix.ReactionMessage: {
          reactionMessages.push({ i, message });
          break;
        }
        case UserPostfix.CastMessage: {
          castMessages.push({ i, message });
          break;
        }
        case UserPostfix.UserDataMessage: {
          userDataMessages.push({ i, message });
          break;
        }
        case UserPostfix.VerificationMessage: {
          verificationMessages.push({ i, message });
          break;
        }
        case UserPostfix.UsernameProofMessage: {
          usernameProofMessages.push({ i, message });
          break;
        }
        default: {
          results.set(i, err(new HubError("bad_request.validation_failure", "invalid message type")));
        }
      }
    }

    const stores = [
      this._linkStore,
      this._reactionStore,
      this._castStore,
      this._userDataStore,
      this._verificationStore,
      this._usernameProofStore,
    ];
    const messagesByStore = [
      linkMessages,
      reactionMessages,
      castMessages,
      userDataMessages,
      verificationMessages,
      usernameProofMessages,
    ];

    await Promise.all(
      stores.map(async (store, storeIndex) => {
        const storeMessages = messagesByStore[storeIndex] as IndexedMessage[];

        const start = Date.now();
        const storeResults: Map<number, HubResult<number>> = await store.mergeMessages(
          storeMessages.map((m) => m.message),
        );
        const duration = Date.now() - start;
        statsd().timing("storage.merge_messages", duration, { store: store.postfix.toString() });

        for (const [j, v] of storeResults.entries()) {
          results.set(storeMessages[j]?.i as number, v);
        }
      }),
    );

    return results;
  }

  async mergeOnChainEvent(event: OnChainEvent): HubAsyncResult<number> {
    const eventResult = await this.validateOnChainEvent(event);
    if (eventResult.isErr()) {
      return err(eventResult.error);
    }
    const mergeResult = await ResultAsync.fromPromise(
      this._onchainEventsStore.mergeOnChainEvent(event),
      (e) => e as HubError,
    );
    if (mergeResult.isErr() && mergeResult.error.errCode === "bad_request.duplicate") {
      this.emit("duplicateOnChainEvent", event);
    }
    return mergeResult;
  }

  async mergeUserNameProof(usernameProof: UserNameProof): HubAsyncResult<number> {
    // TODO: Validate signature here instead of the fname event provider
    const mergeResult = await ResultAsync.fromPromise(
      this._userDataStore.mergeUserNameProof(usernameProof),
      (e) => e as HubError,
    );
    if (mergeResult.isErr() && mergeResult.error.errCode === "bad_request.duplicate") {
      this.emit("duplicateUserNameProofEvent", usernameProof);
    }
    return mergeResult;
  }

  async revokeMessagesBySigner(fid: number, signer: Uint8Array): HubAsyncResult<void> {
    const signerHex = bytesToHexString(signer);
    if (signerHex.isErr()) {
      return err(signerHex.error);
    }

    let revokedCount = 0;

    const revokeMessage = async (message: Message): HubAsyncResult<number | undefined> => {
      if (!message.data) {
        return err(new HubError("bad_request.invalid_param", "missing message data"));
      }

      const postfix = typeToSetPostfix(message.data.type);

      switch (postfix) {
        case UserPostfix.LinkCompactStateMessage:
        case UserPostfix.LinkMessage: {
          return this._linkStore.revoke(message);
        }
        case UserPostfix.ReactionMessage: {
          return this._reactionStore.revoke(message);
        }
        case UserPostfix.CastMessage: {
          return this._castStore.revoke(message);
        }
        case UserPostfix.UserDataMessage: {
          return this._userDataStore.revoke(message);
        }
        case UserPostfix.VerificationMessage: {
          return this._verificationStore.revoke(message);
        }
        case UserPostfix.UsernameProofMessage: {
          return this._usernameProofStore.revoke(message);
        }
        default: {
          return err(new HubError("bad_request.invalid_param", "invalid message type"));
        }
      }
    };

    await forEachMessageBySigner(this._db, fid, signer, async (message) => {
      const revokeResult = await revokeMessage(message);
      revokeResult.match(
        () => {
          revokedCount += 1;
        },
        (e) => {
          log.error(
            { errCode: e.errCode },
            `error revoking message from signer ${signerHex.value} and fid ${fid}: ${e.message}`,
          );
        },
      );
    });

    if (revokedCount > 0) {
      log.info(`revoked ${revokedCount} messages from ${signerHex.value} and fid ${fid}`);
    }

    return ok(undefined);
  }

  async pruneMessages(fid: number): HubAsyncResult<number> {
    await this.clearStorageCacheForFid(fid);
    const logPruneResult = (result: HubResult<number[]>, store: string): number => {
      return result.match(
        (ids) => {
          if (ids.length > 0) {
            log.info(`pruned ${ids.length} ${store} messages for fid ${fid}`);
          }
          return ids.length;
        },
        (e) => {
          log.error({ errCode: e.errCode }, `error pruning ${store} messages for fid ${fid}: ${e.message}`);
          return 0;
        },
      );
    };

    let totalPruned = 0;
    const castResult = await this._castStore.pruneMessages(fid);
    totalPruned += logPruneResult(castResult, "cast");

    const reactionResult = await this._reactionStore.pruneMessages(fid);
    totalPruned += logPruneResult(reactionResult, "reaction");

    const verificationResult = await this._verificationStore.pruneMessages(fid);
    totalPruned += logPruneResult(verificationResult, "verification");

    const userDataResult = await this._userDataStore.pruneMessages(fid);
    totalPruned += logPruneResult(userDataResult, "user data");

    const linkResult = await this._linkStore.pruneMessages(fid);
    totalPruned += logPruneResult(linkResult, "link");

    return ok(totalPruned);
  }

  /** revoke message if it is not valid */
  async validateOrRevokeMessage(message: Message, lowPriority = false): HubAsyncResult<number | undefined> {
    const isValid = await this.validateMessage(message, lowPriority);

    if (isValid.isErr() && message.data) {
      if (isValid.error.errCode === "unavailable.network_failure") {
        return err(isValid.error);
      }

      const setPostfix = typeToSetPostfix(message.data.type);

      switch (setPostfix) {
        case UserPostfix.LinkCompactStateMessage:
        case UserPostfix.LinkMessage: {
          return this._linkStore.revoke(message);
        }
        case UserPostfix.ReactionMessage: {
          return this._reactionStore.revoke(message);
        }
        case UserPostfix.CastMessage: {
          return this._castStore.revoke(message);
        }
        case UserPostfix.UserDataMessage: {
          return this._userDataStore.revoke(message);
        }
        case UserPostfix.VerificationMessage: {
          return this._verificationStore.revoke(message);
        }
        case UserPostfix.UsernameProofMessage: {
          return this._usernameProofStore.revoke(message);
        }
        default: {
          return err(new HubError("bad_request.invalid_param", "invalid message type"));
        }
      }
    }

    return ok(undefined);
  }

  /* -------------------------------------------------------------------------- */
  /*                             Event Methods                                  */
  /* -------------------------------------------------------------------------- */

  async getEvent(id: number): HubAsyncResult<HubEvent> {
    return this.eventHandler.getEvent(id);
  }

  async getEvents(startId: number): HubAsyncResult<{ events: HubEvent[]; nextPageEventId: number }> {
    return this.eventHandler.getEventsPage(startId, DEFAULT_PAGE_SIZE);
  }

  /* -------------------------------------------------------------------------- */
  /*                             Cast Store Methods                             */
  /* -------------------------------------------------------------------------- */

  validateStartAndStopTime(startTime?: number, stopTime?: number) {
    let validatedStartTime;
    if (startTime) {
      const validatedStartTimeResult = validations.validateFarcasterTime(startTime);
      if (validatedStartTimeResult.isErr()) {
        return err(validatedStartTimeResult.error);
      }

      validatedStartTime = validatedStartTimeResult.value;
    }

    let validatedStopTime;
    if (stopTime) {
      const validatedStopTimeResult = validations.validateFarcasterTime(stopTime);
      if (validatedStopTimeResult.isErr()) {
        return err(validatedStopTimeResult.error);
      }

      validatedStopTime = validatedStopTimeResult.value;
    }

    return ok({ validatedStartTime, validatedStopTime });
  }

  async getCast(fid: number, hash: Uint8Array): HubAsyncResult<CastAddMessage> {
    const validatedFid = validations.validateFid(fid);
    if (validatedFid.isErr()) {
      return err(validatedFid.error);
    }

    return ResultAsync.fromPromise(this._castStore.getCastAdd(fid, hash), (e) => e as HubError);
  }

  async getCastsByFid(fid: number, pageOptions: PageOptions = {}): HubAsyncResult<MessagesPage<CastAddMessage>> {
    const validatedFid = validations.validateFid(fid);
    if (validatedFid.isErr()) {
      return err(validatedFid.error);
    }

    return ResultAsync.fromPromise(this._castStore.getCastAddsByFid(fid, pageOptions), (e) => e as HubError);
  }

  async getCastsByParent(
    parent: CastId | string,
    pageOptions: PageOptions = {},
  ): HubAsyncResult<MessagesPage<CastAddMessage>> {
    const validatedParent = validations.validateParent(parent);
    if (validatedParent.isErr()) {
      return err(validatedParent.error);
    }

    return ResultAsync.fromPromise(this._castStore.getCastsByParent(parent, pageOptions), (e) => e as HubError);
  }

  async getCastsByMention(
    mentionFid: number,
    pageOptions: PageOptions = {},
  ): HubAsyncResult<MessagesPage<CastAddMessage>> {
    const validatedFid = validations.validateFid(mentionFid);
    if (validatedFid.isErr()) {
      return err(validatedFid.error);
    }

    return ResultAsync.fromPromise(this._castStore.getCastsByMention(mentionFid, pageOptions), (e) => e as HubError);
  }

  async getAllCastMessagesByFid(
    fid: number,
    pageOptions: PageOptions = {},
    startTime?: number,
    stopTime?: number,
  ): HubAsyncResult<MessagesPage<CastAddMessage | CastRemoveMessage>> {
    const validatedFid = validations.validateFid(fid);
    if (validatedFid.isErr()) {
      return err(validatedFid.error);
    }

    const validatedTimes = this.validateStartAndStopTime(startTime, stopTime);
    if (validatedTimes.isErr()) {
      return err(validatedTimes.error);
    }

    return ResultAsync.fromPromise(
      this._castStore.getAllCastMessagesByFid(
        fid,
        pageOptions,
        validatedTimes.value.validatedStartTime,
        validatedTimes.value.validatedStopTime,
      ),
      (e) => e as HubError,
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                            Reaction Store Methods                          */
  /* -------------------------------------------------------------------------- */

  async getReaction(fid: number, type: ReactionType, target: CastId | string): HubAsyncResult<ReactionAddMessage> {
    const validatedFid = validations.validateFid(fid);
    if (validatedFid.isErr()) {
      return err(validatedFid.error);
    }

    const validatedTarget = validations.validateTarget(target);
    if (validatedTarget.isErr()) {
      return err(validatedTarget.error);
    }

    return ResultAsync.fromPromise(this._reactionStore.getReactionAdd(fid, type, target), (e) => e as HubError);
  }

  async getReactionsByFid(
    fid: number,
    type?: ReactionType,
    pageOptions: PageOptions = {},
  ): HubAsyncResult<MessagesPage<ReactionAddMessage>> {
    const validatedFid = validations.validateFid(fid);
    if (validatedFid.isErr()) {
      return err(validatedFid.error);
    }

    return ResultAsync.fromPromise(
      this._reactionStore.getReactionAddsByFid(fid, type, pageOptions),
      (e) => e as HubError,
    );
  }

  async getReactionsByTarget(
    target: CastId | string,
    type?: ReactionType,
    pageOptions: PageOptions = {},
  ): HubAsyncResult<MessagesPage<ReactionAddMessage>> {
    if (typeof target !== "string") {
      const validatedCastId = validations.validateCastId(target);
      if (validatedCastId.isErr()) {
        return err(validatedCastId.error);
      }
    }

    return ResultAsync.fromPromise(
      this._reactionStore.getReactionsByTarget(target, type, pageOptions),
      (e) => e as HubError,
    );
  }

  async getAllReactionMessagesByFid(
    fid: number,
    pageOptions: PageOptions = {},
    startTime?: number,
    stopTime?: number,
  ): HubAsyncResult<MessagesPage<ReactionAddMessage | ReactionRemoveMessage>> {
    const validatedFid = validations.validateFid(fid);
    if (validatedFid.isErr()) {
      return err(validatedFid.error);
    }

    const validatedTimes = this.validateStartAndStopTime(startTime, stopTime);
    if (validatedTimes.isErr()) {
      return err(validatedTimes.error);
    }

    return ResultAsync.fromPromise(
      this._reactionStore.getAllReactionMessagesByFid(
        fid,
        pageOptions,
        validatedTimes.value.validatedStartTime,
        validatedTimes.value.validatedStopTime,
      ),
      (e) => e as HubError,
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                          Verification Store Methods                        */
  /* -------------------------------------------------------------------------- */

  async getVerification(fid: number, address: Uint8Array): HubAsyncResult<VerificationAddAddressMessage> {
    const validatedFid = validations.validateFid(fid);
    if (validatedFid.isErr()) {
      return err(validatedFid.error);
    }

    if (validations.validateEthAddress(address).isErr() && validations.validateSolAddress(address).isErr()) {
      return err(new HubError("not_found", "Ethereum or Solana address is incorrect"));
    }
    return ResultAsync.fromPromise(this._verificationStore.getVerificationAdd(fid, address), (e) => e as HubError);
  }

  async getVerificationsByFid(
    fid: number,
    pageOptions: PageOptions = {},
  ): HubAsyncResult<MessagesPage<VerificationAddAddressMessage>> {
    const validatedFid = validations.validateFid(fid);
    if (validatedFid.isErr()) {
      return err(validatedFid.error);
    }

    return ResultAsync.fromPromise(
      this._verificationStore.getVerificationAddsByFid(fid, pageOptions),
      (e) => e as HubError,
    );
  }

  async getAllVerificationMessagesByFid(
    fid: number,
    pageOptions: PageOptions = {},
    startTime?: number,
    stopTime?: number,
  ): HubAsyncResult<MessagesPage<VerificationAddAddressMessage | VerificationRemoveMessage>> {
    const validatedFid = validations.validateFid(fid);
    if (validatedFid.isErr()) {
      return err(validatedFid.error);
    }

    const validatedTimes = this.validateStartAndStopTime(startTime, stopTime);
    if (validatedTimes.isErr()) {
      return err(validatedTimes.error);
    }

    return ResultAsync.fromPromise(
      this._verificationStore.getAllVerificationMessagesByFid(
        fid,
        pageOptions,
        validatedTimes.value.validatedStartTime,
        validatedTimes.value.validatedStopTime,
      ),
      (e) => e as HubError,
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                              Signer Store Methods                          */
  /* -------------------------------------------------------------------------- */

  async getActiveSigner(fid: number, signerPubKey: Uint8Array): HubAsyncResult<SignerOnChainEvent> {
    const validatedFid = validations.validateFid(fid);
    if (validatedFid.isErr()) {
      return err(validatedFid.error);
    }

    const validatedPubKey = validations.validateEd25519PublicKey(signerPubKey);
    if (validatedPubKey.isErr()) {
      return err(validatedPubKey.error);
    }

    return ResultAsync.fromPromise(this._onchainEventsStore.getActiveSigner(fid, signerPubKey), (e) => e as HubError);
  }

  async getOnChainSignersByFid(fid: number, pageOptions: PageOptions = {}): HubAsyncResult<OnChainEventResponse> {
    const validatedFid = validations.validateFid(fid);
    if (validatedFid.isErr()) {
      return err(validatedFid.error);
    }

    return ResultAsync.fromPromise(this._onchainEventsStore.getSignersByFid(fid, pageOptions), (e) => e as HubError);
  }

  async getIdRegistryOnChainEvent(fid: number): HubAsyncResult<OnChainEvent> {
    return ResultAsync.fromPromise(this._onchainEventsStore.getIdRegisterEventByFid(fid), (e) => e as HubError);
  }

  async getIdRegistryOnChainEventByAddress(address: Uint8Array): HubAsyncResult<OnChainEvent> {
    return ResultAsync.fromPromise(
      this._onchainEventsStore.getIdRegisterEventByCustodyAddress(address),
      (e) => e as HubError,
    );
  }

  async getFids(pageOptions: PageOptions = {}): HubAsyncResult<{
    fids: number[];
    nextPageToken: Uint8Array | undefined;
  }> {
    return ResultAsync.fromPromise(this._onchainEventsStore.getFids(pageOptions), (e) => e as HubError);
  }

  /* -------------------------------------------------------------------------- */
  /*                           User Data Store Methods                          */
  /* -------------------------------------------------------------------------- */

  async getUserData(fid: number, type: UserDataType): HubAsyncResult<UserDataAddMessage> {
    const validatedFid = validations.validateFid(fid);
    if (validatedFid.isErr()) {
      return err(validatedFid.error);
    }

    return ResultAsync.fromPromise(this._userDataStore.getUserDataAdd(fid, type), (e) => e as HubError);
  }

  async getUserDataByFid(
    fid: number,
    pageOptions: PageOptions = {},
    startTime?: number,
    stopTime?: number,
  ): HubAsyncResult<MessagesPage<UserDataAddMessage>> {
    const validatedFid = validations.validateFid(fid);
    if (validatedFid.isErr()) {
      return err(validatedFid.error);
    }

    const validatedTimes = this.validateStartAndStopTime(startTime, stopTime);
    if (validatedTimes.isErr()) {
      return err(validatedTimes.error);
    }

    return ResultAsync.fromPromise(
      this._userDataStore.getUserDataAddsByFid(
        fid,
        pageOptions,
        validatedTimes.value.validatedStartTime,
        validatedTimes.value.validatedStopTime,
      ),
      (e) => e as HubError,
    );
  }

  async getOnChainEvents(type: OnChainEventType, fid: number): HubAsyncResult<OnChainEventResponse> {
    if (type === OnChainEventType.EVENT_TYPE_SIGNER_MIGRATED) {
      if (fid !== 0) {
        return err(new HubError("bad_request.invalid_param", "fid must be 0 for signer migrated events"));
      }
    } else {
      const validatedFid = validations.validateFid(fid);
      if (validatedFid.isErr()) {
        return err(validatedFid.error);
      }
    }

    return ResultAsync.fromPromise(this._onchainEventsStore.getOnChainEvents(type, fid), (e) => e as HubError).map(
      (events) => OnChainEventResponse.create({ events }),
    );
  }

  async getCurrentStorageLimitsByFid(fid: number): HubAsyncResult<StorageLimitsResponse> {
    const validatedFid = validations.validateFid(fid);
    if (validatedFid.isErr()) {
      return err(validatedFid.error);
    }

    await this.clearStorageCacheForFid(fid);
    const slot = await this.eventHandler.getCurrentStorageSlotForFid(fid);

    if (slot.isErr()) {
      return err(slot.error);
    }

    const unitDetails = [
      { unitType: StorageUnitType.UNIT_TYPE_LEGACY, unitSize: slot.value.legacy_units },
      { unitType: StorageUnitType.UNIT_TYPE_2024, unitSize: slot.value.units },
    ];
    const storeLimits = getStoreLimits(unitDetails);
    const limits: StorageLimit[] = [];
    for (const limit of storeLimits) {
      const usageResult = await this.eventHandler.getUsage(fid, limit.storeType);
      if (usageResult.isErr()) {
        log.warn({ err: usageResult.error }, `error getting usage for storage limit for ${fid} and ${limit.storeType}`);
        continue;
      }
      limits.push(
        StorageLimit.create({
          limit: limit.limit,
          name: StoreType[limit.storeType],
          used: usageResult.value.used,
          earliestTimestamp: usageResult.value.earliestTimestamp,
          earliestHash: usageResult.value.earliestHash,
          storeType: limit.storeType,
        }),
      );
    }
    return ok({
      units: slot.value.units + slot.value.legacy_units,
      limits: limits,
      unitDetails: unitDetails,
    });
  }

  async clearStorageCacheForFid(fid: number): HubAsyncResult<void> {
    const limits = getStoreLimits([]);
    for (const limit of limits) {
      await this.eventHandler.clearCachedMessageCount(fid, limit.storeType);
    }
    return ok(undefined);
  }

  async getUserNameProof(name: Uint8Array, retries = 1): HubAsyncResult<UserNameProof> {
    const nameString = bytesToUtf8String(name);
    if (nameString.isErr()) {
      return err(nameString.error);
    }
    if (nameString.value.endsWith(".eth")) {
      const validatedEnsName = validations.validateEnsName(name);
      if (validatedEnsName.isErr()) {
        return err(validatedEnsName.error);
      }
      return ResultAsync.fromPromise(
        this._usernameProofStore.getUsernameProof(name, UserNameType.USERNAME_TYPE_ENS_L1).then((proof) => {
          return proof.data.usernameProofBody;
        }),
        (e) => e as HubError,
      );
    } else {
      const validatedFname = validations.validateFname(name);
      if (validatedFname.isErr()) {
        return err(validatedFname.error);
      }

      const result = await ResultAsync.fromPromise(this._userDataStore.getUserNameProof(name), (e) => e as HubError);

      if (result.isErr() && result.error.errCode === "not_found" && retries > 0 && this._fNameRegistryEventsProvider) {
        const rateLimitResult = await ResultAsync.fromPromise(
          this._fNameRetryRateLimiter.consume(0),
          () => new HubError("unavailable", "Too many requests to fName server"),
        );
        if (rateLimitResult.isErr()) {
          return err(rateLimitResult.error);
        }
        await this._fNameRegistryEventsProvider.retryTransferByName(name);
        return this.getUserNameProof(name, retries - 1);
      }

      return result;
    }
  }

  async getUserNameProofsByFid(fid: number): HubAsyncResult<UserNameProof[]> {
    const validatedFid = validations.validateFid(fid);
    if (validatedFid.isErr()) {
      return err(validatedFid.error);
    }
    const proofs: UserNameProof[] = [];
    const fnameProof = await ResultAsync.fromPromise(
      this._userDataStore.getUserNameProofByFid(fid),
      (e) => e as HubError,
    );
    if (fnameProof.isOk()) {
      proofs.push(fnameProof.value);
    }
    const ensProofs = await ResultAsync.fromPromise(
      this._usernameProofStore.getUsernameProofsByFid(fid),
      (e) => e as HubError,
    );
    if (ensProofs.isOk()) {
      proofs.push(...ensProofs.value);
    }
    return ok(proofs);
  }

  /* -------------------------------------------------------------------------- */
  /*                              Link Store Methods                            */
  /* -------------------------------------------------------------------------- */

  async getLink(fid: number, type: string, target: number): HubAsyncResult<LinkAddMessage> {
    const versionCheck = ensureAboveTargetFarcasterVersion("2023.4.19");
    if (versionCheck.isErr()) {
      return err(versionCheck.error);
    }

    const validatedFid = validations.validateFid(fid);
    if (validatedFid.isErr()) {
      return err(validatedFid.error);
    }

    const validatedTarget = validations.validateFid(target);
    if (validatedTarget.isErr()) {
      return err(validatedTarget.error);
    }

    return ResultAsync.fromPromise(this._linkStore.getLinkAdd(fid, type, target), (e) => e as HubError);
  }

  async getLinksByFid(
    fid: number,
    type?: string,
    pageOptions: PageOptions = {},
  ): HubAsyncResult<MessagesPage<LinkAddMessage>> {
    const versionCheck = ensureAboveTargetFarcasterVersion("2023.4.19");
    if (versionCheck.isErr()) {
      return err(versionCheck.error);
    }

    const validatedFid = validations.validateFid(fid);
    if (validatedFid.isErr()) {
      return err(validatedFid.error);
    }

    return ResultAsync.fromPromise(this._linkStore.getLinkAddsByFid(fid, type, pageOptions), (e) => e as HubError);
  }

  async getLinksByTarget(
    target: number,
    type?: string,
    pageOptions: PageOptions = {},
  ): HubAsyncResult<MessagesPage<LinkAddMessage>> {
    const versionCheck = ensureAboveTargetFarcasterVersion("2023.4.19");
    if (versionCheck.isErr()) {
      return err(versionCheck.error);
    }

    if (typeof target !== "string") {
      const validatedTargetId = validations.validateFid(target);
      if (validatedTargetId.isErr()) {
        return err(validatedTargetId.error);
      }
    }

    return ResultAsync.fromPromise(this._linkStore.getLinksByTarget(target, type, pageOptions), (e) => e as HubError);
  }

  async getAllLinkMessagesByFid(
    fid: number,
    pageOptions: PageOptions = {},
    startTime?: number,
    stopTime?: number,
  ): HubAsyncResult<MessagesPage<LinkAddMessage | LinkRemoveMessage>> {
    const versionCheck = ensureAboveTargetFarcasterVersion("2023.4.19");
    if (versionCheck.isErr()) {
      return err(versionCheck.error);
    }

    const validatedFid = validations.validateFid(fid);
    if (validatedFid.isErr()) {
      return err(validatedFid.error);
    }

    const validatedTimes = this.validateStartAndStopTime(startTime, stopTime);
    if (validatedTimes.isErr()) {
      return err(validatedTimes.error);
    }

    return ResultAsync.fromPromise(
      this._linkStore.getAllLinkMessagesByFid(
        fid,
        pageOptions,
        validatedTimes.value.validatedStartTime,
        validatedTimes.value.validatedStopTime,
      ),
      (e) => e as HubError,
    );
  }

  async getLinkCompactStateMessageByFid(
    fid: number,
    pageOptions: PageOptions = {},
  ): HubAsyncResult<MessagesPage<LinkCompactStateMessage>> {
    const versionCheck = ensureAboveTargetFarcasterVersion("2024.3.20");
    if (versionCheck.isErr()) {
      return err(versionCheck.error);
    }

    const validatedFid = validations.validateFid(fid);
    if (validatedFid.isErr()) {
      return err(validatedFid.error);
    }

    return ResultAsync.fromPromise(
      this._linkStore.getLinkCompactStateMessageByFid(fid, pageOptions),
      (e) => e as HubError,
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                               Private Methods                              */
  /* -------------------------------------------------------------------------- */

  private async validateOnChainEvent(event: OnChainEvent): HubAsyncResult<OnChainEvent> {
    if (!event) {
      return err(new HubError("bad_request.validation_failure", "event is missing"));
    }

    if (
      !(
        event.type === OnChainEventType.EVENT_TYPE_SIGNER ||
        event.type === OnChainEventType.EVENT_TYPE_SIGNER_MIGRATED ||
        event.type === OnChainEventType.EVENT_TYPE_ID_REGISTER ||
        event.type === OnChainEventType.EVENT_TYPE_STORAGE_RENT
      )
    ) {
      return err(new HubError("bad_request.validation_failure", "invalid event type"));
    }
    return ok(event);
  }

  async validateMessage(message: Message, lowPriority = false): HubAsyncResult<Message> {
    // 1. Ensure message data is present
    if (!message || !message.data) {
      return err(new HubError("bad_request.validation_failure", "message data is missing"));
    }

    // 2. Check the network
    if (message.data.network !== this._network) {
      return err(
        new HubError(
          "bad_request.validation_failure",
          `incorrect network: ${message.data.network} (expected: ${this._network})`,
        ),
      );
    }

    // 3. Check that the user has a custody address
    let custodyAddress: Uint8Array | undefined;
    const custodyEvent = await ResultAsync.fromPromise(
      this._onchainEventsStore.getIdRegisterEventByFid(message.data.fid),
      (e) => e as HubError,
    );
    if (custodyEvent.isErr()) {
      log.error(
        { errCode: custodyEvent.error.errCode, errMessage: custodyEvent.error.message },
        `failed to get v2 custody event for ${message.data.fid}`,
      );
    } else {
      custodyAddress = custodyEvent.value.idRegisterEventBody.to;
    }

    if (!custodyAddress) {
      return err(new HubError("bad_request.unknown_fid", `unknown fid: ${message.data.fid}`));
    }

    // 4. Check that the signer is valid
    const result = await ResultAsync.fromPromise(
      this._onchainEventsStore.getActiveSigner(message.data.fid, message.signer),
      (e) => e,
    );
    const signerExists = result.isOk();
    if (!signerExists) {
      const hex = bytesToHexString(message.signer);
      return hex.andThen((signerHex) => {
        return err(
          new HubError(
            "bad_request.unknown_signer",
            `invalid signer: signer ${signerHex} not found for fid ${message.data?.fid}`,
          ),
        );
      });
    }

    // 5. For fname add UserDataAdd messages, check that the user actually owns the fname
    if (isUserDataAddMessage(message) && message.data.userDataBody.type === UserDataType.USERNAME) {
      // For fname messages, check if the user actually owns the fname.
      const nameBytes = utf8StringToBytes(message.data.userDataBody.value);
      if (nameBytes.isErr()) {
        return err(nameBytes.error);
      }

      // Users are allowed to set fname = '' to remove their fname, so check to see if fname is set
      // before validating the custody address
      if (nameBytes.value.length > 0) {
        // Get the NameRegistryEvent for the fname
        const nameProof = (await this.getUserNameProof(nameBytes.value)).mapErr((e) =>
          e.errCode === "not_found"
            ? new HubError(
                "bad_request.validation_failure",
                `name ${message.data.userDataBody.value} is not registered`,
              )
            : e,
        );
        if (nameProof.isErr()) {
          return err(nameProof.error);
        }

        if (
          nameProof.value.type !== UserNameType.USERNAME_TYPE_FNAME &&
          nameProof.value.type !== UserNameType.USERNAME_TYPE_ENS_L1
        ) {
          return err(new HubError("bad_request.validation_failure", "invalid username type"));
        }

        // Check that the fid for the fname/ens name and message are the same
        if (nameProof.value.fid !== message.data.fid) {
          return err(
            new HubError(
              "bad_request.validation_failure",
              `fid ${nameProof.value.fid} does not match message fid ${message.data.fid}`,
            ),
          );
        }

        if (nameProof.value.type === UserNameType.USERNAME_TYPE_ENS_L1) {
          const result = await this.validateEnsUsernameProof(nameProof.value, custodyAddress);
          if (result.isErr()) {
            return err(result.error);
          }
        }
      }
    }

    // 6. For username proof messages, make sure the name resolves to the users custody address or a connected address actually owns the ens name
    if (isUsernameProofMessage(message) && message.data.usernameProofBody.type === UserNameType.USERNAME_TYPE_ENS_L1) {
      const result = await this.validateEnsUsernameProof(message.data.usernameProofBody, custodyAddress);
      if (result.isErr()) {
        return err(result.error);
      }
    }

    if (
      isVerificationAddAddressMessage(message) &&
      message.data.verificationAddAddressBody.protocol === Protocol.SOLANA
    ) {
      if (!this._solanaVerificationsEnabled) {
        return err(new HubError("bad_request.validation_failure", "solana verifications are not enabled"));
      }
    }

    // LinkCompactStateMessages can't be more than 100 storage units
    if (
      isLinkCompactStateMessage(message) &&
      message.data.linkCompactStateBody.targetFids.length >
        getDefaultStoreLimit(StoreType.LINKS, StorageUnitType.UNIT_TYPE_LEGACY) * 100
    ) {
      return err(
        new HubError("bad_request.validation_failure", "LinkCompactStateMessage is too big. Limit = 100 storage units"),
      );
    }

    // 6. Check message body and envelope
    if (this._validationWorkers) {
      this._nextValidationWorker += 1;
      this._nextValidationWorker = this._nextValidationWorker % this._validationWorkers.length;

      // If this is a low-priority message and we're under load, only send it to the [0] worker,
      // leaving the rest for high-priority messages
      let workerIndex = this._nextValidationWorker;
      if (this._validationWorkerPromiseMap.size > 100) {
        if (lowPriority) {
          workerIndex = 0;
        } else {
          // Send the high-priority message any but the first worker, which is reserved for the low-priority messages
          workerIndex = this._nextValidationWorker === 0 ? 1 : this._nextValidationWorker;
        }
      }

      const worker = this._validationWorkers[workerIndex] as Worker;
      return new Promise<HubResult<Message>>((resolve) => {
        const id = this._validationWorkerJobId++;
        this._validationWorkerPromiseMap.set(id, resolve);

        worker.postMessage({ id, message });
      });
    } else {
      return validations.validateMessage(message, rsValidationMethods, this.getPublicClients());
    }
  }

  private async validateEnsUsernameProof(
    nameProof: UserNameProof,
    custodyAddress: Uint8Array,
  ): HubAsyncResult<undefined> {
    const nameResult = bytesToUtf8String(nameProof.name);
    if (nameResult.isErr() || !nameResult.value.endsWith(".eth")) {
      return err(new HubError("bad_request.validation_failure", `invalid ens name: ${nameProof.name}`));
    }
    let resolvedAddress;
    let resolvedAddressString;
    try {
      resolvedAddressString = await this._publicClient?.getEnsAddress({ name: normalize(nameResult.value) });
      const resolvedAddressBytes = hexStringToBytes(resolvedAddressString || "");
      if (resolvedAddressBytes.isErr() || resolvedAddressBytes.value.length === 0) {
        return err(new HubError("bad_request.validation_failure", `no valid address for ${nameResult.value}`));
      }
      resolvedAddress = resolvedAddressBytes.value;
    } catch (e) {
      return err(new HubError("unavailable.network_failure", `failed to resolve ens name ${nameResult.value}: ${e}`));
    }

    if (bytesCompare(resolvedAddress, nameProof.owner) !== 0) {
      return err(
        new HubError(
          "bad_request.validation_failure",
          `resolved address ${resolvedAddressString} does not match proof`,
        ),
      );
    }
    // If resolved address does not match custody address then check if we have an eth verification for it
    if (bytesCompare(resolvedAddress, custodyAddress) !== 0) {
      const verificationResult = await this.getVerification(nameProof.fid, resolvedAddress);
      if (verificationResult.isErr()) {
        return err(new HubError("bad_request.validation_failure", `ens name does not belong to fid: ${nameProof.fid}`));
      }
    }
    return ok(undefined);
  }

  private async handleMergeUsernameProofEvent(event: MergeUsernameProofHubEvent): HubAsyncResult<void> {
    const { deletedUsernameProof, usernameProof } = event.mergeUsernameProofBody;

    // When there is a UserNameProof, we need to check if we need to revoke UserDataAdd messages from the
    // previous owner of the name.
    if (deletedUsernameProof && deletedUsernameProof.owner.length > 0) {
      // If the name and the fid are the same (proof just has a newer timestamp or different owner address) then we don't need to revoke
      if (
        usernameProof &&
        bytesCompare(deletedUsernameProof.name, usernameProof.name) === 0 &&
        deletedUsernameProof.fid === usernameProof.fid
      ) {
        return ok(undefined);
      }
      const fid = deletedUsernameProof.fid;

      // Check if this fid assigned the name with a UserDataAdd message
      const usernameAdd = await ResultAsync.fromPromise(
        this._userDataStore.getUserDataAdd(fid, UserDataType.USERNAME),
        () => undefined,
      );
      if (usernameAdd.isOk()) {
        const nameBytes = utf8StringToBytes(usernameAdd.value.data.userDataBody.value);
        if (!nameBytes.isOk()) {
          log.error(
            `failed to convert username add message ${bytesToHexString(
              usernameAdd.value.hash,
            )} for fid ${fid} to utf8 string`,
          );
          return err(nameBytes.error);
        }
        if (bytesCompare(nameBytes.value, deletedUsernameProof.name) !== 0) {
          log.debug(`deleted name proof for ${fid} does not match current user name, skipping revoke`);
          return ok(undefined);
        }

        const revokeResult = await this._userDataStore.revoke(usernameAdd.value);
        const usernameAddHex = bytesToHexString(usernameAdd.value.hash);
        revokeResult.match(
          () =>
            log.info(`revoked message ${usernameAddHex._unsafeUnwrap()} for fid ${fid} due to name proof invalidation`),
          (e) =>
            log.error(
              { errCode: e.errCode },
              `failed to revoke message ${usernameAddHex._unsafeUnwrap()} for fid ${fid} due to name proof invalidation: ${
                e.message
              }`,
            ),
        );
      }
    }

    return ok(undefined);
  }

  private async handleMergeOnChainEvent(event: MergeOnChainEventHubEvent): HubAsyncResult<void> {
    const onChainEvent = event.mergeOnChainEventBody.onChainEvent;

    if (
      onChainEvent &&
      isSignerOnChainEvent(onChainEvent) &&
      onChainEvent.signerEventBody.eventType === SignerEventType.REMOVE
    ) {
      const payload = RevokeMessagesBySignerJobPayload.create({
        fid: onChainEvent.fid,
        signer: onChainEvent.signerEventBody.key,
      });
      const enqueueRevoke = await this._revokeSignerQueue.enqueueJob(payload);
      if (enqueueRevoke.isErr()) {
        log.error(
          { errCode: enqueueRevoke.error.errCode },
          `failed to enqueue revoke signer job: ${enqueueRevoke.error.message}`,
        );
      }
    }

    return ok(undefined);
  }

  private getPublicClients(): { [chainId: number]: PublicClient } {
    const clients: { [chainId: number]: PublicClient } = {};
    if (this._publicClient?.chain) {
      clients[this._publicClient.chain.id] = this._publicClient;
    }
    if (this._l2PublicClient?.chain) {
      clients[this._l2PublicClient.chain.id] = this._l2PublicClient as PublicClient;
    }
    return clients;
  }

  private getWorkerData(): ValidationWorkerData {
    const l1Transports: string[] = [];
    this._publicClient?.transport["transports"].forEach((transport: { value?: { url: string } }) => {
      if (transport?.value) {
        l1Transports.push(transport.value["url"]);
      }
    });
    const l2Transports: string[] = [];
    this._l2PublicClient?.transport["transports"].forEach((transport: { value?: { url: string } }) => {
      if (transport?.value) {
        l2Transports.push(transport.value["url"]);
      }
    });

    return {
      ethMainnetRpcUrl: l1Transports.join(","),
      l2RpcUrl: l2Transports.join(","),
    };
  }
}

export default Engine;
