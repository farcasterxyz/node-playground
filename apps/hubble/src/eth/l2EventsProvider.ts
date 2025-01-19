import {
  hexStringToBytes,
  HubAsyncResult,
  HubError,
  HubResult,
  IdRegisterEventBody,
  IdRegisterEventType,
  OnChainEvent,
  OnChainEventType,
  onChainEventTypeToJSON,
  SignerEventBody,
  SignerEventType,
  SignerMigratedEventBody,
  StorageRentEventBody,
  toFarcasterTime,
} from "@farcaster/hub-nodejs";
import { err, ok, Result, ResultAsync } from "neverthrow";
import { IdRegistry, KeyRegistry, StorageRegistry } from "./abis.js";
import { HubInterface } from "../hubble.js";
import { logger } from "../utils/logger.js";
import {
  createContractEventFilter,
  createEventFilter,
  getBlock,
  getBlockNumber,
  getContractEvents,
  getFilterLogs,
} from "viem/actions";
import { optimismGoerli } from "viem/chains";
import {
  createPublicClient,
  fallback,
  http,
  Log,
  WatchContractEventOnLogsParameter,
  PublicClient,
  Hex,
  FallbackTransport,
  HttpRequestError,
  HttpTransport,
  ContractEventName,
  Chain,
  BlockNumber,
  BlockTag,
  GetContractEventsParameters,
  MaybeExtractEventArgsFromAbi,
  CreateContractEventFilterParameters,
  Transport,
} from "viem";
import { WatchContractEvent } from "./watchContractEvent.js";
import { WatchBlockNumber } from "./watchBlockNumber.js";
import { Abi, ExtractAbiEvent } from "abitype";
import { onChainEventSorter } from "../storage/db/onChainEvent.js";
import { formatPercentage } from "../profile/profile.js";
import { addProgressBar } from "../utils/progressBars.js";
import { statsd } from "../utils/statsd.js";
import { diagnosticReporter } from "../utils/diagnosticReport.js";

const log = logger.child({
  component: "L2EventsProvider",
});

export class OptimismConstants {
  public static StorageRegistryAddress = "0x00000000fcce7f938e7ae6d3c335bd6a1a7c593d" as const;
  public static KeyRegistryV2Address = "0x00000000Fc1237824fb747aBDE0FF18990E59b7e" as const;
  public static IdRegistryV2Address = "0x00000000Fc6c5F01Fc30151999387Bb99A9f489b" as const;
  public static FirstBlock = 108864739; // ~Aug 29 2023 5:00pm UTC
  public static ChunkSize = 1000;
  public static ChainId = 10; // OP mainnet
}

const RENT_EXPIRY_IN_SECONDS = 365 * 24 * 60 * 60; // One year
const FID_RETRY_DEDUP_LOOKBACK_MS = 60 * 60 * 1000; // One hour

type EventSpecificArgs = {
  eventName: string;
  fid: number;
};

/**
 * Class that follows the Optimism chain to handle onchain events from the Storage Registry contract.
 */
export class L2EventsProvider<chain extends Chain = Chain, transport extends Transport = Transport> {
  private _hub: HubInterface;
  private _publicClient: PublicClient<transport, chain>;

  private _firstBlock: number;
  private _stopBlock?: number;
  private _chunkSize: number;
  private _chainId: number;
  private _rentExpiry: number;
  private _resyncEvents: boolean;
  private _useFilters: boolean;

  private _onChainEventsByBlock: Map<number, Array<OnChainEvent>>;
  private _retryDedupMap: Map<number, boolean>;
  private _fidRetryDedupMap: Map<number, boolean>;
  private _blockTimestampsCache: Map<string, number>;

  private _lastBlockNumber: number;

  private storageRegistryAddress: `0x${string}` | undefined;
  private keyRegistryV2Address: `0x${string}` | undefined;
  private idRegistryV2Address: `0x${string}` | undefined;

  private _watchStorageContractEvents?: WatchContractEvent<
    chain,
    typeof StorageRegistry.abi,
    ContractEventName<typeof StorageRegistry.abi>,
    true,
    transport
  >;
  private _watchKeyRegistryV2ContractEvents?: WatchContractEvent<
    chain,
    typeof KeyRegistry.abi,
    ContractEventName<typeof KeyRegistry.abi>,
    true,
    transport
  >;
  private _watchIdRegistryV2ContractEvents?: WatchContractEvent<
    chain,
    typeof IdRegistry.abi,
    ContractEventName<typeof IdRegistry.abi>,
    true,
    transport
  >;
  private _watchBlockNumber?: WatchBlockNumber<transport, chain>;

  // Whether the historical events have been synced. This is used to avoid syncing the events multiple times.
  private _isHistoricalSyncDone = false;
  private _isHandlingBlock = false;

  // Number of blocks to wait before processing an event. This is hardcoded to
  // 2 for now, because that's the threshold beyond which blocks are unlikely
  // to reorg anymore. Note that these are blocks on the L2 chain, not the L1.
  static numConfirmations = 2;

  // Events are only processed after `numConfirmations` blocks have been confirmed; poll less
  // frequently while ensuring events are available the moment they are
  // confirmed.
  static eventPollingInterval = Math.max(L2EventsProvider.numConfirmations - 2, 1) * 10_000;
  static blockPollingInterval = 4_000;

  constructor(
    hub: HubInterface,
    publicClient: PublicClient<transport, chain>,
    storageRegistryAddress: `0x${string}`,
    keyRegistryV2Address: `0x${string}`,
    idRegistryV2Address: `0x${string}`,
    firstBlock: number,
    chunkSize: number,
    chainId: number,
    resyncEvents: boolean,
    expiryOverride?: number,
    stopBlock?: number,
  ) {
    this._hub = hub;
    this._publicClient = publicClient;
    this._firstBlock = firstBlock;
    this._stopBlock = stopBlock;
    this._chunkSize = chunkSize;
    this._chainId = chainId;
    this._resyncEvents = resyncEvents;
    this._useFilters = false;
    this._rentExpiry = expiryOverride ?? RENT_EXPIRY_IN_SECONDS;

    this._lastBlockNumber = 0;

    // Initialize the cache for the Storage Registry events. They will be processed after
    // numConfirmations blocks have been mined.
    this._onChainEventsByBlock = new Map();
    this._retryDedupMap = new Map();
    this._fidRetryDedupMap = new Map();
    // Clear the map periodically to avoid memory bloat.
    setInterval(() => {
      this._fidRetryDedupMap.clear();
    }, FID_RETRY_DEDUP_LOOKBACK_MS);

    this._blockTimestampsCache = new Map();

    this.setAddresses(storageRegistryAddress, keyRegistryV2Address, idRegistryV2Address);

    if (expiryOverride) {
      log.warn(`Overriding rent expiry to ${expiryOverride} seconds`);
    }
  }

  /**
   *
   * Build an L2 Events Provider for the ID Registry and Name Registry contracts.
   */
  public static build<chain extends Chain = typeof optimismGoerli>(
    hub: HubInterface,
    l2RpcUrl: string,
    rankRpcs: boolean,
    storageRegistryAddress: `0x${string}`,
    keyRegistryV2Address: `0x${string}`,
    idRegistryV2Address: `0x${string}`,
    firstBlock: number,
    chunkSize: number,
    chainId: number,
    resyncEvents: boolean,
    expiryOverride?: number,
    stopBlock?: number,
  ): L2EventsProvider<chain> {
    const l2RpcUrls = l2RpcUrl.split(",");
    const transports = l2RpcUrls.map((url) =>
      http(url, {
        retryCount: 10,
        fetchOptions: {
          ...(process.env["L2_RPC_AUTHORIZATION_HEADER"] && {
            headers: {
              Authorization: `${process.env["L2_RPC_AUTHORIZATION_HEADER"]}`,
            },
          }),
        },
      }),
    );

    const publicClient = createPublicClient({
      // Fallback; provided RPC URLs override this
      chain: optimismGoerli as unknown as chain,
      transport: fallback(transports, {
        rank: rankRpcs,
      }),
    });

    const provider = new L2EventsProvider(
      hub,
      publicClient,
      storageRegistryAddress,
      keyRegistryV2Address,
      idRegistryV2Address,
      firstBlock,
      chunkSize,
      chainId,
      resyncEvents,
      expiryOverride,
      stopBlock,
    );

    return provider;
  }

  public getLatestBlockNumber(): number {
    return this._lastBlockNumber;
  }

  public async start(): HubAsyncResult<undefined> {
    // Connect to L2 RPC

    // Start the contract watchers first, so we cache events while we sync historical events
    // this._watchStorageContractEvents?.start();
    // this._watchIdRegistryV2ContractEvents?.start();
    // this._watchKeyRegistryV2ContractEvents?.start();

    const syncHistoryResult = await this.connectAndSyncHistoricalEvents();
    if (syncHistoryResult.isErr()) {
      diagnosticReporter().reportError(syncHistoryResult.error as Error);
      throw syncHistoryResult.error;
    } else if (!this._isHistoricalSyncDone) {
      throw new HubError("unavailable", "Historical sync failed to complete");
    } else {
      return ok(undefined);
      // return ok(this._watchBlockNumber?.start());
    }
  }

  public async stop() {
    // NOTE: Contract event watchers may rely on creation of filters (eth_newFilter) - however, by default providers like
    // Alchemy will expire filters if they're not used for 5 minutes.
    // As a result, we log errors on the contract event watchers, but continue with the rest of the shutdown process.
    [
      this._watchStorageContractEvents?.stop(),
      this._watchIdRegistryV2ContractEvents?.stop(),
      this._watchKeyRegistryV2ContractEvents?.stop(),
      this._watchBlockNumber?.stop(),
    ].forEach((result: HubResult<void> | undefined) => {
      if (!result) {
        return;
      }

      if (result.isErr()) {
        log.error(result.error, "error stopping contract event watcher");
      }
    });

    // Wait for all async promises to resolve
    await new Promise((resolve) => setTimeout(resolve, 0));
    log.info("L2EventsProvider stopped");
  }

  /* -------------------------------------------------------------------------- */
  /*                               Private Methods                              */
  /* -------------------------------------------------------------------------- */

  private async processStorageEvents(
    logs: WatchContractEventOnLogsParameter<
      typeof StorageRegistry.abi,
      ContractEventName<typeof StorageRegistry.abi>,
      true
    >,
    version = 0,
  ) {
    for (const event of logs) {
      const { blockNumber, blockHash, transactionHash, transactionIndex, logIndex } = event;

      // Do nothing if the block is pending
      if (
        blockHash === null ||
        blockNumber === null ||
        transactionHash === null ||
        transactionIndex === null ||
        logIndex === null
      ) {
        continue;
      }

      // Handling: use try-catch + log since errors are expected and not important to surface
      try {
        if (event.eventName === "Rent") {
          statsd().increment("l2events.events_processed", { kind: "storage:rent" });
          // Fix when viem fixes https://github.com/wagmi-dev/viem/issues/938
          const rentEvent = event as Log<
            bigint,
            number,
            boolean,
            ExtractAbiEvent<typeof StorageRegistry.abi, "Rent">,
            true,
            typeof StorageRegistry.abi
          >;
          const blockTimestamp = await this._getBlockTimestamp(blockHash);
          const blockTimeAsFarcasterTime = toFarcasterTime(blockTimestamp * 1000);
          if (blockTimeAsFarcasterTime.isErr()) {
            log.error(blockTimeAsFarcasterTime.error, "failed to parse block timestamp");
            continue;
          }
          const expiry = blockTimeAsFarcasterTime.value + this._rentExpiry;
          const storageRentEventBody = StorageRentEventBody.create({
            payer: hexStringToBytes(rentEvent.args.payer)._unsafeUnwrap(),
            units: Number(rentEvent.args.units),
            expiry: expiry,
          });
          await this.cacheOnChainEvent(
            OnChainEventType.EVENT_TYPE_STORAGE_RENT,
            rentEvent.args.fid,
            blockNumber,
            blockHash,
            transactionHash,
            transactionIndex,
            logIndex,
            version,
            undefined,
            undefined,
            undefined,
            storageRentEventBody,
          );
        }
      } catch (e) {
        diagnosticReporter().reportError(e as Error);
        log.error(e, "error found while processing storage event");
        log.error({ event }, "failed to parse event args");
      }
    }
  }

  private async processKeyRegistryEventsV2(logs: WatchContractEventOnLogsParameter<typeof KeyRegistry.abi>) {
    await this.processKeyRegistryEvents(logs, 2);
  }

  private async processKeyRegistryEvents(logs: WatchContractEventOnLogsParameter<typeof KeyRegistry.abi>, version = 0) {
    for (const event of logs) {
      const { blockNumber, blockHash, transactionHash, transactionIndex, logIndex } = event;

      // Do nothing if the block is pending
      if (
        blockHash === null ||
        blockNumber === null ||
        transactionHash === null ||
        transactionIndex === null ||
        logIndex === null
      ) {
        continue;
      }

      // Handling: use try-catch + log since errors are expected and not important to surface
      try {
        if (event.eventName === "Add") {
          statsd().increment("l2events.events_processed", { kind: "key-registry:add" });
          const addEvent = event as Log<
            bigint,
            number,
            boolean,
            ExtractAbiEvent<typeof KeyRegistry.abi, "Add">,
            true,
            typeof KeyRegistry.abi
          >;
          const signerEventBody = SignerEventBody.create({
            eventType: SignerEventType.ADD,
            key: hexStringToBytes(addEvent.args.keyBytes)._unsafeUnwrap(),
            keyType: addEvent.args.keyType,
            metadata: hexStringToBytes(addEvent.args.metadata)._unsafeUnwrap(),
            metadataType: addEvent.args.metadataType,
          });
          await this.cacheOnChainEvent(
            OnChainEventType.EVENT_TYPE_SIGNER,
            addEvent.args.fid,
            blockNumber,
            blockHash,
            transactionHash,
            transactionIndex,
            logIndex,
            version,
            signerEventBody,
          );
        } else if (event.eventName === "Remove") {
          statsd().increment("l2events.events_processed", { kind: "key-registry:remove" });
          const removeEvent = event as Log<
            bigint,
            number,
            boolean,
            ExtractAbiEvent<typeof KeyRegistry.abi, "Remove">,
            true,
            typeof KeyRegistry.abi
          >;
          const signerEventBody = SignerEventBody.create({
            eventType: SignerEventType.REMOVE,
            key: hexStringToBytes(removeEvent.args.keyBytes)._unsafeUnwrap(),
          });
          await this.cacheOnChainEvent(
            OnChainEventType.EVENT_TYPE_SIGNER,
            removeEvent.args.fid,
            blockNumber,
            blockHash,
            transactionHash,
            transactionIndex,
            logIndex,
            version,
            signerEventBody,
          );
        } else if (event.eventName === "AdminReset") {
          statsd().increment("l2events.events_processed", { kind: "key-registry:admin-reset" });
          const resetEvent = event as Log<
            bigint,
            number,
            boolean,
            ExtractAbiEvent<typeof KeyRegistry.abi, "AdminReset">,
            true,
            typeof KeyRegistry.abi
          >;
          const signerEventBody = SignerEventBody.create({
            eventType: SignerEventType.ADMIN_RESET,
            key: hexStringToBytes(resetEvent.args.keyBytes)._unsafeUnwrap(),
          });
          await this.cacheOnChainEvent(
            OnChainEventType.EVENT_TYPE_SIGNER,
            resetEvent.args.fid,
            blockNumber,
            blockHash,
            transactionHash,
            transactionIndex,
            logIndex,
            version,
            signerEventBody,
          );
        } else if (event.eventName === "Migrated") {
          statsd().increment("l2events.events_processed", { kind: "key-registry:migrated" });
          const migratedEvent = event as Log<
            bigint,
            number,
            boolean,
            ExtractAbiEvent<typeof KeyRegistry.abi, "Migrated">,
            true,
            typeof KeyRegistry.abi
          >;
          await this.cacheOnChainEvent(
            OnChainEventType.EVENT_TYPE_SIGNER_MIGRATED,
            0n,
            blockNumber,
            blockHash,
            transactionHash,
            transactionIndex,
            logIndex,
            version,
            undefined,
            SignerMigratedEventBody.create({
              migratedAt: Number(migratedEvent.args.keysMigratedAt),
            }),
          );
        }
      } catch (e) {
        log.error(e);
        log.error({ event }, "failed to parse signer event args");
      }
    }
  }

  private async processIdRegistryV2Events(logs: WatchContractEventOnLogsParameter<typeof IdRegistry.abi>) {
    await this.processIdRegistryEvents(logs, 2);
  }

  private async processIdRegistryEvents(logs: WatchContractEventOnLogsParameter<typeof IdRegistry.abi>, version = 0) {
    for (const event of logs) {
      const { blockNumber, blockHash, transactionHash, transactionIndex, logIndex } = event;

      // Do nothing if the block is pending
      if (
        blockHash === null ||
        blockNumber === null ||
        transactionHash === null ||
        transactionIndex === null ||
        logIndex === null
      ) {
        continue;
      }

      // Handling: use try-catch + log since errors are expected and not important to surface
      try {
        if (event.eventName === "Register") {
          statsd().increment("l2events.events_processed", { kind: "id-registry:register" });
          const registerEvent = event as Log<
            bigint,
            number,
            boolean,
            ExtractAbiEvent<typeof IdRegistry.abi, "Register">,
            true,
            typeof IdRegistry.abi
          >;
          const idRegisterEventBody = IdRegisterEventBody.create({
            eventType: IdRegisterEventType.REGISTER,
            to: hexStringToBytes(registerEvent.args.to)._unsafeUnwrap(),
            recoveryAddress: hexStringToBytes(registerEvent.args.recovery)._unsafeUnwrap(),
          });
          await this.cacheOnChainEvent(
            OnChainEventType.EVENT_TYPE_ID_REGISTER,
            registerEvent.args.id,
            blockNumber,
            blockHash,
            transactionHash,
            transactionIndex,
            logIndex,
            version,
            undefined,
            undefined,
            idRegisterEventBody,
          );
        } else if (event.eventName === "Transfer") {
          statsd().increment("l2events.events_processed", { kind: "id-registry:transfer" });
          const transferEvent = event as Log<
            bigint,
            number,
            boolean,
            ExtractAbiEvent<typeof IdRegistry.abi, "Transfer">,
            true,
            typeof IdRegistry.abi
          >;
          const idRegisterEventBody = IdRegisterEventBody.create({
            eventType: IdRegisterEventType.TRANSFER,
            to: hexStringToBytes(transferEvent.args.to)._unsafeUnwrap(),
            from: hexStringToBytes(transferEvent.args.from)._unsafeUnwrap(),
          });
          await this.cacheOnChainEvent(
            OnChainEventType.EVENT_TYPE_ID_REGISTER,
            transferEvent.args.id,
            blockNumber,
            blockHash,
            transactionHash,
            transactionIndex,
            logIndex,
            version,
            undefined,
            undefined,
            idRegisterEventBody,
          );
        } else if (event.eventName === "ChangeRecoveryAddress") {
          statsd().increment("l2events.events_processed", { kind: "id-registry:change-recovery-address" });
          const transferEvent = event as Log<
            bigint,
            number,
            boolean,
            ExtractAbiEvent<typeof IdRegistry.abi, "ChangeRecoveryAddress">,
            true,
            typeof IdRegistry.abi
          >;
          const idRegisterEventBody = IdRegisterEventBody.create({
            eventType: IdRegisterEventType.CHANGE_RECOVERY,
            recoveryAddress: hexStringToBytes(transferEvent.args.recovery)._unsafeUnwrap(),
          });
          await this.cacheOnChainEvent(
            OnChainEventType.EVENT_TYPE_ID_REGISTER,
            transferEvent.args.id,
            blockNumber,
            blockHash,
            transactionHash,
            transactionIndex,
            logIndex,
            version,
            undefined,
            undefined,
            idRegisterEventBody,
          );
        }
      } catch (e) {
        log.error(e);
        log.error({ event }, "failed to parse signer event args");
      }
    }
  }

  /** Connect to OP RPC and sync events. Returns the highest block that was synced */
  private async connectAndSyncHistoricalEvents(): HubAsyncResult<number> {
    // Find how how much we need to sync
    let lastSyncedBlock = this._firstBlock;

    const hubState = await this._hub.getHubState();
    if (hubState.isOk() && hubState.value.lastL2Block) {
      // Look back 2 blocks just in case hub was shut down before it received enough confirmations to persist the cached events
      lastSyncedBlock = hubState.value.lastL2Block - L2EventsProvider.numConfirmations;
    }

    if (this._resyncEvents) {
      log.info(`Resyncing events from ${this._firstBlock} instead of ${lastSyncedBlock}`);
      lastSyncedBlock = this._firstBlock;
    }

    log.info({ lastSyncedBlock }, "last synced block");
    let latestBlock = lastSyncedBlock;
    if (this._stopBlock) {
      latestBlock = this._stopBlock;
    } else {
      const latestBlockResult = await ResultAsync.fromPromise(getBlockNumber(this._publicClient), (err) => err);
      if (latestBlockResult.isErr()) {
        diagnosticReporter().reportError(latestBlockResult.error as Error);
        const msg = "failed to connect to optimism node. Check your eth RPC URL (e.g. --l2-rpc-url)";
        log.error({ err: latestBlockResult.error }, msg);
        return err(new HubError("unavailable.network_failure", msg));
      }
      latestBlock = Number(latestBlockResult.value);

      if (!latestBlock) {
        const msg = "failed to get the latest block from the RPC provider";
        log.error(msg);
        return err(new HubError("unavailable.network_failure", msg));
      }

      log.info({ latestBlock: latestBlock }, "connected to optimism node");
    }

    const toBlock = latestBlock;

    if (lastSyncedBlock < toBlock) {
      log.info({ fromBlock: lastSyncedBlock, toBlock }, "syncing events from missed blocks");

      // Check if filters are supported, reduce batch size if necessary
      await this.detectFilterSupport();
      const chunkSize = this._useFilters ? this._chunkSize : 250;

      // Sync old Rent events
      const syncResult = await ResultAsync.fromPromise(
        this.syncHistoricalEvents(lastSyncedBlock, toBlock, chunkSize),
        (e) => {
          return {
            message: `failed to sync historical events from ${lastSyncedBlock} to ${toBlock}`,
            cause: new Error(JSON.stringify(e)),
          };
        },
      );
      if (syncResult.isErr()) {
        return err(new HubError("unavailable.network_failure", syncResult.error));
      }
    }

    this._isHistoricalSyncDone = true;
    return ok(latestBlock);
  }

  /**
   * Retry events from a specific block number
   *
   * @param blockNumber
   */
  public async retryEventsFromBlock(blockNumber: number) {
    if (this._retryDedupMap.has(blockNumber)) {
      return;
    }
    this._retryDedupMap.set(blockNumber, true);

    // Sync old events
    try {
      await this.syncHistoricalEvents(blockNumber, blockNumber + 1, 1);
    } catch (e) {
      log.error(e, `Error retrying events from block ${blockNumber}`);
    }
  }

  private getEventSpecificArgs(fid: number) {
    return {
      StorageRegistry: [{ eventName: "Rent", fid }],
      IdRegistry: [
        { eventName: "Register", fid },
        { eventName: "Transfer", fid },
      ],
      KeyRegistry: [
        { eventName: "Add", fid },
        { eventName: "Remove", fid },
      ],
    };
  }

  public async retryEventsForFid(fid: number) {
    if (this._fidRetryDedupMap.has(fid)) {
      return;
    }

    this._fidRetryDedupMap.set(fid, true);

    log.info(
      { fid, startBlock: this._firstBlock, stopBlock: this._lastBlockNumber, chunkSize: this._chunkSize },
      `Attempting to retryEventsForFid ${fid}`,
    );
    statsd().increment("l2events.retriesByFid.attempts", 1, { fid: fid.toString() });

    // Let's not remove. No need to retry same fid many times. If we allow retrying multiple times, we need to rate limit. The map will get cleared periodically to prevent memory bloat.
    try {
      // The viem API requires an event kind if you want to provide filters by indexed arguments-- this is why we're making multiple calls to syncHistoricalEvents and prioritizing the most common event types.
      const eventSpecificArgs = this.getEventSpecificArgs(fid);

      // The batch sizes are artificially large-- this batch size is internally enforced and we essentially want to eliminate batches given that we don't expect a lot of results from these queries.
      await this.syncHistoricalEvents(
        this._firstBlock,
        this._lastBlockNumber,
        this._lastBlockNumber,
        eventSpecificArgs,
      );

      log.info({ fid }, `Finished retryEventsForFid ${fid}`);
      statsd().increment("l2events.retriesByFid.successes", 1, { fid: fid.toString() });
    } catch (e) {
      log.error(e, `Error in retryEventsForFid ${fid}`);
      statsd().increment("l2events.retriesByFid.errors", 1, { fid: fid.toString() });
    }
  }

  private setAddresses(
    storageRegistryAddress: `0x${string}`,
    keyRegistryV2Address: `0x${string}`,
    idRegistryV2Address: `0x${string}`,
  ) {
    this.storageRegistryAddress = storageRegistryAddress;
    this.idRegistryV2Address = idRegistryV2Address;
    this.keyRegistryV2Address = keyRegistryV2Address;

    this._watchStorageContractEvents = new WatchContractEvent<
      chain,
      typeof StorageRegistry.abi,
      ContractEventName<typeof StorageRegistry.abi>,
      true,
      transport
    >(
      this._publicClient,
      {
        address: storageRegistryAddress,
        abi: StorageRegistry.abi,
        onLogs: this.processStorageEvents.bind(this),
        pollingInterval: L2EventsProvider.eventPollingInterval,
        strict: true,
      },
      "StorageRegistry",
    );

    this._watchKeyRegistryV2ContractEvents = new WatchContractEvent<
      chain,
      typeof KeyRegistry.abi,
      ContractEventName<typeof KeyRegistry.abi>,
      true,
      transport
    >(
      this._publicClient,
      {
        address: keyRegistryV2Address,
        abi: KeyRegistry.abi,
        onLogs: this.processKeyRegistryEventsV2.bind(this),
        pollingInterval: L2EventsProvider.eventPollingInterval,
        strict: true,
      },
      "KeyRegistryV2",
    );

    this._watchIdRegistryV2ContractEvents = new WatchContractEvent<
      chain,
      typeof IdRegistry.abi,
      ContractEventName<typeof IdRegistry.abi>,
      true,
      transport
    >(
      this._publicClient,
      {
        address: idRegistryV2Address,
        abi: IdRegistry.abi,
        onLogs: this.processIdRegistryV2Events.bind(this),
        pollingInterval: L2EventsProvider.eventPollingInterval,
        strict: true,
      },
      "IdRegistryV2",
    );

    this._watchBlockNumber = new WatchBlockNumber(this._publicClient, {
      pollingInterval: L2EventsProvider.blockPollingInterval,
      onBlockNumber: (blockNumber) => this.handleNewBlock(Number(blockNumber)),
      onError: (error) => {
        diagnosticReporter().reportError(error);
        log.error(`Error watching new block numbers: ${error}`, { error });
      },
    });
    log.info(
      `StorageRegistry: ${storageRegistryAddress}, KeyRegistry: ${keyRegistryV2Address}, IdRegistry: ${idRegistryV2Address}`,
    );
  }

  getCommonFilterArgs(fromBlock?: number, toBlock?: number, eventSpecificArgs?: EventSpecificArgs) {
    let fromBlockBigInt;
    if (fromBlock !== undefined) {
      fromBlockBigInt = BigInt(fromBlock);
    }

    let toBlockBigInt;
    if (toBlock !== undefined) {
      toBlockBigInt = BigInt(toBlock);
    }

    return {
      fromBlock: fromBlockBigInt,
      toBlock: toBlockBigInt,
      eventName: eventSpecificArgs?.eventName,
      strict: true,
    };
  }

  getEventSpecificFid(eventSpecificArgs?: EventSpecificArgs) {
    if (eventSpecificArgs !== undefined) {
      return BigInt(eventSpecificArgs.fid);
    }

    return undefined;
  }

  async getStorageEvents(fromBlock?: number, toBlock?: number, eventSpecificArgs?: EventSpecificArgs) {
    const realParams = {
      ...this.getCommonFilterArgs(fromBlock, toBlock, eventSpecificArgs),
      address: this.storageRegistryAddress,
      abi: StorageRegistry.abi,
      args: { fid: this.getEventSpecificFid(eventSpecificArgs) },
    };

    const storageLogsPromise = this.getContractEvents(realParams);
    await this.processStorageEvents(
      (await storageLogsPromise) as WatchContractEventOnLogsParameter<typeof StorageRegistry.abi>,
    );
  }

  async getIdRegistryEvents(fromBlock?: number, toBlock?: number, eventSpecificArgs?: EventSpecificArgs) {
    const idV2LogsPromise = this.getContractEvents({
      ...this.getCommonFilterArgs(fromBlock, toBlock, eventSpecificArgs),
      address: this.idRegistryV2Address,
      abi: IdRegistry.abi,
      args: {
        id: this.getEventSpecificFid(eventSpecificArgs) /* The fid parameter is named "id" in the IdRegistry events */,
      },
    });

    await this.processIdRegistryV2Events(
      (await idV2LogsPromise) as WatchContractEventOnLogsParameter<typeof IdRegistry.abi>,
    );
  }

  async getKeyRegistryEvents(fromBlock?: number, toBlock?: number, eventSpecificArgs?: EventSpecificArgs) {
    const keyV2LogsPromise = this.getContractEvents({
      ...this.getCommonFilterArgs(fromBlock, toBlock, eventSpecificArgs),
      address: this.keyRegistryV2Address,
      abi: KeyRegistry.abi,
      args: { fid: this.getEventSpecificFid(eventSpecificArgs) },
    });

    await this.processKeyRegistryEventsV2(
      (await keyV2LogsPromise) as WatchContractEventOnLogsParameter<typeof KeyRegistry.abi>,
    );
  }

  /**
   * Sync old Storage events that may have happened before hub was started. We'll put them all
   * in the sync queue to be processed later, to make sure we don't process any unconfirmed events.
   */
  private async syncHistoricalEvents(
    fromBlock: number,
    toBlock: number,
    batchSize: number, // This batch size is enforced by us internally, not by the RPC provider
    byEventKind?: {
      StorageRegistry: EventSpecificArgs[];
      IdRegistry: EventSpecificArgs[];
      KeyRegistry: EventSpecificArgs[];
    },
  ) {
    if (!this.idRegistryV2Address || !this.keyRegistryV2Address || !this.storageRegistryAddress) {
      return;
    }
    /*
     * Querying Blocks in Batches
     *
     * 1. Calculate the difference between the first and last sync blocks (e.g. )
     * 2. Divide by batch size and round up to get runs, and iterate with for-loop
     * 3. Compute the fromBlock in each run as firstBlock + (loopIndex * batchSize)
     * 4. Compute the toBlock in each run as fromBlock + batchSize
     * 5. In every run after the first one, increment fromBlock by 1 to avoid duplication

     * To sync blocks from 7,648,795 to 8,418,326, the diff is 769,531
     * The run size for a 10k batch would be =  76.9531 ~= 77 runs
     * For the 1st run, fromBlock = 7,648,795 + (0 * 10,000) =  7,648,795
     * For the 1st run, toBlock = 7,648,795 + 10,000 =  7,658,795
     * For the 2nd run, fromBlock = 7,648,795 + (1 * 10,000) + 1 =  7,658,796
     * For the 2nd run, toBlock = 7,658,796 + 10,000 =  7,668,796
     */

    // Calculate the amount of runs required based on batchSize, and round up to capture all blocks
    const totalBlocks = toBlock - fromBlock;
    const numOfRuns = Math.ceil(totalBlocks / batchSize);

    let progressBar;
    if (totalBlocks > 100) {
      progressBar = addProgressBar("Syncing Farcaster L2 Contracts", totalBlocks);
    }

    for (let i = 0; i < numOfRuns; i++) {
      this._blockTimestampsCache.clear(); // Clear the cache for each block to avoid unbounded growth
      let nextFromBlock = fromBlock + i * batchSize;
      let nextToBlock = nextFromBlock + batchSize;
      if (nextToBlock > toBlock) {
        nextToBlock = toBlock;
      }

      if (i > 0) {
        // If this isn't our first loop, we need to up the fromBlock by 1, or else we will be re-caching an already cached block.
        nextFromBlock += 1;
      }

      log.debug(
        { fromBlock: nextFromBlock, toBlock: nextToBlock },
        `syncing events (${formatPercentage((nextFromBlock - fromBlock) / totalBlocks)})`,
      );
      progressBar?.update(Math.max(nextFromBlock - fromBlock - 1, 0));

      if (byEventKind) {
        // If there are event-specific filters, we don't count the blocks here. The filters mean we don't necessarily consume all the blocks in the provided range. Instead, look at "l2events.events_processed" for an accurate metric.
        for (const storageEventSpecific of byEventKind.StorageRegistry) {
          await this.getStorageEvents(nextFromBlock, nextToBlock, storageEventSpecific);
        }

        for (const idRegistryEventSpecific of byEventKind.IdRegistry) {
          await this.getIdRegistryEvents(nextFromBlock, nextToBlock, idRegistryEventSpecific);
        }

        for (const keyRegistryEventSpecific of byEventKind.KeyRegistry) {
          await this.getKeyRegistryEvents(nextFromBlock, nextToBlock, keyRegistryEventSpecific);
        }
      } else {
        statsd().increment("l2events.blocks", Math.min(toBlock, nextToBlock - nextFromBlock));
        await this.getStorageEvents(nextFromBlock, nextToBlock);
        await this.getIdRegistryEvents(nextFromBlock, nextToBlock);
        await this.getKeyRegistryEvents(nextFromBlock, nextToBlock);
      }

      // Write out all the cached blocks first
      await this.writeCachedBlocks(toBlock);
    }

    progressBar?.update(totalBlocks);
    progressBar?.stop();
  }

  private async withRetry<T>(operation: () => Promise<T>, attempts = 3, delay = 500): Promise<T> {
    try {
      return await operation();
    } catch (err) {
      if (attempts === 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.withRetry(operation, attempts - 1, delay * 2);
    }
  }
  /** Wrapper around Viem client getFilterLogs/getContractEvents. Uses filters
   *  when supported, otherwise falls back to getContractEvents.
   */
  private async getContractEvents(params: GetContractEventsParameters | CreateContractEventFilterParameters) {
    return this.withRetry(
      async () => {
        if (this._useFilters) {
          const filter = await createContractEventFilter(this._publicClient, params);
          return getFilterLogs(this._publicClient, { filter });
        } else {
          return getContractEvents(this._publicClient, params);
        }
      },
      3, // attempts
      500, // initial delay in ms
    ).catch((err) => {
      diagnosticReporter().reportError(err);
      log.error({ err, params }, "failed to get contract events");
      return [];
    });
  }

  /** Detect whether the configured RPC provider supports filters */
  private async detectFilterSupport() {
    // Set up a client with fewer retries and shorter timeout
    const urls: string[] = [];

    (this._publicClient as PublicClient<FallbackTransport<HttpTransport[]>, chain>).transport["transports"].forEach(
      (transport) => {
        if (transport?.value?.["url"]) {
          urls.push(transport.value["url"]);
        }
      },
    );

    const transports = urls.map((url) => http(url, { retryCount: 1, timeout: 1000 }));
    const testClient = createPublicClient({
      chain: optimismGoerli,
      transport: fallback(transports),
    });

    // Handling: intentionally catch to test for filter support
    try {
      await createEventFilter(testClient, {
        fromBlock: BigInt(1),
        toBlock: BigInt(1),
      });
      this._useFilters = true;
      log.info("RPC provider supports filters. Using eth_getFilterLogs");
    } catch (err) {
      this._useFilters = false;
      log.info("RPC provider does not support filters. Falling back to eth_getLogs");
    }
  }

  private async writeCachedBlocks(latestBlockNumber: number) {
    // Get all blocks that have been confirmed into a single array and sort.
    const cachedBlocksSet = new Set([...this._onChainEventsByBlock.keys()]);
    const cachedBlocks = Array.from(cachedBlocksSet);
    cachedBlocks.sort();

    let highestBlockWritten = 0;
    for (const cachedBlock of cachedBlocks) {
      if (cachedBlock + L2EventsProvider.numConfirmations <= latestBlockNumber) {
        const onChainEvents = this._onChainEventsByBlock.get(cachedBlock);
        this._onChainEventsByBlock.delete(cachedBlock);
        highestBlockWritten = cachedBlock;

        if (onChainEvents) {
          for (const onChainEvent of onChainEvents.sort(onChainEventSorter)) {
            await this._hub.submitOnChainEvent(onChainEvent, "l2-provider");
          }
        }

        this._retryDedupMap.delete(cachedBlock);
      }
    }

    // Write to hub state if we have written a new block
    if (highestBlockWritten > 0) {
      const hubState = await this._hub.getHubState();
      if (hubState.isOk()) {
        if (highestBlockWritten > hubState.value.lastL2Block) {
          hubState.value.lastL2Block = highestBlockWritten;
          await this._hub.putHubState(hubState.value);
        }
      } else {
        diagnosticReporter().reportError(hubState.error);
        log.error({ errCode: hubState.error.errCode }, `failed to get hub state: ${hubState.error.message}`);
      }
    }
  }

  /** Handle a new block. Processes all events in the cache that have now been confirmed */
  private async handleNewBlock(blockNumber: number) {
    // Don't let multiple blocks be handled at once
    while (this._isHandlingBlock) {
      log.info({ blockNumber }, "waiting for previous block to be handled");
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this._isHandlingBlock = true;
    log.info({ blockNumber }, `new block: ${blockNumber}`);
    statsd().increment("l2events.blocks");

    await this.writeCachedBlocks(blockNumber);

    this._blockTimestampsCache.clear(); // Clear the cache periodically to avoid unbounded growth
    this._isHandlingBlock = false;
    this._lastBlockNumber = blockNumber;
  }

  private async cacheOnChainEvent(
    type: OnChainEventType,
    fid: bigint,
    blockNumBigInt: bigint,
    blockHash: string,
    transactionHash: string,
    txIndex: number,
    logIndex: number,
    version: number,
    signerEventBody?: SignerEventBody,
    signerMigratedEventBody?: SignerMigratedEventBody,
    idRegisterEventBody?: IdRegisterEventBody,
    storageRentEventBody?: StorageRentEventBody,
  ): HubAsyncResult<void> {
    const blockNumber = Number(blockNumBigInt);
    const logEvent = log.child({ event: { type, blockNumber } });
    const serialized = Result.combine([hexStringToBytes(blockHash), hexStringToBytes(transactionHash)]);

    statsd().gauge("contracts.block_number", blockNumber);

    if (serialized.isErr()) {
      logEvent.error({ errCode: serialized.error.errCode }, `cacheOnChainEvent error: ${serialized.error.message}`);
      return err(serialized.error);
    }

    const [blockHashBytes, transactionHashBytes] = serialized.value;
    const timestamp = await this._getBlockTimestamp(blockHash);

    const onChainEvent = OnChainEvent.create({
      type,
      chainId: this._chainId,
      fid: Number(fid),
      blockNumber: Number(blockNumber),
      blockHash: blockHashBytes,
      blockTimestamp: timestamp,
      transactionHash: transactionHashBytes,
      txIndex: txIndex,
      logIndex: logIndex,
      version: version,
      signerEventBody: signerEventBody,
      signerMigratedEventBody: signerMigratedEventBody,
      idRegisterEventBody: idRegisterEventBody,
      storageRentEventBody: storageRentEventBody,
    });

    // Add it to the cache
    let onChainEvents = this._onChainEventsByBlock.get(blockNumber);
    if (!onChainEvents) {
      onChainEvents = [];
      this._onChainEventsByBlock.set(blockNumber, onChainEvents);
    }
    onChainEvents.push(onChainEvent);

    logEvent.info(
      `cacheOnChainEvent: recorded ${onChainEventTypeToJSON(type)} for fid: ${fid} in block ${blockNumber}`,
    );

    return ok(undefined);
  }

  private async _getBlockTimestamp(blockHash: string): Promise<number> {
    const cachedTimestamp = this._blockTimestampsCache.get(blockHash);
    if (cachedTimestamp) {
      return cachedTimestamp;
    }
    const block = await getBlock(this._publicClient, {
      blockHash: blockHash as `0x${string}`,
    });
    const timestamp = Number(block.timestamp);
    this._blockTimestampsCache.set(blockHash, timestamp);
    return timestamp;
  }
}
