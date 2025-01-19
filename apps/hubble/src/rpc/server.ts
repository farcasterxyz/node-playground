import {
  CastAddMessage,
  CastId,
  CastRemoveMessage,
  ContactInfoResponse,
  DbStats,
  FidsResponse,
  getServer,
  HubError,
  HubEvent,
  HubEventType,
  HubInfoResponse,
  HubServiceServer,
  HubServiceService,
  LinkAddMessage,
  LinkCompactStateMessage,
  LinkRemoveMessage,
  Message,
  MessagesResponse,
  Metadata,
  ReactionAddMessage,
  ReactionRemoveMessage,
  Server as GrpcServer,
  ServerCredentials,
  ServiceError,
  status,
  StorageLimitsResponse,
  SyncIds,
  SyncStatus,
  SyncStatusResponse,
  TrieNodeMetadataResponse,
  TrieNodeSnapshotResponse,
  UserDataAddMessage,
  VerificationAddAddressMessage,
  VerificationRemoveMessage,
  ValidationResponse,
  UserNameProof,
  UsernameProofsResponse,
  OnChainEventResponse,
  SignerOnChainEvent,
  OnChainEvent,
  HubResult,
  HubAsyncResult,
  ServerWritableStream,
  SubscribeRequest,
  StreamSyncRequest,
  StreamSyncResponse,
  HubInfoRequest,
  Empty,
  SyncStatusRequest,
  TrieNodePrefix,
  StreamFetchRequest,
  StreamFetchResponse,
  StreamError,
  OnChainEventRequest,
  FidRequest,
  getFarcasterTime,
  MessageBundle,
  SubmitBulkMessagesResponse,
  BulkMessageResponse,
  MessageError,
} from "@farcaster/hub-nodejs";
import { err, ok, Result, ResultAsync } from "neverthrow";
import { APP_NICKNAME, APP_VERSION, HubInterface } from "../hubble.js";
import { GossipNode } from "../network/p2p/gossipNode.js";
import { NodeMetadata } from "../network/sync/merkleTrie.js";
import SyncEngine from "../network/sync/syncEngine.js";
import Engine from "../storage/engine/index.js";
import { MessagesPage } from "../storage/stores/types.js";
import { logger } from "../utils/logger.js";
import { addressInfoFromParts, extractIPAddress, getPublicIp } from "../utils/p2p.js";
import { RateLimiterMemory } from "rate-limiter-flexible";
import {
  BufferedStreamWriter,
  STREAM_MESSAGE_BUFFER_SIZE,
  SLOW_CLIENT_GRACE_PERIOD_MS,
} from "./bufferedStreamWriter.js";
import { blake3Truncate160, sleep } from "../utils/crypto.js";
import { jumpConsistentHash } from "../utils/jumpConsistentHash.js";
import { SUBMIT_MESSAGE_RATE_LIMIT, rateLimitByIp } from "../utils/rateLimits.js";
import { statsd } from "../utils/statsd.js";
import { SyncId } from "../network/sync/syncId.js";
import { AddressInfo } from "net";
import * as net from "node:net";
import axios from "axios";
import { fidFromEvent } from "../storage/stores/storeEventHandler.js";
import { rustErrorToHubError } from "../rustfunctions.js";
import { handleUnaryCall, sendUnaryData, ServerDuplexStream, ServerUnaryCall } from "@grpc/grpc-js";
import { MAX_BUNDLE_SIZE } from "../network/p2p/bundleCreator.js";

const HUBEVENTS_READER_TIMEOUT = 1 * 60 * 60 * 1000; // 1 hour
const STREAM_METHODS_TIMEOUT = 8 * 1000; // 2 seconds

export const DEFAULT_SUBSCRIBE_PERIP_LIMIT = 4; // Max 4 subscriptions per IP
export const DEFAULT_SUBSCRIBE_GLOBAL_LIMIT = 4096; // Max 4096 subscriptions globally
const MAX_EVENT_STREAM_SHARDS = 10;
export const DEFAULT_SERVER_INTERNET_ADDRESS_IPV4 = "0.0.0.0";
export const MAX_VALUES_RETURNED_PER_SYNC_ID_REQUEST = 1024; // getAllSyncIdsByPrefix returns a max of 1024 sync ids in one response. This value is mirrored in [addon/src/trie/trie_node.rs], make sure to change it in both places.

export type RpcUsers = Map<string, string[]>;

const log = logger.child({ component: "gRPCServer" });

// Check if the user is authenticated via the metadata
export const authenticateUser = (metadata: Metadata, rpcUsers: RpcUsers): HubResult<boolean> => {
  // If there is no auth user/pass, we don't need to authenticate
  if (rpcUsers.size === 0) {
    return ok(true);
  }

  if (metadata.get("authorization")) {
    const authHeader = metadata.get("authorization")[0] as string;
    if (!authHeader) {
      return err(new HubError("unauthenticated", "Authorization header is empty"));
    }

    const encodedCredentials = authHeader.replace("Basic ", "");
    const decodedCredentials = Buffer.from(encodedCredentials, "base64").toString("utf-8");
    const [username, password] = decodedCredentials.split(":");
    if (!username || !password) {
      return err(new HubError("unauthenticated", `Invalid username: ${username}`));
    }

    // See if username and password match one of rpcUsers
    const allowedPasswords = rpcUsers.get(username);
    if (!allowedPasswords) {
      return err(new HubError("unauthenticated", `Invalid username: ${username}`));
    }

    if (!allowedPasswords.includes(password)) {
      return err(new HubError("unauthenticated", `Invalid password for user: ${username}`));
    }

    return ok(true);
  }
  return err(new HubError("unauthenticated", "No authorization header"));
};

async function retryAsyncOperation<T>(
  operation: () => HubAsyncResult<T>,
  retries = 3,
  delayMs = 1000,
): HubAsyncResult<T> {
  const attempt = async (remainingRetries: number, delayMs: number): HubAsyncResult<T> => {
    const result = await operation();
    if (result.isErr()) {
      if (remainingRetries > 0) {
        await sleep(delayMs);
        return attempt(remainingRetries - 1, delayMs * 2);
      }

      return err(result.error);
    }

    return ok(result.value);
  };
  return attempt(retries, delayMs);
}

export async function checkPort(ip: string, port: number): HubAsyncResult<void> {
  if (ip === "") {
    return err(new HubError("bad_request.invalid_param", "Invalid ip address"));
  }

  if (port === 0) {
    return err(new HubError("bad_request.invalid_param", "Invalid port"));
  }

  return ResultAsync.fromPromise(
    new Promise<void>((resolve, reject) => {
      const socket = new net.Socket();
      const socketTimeoutMs = 2000; // 2 seconds

      socket.setTimeout(socketTimeoutMs);
      socket
        .once("connect", () => {
          socket.destroy();
          resolve();
        })
        .once("error", (err) => {
          socket.destroy();
          reject(err);
        })
        .once("timeout", () => {
          socket.destroy();
          reject(new HubError("unavailable.network_failure", `Timeout connecting to ${ip}:${port}`));
        })
        .connect(port, ip);
    }),
    (error) => {
      return new HubError("unavailable.network_failure", `Failed to connect to ${ip}:${port}: ${error}`);
    },
  ).match(
    async (okResult: void): HubAsyncResult<void> => ok(okResult),
    async (errorResult: HubError): HubAsyncResult<void> => err(errorResult),
  );
}

export const checkPortAndPublicAddress = async (
  localIP: string,
  port: number,
  remoteIP?: string,
): HubAsyncResult<void> => {
  const retryCount = 3;
  const localDelayMs = 50;
  const localResult: Result<void, Error> = await retryAsyncOperation<void>(
    () => checkPort(localIP, port),
    retryCount,
    localDelayMs, // local ping does not need high timeout
  );

  if (localResult.isErr()) {
    return err(
      new HubError("unavailable.network_failure", `Failed to connect to ${localIP}:${port}: ${localResult.error}`),
    );
  }

  let publicIP: string = remoteIP ?? "";
  if (publicIP === "") {
    const publicIPResponse = await getPublicIp("json");
    if (publicIPResponse.isErr()) {
      return err(publicIPResponse.error);
    }
    publicIP = publicIPResponse.value;
  }

  return await retryAsyncOperation<void>(() => checkPort(publicIP, port), retryCount);
};

export const toServiceError = (err: HubError): ServiceError => {
  // hack: After rust migration, requests that propagate to RocksDB may yield string errors that don't have an errCode.
  //      Since the rustErrorToHubError function is not called in these cases, we attempt conversion here.
  const hubErr: HubError = err.errCode ? err : rustErrorToHubError(err);

  let grpcCode: number;
  if (err.errCode === "unauthenticated") {
    grpcCode = status.UNAUTHENTICATED;
  } else if (err.errCode === "unauthorized") {
    grpcCode = status.PERMISSION_DENIED;
  } else if (
    err.errCode === "bad_request" ||
    err.errCode === "bad_request.parse_failure" ||
    err.errCode === "bad_request.validation_failure" ||
    err.errCode === "bad_request.invalid_param" ||
    err.errCode === "bad_request.conflict" ||
    err.errCode === "bad_request.duplicate" ||
    err.errCode === "bad_request.prunable"
  ) {
    grpcCode = status.INVALID_ARGUMENT;
  } else if (err.errCode === "not_found") {
    grpcCode = status.NOT_FOUND;
  } else if (
    err.errCode === "unavailable" ||
    err.errCode === "unavailable.network_failure" ||
    err.errCode === "unavailable.storage_failure"
  ) {
    grpcCode = status.UNAVAILABLE;
  } else {
    grpcCode = status.UNKNOWN;
  }
  const metadata = new Metadata();
  metadata.set("errCode", hubErr.errCode);
  return Object.assign(hubErr, {
    code: grpcCode,
    details: hubErr.message,
    metadata,
  });
};

const messagesPageToResponse = ({ messages, nextPageToken }: MessagesPage<Message>) => {
  return MessagesResponse.create({
    messages,
    nextPageToken: nextPageToken ?? new Uint8Array(),
  });
};

export const getRPCUsersFromAuthString = (rpcAuth?: string): Map<string, string[]> => {
  if (!rpcAuth) {
    return new Map();
  }

  // Split up the auth string by commas
  const rpcAuthUsers = rpcAuth?.split(",") ?? [];

  // Create a map of username to all the passwords for that user
  const rpcUsers = new Map();
  rpcAuthUsers.forEach((rpcAuthUser) => {
    const [username, password] = rpcAuthUser.split(":");
    if (username && password) {
      const passwords = rpcUsers.get(username) ?? [];
      passwords.push(password);
      rpcUsers.set(username, passwords);
    }
  });

  return rpcUsers;
};

/**
 * Limit the number of simultaneous connections to the RPC server by
 * a single IP address.
 */
class IpConnectionLimiter {
  private perIpLimit: number;
  private globalLimit: number;

  private ipConnections: Map<string, number>;
  private totalConnections: number;

  constructor(perIpLimit: number, globalLimit: number) {
    this.ipConnections = new Map();

    this.perIpLimit = perIpLimit;
    this.globalLimit = globalLimit;
    this.totalConnections = 0;
  }

  public addConnection(peerString: string): Result<boolean, Error> {
    // Get the IP part of the address
    const ip = extractIPAddress(peerString) ?? "unknown";

    const connections = this.ipConnections.get(ip) ?? 0;
    if (ip !== "127.0.0.1" && ip !== "::1" && connections >= this.perIpLimit) {
      return err(new Error(`Too many connections from this IP: ${ip}`));
    }

    if (this.totalConnections >= this.globalLimit) {
      return err(new Error("Too many connections to this server"));
    }

    this.ipConnections.set(ip, connections + 1);
    this.totalConnections += 1;
    return ok(true);
  }

  public removeConnection(peerString: string) {
    // Get the IP part of the address
    const ip = extractIPAddress(peerString) ?? "unknown";

    const connections = this.ipConnections.get(ip) ?? 0;
    if (connections > 0) {
      this.ipConnections.set(ip, connections - 1);
      this.totalConnections -= 1;
    }
  }

  clear() {
    this.ipConnections.clear();
    this.totalConnections = 0;
  }
}

export function destroyStream<T, R>(stream: ServerWritableStream<T, R> | ServerDuplexStream<T, R>, error: Error) {
  stream.emit("error", error);
  stream.end();
}

export const toTrieNodeMetadataResponse = (metadata?: NodeMetadata): TrieNodeMetadataResponse => {
  const childrenTrie = [];

  if (!metadata) {
    return TrieNodeMetadataResponse.create({});
  }

  if (metadata.children) {
    for (const [, child] of metadata.children) {
      childrenTrie.push(
        TrieNodeMetadataResponse.create({
          prefix: child.prefix,
          numMessages: child.numMessages,
          hash: child.hash,
          children: [],
        }),
      );
    }
  }

  const metadataResponse = TrieNodeMetadataResponse.create({
    prefix: metadata.prefix,
    numMessages: metadata.numMessages,
    hash: metadata.hash,
    children: childrenTrie,
  });

  return metadataResponse;
};
export default class Server {
  private hub: HubInterface | undefined;
  private engine: Engine | undefined;
  private syncEngine: SyncEngine | undefined;
  private gossipNode: GossipNode | undefined;

  private grpcServer: GrpcServer;
  private listenIp: string;
  private port: number;

  private impl: HubServiceServer;

  private incomingConnections = 0;

  private rpcUsers: RpcUsers;
  private submitMessageRateLimiter: RateLimiterMemory;
  private subscribeIpLimiter: IpConnectionLimiter;

  constructor(
    hub?: HubInterface,
    engine?: Engine,
    syncEngine?: SyncEngine,
    gossipNode?: GossipNode,
    rpcAuth?: string,
    rpcRateLimit?: number,
    rpcSubscribePerIpLimit?: number,
  ) {
    this.hub = hub;
    this.engine = engine;
    this.syncEngine = syncEngine;
    this.gossipNode = gossipNode;

    this.grpcServer = getServer();

    this.listenIp = "";
    this.port = 0;

    this.rpcUsers = getRPCUsersFromAuthString(rpcAuth);

    if (this.rpcUsers.size > 0) {
      log.info({ num_users: this.rpcUsers.size }, "RPC auth enabled");
    }

    this.impl = this.makeImpl();
    this.grpcServer.addService(HubServiceService, this.impl);

    // Submit message are rate limited by default to 20k per minute
    const rateLimitPerMinute = SUBMIT_MESSAGE_RATE_LIMIT;
    if (rpcRateLimit !== undefined && rpcRateLimit >= 0) {
      rateLimitPerMinute.points = rpcRateLimit;
    }
    log.info({ rpcRateLimit }, "RPC rate limit enabled");

    this.submitMessageRateLimiter = new RateLimiterMemory(rateLimitPerMinute);
    this.subscribeIpLimiter = new IpConnectionLimiter(
      rpcSubscribePerIpLimit ?? DEFAULT_SUBSCRIBE_PERIP_LIMIT,
      DEFAULT_SUBSCRIBE_GLOBAL_LIMIT,
    );
  }

  async start(ip = DEFAULT_SERVER_INTERNET_ADDRESS_IPV4, port = 0): Promise<number> {
    return new Promise((resolve, reject) => {
      this.grpcServer.bindAsync(`${ip}:${port}`, ServerCredentials.createInsecure(), (err, port) => {
        if (err) {
          logger.error({ component: "gRPC Server", err }, "Failed to start gRPC Server. Is the port already in use?");
          reject(err);
        } else {
          this.grpcServer.start();

          this.listenIp = ip;
          this.port = port;

          logger.info({ component: "gRPC Server", address: this.address }, "Starting gRPC Server");
          resolve(port);
        }
      });
    });
  }

  async stop(force = false): Promise<void> {
    return new Promise((resolve, reject) => {
      if (force) {
        this.grpcServer.forceShutdown();
        log.info("gRPC server force shutdown succeeded");
        resolve();
      } else {
        this.grpcServer.tryShutdown((err) => {
          if (err) {
            log.error(`gRPC server shutdown failed: ${err}`);
            reject(err);
          } else {
            log.info("gRPC server shutdown succeeded");
            resolve();
          }
        });
      }
    });
  }

  get address(): HubResult<AddressInfo> {
    const addr = addressInfoFromParts(this.listenIp, this.port);
    return addr;
  }

  get auth() {
    return this.rpcUsers;
  }

  get listenPort() {
    return this.port;
  }

  public hasInboundConnections() {
    return this.incomingConnections > 0;
  }

  public clearRateLimiters() {
    this.subscribeIpLimiter.clear();
  }

  public async getInfo(request: HubInfoRequest) {
    const info = HubInfoResponse.create({
      version: APP_VERSION,
      isSyncing: !!this.syncEngine?.isSyncing(),
      nickname: APP_NICKNAME,
      rootHash: (await this.syncEngine?.trie.rootHash()) ?? "",
      peerId: Result.fromThrowable(
        () => this.hub?.identity ?? "",
        (e) => e,
      )().unwrapOr(""),
      hubOperatorFid: this.hub?.hubOperatorFid ?? 0,
    });

    if (request.dbStats && this.syncEngine) {
      const stats = await this.syncEngine.getDbStats();
      info.dbStats = DbStats.create({
        approxSize: stats?.approxSize,
        numMessages: stats?.numItems,
        numFidEvents: stats?.numFids,
        numFnameEvents: stats?.numFnames,
      });
    }
    return info;
  }

  public getInfoRPC(call: ServerUnaryCall<HubInfoRequest, HubInfoResponse>, callback: sendUnaryData<HubInfoResponse>) {
    (async () => {
      const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
      log.debug({ method: "getInfo", req: call?.request || { dbStats: false } }, `RPC call from ${peer}`);
      statsd().increment("rpc.open_request_count", { method: "getInfo" });

      const info = await this.getInfo(call?.request || { dbStats: false });

      statsd().decrement("rpc.open_request_count", { method: "getInfo" });
      callback(null, info);
    })();
  }

  public async stopSync() {
    const result = await this.syncEngine?.stopSync();
    if (!result) {
      return err(new HubError("bad_request", "Stop sync timed out"));
    } else {
      return ok(
        SyncStatusResponse.create({
          isSyncing: this.syncEngine?.isSyncing() || false,
          engineStarted: this.syncEngine?.isStarted() || false,
          syncStatus: [],
        }),
      );
    }
  }

  public stopSyncRPC(call: ServerUnaryCall<Empty, SyncStatusResponse>, callback: sendUnaryData<SyncStatusResponse>) {
    (async () => {
      const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
      log.debug({ method: "stopSync", req: call.request }, `RPC call from ${peer}`);
      statsd().increment("rpc.open_request_count", { method: "stopSync" });

      const result = await this.stopSync();

      statsd().decrement("rpc.open_request_count", { method: "stopSync" });
      if (result.isErr()) {
        callback(toServiceError(result.error));
      } else {
        callback(null, result.value);
      }
    })();
  }

  public async forceSync(request: SyncStatusRequest) {
    const peerId = request.peerId;
    if (!peerId || peerId.length === 0) {
      return err(new HubError("bad_request", "peerId is required"));
    }
    const result = await this.syncEngine?.forceSyncWithPeer(peerId);
    if (!result || result.isErr()) {
      return err(result?.error || new HubError("bad_request", "sync engine not available"));
    } else {
      const status = result.value;
      const response = SyncStatusResponse.create({
        isSyncing: this.syncEngine?.isSyncing() || false,
        engineStarted: this.syncEngine?.isStarted() || false,
        syncStatus: [
          SyncStatus.create({
            peerId,
            inSync: status.inSync,
            shouldSync: status.shouldSync,
            lastBadSync: status.lastBadSync,
            ourMessages: status.ourSnapshot.numMessages,
            theirMessages: status.theirSnapshot.numMessages,
            score: status.score,
          }),
        ],
      });
      return ok(response);
    }
  }

  public forceSyncRPC(
    call: ServerUnaryCall<SyncStatusRequest, SyncStatusResponse>,
    callback: sendUnaryData<SyncStatusResponse>,
  ) {
    (async () => {
      const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
      log.debug({ method: "forceSync", req: call.request }, `RPC call from ${peer}`);
      statsd().increment("rpc.open_request_count", { method: "forceSync" });

      const result = await this.forceSync(call.request);

      statsd().decrement("rpc.open_request_count", { method: "forceSync" });
      if (result.isErr()) {
        callback(toServiceError(result.error));
      } else {
        callback(null, result.value);
      }
    })();
  }

  public getCurrentPeers() {
    const currentHubPeerContacts = this.syncEngine?.getCurrentHubPeerContacts();

    if (!currentHubPeerContacts) {
      return ContactInfoResponse.create({ contacts: [] });
    }

    const contactInfoArray = Array.from(currentHubPeerContacts).map((peerContact) => peerContact[1]);
    return ContactInfoResponse.create({ contacts: contactInfoArray });
  }

  public getCurrentPeersRPC(
    call: ServerUnaryCall<Empty, ContactInfoResponse>,
    callback: sendUnaryData<ContactInfoResponse>,
  ) {
    (async () => {
      const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
      log.debug({ method: "getCurrentPeers", req: call.request }, `RPC call from ${peer}`);
      statsd().increment("rpc.open_request_count", { method: "getCurrentPeers" });

      const result = this.getCurrentPeers();

      statsd().decrement("rpc.open_request_count", { method: "getCurrentPeers" });

      callback(null, result);
    })();
  }

  public async getSyncStatus(peerId: string | undefined) {
    if (!this.gossipNode || !this.syncEngine || !this.hub) {
      return err(new HubError("bad_request", "Hub isn't initialized"));
    }

    let peersToCheck: string[];
    if (peerId && peerId.length > 0) {
      peersToCheck = [peerId];
    } else {
      // If no peerId is specified, check upto 20 peers
      peersToCheck = (await this.gossipNode.allPeerIds()).slice(0, 20);
    }

    const response = SyncStatusResponse.create({
      isSyncing: false,
      syncStatus: [],
      engineStarted: this.syncEngine.isStarted(),
    });

    await Promise.all(
      peersToCheck.map(async (peerId) => {
        const statusResult = await this.syncEngine?.getSyncStatusForPeer(peerId, this.hub as HubInterface);
        if (statusResult?.isOk()) {
          const status = statusResult.value;
          response.isSyncing = status.isSyncing;
          response.syncStatus.push(
            SyncStatus.create({
              peerId,
              inSync: status.inSync,
              shouldSync: status.shouldSync,
              lastBadSync: status.lastBadSync,
              ourMessages: status.ourSnapshot.numMessages,
              theirMessages: status.theirSnapshot.numMessages,
              score: status.score,
            }),
          );
        }
      }),
    );

    return ok(response);
  }

  public getSyncStatusRPC(
    call: ServerUnaryCall<SyncStatusRequest, SyncStatusResponse>,
    callback: sendUnaryData<SyncStatusResponse>,
  ) {
    (async () => {
      const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
      log.debug({ method: "getSyncStatus", req: call.request }, `RPC call from ${peer}`);
      statsd().increment("rpc.open_request_count", { method: "getSyncStatus" });

      const peerId = call.request.peerId;
      const result = await this.getSyncStatus(peerId);

      statsd().decrement("rpc.open_request_count", { method: "getSyncStatus" });
      if (result.isErr()) {
        callback(toServiceError(result.error));
      } else {
        callback(null, result.value);
      }
    })();
  }

  public async getAllSyncIdsByPrefix(request: TrieNodePrefix) {
    const syncIdsResponse = await this.syncEngine?.getAllSyncIdsByPrefix(request.prefix);
    return ok(SyncIds.create({ syncIds: syncIdsResponse ?? [] }));
  }

  public getAllSyncIdsByPrefixRPC(call: ServerUnaryCall<TrieNodePrefix, SyncIds>, callback: sendUnaryData<SyncIds>) {
    const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
    log.debug({ method: "getAllSyncIdsByPrefix", req: call.request }, `RPC call from ${peer}`);
    statsd().increment("rpc.open_request_count", { method: "getAllSyncIdsByPrefix" });

    (async () => {
      const result = await this.getAllSyncIdsByPrefix(call.request);

      statsd().decrement("rpc.open_request_count", { method: "getAllSyncIdsByPrefix" });
      if (result.isErr()) {
        callback(toServiceError(result.error));
      } else {
        callback(null, result.value);
      }
    })();
  }

  public async getAllMessagesBySyncIds(request: SyncIds) {
    if (request.syncIds.length > MAX_VALUES_RETURNED_PER_SYNC_ID_REQUEST) {
      return err(new HubError("bad_request.validation_failure", "Too many sync ids provided"));
    }

    const syncIds = request.syncIds.map((syncId) => SyncId.fromBytes(syncId));
    const messagesResult = await this.syncEngine?.getAllMessagesBySyncIds(syncIds);
    if (messagesResult?.isErr()) {
      return err(messagesResult.error);
    } else if (messagesResult?.isOk()) {
      let messages = messagesResult.value;
      // Check the messages for corruption. If a message is blank, that means it was present
      // in our sync trie, but the DB couldn't find it. So remove it from the sync Trie.
      const corruptedSyncIds = this.syncEngine?.findCorruptedSyncIDs(messages, syncIds);

      if ((corruptedSyncIds?.length ?? 0) > 0) {
        log.warn(
          { num: corruptedSyncIds?.length },
          "Found corrupted messages while serving API, rebuilding some syncIDs",
        );

        // Don't wait for this to finish, just return the messages we have.
        this.syncEngine?.revokeSyncIds(corruptedSyncIds ?? []);

        messages = messages.filter((message) => message.data !== undefined && message.hash.length > 0);
      }

      const response = MessagesResponse.create({ messages });
      return ok(response);
    } else {
      return err(new HubError("unavailable", "no messages available"));
    }
  }

  public async getAllMessagesBySyncIdsRPC(
    call: ServerUnaryCall<SyncIds, MessagesResponse>,
    callback: sendUnaryData<MessagesResponse>,
  ) {
    const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
    log.debug({ method: "getAllMessagesBySyncIds", req: call.request }, `RPC call from ${peer}`);
    statsd().increment("rpc.open_request_count", { method: "getAllMessagesBySyncIds" });

    const result = await this.getAllMessagesBySyncIds(call.request);

    statsd().decrement("rpc.open_request_count", { method: "getAllMessagesBySyncIds" });
    if (result.isErr()) {
      callback(toServiceError(result.error));
    } else {
      callback(null, result.value);
    }
  }

  public async getSyncMetadataByPrefix(request: TrieNodePrefix) {
    const metadata = await this.syncEngine?.getTrieNodeMetadata(request.prefix);
    return ok(toTrieNodeMetadataResponse(metadata));
  }

  public getSyncMetadataByPrefixRPC(
    call: ServerUnaryCall<TrieNodePrefix, TrieNodeMetadataResponse>,
    callback: sendUnaryData<TrieNodeMetadataResponse>,
  ) {
    const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
    log.debug({ method: "getSyncMetadataByPrefix", req: call.request }, `RPC call from ${peer}`);
    statsd().increment("rpc.open_request_count", { method: "getSyncMetadataByPrefix" });

    (async () => {
      const result = await this.getSyncMetadataByPrefix(call.request);
      statsd().decrement("rpc.open_request_count", { method: "getSyncMetadataByPrefix" });

      if (result.isErr()) {
        callback(toServiceError(result.error));
      } else {
        callback(null, result.value);
      }
    })();
  }

  public async getSyncSnapshotByPrefix(request: TrieNodePrefix) {
    const rootHash = (await this.syncEngine?.trie.rootHash()) ?? "";
    const snapshot = await this.syncEngine?.getSnapshotByPrefix(request.prefix);
    if (snapshot?.isErr()) {
      return err(snapshot.error);
    } else if (snapshot?.isOk()) {
      const snapshotResponse = TrieNodeSnapshotResponse.create({
        prefix: snapshot.value.prefix,
        numMessages: snapshot.value.numMessages,
        rootHash,
        excludedHashes: snapshot.value.excludedHashes,
      });
      return ok(snapshotResponse);
    } else {
      return err(new HubError("unavailable", "no snapshot available"));
    }
  }

  public getSyncSnapshotByPrefixRPC(
    call: ServerUnaryCall<TrieNodePrefix, TrieNodeSnapshotResponse>,
    callback: sendUnaryData<TrieNodeSnapshotResponse>,
  ) {
    const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
    log.debug({ method: "getSyncSnapshotByPrefix", req: call.request }, `RPC call from ${peer}`);
    statsd().increment("rpc.open_request_count", { method: "getSyncSnapshotByPrefix" });

    // If someone is asking for our sync snapshot, that means we're getting incoming
    // connections
    this.incomingConnections += 1;
    statsd().increment("rpc.get_sync_snapshot");

    (async () => {
      const result = await this.getSyncSnapshotByPrefix(call.request);
      statsd().decrement("rpc.open_request_count", { method: "getSyncSnapshotByPrefix" });
      if (result.isErr()) {
        callback(toServiceError(result.error));
      } else {
        callback(null, result.value);
      }
    })();
  }

  public async getOnChainSignersByFid(request: FidRequest) {
    const { fid, pageSize, pageToken, reverse } = request;
    return (
      (await this.engine?.getOnChainSignersByFid(fid, {
        pageSize,
        pageToken,
        reverse,
      })) || err(new HubError("bad_request", "sync engine not available"))
    );
  }

  public async getOnChainSignersByFidRPC(
    call: ServerUnaryCall<FidRequest, OnChainEventResponse>,
    callback: sendUnaryData<OnChainEventResponse>,
  ) {
    const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
    log.debug({ method: "getOnChainSignersByFid", req: call.request }, `RPC call from ${peer}`);
    statsd().increment("rpc.open_request_count", { method: "getOnChainSignersByFid" });

    const signersResult = await this.getOnChainSignersByFid(call.request);

    statsd().decrement("rpc.open_request_count", { method: "getOnChainSignersByFid" });
    signersResult?.match(
      (page: OnChainEventResponse) => {
        callback(null, page);
      },
      (err: HubError) => {
        callback(toServiceError(err));
      },
    );
  }

  public async getOnChainEvents(request: OnChainEventRequest) {
    return (
      (await this.engine?.getOnChainEvents(request.eventType, request.fid)) ||
      err(new HubError("bad_request", "sync engine not available"))
    );
  }

  public getOnChainEventsRPC(
    call: ServerUnaryCall<OnChainEventRequest, OnChainEventResponse>,
    callback: sendUnaryData<OnChainEventResponse>,
  ) {
    const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
    log.debug({ method: "getOnChainEvents", req: call.request }, `RPC call from ${peer}`);
    statsd().increment("rpc.open_request_count", { method: "getOnChainEvents" });

    (async () => {
      const result = await this.getOnChainEvents(call.request);
      statsd().decrement("rpc.open_request_count", { method: "getOnChainEvents" });
      if (result.isErr()) {
        callback(toServiceError(result.error));
      } else {
        callback(null, result.value);
      }
    })();
  }

  getImpl(): HubServiceServer {
    return this.impl;
  }

  makeImpl(): HubServiceServer {
    return {
      getInfo: async (call, callback) => this.getInfoRPC(call, callback),
      getCurrentPeers: async (call, callback) => this.getCurrentPeersRPC(call, callback),
      stopSync: async (call, callback) => this.stopSyncRPC(call, callback),
      forceSync: async (call, callback) => this.forceSyncRPC(call, callback),
      getSyncStatus: async (call, callback) => this.getSyncStatusRPC(call, callback),
      getAllSyncIdsByPrefix: async (call, callback) => this.getAllSyncIdsByPrefixRPC(call, callback),
      getAllMessagesBySyncIds: async (call, callback) => this.getAllMessagesBySyncIdsRPC(call, callback),
      getSyncMetadataByPrefix: async (call, callback) => this.getSyncMetadataByPrefixRPC(call, callback),
      getSyncSnapshotByPrefix: async (call, callback) => this.getSyncSnapshotByPrefixRPC(call, callback),
      getOnChainSignersByFid: async (call, callback) => this.getOnChainSignersByFidRPC(call, callback),
      getOnChainEvents: async (call, callback) => this.getOnChainEventsRPC(call, callback),
      submitMessage: async (call, callback) => {
        // Identify peer that is calling, if available. This is used for rate limiting.
        // const peer = Result.fromThrowable(
        //   () => call.getPeer(),
        //   (e) => e,
        // )().unwrapOr("unavailable");
        statsd().increment("rpc.open_request_count", { method: "submitMessage" });

        // const rateLimitResult = await rateLimitByIp(peer, this.submitMessageRateLimiter);
        // if (rateLimitResult.isErr()) {
        //   logger.warn({ peer }, "submitMessage rate limited");
        //   callback(toServiceError(new HubError("unavailable", "API rate limit exceeded")));
        //   return;
        // }

        // Authentication
        const authResult = authenticateUser(call.metadata, this.rpcUsers);
        if (authResult.isErr()) {
          logger.warn({ errMsg: authResult.error.message }, "gRPC submitMessage failed");
          callback(
            toServiceError(new HubError("unauthenticated", `gRPC authentication failed: ${authResult.error.message}`)),
          );
          return;
        }

        const message = call.request;
        const result = await this.hub?.submitMessage(message, "rpc");

        statsd().decrement("rpc.open_request_count", { method: "submitMessage" });

        result?.match(
          () => {
            callback(null, message);
          },
          (err: HubError) => {
            callback(toServiceError(err));
          },
        );
      },
      submitBulkMessages: async (call, callback) => {
        // Identify peer that is calling, if available. This is used for rate limiting.
        // const peer = Result.fromThrowable(
        //   () => call.getPeer(),
        //   (e) => e,
        // )().unwrapOr("unavailable");
        statsd().increment("rpc.open_request_count", { method: "submitBulkMessages" });

        // Check for rate limits
        // const rateLimitResult = await rateLimitByIp(peer, this.submitMessageRateLimiter);
        // if (rateLimitResult.isErr()) {
        //   logger.warn({ peer }, "submitBulkMessages rate limited");
        //   callback(toServiceError(new HubError("unavailable", "API rate limit exceeded")));
        //   return;
        // }

        // Authentication
        const authResult = authenticateUser(call.metadata, this.rpcUsers);
        if (authResult.isErr()) {
          logger.warn({ errMsg: authResult.error.message }, "gRPC submitBulkMessages failed");
          callback(
            toServiceError(new HubError("unauthenticated", `gRPC authentication failed: ${authResult.error.message}`)),
          );
          return;
        }

        if (call.request.messages.length > MAX_BUNDLE_SIZE) {
          logger.warn({ total: call.request.messages.length }, "gRPC submitBulkMessages received too many messages");
          callback(
            toServiceError(
              new HubError("bad_request.validation_failure", `Too many messages. Max is ${MAX_BUNDLE_SIZE}`),
            ),
          );
          return;
        }

        const submissionTime = getFarcasterTime();
        if (submissionTime.isErr()) {
          callback(toServiceError(submissionTime.error));
          return;
        }

        const { messages } = call.request;
        const allHashes = Buffer.concat(messages.map((message) => message.hash ?? new Uint8Array()));
        const bundleHash = blake3Truncate160(allHashes);

        const messageBundle = MessageBundle.create({
          messages: messages,
          hash: bundleHash,
        });
        const result = await this.hub?.submitMessageBundle(submissionTime.value, messageBundle, "rpc");

        statsd().decrement("rpc.open_request_count", { method: "submitBulkMessages" });

        callback(
          null,
          SubmitBulkMessagesResponse.create({
            messages: result?.map((m, i) =>
              m.match(
                () => {
                  return BulkMessageResponse.create({
                    message: messages[i],
                  });
                },
                (err: HubError) => {
                  return BulkMessageResponse.create({
                    messageError: MessageError.create({
                      hash: messages[i]?.hash ?? new Uint8Array([]),
                      errCode: err.errCode,
                      message: err.message,
                    }),
                  });
                },
              ),
            ),
          }),
        );
      },
      validateMessage: async (call, callback) => {
        statsd().increment("rpc.open_request_count", { method: "validateMessage" });

        const message = call.request;
        const result = await this.hub?.validateMessage(message);

        statsd().decrement("rpc.open_request_count", { method: "validateMessage" });
        result?.match(
          (message: Message) => {
            callback(null, ValidationResponse.create({ valid: true, message }));
          },
          (err: HubError) => {
            callback(toServiceError(err));
          },
        );
      },
      getCast: async (call, callback) => {
        const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
        log.debug({ method: "getCast", req: call.request }, `RPC call from ${peer}`);
        statsd().increment("rpc.open_request_count", { method: "getCast" });

        const request = call.request;

        const castAddResult = await this.engine?.getCast(request.fid, request.hash);
        statsd().decrement("rpc.open_request_count", { method: "getCast" });

        castAddResult?.match(
          (castAdd: CastAddMessage) => {
            callback(null, castAdd);
          },
          (err: HubError) => {
            callback(toServiceError(err));
          },
        );
      },
      getCastsByFid: async (call, callback) => {
        const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
        log.debug({ method: "getCastsByFid", req: call.request }, `RPC call from ${peer}`);
        statsd().increment("rpc.open_request_count", { method: "getCastsByFid" });

        const { fid, pageSize, pageToken, reverse } = call.request;

        const castsResult = await this.engine?.getCastsByFid(fid, {
          pageSize,
          pageToken,
          reverse,
        });

        statsd().decrement("rpc.open_request_count", { method: "getCastsByFid" });
        castsResult?.match(
          (page: MessagesPage<CastAddMessage>) => {
            callback(null, messagesPageToResponse(page));
          },
          (err: HubError) => {
            callback(toServiceError(err));
          },
        );
      },
      getCastsByParent: async (call, callback) => {
        const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
        log.debug({ method: "getCastsByParent", req: call.request }, `RPC call from ${peer}`);
        statsd().increment("rpc.open_request_count", { method: "getCastsByParent" });

        const { parentCastId, parentUrl, pageSize, pageToken, reverse } = call.request;

        if (!parentCastId && !parentUrl) {
          callback(
            toServiceError(new HubError("bad_request.invalid_param", "Parent cast identifier must be provided")),
          );
          return;
        }

        const castsResult = await this.engine?.getCastsByParent(parentCastId ?? parentUrl ?? "", {
          pageSize,
          pageToken,
          reverse,
        });

        statsd().decrement("rpc.open_request_count", { method: "getCastsByParent" });
        castsResult?.match(
          (page: MessagesPage<CastAddMessage>) => {
            callback(null, messagesPageToResponse(page));
          },
          (err: HubError) => {
            callback(toServiceError(err));
          },
        );
      },
      getCastsByMention: async (call, callback) => {
        const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
        log.debug({ method: "getCastsByMention", req: call.request }, `RPC call from ${peer}`);
        statsd().increment("rpc.open_request_count", { method: "getCastsByMention" });

        const { fid, pageSize, pageToken, reverse } = call.request;

        const castsResult = await this.engine?.getCastsByMention(fid, { pageSize, pageToken, reverse });

        statsd().decrement("rpc.open_request_count", { method: "getCastsByMention" });
        castsResult?.match(
          (page: MessagesPage<CastAddMessage>) => {
            callback(null, messagesPageToResponse(page));
          },
          (err: HubError) => {
            callback(toServiceError(err));
          },
        );
      },
      getReaction: async (call, callback) => {
        const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
        log.debug({ method: "getReaction", req: call.request }, `RPC call from ${peer}`);
        statsd().increment("rpc.open_request_count", { method: "getReaction" });

        const request = call.request;

        const reactionResult = await this.engine?.getReaction(
          request.fid,
          request.reactionType,
          request.targetCastId ?? request.targetUrl ?? "",
        );
        statsd().decrement("rpc.open_request_count", { method: "getReaction" });

        reactionResult?.match(
          (reaction: ReactionAddMessage) => {
            callback(null, reaction);
          },
          (err: HubError) => {
            callback(toServiceError(err));
          },
        );
      },
      getReactionsByFid: async (call, callback) => {
        const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
        log.debug({ method: "getReactionsByFid", req: call.request }, `RPC call from ${peer}`);
        statsd().increment("rpc.open_request_count", { method: "getReactionsByFid" });

        const { fid, reactionType, pageSize, pageToken, reverse } = call.request;
        const reactionsResult = await this.engine?.getReactionsByFid(fid, reactionType, {
          pageSize,
          pageToken,
          reverse,
        });

        statsd().decrement("rpc.open_request_count", { method: "getReactionsByFid" });
        reactionsResult?.match(
          (page: MessagesPage<ReactionAddMessage>) => {
            callback(null, messagesPageToResponse(page));
          },
          (err: HubError) => {
            callback(toServiceError(err));
          },
        );
      },
      getReactionsByCast: async (call, callback) => {
        const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
        log.debug({ method: "getReactionsByCast", req: call.request }, `RPC call from ${peer}`);
        statsd().increment("rpc.open_request_count", { method: "getReactionsByCast" });

        const { targetCastId, reactionType, pageSize, pageToken, reverse } = call.request;
        const reactionsResult = await this.engine?.getReactionsByTarget(targetCastId ?? CastId.create(), reactionType, {
          pageSize,
          pageToken,
          reverse,
        });
        statsd().decrement("rpc.open_request_count", { method: "getReactionsByCast" });

        reactionsResult?.match(
          (page: MessagesPage<ReactionAddMessage>) => {
            callback(null, messagesPageToResponse(page));
          },
          (err: HubError) => {
            callback(toServiceError(err));
          },
        );
      },
      getReactionsByTarget: async (call, callback) => {
        const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
        log.debug({ method: "getReactionsByTarget", req: call.request }, `RPC call from ${peer}`);
        statsd().increment("rpc.open_request_count", { method: "getReactionsByTarget" });

        const { targetCastId, targetUrl, reactionType, pageSize, pageToken, reverse } = call.request;
        const reactionsResult = await this.engine?.getReactionsByTarget(targetCastId ?? targetUrl ?? "", reactionType, {
          pageSize,
          pageToken,
          reverse,
        });

        statsd().decrement("rpc.open_request_count", { method: "getReactionsByTarget" });
        reactionsResult?.match(
          (page: MessagesPage<ReactionAddMessage>) => {
            callback(null, messagesPageToResponse(page));
          },
          (err: HubError) => {
            callback(toServiceError(err));
          },
        );
      },
      getUserData: async (call, callback) => {
        const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
        log.debug({ method: "getUserData", req: call.request }, `RPC call from ${peer}`);
        statsd().increment("rpc.open_request_count", { method: "getUserData" });

        const request = call.request;

        const userDataResult = await this.engine?.getUserData(request.fid, request.userDataType);

        statsd().decrement("rpc.open_request_count", { method: "getUserData" });
        userDataResult?.match(
          (userData: UserDataAddMessage) => {
            callback(null, userData);
          },
          (err: HubError) => {
            callback(toServiceError(err));
          },
        );
      },
      getUserDataByFid: async (call, callback) => {
        const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
        log.debug({ method: "getUserDataByFid", req: call.request }, `RPC call from ${peer}`);
        statsd().increment("rpc.open_request_count", { method: "getUserDataByFid" });

        const { fid, pageSize, pageToken, reverse } = call.request;

        const userDataResult = await this.engine?.getUserDataByFid(fid, {
          pageSize,
          pageToken,
          reverse,
        });

        statsd().decrement("rpc.open_request_count", { method: "getUserDataByFid" });
        userDataResult?.match(
          (page: MessagesPage<UserDataAddMessage>) => {
            callback(null, messagesPageToResponse(page));
          },
          (err: HubError) => {
            callback(toServiceError(err));
          },
        );
      },
      getUsernameProof: async (call, callback) => {
        const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
        log.debug({ method: "getUsernameProof", req: call.request }, `RPC call from ${peer}`);
        statsd().increment("rpc.open_request_count", { method: "getUsernameProof" });

        const request = call.request;

        const usernameProofResult = await this.engine?.getUserNameProof(request.name);

        statsd().decrement("rpc.open_request_count", { method: "getUsernameProof" });
        usernameProofResult?.match(
          (usernameProof: UserNameProof) => {
            callback(null, usernameProof);
          },
          (err: HubError) => {
            callback(toServiceError(err));
          },
        );
      },
      getUserNameProofsByFid: async (call, callback) => {
        const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
        log.debug({ method: "getUserNameProofsByFid", req: call.request }, `RPC call from ${peer}`);
        statsd().increment("rpc.open_request_count", { method: "getUserNameProofsByFid" });

        const request = call.request;

        const usernameProofResult = await this.engine?.getUserNameProofsByFid(request.fid);

        statsd().decrement("rpc.open_request_count", { method: "getUserNameProofsByFid" });
        usernameProofResult?.match(
          (usernameProofs: UserNameProof[]) => {
            callback(null, UsernameProofsResponse.create({ proofs: usernameProofs }));
          },
          (err: HubError) => {
            callback(toServiceError(err));
          },
        );
      },
      getVerification: async (call, callback) => {
        const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
        log.debug({ method: "getVerification", req: call.request }, `RPC call from ${peer}`);
        statsd().increment("rpc.open_request_count", { method: "getVerification" });

        const request = call.request;

        const verificationResult = await this.engine?.getVerification(request.fid, request.address);

        statsd().decrement("rpc.open_request_count", { method: "getVerification" });
        verificationResult?.match(
          (verification: VerificationAddAddressMessage) => {
            callback(null, verification);
          },
          (err: HubError) => {
            callback(toServiceError(err));
          },
        );
      },
      getVerificationsByFid: async (call, callback) => {
        const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
        log.debug({ method: "getVerificationsByFid", req: call.request }, `RPC call from ${peer}`);
        statsd().increment("rpc.open_request_count", { method: "getVerificationsByFid" });

        const { fid, pageSize, pageToken, reverse } = call.request;

        const verificationsResult = await this.engine?.getVerificationsByFid(fid, {
          pageSize,
          pageToken,
          reverse,
        });

        statsd().decrement("rpc.open_request_count", { method: "getVerificationsByFid" });
        verificationsResult?.match(
          (page: MessagesPage<VerificationAddAddressMessage>) => {
            callback(null, messagesPageToResponse(page));
          },
          (err: HubError) => {
            callback(toServiceError(err));
          },
        );
      },
      getOnChainSigner: async (call, callback) => {
        const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
        log.debug({ method: "getOnChainSigner", req: call.request }, `RPC call from ${peer}`);
        statsd().decrement("rpc.open_request_count", { method: "getOnChainSigner" });

        const request = call.request;

        const signerResult = await this.engine?.getActiveSigner(request.fid, request.signer);

        statsd().decrement("rpc.open_request_count", { method: "getOnChainSigner" });
        signerResult?.match(
          (signer: SignerOnChainEvent) => {
            callback(null, signer);
          },
          (err: HubError) => {
            callback(toServiceError(err));
          },
        );
      },
      getLink: async (call, callback) => {
        const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
        log.debug({ method: "getLink", req: call.request }, `RPC call from ${peer}`);
        statsd().increment("rpc.open_request_count", { method: "getLink" });

        const request = call.request;

        const linkResult = await this.engine?.getLink(request.fid, request.linkType, request.targetFid ?? 0);

        statsd().decrement("rpc.open_request_count", { method: "getLink" });
        linkResult?.match(
          (link: LinkAddMessage) => {
            callback(null, link);
          },
          (err: HubError) => {
            callback(toServiceError(err));
          },
        );
      },
      getLinksByFid: async (call, callback) => {
        const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
        log.debug({ method: "getLinksByFid", req: call.request }, `RPC call from ${peer}`);
        statsd().increment("rpc.open_request_count", { method: "getLinksByFid" });

        const { fid, linkType, pageSize, pageToken, reverse } = call.request;
        const linksResult = await this.engine?.getLinksByFid(fid, linkType, {
          pageSize,
          pageToken,
          reverse,
        });

        statsd().decrement("rpc.open_request_count", { method: "getLinksByFid" });
        linksResult?.match(
          (page: MessagesPage<LinkAddMessage>) => {
            callback(null, messagesPageToResponse(page));
          },
          (err: HubError) => {
            callback(toServiceError(err));
          },
        );
      },
      getLinksByTarget: async (call, callback) => {
        const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
        log.debug({ method: "getLinksByTarget", req: call.request }, `RPC call from ${peer}`);
        statsd().increment("rpc.open_request_count", { method: "getLinksByTarget" });

        const { targetFid, linkType, pageSize, pageToken, reverse } = call.request;
        const linksResult = await this.engine?.getLinksByTarget(targetFid ?? 0, linkType, {
          pageSize,
          pageToken,
          reverse,
        });

        statsd().decrement("rpc.open_request_count", { method: "getLinksByTarget" });
        linksResult?.match(
          (page: MessagesPage<LinkAddMessage>) => {
            callback(null, messagesPageToResponse(page));
          },
          (err: HubError) => {
            callback(toServiceError(err));
          },
        );
      },
      getIdRegistryOnChainEvent: async (call, callback) => {
        const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
        log.debug({ method: "getIdRegistryOnChainEvent", req: call.request }, `RPC call from ${peer}`);
        statsd().increment("rpc.open_request_count", { method: "getIdRegistryOnChainEvent" });

        const request = call.request;
        const idRegistryEventResult = await this.engine?.getIdRegistryOnChainEvent(request.fid);

        statsd().decrement("rpc.open_request_count", { method: "getIdRegistryOnChainEvent" });
        idRegistryEventResult?.match(
          (idRegistryEvent: OnChainEvent) => {
            callback(null, idRegistryEvent);
          },
          (err: HubError) => {
            callback(toServiceError(err));
          },
        );
      },
      getIdRegistryOnChainEventByAddress: async (call, callback) => {
        const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
        log.debug({ method: "getIdRegistryOnChainEventByAddress", req: call.request }, `RPC call from ${peer}`);
        statsd().increment("rpc.open_request_count", { method: "getIdRegistryOnChainEventByAddress" });

        const request = call.request;
        const idRegistryEventResult = await this.engine?.getIdRegistryOnChainEventByAddress(request.address);

        statsd().decrement("rpc.open_request_count", { method: "getIdRegistryOnChainEventByAddress" });
        idRegistryEventResult?.match(
          (idRegistryEvent: OnChainEvent) => {
            callback(null, idRegistryEvent);
          },
          (err: HubError) => {
            callback(toServiceError(err));
          },
        );
      },
      getCurrentStorageLimitsByFid: async (call, callback) => {
        statsd().increment("rpc.open_request_count", { method: "getCurrentStorageLimitsByFid" });

        const request = call.request;
        const storageLimitsResult = await this.engine?.getCurrentStorageLimitsByFid(request.fid);

        statsd().decrement("rpc.open_request_count", { method: "getCurrentStorageLimitsByFid" });
        storageLimitsResult?.match(
          (storageLimits: StorageLimitsResponse) => {
            callback(null, storageLimits);
          },
          (err: HubError) => {
            callback(toServiceError(err));
          },
        );
      },
      getFids: async (call, callback) => {
        const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
        log.debug({ method: "getFids", req: call.request }, `RPC call from ${peer}`);
        statsd().increment("rpc.open_request_count", { method: "getFids" });

        const { pageSize, pageToken, reverse } = call.request;

        const result = await this.engine?.getFids({
          pageSize,
          pageToken,
          reverse,
        });

        statsd().decrement("rpc.open_request_count", { method: "getFids" });
        result?.match(
          (page: { fids: number[]; nextPageToken: Uint8Array | undefined }) => {
            callback(null, FidsResponse.create(page));
          },
          (err: HubError) => {
            callback(toServiceError(err));
          },
        );
      },
      getAllCastMessagesByFid: async (call, callback) => {
        const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
        log.debug({ method: "getAllCastMessagesByFid", req: call.request }, `RPC call from ${peer}`);
        statsd().increment("rpc.open_request_count", { method: "getAllCastMessagesByFid" });

        const { fid, pageSize, pageToken, reverse, startTimestamp, stopTimestamp } = call.request;
        const result = await this.engine?.getAllCastMessagesByFid(
          fid,
          {
            pageSize,
            pageToken,
            reverse,
          },
          startTimestamp,
          stopTimestamp,
        );

        statsd().decrement("rpc.open_request_count", { method: "getAllCastMessagesByFid" });
        result?.match(
          (page: MessagesPage<CastAddMessage | CastRemoveMessage>) => {
            callback(null, messagesPageToResponse(page));
          },
          (err: HubError) => {
            callback(toServiceError(err));
          },
        );
      },
      getAllReactionMessagesByFid: async (call, callback) => {
        const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
        log.debug({ method: "getAllReactionMessagesByFid", req: call.request }, `RPC call from ${peer}`);
        statsd().increment("rpc.open_request_count", { method: "getAllReactionMessagesByFid" });

        const { fid, pageSize, pageToken, reverse, startTimestamp, stopTimestamp } = call.request;
        const result = await this.engine?.getAllReactionMessagesByFid(
          fid,
          {
            pageSize,
            pageToken,
            reverse,
          },
          startTimestamp,
          stopTimestamp,
        );

        statsd().decrement("rpc.open_request_count", { method: "getAllReactionMessagesByFid" });
        result?.match(
          (page: MessagesPage<ReactionAddMessage | ReactionRemoveMessage>) => {
            callback(null, messagesPageToResponse(page));
          },
          (err: HubError) => {
            callback(toServiceError(err));
          },
        );
      },
      getAllVerificationMessagesByFid: async (call, callback) => {
        const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
        log.debug({ method: "getAllVerificationMessagesByFid", req: call.request }, `RPC call from ${peer}`);
        statsd().increment("rpc.open_request_count", { method: "getAllVerificationMessagesByFid" });

        const { fid, pageSize, pageToken, reverse, startTimestamp, stopTimestamp } = call.request;
        const result = await this.engine?.getAllVerificationMessagesByFid(
          fid,
          {
            pageSize,
            pageToken,
            reverse,
          },
          startTimestamp,
          stopTimestamp,
        );

        statsd().decrement("rpc.open_request_count", { method: "getAllVerificationMessagesByFid" });
        result?.match(
          (page: MessagesPage<VerificationAddAddressMessage | VerificationRemoveMessage>) => {
            callback(null, messagesPageToResponse(page));
          },
          (err: HubError) => {
            callback(toServiceError(err));
          },
        );
      },
      getAllUserDataMessagesByFid: async (call, callback) => {
        const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
        log.debug({ method: "getAllUserDataMessagesByFid", req: call.request }, `RPC call from ${peer}`);
        statsd().increment("rpc.open_request_count", { method: "getAllUserDataMessagesByFid" });

        const { fid, pageSize, pageToken, reverse, startTimestamp, stopTimestamp } = call.request;
        const result = await this.engine?.getUserDataByFid(
          fid,
          {
            pageSize,
            pageToken,
            reverse,
          },
          startTimestamp,
          stopTimestamp,
        );

        statsd().decrement("rpc.open_request_count", { method: "getAllUserDataMessagesByFid" });
        result?.match(
          (page: MessagesPage<UserDataAddMessage>) => {
            callback(null, messagesPageToResponse(page));
          },
          (err: HubError) => {
            callback(toServiceError(err));
          },
        );
      },
      getAllLinkMessagesByFid: async (call, callback) => {
        const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
        log.debug({ method: "getAllLinkMessagesByFid", req: call.request }, `RPC call from ${peer}`);
        statsd().increment("rpc.open_request_count", { method: "getAllLinkMessagesByFid" });

        const { fid, pageSize, pageToken, reverse, startTimestamp, stopTimestamp } = call.request;
        const result = await this.engine?.getAllLinkMessagesByFid(
          fid,
          {
            pageSize,
            pageToken,
            reverse,
          },
          startTimestamp,
          stopTimestamp,
        );

        statsd().decrement("rpc.open_request_count", { method: "getAllLinkMessagesByFid" });
        result?.match(
          (page: MessagesPage<LinkAddMessage | LinkRemoveMessage>) => {
            callback(null, messagesPageToResponse(page));
          },
          (err: HubError) => {
            callback(toServiceError(err));
          },
        );
      },
      getLinkCompactStateMessageByFid: async (call, callback) => {
        const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
        log.debug({ method: "getLinkCompactStateMessageByFid", req: call.request }, `RPC call from ${peer}`);
        statsd().increment("rpc.open_request_count", { method: "getLinkCompactStateMessageByFid" });

        const { fid, pageSize, pageToken, reverse } = call.request;
        const result = await this.engine?.getLinkCompactStateMessageByFid(fid, {
          pageSize,
          pageToken,
          reverse,
        });

        statsd().decrement("rpc.open_request_count", { method: "getLinkCompactStateMessageByFid" });
        result?.match(
          (page: MessagesPage<LinkCompactStateMessage>) => {
            callback(null, messagesPageToResponse(page));
          },
          (err: HubError) => {
            callback(toServiceError(err));
          },
        );
      },
      getEvent: async (call, callback) => {
        const peer = Result.fromThrowable(() => call.getPeer())().unwrapOr("unknown");
        log.debug({ method: "getEvent", req: call.request }, `RPC call from ${peer}`);
        statsd().increment("rpc.open_request_count", { method: "getevent" });

        const result = await this.engine?.getEvent(call.request.id);

        statsd().decrement("rpc.open_request_count", { method: "getevent" });
        result?.match(
          (event: HubEvent) => callback(null, event),
          (err: HubError) => callback(toServiceError(err)),
        );
      },
      subscribe: async (stream) => {
        const { request } = stream;
        const peer = Result.fromThrowable(
          () => stream.getPeer(),
          (e) => {
            log.error({ err: e }, "subscribe: error getting peer");
          },
        )().unwrapOr("unknown peer:port");

        // Check if username/password authenticates. If it does, we'll allow the connection
        // regardless of rate limits.
        let authorized = false;
        if (this.rpcUsers.size > 0) {
          authorized = authenticateUser(stream.metadata, this.rpcUsers).unwrapOr(false);
        }
        const allowed = this.subscribeIpLimiter.addConnection(peer);

        if (allowed.isOk() || authorized) {
          log.info({ r: request, peer }, "subscribe: starting stream");
          statsd().increment("rpc.open_stream_count", { method: "subscribe" });
          statsd().increment("rpc.open_request_count", { method: "subscribe" });
        } else {
          log.info({ r: request, peer, err: allowed.error.message }, "subscribe: rejected stream");
          destroyStream(stream, allowed.error);
          return;
        }

        // We'll write using a Buffered Stream Writer
        const bufferedStreamWriter = new BufferedStreamWriter(stream);

        // We'll listen to all events and write them to the stream as they happen
        let lastEventId = 0;
        const totalShards = request.totalShards || 0;
        if (totalShards > MAX_EVENT_STREAM_SHARDS) {
          log.info({ r: request, peer, err: "invalid totalShards" }, "subscribe: rejected stream");
          destroyStream(stream, new Error(`totalShards must be less than ${MAX_EVENT_STREAM_SHARDS}`));
        }
        if (totalShards > 0 && (request.shardIndex === undefined || request.shardIndex >= totalShards)) {
          log.info({ r: request, peer, err: "invalid shard index" }, "subscribe: rejected stream");
          destroyStream(stream, new Error("invalid shard index"));
        }
        const shardIndex = request.shardIndex || 0;

        const eventListener = (event: HubEvent) => {
          if (event.id <= lastEventId) {
            statsd().increment("rpc.subscribe.out_of_order");
          }
          lastEventId = event.id;
          const isOrderedEvent =
            event.type === HubEventType.MERGE_ON_CHAIN_EVENT || event.type === HubEventType.MERGE_USERNAME_PROOF;
          if (totalShards === 0 || (isOrderedEvent && shardIndex === 0)) {
            bufferedStreamWriter.writeToStream(event);
          } else if (!isOrderedEvent) {
            const fid = fidFromEvent(event);
            if (jumpConsistentHash(fid, totalShards) === shardIndex) {
              bufferedStreamWriter.writeToStream(event);
            }
          }
        };

        // Register a close listener to remove all listeners before we start sending events
        stream.on("close", () => {
          this.engine?.eventHandler.off("mergeMessage", eventListener);
          this.engine?.eventHandler.off("pruneMessage", eventListener);
          this.engine?.eventHandler.off("revokeMessage", eventListener);
          this.engine?.eventHandler.off("mergeUsernameProofEvent", eventListener);
          this.engine?.eventHandler.off("mergeOnChainEvent", eventListener);

          this.subscribeIpLimiter.removeConnection(peer);

          log.info({ peer }, "subscribe: stream closed");
          statsd().decrement("rpc.open_stream_count", { method: "subscribe" });
          statsd().decrement("rpc.open_request_count", { method: "subscribe" });
        });

        // If the user wants to start from a specific event, we'll start from there first
        if (this.engine && request.fromId !== undefined && request.fromId >= 0) {
          const eventsIteratorOpts = this.engine.eventHandler.getEventsIteratorOpts({ fromId: request.fromId });
          if (eventsIteratorOpts.isErr()) {
            destroyStream(stream, eventsIteratorOpts.error);
            return;
          }

          // We'll set a timeout of 1 hour, after which we'll stop writing to the stream
          // This is to prevent a situation where we're writing to the stream, but the client
          // is not reading it.
          const timeout = setTimeout(async () => {
            logger.warn(
              { timeout: HUBEVENTS_READER_TIMEOUT, peer: stream.getPeer() },
              "HubEvents subscribe: timeout, stopping stream",
            );

            const error = new HubError("unavailable.network_failure", `stream timeout for peer: ${stream.getPeer()}`);
            destroyStream(stream, error);
          }, HUBEVENTS_READER_TIMEOUT);

          // Track our RSS usage, to detect a situation where we're writing a lot of data to the stream,
          // but the client is not reading it. If we detect this, we'll stop writing to the stream.
          // Right now, we don't act on it, but we'll log it for now. We could potentially
          // destroy() the stream.
          const rssUsage = process.memoryUsage().rss;
          const RSS_USAGE_THRESHOLD = 1_000_000_000; // 1G

          await this.engine.getDb().forEachIteratorByOpts(eventsIteratorOpts.value, async (_key, value) => {
            const event = HubEvent.decode(Uint8Array.from(value as Buffer));
            const isOrderedEvent =
              event.type === HubEventType.MERGE_ON_CHAIN_EVENT || event.type === HubEventType.MERGE_USERNAME_PROOF;
            const isRequestedType = request.eventTypes.length === 0 || request.eventTypes.includes(event.type);
            const shouldWriteEvent =
              isRequestedType &&
              (totalShards === 0 ||
                (isOrderedEvent && shardIndex === 0) ||
                (!isOrderedEvent && jumpConsistentHash(fidFromEvent(event), totalShards) === shardIndex));
            if (shouldWriteEvent) {
              const writeResult = bufferedStreamWriter.writeToStream(event);

              if (writeResult.isErr()) {
                logger.warn(
                  { err: writeResult.error },
                  `subscribe: failed to write to stream while returning events ${request.fromId}`,
                );

                return true;
              } else {
                if (writeResult.value === false) {
                  // If the stream was buffered, we can wait for a bit before continuing
                  // to allow the client to read the data. If this happens too much, the bufferedStreamWriter
                  // will timeout and destroy the stream.
                  // The buffered writer is not async to make it easier to preserve ordering guarantees. So, we sleep here
                  await sleep(SLOW_CLIENT_GRACE_PERIOD_MS / STREAM_MESSAGE_BUFFER_SIZE);
                }

                // Write was successful, check the RSS usage
                if (process.memoryUsage().rss > rssUsage + RSS_USAGE_THRESHOLD) {
                  // more than 1G, so we're writing a lot of data to the stream, but the client is not reading it.
                  // We'll destroy the stream.
                  const error = new HubError("unavailable.network_failure", "stream memory usage too much");
                  logger.error({ errCode: error.errCode }, error.message);
                  destroyStream(stream, error);

                  return true;
                }
              }
            }

            return false;
          });

          // If we reach here, the iterator has ended, so we'll clear the timeout
          clearTimeout(timeout);
        }

        // if no type filters are provided, subscribe to all event types and start streaming events
        if (request.eventTypes.length === 0) {
          this.engine?.eventHandler.on("mergeMessage", eventListener);
          this.engine?.eventHandler.on("pruneMessage", eventListener);
          this.engine?.eventHandler.on("revokeMessage", eventListener);
          this.engine?.eventHandler.on("mergeUsernameProofEvent", eventListener);
          this.engine?.eventHandler.on("mergeOnChainEvent", eventListener);
        } else {
          for (const eventType of request.eventTypes) {
            if (eventType === HubEventType.MERGE_MESSAGE) {
              this.engine?.eventHandler.on("mergeMessage", eventListener);
            } else if (eventType === HubEventType.PRUNE_MESSAGE) {
              this.engine?.eventHandler.on("pruneMessage", eventListener);
            } else if (eventType === HubEventType.REVOKE_MESSAGE) {
              this.engine?.eventHandler.on("revokeMessage", eventListener);
            } else if (eventType === HubEventType.MERGE_USERNAME_PROOF) {
              this.engine?.eventHandler.on("mergeUsernameProofEvent", eventListener);
            } else if (eventType === HubEventType.MERGE_ON_CHAIN_EVENT) {
              this.engine?.eventHandler.on("mergeOnChainEvent", eventListener);
            }
          }
        }
      },
      streamSync: async (stream: ServerDuplexStream<StreamSyncRequest, StreamSyncResponse>) => {
        const timeout = setTimeout(async () => {
          const error = new HubError("unavailable.network_failure", "stream timeout");
          destroyStream(stream, error);
        }, STREAM_METHODS_TIMEOUT);

        await new Promise<void>((resolve) => {
          stream.on("close", () => {
            resolve();
          });
          stream.on("data", async (request) => {
            statsd().increment("rpc.open_stream_count", { method: "streamSync" });
            statsd().increment("rpc.open_request_count", { method: "streamSync" });
            if (request.forceSync) {
              const result = await this.forceSync(request.forceSync);
              if (result.isErr()) {
                stream.write(
                  StreamSyncResponse.create({
                    error: StreamError.create({
                      errCode: result.error.errCode,
                      message: result.error.message,
                      request: "forceSync",
                    }),
                  }),
                );
              } else {
                stream.write(
                  StreamSyncResponse.create({
                    forceSync: result.value,
                  }),
                );
                timeout.refresh();
              }
            } else if (request.getAllMessagesBySyncIds) {
              const result = await this.getAllMessagesBySyncIds(request.getAllMessagesBySyncIds);
              if (result.isErr()) {
                stream.write(
                  StreamSyncResponse.create({
                    error: StreamError.create({
                      errCode: result.error.errCode,
                      message: result.error.message,
                      request: "getAllMessagesBySyncIds",
                    }),
                  }),
                );
              } else {
                stream.write(
                  StreamSyncResponse.create({
                    getAllMessagesBySyncIds: result.value,
                  }),
                );
                timeout.refresh();
              }
            } else if (request.getAllSyncIdsByPrefix) {
              const result = await this.getAllSyncIdsByPrefix(request.getAllSyncIdsByPrefix);
              if (result.isErr()) {
                stream.write(
                  StreamSyncResponse.create({
                    error: StreamError.create({
                      request: "getAllSyncIdsByPrefix",
                    }),
                  }),
                );
              } else {
                stream.write(
                  StreamSyncResponse.create({
                    getAllSyncIdsByPrefix: result.value,
                  }),
                );
                timeout.refresh();
              }
            } else if (request.getCurrentPeers) {
              const result = await this.getCurrentPeers();
              stream.write(
                StreamSyncResponse.create({
                  getCurrentPeers: result,
                }),
              );
            } else if (request.getInfo) {
              const result = await this.getInfo(request.getInfo);
              stream.write(
                StreamSyncResponse.create({
                  getInfo: result,
                }),
              );
              timeout.refresh();
            } else if (request.getOnChainEvents) {
              const result = await this.getOnChainEvents(request.getOnChainEvents);
              if (result.isErr()) {
                stream.write(
                  StreamSyncResponse.create({
                    error: StreamError.create({
                      request: "getOnChainEvents",
                    }),
                  }),
                );
              } else {
                stream.write(
                  StreamSyncResponse.create({
                    getOnChainEvents: result.value,
                  }),
                );
                timeout.refresh();
              }
            } else if (request.getOnChainSignersByFid) {
              const result = await this.getOnChainSignersByFid(request.getOnChainSignersByFid);
              if (result.isErr()) {
                stream.write(
                  StreamSyncResponse.create({
                    error: StreamError.create({
                      request: "getOnChainSignersByFid",
                    }),
                  }),
                );
              } else {
                stream.write(
                  StreamSyncResponse.create({
                    getOnChainSignersByFid: result.value,
                  }),
                );
                timeout.refresh();
              }
            } else if (request.getSyncMetadataByPrefix) {
              const result = await this.getSyncMetadataByPrefix(request.getSyncMetadataByPrefix);

              if (result.isErr()) {
                stream.write(
                  StreamSyncResponse.create({
                    error: StreamError.create({
                      request: "getSyncMetadataByPrefix",
                    }),
                  }),
                );
              } else {
                stream.write(
                  StreamSyncResponse.create({
                    getSyncMetadataByPrefix: result.value,
                  }),
                );
                timeout.refresh();
              }
            } else if (request.getSyncSnapshotByPrefix) {
              const result = await this.getSyncSnapshotByPrefix(request.getSyncSnapshotByPrefix);
              if (result.isErr()) {
                stream.write(
                  StreamSyncResponse.create({
                    error: StreamError.create({
                      errCode: result.error.errCode,
                      message: result.error.message,
                      request: "getSyncSnapshotByPrefix",
                    }),
                  }),
                );
              } else {
                stream.write(
                  StreamSyncResponse.create({
                    getSyncSnapshotByPrefix: result.value,
                  }),
                );
                timeout.refresh();
              }
            } else if (request.getSyncStatus) {
              const result = await this.getSyncStatus(request.getSyncStatus.peerId);
              if (result.isErr()) {
                stream.write(
                  StreamSyncResponse.create({
                    error: StreamError.create({
                      errCode: result.error.errCode,
                      message: result.error.message,
                      request: "getSyncStatus",
                    }),
                  }),
                );
              } else {
                stream.write(
                  StreamSyncResponse.create({
                    getSyncStatus: result.value,
                  }),
                );
              }
            } else if (request.stopSync) {
              const result = await this.stopSync();
              if (result.isErr()) {
                stream.write(
                  StreamSyncResponse.create({
                    error: StreamError.create({
                      errCode: result.error.errCode,
                      message: result.error.message,
                      request: "stopSync",
                    }),
                  }),
                );
              } else {
                stream.write(
                  StreamSyncResponse.create({
                    stopSync: result.value,
                  }),
                );
                timeout.refresh();
              }
            }
            statsd().decrement("rpc.open_stream_count", { method: "streamSync" });
            statsd().decrement("rpc.open_request_count", { method: "streamSync" });
          });
        });
      },
      streamFetch: async (stream: ServerDuplexStream<StreamFetchRequest, StreamFetchResponse>) => {
        const timeout = setTimeout(async () => {
          const error = new HubError("unavailable.network_failure", "stream timeout");
          destroyStream(stream, error);
        }, STREAM_METHODS_TIMEOUT);

        await new Promise<void>((resolve) => {
          stream.on("close", () => {
            resolve();
          });
          stream.on("data", async (request) => {
            statsd().increment("rpc.open_stream_count", { method: "streamFetch" });
            statsd().increment("rpc.open_request_count", { method: "streamFetch" });
            const requestPayload =
              request.castMessagesByFid ||
              request.linkMessagesByFid ||
              request.reactionMessagesByFid ||
              request.userDataMessagesByFid ||
              request.verificationMessagesByFid;

            if (!requestPayload) {
              return;
            }

            const { fid, pageSize, pageToken, reverse, startTimestamp, stopTimestamp } = requestPayload;
            let result: HubResult<MessagesPage<Message>> | undefined;
            if (request.castMessagesByFid) {
              result = await this.engine?.getAllCastMessagesByFid(
                fid,
                {
                  pageSize,
                  pageToken,
                  reverse,
                },
                startTimestamp,
                stopTimestamp,
              );
            } else if (request.linkMessagesByFid) {
              result = await this.engine?.getAllLinkMessagesByFid(
                fid,
                {
                  pageSize,
                  pageToken,
                  reverse,
                },
                startTimestamp,
                stopTimestamp,
              );
              if (result?.isOk() && !result.value.nextPageToken) {
                const additional = await this.engine?.getLinkCompactStateMessageByFid(fid);
                if (additional?.isOk()) {
                  result.value.messages.push(...additional.value.messages);
                }
              }
            } else if (request.reactionMessagesByFid) {
              result = await this.engine?.getAllReactionMessagesByFid(
                fid,
                {
                  pageSize,
                  pageToken,
                  reverse,
                },
                startTimestamp,
                stopTimestamp,
              );
            } else if (request.userDataMessagesByFid) {
              result = await this.engine?.getUserDataByFid(
                fid,
                {
                  pageSize,
                  pageToken,
                  reverse,
                },
                startTimestamp,
                stopTimestamp,
              );
            } else if (request.verificationMessagesByFid) {
              result = await this.engine?.getAllVerificationMessagesByFid(
                fid,
                {
                  pageSize,
                  pageToken,
                  reverse,
                },
                startTimestamp,
                stopTimestamp,
              );
            }

            result?.match(
              (page: MessagesPage<Message>) => {
                stream.write(
                  StreamFetchResponse.create({
                    idempotencyKey: request.idempotencyKey,
                    messages: messagesPageToResponse(page),
                  }),
                );
              },
              (err: HubError) => {
                stream.write(
                  StreamFetchResponse.create({
                    error: StreamError.create({
                      errCode: err.errCode,
                      message: err.message,
                      request: "fetch",
                    }),
                  }),
                );
              },
            );
            timeout.refresh();
            statsd().decrement("rpc.open_stream_count", { method: "streamFetch" });
            statsd().decrement("rpc.open_request_count", { method: "streamFetch" });
          });
        });
      },
    };
  }
}
