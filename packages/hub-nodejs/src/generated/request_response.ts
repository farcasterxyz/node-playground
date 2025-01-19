/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";
import { ContactInfoContentBody } from "./gossip";
import { HubEventType, hubEventTypeFromJSON, hubEventTypeToJSON } from "./hub_event";
import {
  CastId,
  Message,
  ReactionType,
  reactionTypeFromJSON,
  reactionTypeToJSON,
  UserDataType,
  userDataTypeFromJSON,
  userDataTypeToJSON,
} from "./message";
import { OnChainEvent, OnChainEventType, onChainEventTypeFromJSON, onChainEventTypeToJSON } from "./onchain_event";
import { UserNameProof } from "./username_proof";

export enum StoreType {
  NONE = 0,
  CASTS = 1,
  LINKS = 2,
  REACTIONS = 3,
  USER_DATA = 4,
  VERIFICATIONS = 5,
  USERNAME_PROOFS = 6,
}

export function storeTypeFromJSON(object: any): StoreType {
  switch (object) {
    case 0:
    case "STORE_TYPE_NONE":
      return StoreType.NONE;
    case 1:
    case "STORE_TYPE_CASTS":
      return StoreType.CASTS;
    case 2:
    case "STORE_TYPE_LINKS":
      return StoreType.LINKS;
    case 3:
    case "STORE_TYPE_REACTIONS":
      return StoreType.REACTIONS;
    case 4:
    case "STORE_TYPE_USER_DATA":
      return StoreType.USER_DATA;
    case 5:
    case "STORE_TYPE_VERIFICATIONS":
      return StoreType.VERIFICATIONS;
    case 6:
    case "STORE_TYPE_USERNAME_PROOFS":
      return StoreType.USERNAME_PROOFS;
    default:
      throw new tsProtoGlobalThis.Error("Unrecognized enum value " + object + " for enum StoreType");
  }
}

export function storeTypeToJSON(object: StoreType): string {
  switch (object) {
    case StoreType.NONE:
      return "STORE_TYPE_NONE";
    case StoreType.CASTS:
      return "STORE_TYPE_CASTS";
    case StoreType.LINKS:
      return "STORE_TYPE_LINKS";
    case StoreType.REACTIONS:
      return "STORE_TYPE_REACTIONS";
    case StoreType.USER_DATA:
      return "STORE_TYPE_USER_DATA";
    case StoreType.VERIFICATIONS:
      return "STORE_TYPE_VERIFICATIONS";
    case StoreType.USERNAME_PROOFS:
      return "STORE_TYPE_USERNAME_PROOFS";
    default:
      throw new tsProtoGlobalThis.Error("Unrecognized enum value " + object + " for enum StoreType");
  }
}

export enum StorageUnitType {
  UNIT_TYPE_LEGACY = 0,
  UNIT_TYPE_2024 = 1,
}

export function storageUnitTypeFromJSON(object: any): StorageUnitType {
  switch (object) {
    case 0:
    case "UNIT_TYPE_LEGACY":
      return StorageUnitType.UNIT_TYPE_LEGACY;
    case 1:
    case "UNIT_TYPE_2024":
      return StorageUnitType.UNIT_TYPE_2024;
    default:
      throw new tsProtoGlobalThis.Error("Unrecognized enum value " + object + " for enum StorageUnitType");
  }
}

export function storageUnitTypeToJSON(object: StorageUnitType): string {
  switch (object) {
    case StorageUnitType.UNIT_TYPE_LEGACY:
      return "UNIT_TYPE_LEGACY";
    case StorageUnitType.UNIT_TYPE_2024:
      return "UNIT_TYPE_2024";
    default:
      throw new tsProtoGlobalThis.Error("Unrecognized enum value " + object + " for enum StorageUnitType");
  }
}

export interface Empty {
}

export interface SubscribeRequest {
  eventTypes: HubEventType[];
  fromId?: number | undefined;
  totalShards?: number | undefined;
  shardIndex?: number | undefined;
}

export interface EventRequest {
  id: number;
}

export interface HubInfoRequest {
  dbStats: boolean;
}

/** Response Types for the Sync RPC Methods */
export interface HubInfoResponse {
  version: string;
  isSyncing: boolean;
  nickname: string;
  rootHash: string;
  dbStats: DbStats | undefined;
  peerId: string;
  hubOperatorFid: number;
}

export interface DbStats {
  numMessages: number;
  numFidEvents: number;
  numFnameEvents: number;
  approxSize: number;
}

export interface SyncStatusRequest {
  peerId?: string | undefined;
}

export interface SyncStatusResponse {
  isSyncing: boolean;
  syncStatus: SyncStatus[];
  engineStarted: boolean;
}

export interface SyncStatus {
  peerId: string;
  inSync: string;
  shouldSync: boolean;
  divergencePrefix: string;
  divergenceSecondsAgo: number;
  theirMessages: number;
  ourMessages: number;
  lastBadSync: number;
  score: number;
}

export interface TrieNodeMetadataResponse {
  prefix: Uint8Array;
  numMessages: number;
  hash: string;
  children: TrieNodeMetadataResponse[];
}

export interface TrieNodeSnapshotResponse {
  prefix: Uint8Array;
  excludedHashes: string[];
  numMessages: number;
  rootHash: string;
}

export interface TrieNodePrefix {
  prefix: Uint8Array;
}

export interface SyncIds {
  syncIds: Uint8Array[];
}

export interface FidRequest {
  fid: number;
  pageSize?: number | undefined;
  pageToken?: Uint8Array | undefined;
  reverse?: boolean | undefined;
}

export interface FidTimestampRequest {
  fid: number;
  pageSize?: number | undefined;
  pageToken?: Uint8Array | undefined;
  reverse?: boolean | undefined;
  startTimestamp?: number | undefined;
  stopTimestamp?: number | undefined;
}

export interface FidsRequest {
  pageSize?: number | undefined;
  pageToken?: Uint8Array | undefined;
  reverse?: boolean | undefined;
}

export interface FidsResponse {
  fids: number[];
  nextPageToken?: Uint8Array | undefined;
}

export interface MessagesResponse {
  messages: Message[];
  nextPageToken?: Uint8Array | undefined;
}

export interface CastsByParentRequest {
  parentCastId?: CastId | undefined;
  parentUrl?: string | undefined;
  pageSize?: number | undefined;
  pageToken?: Uint8Array | undefined;
  reverse?: boolean | undefined;
}

export interface ReactionRequest {
  fid: number;
  reactionType: ReactionType;
  targetCastId?: CastId | undefined;
  targetUrl?: string | undefined;
}

export interface ReactionsByFidRequest {
  fid: number;
  reactionType?: ReactionType | undefined;
  pageSize?: number | undefined;
  pageToken?: Uint8Array | undefined;
  reverse?: boolean | undefined;
}

export interface ReactionsByTargetRequest {
  targetCastId?: CastId | undefined;
  targetUrl?: string | undefined;
  reactionType?: ReactionType | undefined;
  pageSize?: number | undefined;
  pageToken?: Uint8Array | undefined;
  reverse?: boolean | undefined;
}

export interface UserDataRequest {
  fid: number;
  userDataType: UserDataType;
}

export interface NameRegistryEventRequest {
  name: Uint8Array;
}

export interface RentRegistryEventsRequest {
  fid: number;
}

export interface OnChainEventRequest {
  fid: number;
  eventType: OnChainEventType;
  pageSize?: number | undefined;
  pageToken?: Uint8Array | undefined;
  reverse?: boolean | undefined;
}

export interface OnChainEventResponse {
  events: OnChainEvent[];
  nextPageToken?: Uint8Array | undefined;
}

export interface StorageLimitsResponse {
  limits: StorageLimit[];
  units: number;
  unitDetails: StorageUnitDetails[];
}

export interface StorageUnitDetails {
  unitType: StorageUnitType;
  unitSize: number;
}

export interface StorageLimit {
  storeType: StoreType;
  name: string;
  limit: number;
  used: number;
  earliestTimestamp: number;
  earliestHash: Uint8Array;
}

export interface UsernameProofRequest {
  name: Uint8Array;
}

export interface UsernameProofsResponse {
  proofs: UserNameProof[];
}

export interface VerificationRequest {
  fid: number;
  address: Uint8Array;
}

export interface SignerRequest {
  fid: number;
  signer: Uint8Array;
}

export interface LinkRequest {
  fid: number;
  linkType: string;
  targetFid?: number | undefined;
}

export interface LinksByFidRequest {
  fid: number;
  linkType?: string | undefined;
  pageSize?: number | undefined;
  pageToken?: Uint8Array | undefined;
  reverse?: boolean | undefined;
}

export interface LinksByTargetRequest {
  targetFid?: number | undefined;
  linkType?: string | undefined;
  pageSize?: number | undefined;
  pageToken?: Uint8Array | undefined;
  reverse?: boolean | undefined;
}

export interface IdRegistryEventByAddressRequest {
  address: Uint8Array;
}

export interface ContactInfoResponse {
  contacts: ContactInfoContentBody[];
}

export interface ValidationResponse {
  valid: boolean;
  message: Message | undefined;
}

export interface SubmitBulkMessagesRequest {
  messages: Message[];
}

export interface MessageError {
  hash: Uint8Array;
  errCode: string;
  message: string;
}

export interface BulkMessageResponse {
  message?: Message | undefined;
  messageError?: MessageError | undefined;
}

export interface SubmitBulkMessagesResponse {
  messages: BulkMessageResponse[];
}

export interface StreamSyncRequest {
  getInfo?: HubInfoRequest | undefined;
  getCurrentPeers?: Empty | undefined;
  stopSync?: Empty | undefined;
  forceSync?: SyncStatusRequest | undefined;
  getSyncStatus?: SyncStatusRequest | undefined;
  getAllSyncIdsByPrefix?: TrieNodePrefix | undefined;
  getAllMessagesBySyncIds?: SyncIds | undefined;
  getSyncMetadataByPrefix?: TrieNodePrefix | undefined;
  getSyncSnapshotByPrefix?: TrieNodePrefix | undefined;
  getOnChainEvents?: OnChainEventRequest | undefined;
  getOnChainSignersByFid?: FidRequest | undefined;
}

export interface StreamError {
  errCode: string;
  message: string;
  request: string;
}

export interface StreamSyncResponse {
  getInfo?: HubInfoResponse | undefined;
  getCurrentPeers?: ContactInfoResponse | undefined;
  stopSync?: SyncStatusResponse | undefined;
  forceSync?: SyncStatusResponse | undefined;
  getSyncStatus?: SyncStatusResponse | undefined;
  getAllSyncIdsByPrefix?: SyncIds | undefined;
  getAllMessagesBySyncIds?: MessagesResponse | undefined;
  getSyncMetadataByPrefix?: TrieNodeMetadataResponse | undefined;
  getSyncSnapshotByPrefix?: TrieNodeSnapshotResponse | undefined;
  getOnChainEvents?: OnChainEventResponse | undefined;
  getOnChainSignersByFid?: OnChainEventResponse | undefined;
  error?: StreamError | undefined;
}

export interface StreamFetchRequest {
  idempotencyKey: string;
  castMessagesByFid?: FidTimestampRequest | undefined;
  reactionMessagesByFid?: FidTimestampRequest | undefined;
  verificationMessagesByFid?: FidTimestampRequest | undefined;
  userDataMessagesByFid?: FidTimestampRequest | undefined;
  linkMessagesByFid?: FidTimestampRequest | undefined;
}

export interface StreamFetchResponse {
  idempotencyKey: string;
  messages?: MessagesResponse | undefined;
  error?: StreamError | undefined;
}

export interface PruneMessagesRequest {
  fid: number;
}

export interface PruneMessagesResponse {
  numMessagesPruned: number;
}

function createBaseEmpty(): Empty {
  return {};
}

export const Empty = {
  encode(_: Empty, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Empty {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEmpty();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(_: any): Empty {
    return {};
  },

  toJSON(_: Empty): unknown {
    const obj: any = {};
    return obj;
  },

  create<I extends Exact<DeepPartial<Empty>, I>>(base?: I): Empty {
    return Empty.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<Empty>, I>>(_: I): Empty {
    const message = createBaseEmpty();
    return message;
  },
};

function createBaseSubscribeRequest(): SubscribeRequest {
  return { eventTypes: [], fromId: undefined, totalShards: undefined, shardIndex: undefined };
}

export const SubscribeRequest = {
  encode(message: SubscribeRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    writer.uint32(10).fork();
    for (const v of message.eventTypes) {
      writer.int32(v);
    }
    writer.ldelim();
    if (message.fromId !== undefined) {
      writer.uint32(16).uint64(message.fromId);
    }
    if (message.totalShards !== undefined) {
      writer.uint32(24).uint64(message.totalShards);
    }
    if (message.shardIndex !== undefined) {
      writer.uint32(32).uint64(message.shardIndex);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SubscribeRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSubscribeRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag == 8) {
            message.eventTypes.push(reader.int32() as any);
            continue;
          }

          if (tag == 10) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.eventTypes.push(reader.int32() as any);
            }

            continue;
          }

          break;
        case 2:
          if (tag != 16) {
            break;
          }

          message.fromId = longToNumber(reader.uint64() as Long);
          continue;
        case 3:
          if (tag != 24) {
            break;
          }

          message.totalShards = longToNumber(reader.uint64() as Long);
          continue;
        case 4:
          if (tag != 32) {
            break;
          }

          message.shardIndex = longToNumber(reader.uint64() as Long);
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): SubscribeRequest {
    return {
      eventTypes: Array.isArray(object?.eventTypes) ? object.eventTypes.map((e: any) => hubEventTypeFromJSON(e)) : [],
      fromId: isSet(object.fromId) ? Number(object.fromId) : undefined,
      totalShards: isSet(object.totalShards) ? Number(object.totalShards) : undefined,
      shardIndex: isSet(object.shardIndex) ? Number(object.shardIndex) : undefined,
    };
  },

  toJSON(message: SubscribeRequest): unknown {
    const obj: any = {};
    if (message.eventTypes) {
      obj.eventTypes = message.eventTypes.map((e) => hubEventTypeToJSON(e));
    } else {
      obj.eventTypes = [];
    }
    message.fromId !== undefined && (obj.fromId = Math.round(message.fromId));
    message.totalShards !== undefined && (obj.totalShards = Math.round(message.totalShards));
    message.shardIndex !== undefined && (obj.shardIndex = Math.round(message.shardIndex));
    return obj;
  },

  create<I extends Exact<DeepPartial<SubscribeRequest>, I>>(base?: I): SubscribeRequest {
    return SubscribeRequest.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SubscribeRequest>, I>>(object: I): SubscribeRequest {
    const message = createBaseSubscribeRequest();
    message.eventTypes = object.eventTypes?.map((e) => e) || [];
    message.fromId = object.fromId ?? undefined;
    message.totalShards = object.totalShards ?? undefined;
    message.shardIndex = object.shardIndex ?? undefined;
    return message;
  },
};

function createBaseEventRequest(): EventRequest {
  return { id: 0 };
}

export const EventRequest = {
  encode(message: EventRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== 0) {
      writer.uint32(8).uint64(message.id);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EventRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 8) {
            break;
          }

          message.id = longToNumber(reader.uint64() as Long);
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EventRequest {
    return { id: isSet(object.id) ? Number(object.id) : 0 };
  },

  toJSON(message: EventRequest): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = Math.round(message.id));
    return obj;
  },

  create<I extends Exact<DeepPartial<EventRequest>, I>>(base?: I): EventRequest {
    return EventRequest.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<EventRequest>, I>>(object: I): EventRequest {
    const message = createBaseEventRequest();
    message.id = object.id ?? 0;
    return message;
  },
};

function createBaseHubInfoRequest(): HubInfoRequest {
  return { dbStats: false };
}

export const HubInfoRequest = {
  encode(message: HubInfoRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.dbStats === true) {
      writer.uint32(8).bool(message.dbStats);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): HubInfoRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseHubInfoRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 8) {
            break;
          }

          message.dbStats = reader.bool();
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): HubInfoRequest {
    return { dbStats: isSet(object.dbStats) ? Boolean(object.dbStats) : false };
  },

  toJSON(message: HubInfoRequest): unknown {
    const obj: any = {};
    message.dbStats !== undefined && (obj.dbStats = message.dbStats);
    return obj;
  },

  create<I extends Exact<DeepPartial<HubInfoRequest>, I>>(base?: I): HubInfoRequest {
    return HubInfoRequest.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<HubInfoRequest>, I>>(object: I): HubInfoRequest {
    const message = createBaseHubInfoRequest();
    message.dbStats = object.dbStats ?? false;
    return message;
  },
};

function createBaseHubInfoResponse(): HubInfoResponse {
  return {
    version: "",
    isSyncing: false,
    nickname: "",
    rootHash: "",
    dbStats: undefined,
    peerId: "",
    hubOperatorFid: 0,
  };
}

export const HubInfoResponse = {
  encode(message: HubInfoResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.version !== "") {
      writer.uint32(10).string(message.version);
    }
    if (message.isSyncing === true) {
      writer.uint32(16).bool(message.isSyncing);
    }
    if (message.nickname !== "") {
      writer.uint32(26).string(message.nickname);
    }
    if (message.rootHash !== "") {
      writer.uint32(34).string(message.rootHash);
    }
    if (message.dbStats !== undefined) {
      DbStats.encode(message.dbStats, writer.uint32(42).fork()).ldelim();
    }
    if (message.peerId !== "") {
      writer.uint32(50).string(message.peerId);
    }
    if (message.hubOperatorFid !== 0) {
      writer.uint32(56).uint64(message.hubOperatorFid);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): HubInfoResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseHubInfoResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 10) {
            break;
          }

          message.version = reader.string();
          continue;
        case 2:
          if (tag != 16) {
            break;
          }

          message.isSyncing = reader.bool();
          continue;
        case 3:
          if (tag != 26) {
            break;
          }

          message.nickname = reader.string();
          continue;
        case 4:
          if (tag != 34) {
            break;
          }

          message.rootHash = reader.string();
          continue;
        case 5:
          if (tag != 42) {
            break;
          }

          message.dbStats = DbStats.decode(reader, reader.uint32());
          continue;
        case 6:
          if (tag != 50) {
            break;
          }

          message.peerId = reader.string();
          continue;
        case 7:
          if (tag != 56) {
            break;
          }

          message.hubOperatorFid = longToNumber(reader.uint64() as Long);
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): HubInfoResponse {
    return {
      version: isSet(object.version) ? String(object.version) : "",
      isSyncing: isSet(object.isSyncing) ? Boolean(object.isSyncing) : false,
      nickname: isSet(object.nickname) ? String(object.nickname) : "",
      rootHash: isSet(object.rootHash) ? String(object.rootHash) : "",
      dbStats: isSet(object.dbStats) ? DbStats.fromJSON(object.dbStats) : undefined,
      peerId: isSet(object.peerId) ? String(object.peerId) : "",
      hubOperatorFid: isSet(object.hubOperatorFid) ? Number(object.hubOperatorFid) : 0,
    };
  },

  toJSON(message: HubInfoResponse): unknown {
    const obj: any = {};
    message.version !== undefined && (obj.version = message.version);
    message.isSyncing !== undefined && (obj.isSyncing = message.isSyncing);
    message.nickname !== undefined && (obj.nickname = message.nickname);
    message.rootHash !== undefined && (obj.rootHash = message.rootHash);
    message.dbStats !== undefined && (obj.dbStats = message.dbStats ? DbStats.toJSON(message.dbStats) : undefined);
    message.peerId !== undefined && (obj.peerId = message.peerId);
    message.hubOperatorFid !== undefined && (obj.hubOperatorFid = Math.round(message.hubOperatorFid));
    return obj;
  },

  create<I extends Exact<DeepPartial<HubInfoResponse>, I>>(base?: I): HubInfoResponse {
    return HubInfoResponse.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<HubInfoResponse>, I>>(object: I): HubInfoResponse {
    const message = createBaseHubInfoResponse();
    message.version = object.version ?? "";
    message.isSyncing = object.isSyncing ?? false;
    message.nickname = object.nickname ?? "";
    message.rootHash = object.rootHash ?? "";
    message.dbStats = (object.dbStats !== undefined && object.dbStats !== null)
      ? DbStats.fromPartial(object.dbStats)
      : undefined;
    message.peerId = object.peerId ?? "";
    message.hubOperatorFid = object.hubOperatorFid ?? 0;
    return message;
  },
};

function createBaseDbStats(): DbStats {
  return { numMessages: 0, numFidEvents: 0, numFnameEvents: 0, approxSize: 0 };
}

export const DbStats = {
  encode(message: DbStats, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.numMessages !== 0) {
      writer.uint32(8).uint64(message.numMessages);
    }
    if (message.numFidEvents !== 0) {
      writer.uint32(16).uint64(message.numFidEvents);
    }
    if (message.numFnameEvents !== 0) {
      writer.uint32(24).uint64(message.numFnameEvents);
    }
    if (message.approxSize !== 0) {
      writer.uint32(32).uint64(message.approxSize);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DbStats {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDbStats();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 8) {
            break;
          }

          message.numMessages = longToNumber(reader.uint64() as Long);
          continue;
        case 2:
          if (tag != 16) {
            break;
          }

          message.numFidEvents = longToNumber(reader.uint64() as Long);
          continue;
        case 3:
          if (tag != 24) {
            break;
          }

          message.numFnameEvents = longToNumber(reader.uint64() as Long);
          continue;
        case 4:
          if (tag != 32) {
            break;
          }

          message.approxSize = longToNumber(reader.uint64() as Long);
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): DbStats {
    return {
      numMessages: isSet(object.numMessages) ? Number(object.numMessages) : 0,
      numFidEvents: isSet(object.numFidEvents) ? Number(object.numFidEvents) : 0,
      numFnameEvents: isSet(object.numFnameEvents) ? Number(object.numFnameEvents) : 0,
      approxSize: isSet(object.approxSize) ? Number(object.approxSize) : 0,
    };
  },

  toJSON(message: DbStats): unknown {
    const obj: any = {};
    message.numMessages !== undefined && (obj.numMessages = Math.round(message.numMessages));
    message.numFidEvents !== undefined && (obj.numFidEvents = Math.round(message.numFidEvents));
    message.numFnameEvents !== undefined && (obj.numFnameEvents = Math.round(message.numFnameEvents));
    message.approxSize !== undefined && (obj.approxSize = Math.round(message.approxSize));
    return obj;
  },

  create<I extends Exact<DeepPartial<DbStats>, I>>(base?: I): DbStats {
    return DbStats.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DbStats>, I>>(object: I): DbStats {
    const message = createBaseDbStats();
    message.numMessages = object.numMessages ?? 0;
    message.numFidEvents = object.numFidEvents ?? 0;
    message.numFnameEvents = object.numFnameEvents ?? 0;
    message.approxSize = object.approxSize ?? 0;
    return message;
  },
};

function createBaseSyncStatusRequest(): SyncStatusRequest {
  return { peerId: undefined };
}

export const SyncStatusRequest = {
  encode(message: SyncStatusRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.peerId !== undefined) {
      writer.uint32(10).string(message.peerId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SyncStatusRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSyncStatusRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 10) {
            break;
          }

          message.peerId = reader.string();
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): SyncStatusRequest {
    return { peerId: isSet(object.peerId) ? String(object.peerId) : undefined };
  },

  toJSON(message: SyncStatusRequest): unknown {
    const obj: any = {};
    message.peerId !== undefined && (obj.peerId = message.peerId);
    return obj;
  },

  create<I extends Exact<DeepPartial<SyncStatusRequest>, I>>(base?: I): SyncStatusRequest {
    return SyncStatusRequest.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SyncStatusRequest>, I>>(object: I): SyncStatusRequest {
    const message = createBaseSyncStatusRequest();
    message.peerId = object.peerId ?? undefined;
    return message;
  },
};

function createBaseSyncStatusResponse(): SyncStatusResponse {
  return { isSyncing: false, syncStatus: [], engineStarted: false };
}

export const SyncStatusResponse = {
  encode(message: SyncStatusResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.isSyncing === true) {
      writer.uint32(8).bool(message.isSyncing);
    }
    for (const v of message.syncStatus) {
      SyncStatus.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    if (message.engineStarted === true) {
      writer.uint32(24).bool(message.engineStarted);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SyncStatusResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSyncStatusResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 8) {
            break;
          }

          message.isSyncing = reader.bool();
          continue;
        case 2:
          if (tag != 18) {
            break;
          }

          message.syncStatus.push(SyncStatus.decode(reader, reader.uint32()));
          continue;
        case 3:
          if (tag != 24) {
            break;
          }

          message.engineStarted = reader.bool();
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): SyncStatusResponse {
    return {
      isSyncing: isSet(object.isSyncing) ? Boolean(object.isSyncing) : false,
      syncStatus: Array.isArray(object?.syncStatus) ? object.syncStatus.map((e: any) => SyncStatus.fromJSON(e)) : [],
      engineStarted: isSet(object.engineStarted) ? Boolean(object.engineStarted) : false,
    };
  },

  toJSON(message: SyncStatusResponse): unknown {
    const obj: any = {};
    message.isSyncing !== undefined && (obj.isSyncing = message.isSyncing);
    if (message.syncStatus) {
      obj.syncStatus = message.syncStatus.map((e) => e ? SyncStatus.toJSON(e) : undefined);
    } else {
      obj.syncStatus = [];
    }
    message.engineStarted !== undefined && (obj.engineStarted = message.engineStarted);
    return obj;
  },

  create<I extends Exact<DeepPartial<SyncStatusResponse>, I>>(base?: I): SyncStatusResponse {
    return SyncStatusResponse.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SyncStatusResponse>, I>>(object: I): SyncStatusResponse {
    const message = createBaseSyncStatusResponse();
    message.isSyncing = object.isSyncing ?? false;
    message.syncStatus = object.syncStatus?.map((e) => SyncStatus.fromPartial(e)) || [];
    message.engineStarted = object.engineStarted ?? false;
    return message;
  },
};

function createBaseSyncStatus(): SyncStatus {
  return {
    peerId: "",
    inSync: "",
    shouldSync: false,
    divergencePrefix: "",
    divergenceSecondsAgo: 0,
    theirMessages: 0,
    ourMessages: 0,
    lastBadSync: 0,
    score: 0,
  };
}

export const SyncStatus = {
  encode(message: SyncStatus, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.peerId !== "") {
      writer.uint32(10).string(message.peerId);
    }
    if (message.inSync !== "") {
      writer.uint32(18).string(message.inSync);
    }
    if (message.shouldSync === true) {
      writer.uint32(24).bool(message.shouldSync);
    }
    if (message.divergencePrefix !== "") {
      writer.uint32(34).string(message.divergencePrefix);
    }
    if (message.divergenceSecondsAgo !== 0) {
      writer.uint32(40).int32(message.divergenceSecondsAgo);
    }
    if (message.theirMessages !== 0) {
      writer.uint32(48).uint64(message.theirMessages);
    }
    if (message.ourMessages !== 0) {
      writer.uint32(56).uint64(message.ourMessages);
    }
    if (message.lastBadSync !== 0) {
      writer.uint32(64).int64(message.lastBadSync);
    }
    if (message.score !== 0) {
      writer.uint32(72).int64(message.score);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SyncStatus {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSyncStatus();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 10) {
            break;
          }

          message.peerId = reader.string();
          continue;
        case 2:
          if (tag != 18) {
            break;
          }

          message.inSync = reader.string();
          continue;
        case 3:
          if (tag != 24) {
            break;
          }

          message.shouldSync = reader.bool();
          continue;
        case 4:
          if (tag != 34) {
            break;
          }

          message.divergencePrefix = reader.string();
          continue;
        case 5:
          if (tag != 40) {
            break;
          }

          message.divergenceSecondsAgo = reader.int32();
          continue;
        case 6:
          if (tag != 48) {
            break;
          }

          message.theirMessages = longToNumber(reader.uint64() as Long);
          continue;
        case 7:
          if (tag != 56) {
            break;
          }

          message.ourMessages = longToNumber(reader.uint64() as Long);
          continue;
        case 8:
          if (tag != 64) {
            break;
          }

          message.lastBadSync = longToNumber(reader.int64() as Long);
          continue;
        case 9:
          if (tag != 72) {
            break;
          }

          message.score = longToNumber(reader.int64() as Long);
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): SyncStatus {
    return {
      peerId: isSet(object.peerId) ? String(object.peerId) : "",
      inSync: isSet(object.inSync) ? String(object.inSync) : "",
      shouldSync: isSet(object.shouldSync) ? Boolean(object.shouldSync) : false,
      divergencePrefix: isSet(object.divergencePrefix) ? String(object.divergencePrefix) : "",
      divergenceSecondsAgo: isSet(object.divergenceSecondsAgo) ? Number(object.divergenceSecondsAgo) : 0,
      theirMessages: isSet(object.theirMessages) ? Number(object.theirMessages) : 0,
      ourMessages: isSet(object.ourMessages) ? Number(object.ourMessages) : 0,
      lastBadSync: isSet(object.lastBadSync) ? Number(object.lastBadSync) : 0,
      score: isSet(object.score) ? Number(object.score) : 0,
    };
  },

  toJSON(message: SyncStatus): unknown {
    const obj: any = {};
    message.peerId !== undefined && (obj.peerId = message.peerId);
    message.inSync !== undefined && (obj.inSync = message.inSync);
    message.shouldSync !== undefined && (obj.shouldSync = message.shouldSync);
    message.divergencePrefix !== undefined && (obj.divergencePrefix = message.divergencePrefix);
    message.divergenceSecondsAgo !== undefined && (obj.divergenceSecondsAgo = Math.round(message.divergenceSecondsAgo));
    message.theirMessages !== undefined && (obj.theirMessages = Math.round(message.theirMessages));
    message.ourMessages !== undefined && (obj.ourMessages = Math.round(message.ourMessages));
    message.lastBadSync !== undefined && (obj.lastBadSync = Math.round(message.lastBadSync));
    message.score !== undefined && (obj.score = Math.round(message.score));
    return obj;
  },

  create<I extends Exact<DeepPartial<SyncStatus>, I>>(base?: I): SyncStatus {
    return SyncStatus.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SyncStatus>, I>>(object: I): SyncStatus {
    const message = createBaseSyncStatus();
    message.peerId = object.peerId ?? "";
    message.inSync = object.inSync ?? "";
    message.shouldSync = object.shouldSync ?? false;
    message.divergencePrefix = object.divergencePrefix ?? "";
    message.divergenceSecondsAgo = object.divergenceSecondsAgo ?? 0;
    message.theirMessages = object.theirMessages ?? 0;
    message.ourMessages = object.ourMessages ?? 0;
    message.lastBadSync = object.lastBadSync ?? 0;
    message.score = object.score ?? 0;
    return message;
  },
};

function createBaseTrieNodeMetadataResponse(): TrieNodeMetadataResponse {
  return { prefix: new Uint8Array(), numMessages: 0, hash: "", children: [] };
}

export const TrieNodeMetadataResponse = {
  encode(message: TrieNodeMetadataResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.prefix.length !== 0) {
      writer.uint32(10).bytes(message.prefix);
    }
    if (message.numMessages !== 0) {
      writer.uint32(16).uint64(message.numMessages);
    }
    if (message.hash !== "") {
      writer.uint32(26).string(message.hash);
    }
    for (const v of message.children) {
      TrieNodeMetadataResponse.encode(v!, writer.uint32(34).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): TrieNodeMetadataResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTrieNodeMetadataResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 10) {
            break;
          }

          message.prefix = reader.bytes();
          continue;
        case 2:
          if (tag != 16) {
            break;
          }

          message.numMessages = longToNumber(reader.uint64() as Long);
          continue;
        case 3:
          if (tag != 26) {
            break;
          }

          message.hash = reader.string();
          continue;
        case 4:
          if (tag != 34) {
            break;
          }

          message.children.push(TrieNodeMetadataResponse.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): TrieNodeMetadataResponse {
    return {
      prefix: isSet(object.prefix) ? bytesFromBase64(object.prefix) : new Uint8Array(),
      numMessages: isSet(object.numMessages) ? Number(object.numMessages) : 0,
      hash: isSet(object.hash) ? String(object.hash) : "",
      children: Array.isArray(object?.children)
        ? object.children.map((e: any) => TrieNodeMetadataResponse.fromJSON(e))
        : [],
    };
  },

  toJSON(message: TrieNodeMetadataResponse): unknown {
    const obj: any = {};
    message.prefix !== undefined &&
      (obj.prefix = base64FromBytes(message.prefix !== undefined ? message.prefix : new Uint8Array()));
    message.numMessages !== undefined && (obj.numMessages = Math.round(message.numMessages));
    message.hash !== undefined && (obj.hash = message.hash);
    if (message.children) {
      obj.children = message.children.map((e) => e ? TrieNodeMetadataResponse.toJSON(e) : undefined);
    } else {
      obj.children = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<TrieNodeMetadataResponse>, I>>(base?: I): TrieNodeMetadataResponse {
    return TrieNodeMetadataResponse.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<TrieNodeMetadataResponse>, I>>(object: I): TrieNodeMetadataResponse {
    const message = createBaseTrieNodeMetadataResponse();
    message.prefix = object.prefix ?? new Uint8Array();
    message.numMessages = object.numMessages ?? 0;
    message.hash = object.hash ?? "";
    message.children = object.children?.map((e) => TrieNodeMetadataResponse.fromPartial(e)) || [];
    return message;
  },
};

function createBaseTrieNodeSnapshotResponse(): TrieNodeSnapshotResponse {
  return { prefix: new Uint8Array(), excludedHashes: [], numMessages: 0, rootHash: "" };
}

export const TrieNodeSnapshotResponse = {
  encode(message: TrieNodeSnapshotResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.prefix.length !== 0) {
      writer.uint32(10).bytes(message.prefix);
    }
    for (const v of message.excludedHashes) {
      writer.uint32(18).string(v!);
    }
    if (message.numMessages !== 0) {
      writer.uint32(24).uint64(message.numMessages);
    }
    if (message.rootHash !== "") {
      writer.uint32(34).string(message.rootHash);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): TrieNodeSnapshotResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTrieNodeSnapshotResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 10) {
            break;
          }

          message.prefix = reader.bytes();
          continue;
        case 2:
          if (tag != 18) {
            break;
          }

          message.excludedHashes.push(reader.string());
          continue;
        case 3:
          if (tag != 24) {
            break;
          }

          message.numMessages = longToNumber(reader.uint64() as Long);
          continue;
        case 4:
          if (tag != 34) {
            break;
          }

          message.rootHash = reader.string();
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): TrieNodeSnapshotResponse {
    return {
      prefix: isSet(object.prefix) ? bytesFromBase64(object.prefix) : new Uint8Array(),
      excludedHashes: Array.isArray(object?.excludedHashes) ? object.excludedHashes.map((e: any) => String(e)) : [],
      numMessages: isSet(object.numMessages) ? Number(object.numMessages) : 0,
      rootHash: isSet(object.rootHash) ? String(object.rootHash) : "",
    };
  },

  toJSON(message: TrieNodeSnapshotResponse): unknown {
    const obj: any = {};
    message.prefix !== undefined &&
      (obj.prefix = base64FromBytes(message.prefix !== undefined ? message.prefix : new Uint8Array()));
    if (message.excludedHashes) {
      obj.excludedHashes = message.excludedHashes.map((e) => e);
    } else {
      obj.excludedHashes = [];
    }
    message.numMessages !== undefined && (obj.numMessages = Math.round(message.numMessages));
    message.rootHash !== undefined && (obj.rootHash = message.rootHash);
    return obj;
  },

  create<I extends Exact<DeepPartial<TrieNodeSnapshotResponse>, I>>(base?: I): TrieNodeSnapshotResponse {
    return TrieNodeSnapshotResponse.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<TrieNodeSnapshotResponse>, I>>(object: I): TrieNodeSnapshotResponse {
    const message = createBaseTrieNodeSnapshotResponse();
    message.prefix = object.prefix ?? new Uint8Array();
    message.excludedHashes = object.excludedHashes?.map((e) => e) || [];
    message.numMessages = object.numMessages ?? 0;
    message.rootHash = object.rootHash ?? "";
    return message;
  },
};

function createBaseTrieNodePrefix(): TrieNodePrefix {
  return { prefix: new Uint8Array() };
}

export const TrieNodePrefix = {
  encode(message: TrieNodePrefix, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.prefix.length !== 0) {
      writer.uint32(10).bytes(message.prefix);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): TrieNodePrefix {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTrieNodePrefix();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 10) {
            break;
          }

          message.prefix = reader.bytes();
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): TrieNodePrefix {
    return { prefix: isSet(object.prefix) ? bytesFromBase64(object.prefix) : new Uint8Array() };
  },

  toJSON(message: TrieNodePrefix): unknown {
    const obj: any = {};
    message.prefix !== undefined &&
      (obj.prefix = base64FromBytes(message.prefix !== undefined ? message.prefix : new Uint8Array()));
    return obj;
  },

  create<I extends Exact<DeepPartial<TrieNodePrefix>, I>>(base?: I): TrieNodePrefix {
    return TrieNodePrefix.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<TrieNodePrefix>, I>>(object: I): TrieNodePrefix {
    const message = createBaseTrieNodePrefix();
    message.prefix = object.prefix ?? new Uint8Array();
    return message;
  },
};

function createBaseSyncIds(): SyncIds {
  return { syncIds: [] };
}

export const SyncIds = {
  encode(message: SyncIds, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.syncIds) {
      writer.uint32(10).bytes(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SyncIds {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSyncIds();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 10) {
            break;
          }

          message.syncIds.push(reader.bytes());
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): SyncIds {
    return { syncIds: Array.isArray(object?.syncIds) ? object.syncIds.map((e: any) => bytesFromBase64(e)) : [] };
  },

  toJSON(message: SyncIds): unknown {
    const obj: any = {};
    if (message.syncIds) {
      obj.syncIds = message.syncIds.map((e) => base64FromBytes(e !== undefined ? e : new Uint8Array()));
    } else {
      obj.syncIds = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<SyncIds>, I>>(base?: I): SyncIds {
    return SyncIds.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SyncIds>, I>>(object: I): SyncIds {
    const message = createBaseSyncIds();
    message.syncIds = object.syncIds?.map((e) => e) || [];
    return message;
  },
};

function createBaseFidRequest(): FidRequest {
  return { fid: 0, pageSize: undefined, pageToken: undefined, reverse: undefined };
}

export const FidRequest = {
  encode(message: FidRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.fid !== 0) {
      writer.uint32(8).uint64(message.fid);
    }
    if (message.pageSize !== undefined) {
      writer.uint32(16).uint32(message.pageSize);
    }
    if (message.pageToken !== undefined) {
      writer.uint32(26).bytes(message.pageToken);
    }
    if (message.reverse !== undefined) {
      writer.uint32(32).bool(message.reverse);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): FidRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseFidRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 8) {
            break;
          }

          message.fid = longToNumber(reader.uint64() as Long);
          continue;
        case 2:
          if (tag != 16) {
            break;
          }

          message.pageSize = reader.uint32();
          continue;
        case 3:
          if (tag != 26) {
            break;
          }

          message.pageToken = reader.bytes();
          continue;
        case 4:
          if (tag != 32) {
            break;
          }

          message.reverse = reader.bool();
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): FidRequest {
    return {
      fid: isSet(object.fid) ? Number(object.fid) : 0,
      pageSize: isSet(object.pageSize) ? Number(object.pageSize) : undefined,
      pageToken: isSet(object.pageToken) ? bytesFromBase64(object.pageToken) : undefined,
      reverse: isSet(object.reverse) ? Boolean(object.reverse) : undefined,
    };
  },

  toJSON(message: FidRequest): unknown {
    const obj: any = {};
    message.fid !== undefined && (obj.fid = Math.round(message.fid));
    message.pageSize !== undefined && (obj.pageSize = Math.round(message.pageSize));
    message.pageToken !== undefined &&
      (obj.pageToken = message.pageToken !== undefined ? base64FromBytes(message.pageToken) : undefined);
    message.reverse !== undefined && (obj.reverse = message.reverse);
    return obj;
  },

  create<I extends Exact<DeepPartial<FidRequest>, I>>(base?: I): FidRequest {
    return FidRequest.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<FidRequest>, I>>(object: I): FidRequest {
    const message = createBaseFidRequest();
    message.fid = object.fid ?? 0;
    message.pageSize = object.pageSize ?? undefined;
    message.pageToken = object.pageToken ?? undefined;
    message.reverse = object.reverse ?? undefined;
    return message;
  },
};

function createBaseFidTimestampRequest(): FidTimestampRequest {
  return {
    fid: 0,
    pageSize: undefined,
    pageToken: undefined,
    reverse: undefined,
    startTimestamp: undefined,
    stopTimestamp: undefined,
  };
}

export const FidTimestampRequest = {
  encode(message: FidTimestampRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.fid !== 0) {
      writer.uint32(8).uint64(message.fid);
    }
    if (message.pageSize !== undefined) {
      writer.uint32(16).uint32(message.pageSize);
    }
    if (message.pageToken !== undefined) {
      writer.uint32(26).bytes(message.pageToken);
    }
    if (message.reverse !== undefined) {
      writer.uint32(32).bool(message.reverse);
    }
    if (message.startTimestamp !== undefined) {
      writer.uint32(40).uint64(message.startTimestamp);
    }
    if (message.stopTimestamp !== undefined) {
      writer.uint32(48).uint64(message.stopTimestamp);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): FidTimestampRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseFidTimestampRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 8) {
            break;
          }

          message.fid = longToNumber(reader.uint64() as Long);
          continue;
        case 2:
          if (tag != 16) {
            break;
          }

          message.pageSize = reader.uint32();
          continue;
        case 3:
          if (tag != 26) {
            break;
          }

          message.pageToken = reader.bytes();
          continue;
        case 4:
          if (tag != 32) {
            break;
          }

          message.reverse = reader.bool();
          continue;
        case 5:
          if (tag != 40) {
            break;
          }

          message.startTimestamp = longToNumber(reader.uint64() as Long);
          continue;
        case 6:
          if (tag != 48) {
            break;
          }

          message.stopTimestamp = longToNumber(reader.uint64() as Long);
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): FidTimestampRequest {
    return {
      fid: isSet(object.fid) ? Number(object.fid) : 0,
      pageSize: isSet(object.pageSize) ? Number(object.pageSize) : undefined,
      pageToken: isSet(object.pageToken) ? bytesFromBase64(object.pageToken) : undefined,
      reverse: isSet(object.reverse) ? Boolean(object.reverse) : undefined,
      startTimestamp: isSet(object.startTimestamp) ? Number(object.startTimestamp) : undefined,
      stopTimestamp: isSet(object.stopTimestamp) ? Number(object.stopTimestamp) : undefined,
    };
  },

  toJSON(message: FidTimestampRequest): unknown {
    const obj: any = {};
    message.fid !== undefined && (obj.fid = Math.round(message.fid));
    message.pageSize !== undefined && (obj.pageSize = Math.round(message.pageSize));
    message.pageToken !== undefined &&
      (obj.pageToken = message.pageToken !== undefined ? base64FromBytes(message.pageToken) : undefined);
    message.reverse !== undefined && (obj.reverse = message.reverse);
    message.startTimestamp !== undefined && (obj.startTimestamp = Math.round(message.startTimestamp));
    message.stopTimestamp !== undefined && (obj.stopTimestamp = Math.round(message.stopTimestamp));
    return obj;
  },

  create<I extends Exact<DeepPartial<FidTimestampRequest>, I>>(base?: I): FidTimestampRequest {
    return FidTimestampRequest.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<FidTimestampRequest>, I>>(object: I): FidTimestampRequest {
    const message = createBaseFidTimestampRequest();
    message.fid = object.fid ?? 0;
    message.pageSize = object.pageSize ?? undefined;
    message.pageToken = object.pageToken ?? undefined;
    message.reverse = object.reverse ?? undefined;
    message.startTimestamp = object.startTimestamp ?? undefined;
    message.stopTimestamp = object.stopTimestamp ?? undefined;
    return message;
  },
};

function createBaseFidsRequest(): FidsRequest {
  return { pageSize: undefined, pageToken: undefined, reverse: undefined };
}

export const FidsRequest = {
  encode(message: FidsRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.pageSize !== undefined) {
      writer.uint32(8).uint32(message.pageSize);
    }
    if (message.pageToken !== undefined) {
      writer.uint32(18).bytes(message.pageToken);
    }
    if (message.reverse !== undefined) {
      writer.uint32(24).bool(message.reverse);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): FidsRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseFidsRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 8) {
            break;
          }

          message.pageSize = reader.uint32();
          continue;
        case 2:
          if (tag != 18) {
            break;
          }

          message.pageToken = reader.bytes();
          continue;
        case 3:
          if (tag != 24) {
            break;
          }

          message.reverse = reader.bool();
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): FidsRequest {
    return {
      pageSize: isSet(object.pageSize) ? Number(object.pageSize) : undefined,
      pageToken: isSet(object.pageToken) ? bytesFromBase64(object.pageToken) : undefined,
      reverse: isSet(object.reverse) ? Boolean(object.reverse) : undefined,
    };
  },

  toJSON(message: FidsRequest): unknown {
    const obj: any = {};
    message.pageSize !== undefined && (obj.pageSize = Math.round(message.pageSize));
    message.pageToken !== undefined &&
      (obj.pageToken = message.pageToken !== undefined ? base64FromBytes(message.pageToken) : undefined);
    message.reverse !== undefined && (obj.reverse = message.reverse);
    return obj;
  },

  create<I extends Exact<DeepPartial<FidsRequest>, I>>(base?: I): FidsRequest {
    return FidsRequest.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<FidsRequest>, I>>(object: I): FidsRequest {
    const message = createBaseFidsRequest();
    message.pageSize = object.pageSize ?? undefined;
    message.pageToken = object.pageToken ?? undefined;
    message.reverse = object.reverse ?? undefined;
    return message;
  },
};

function createBaseFidsResponse(): FidsResponse {
  return { fids: [], nextPageToken: undefined };
}

export const FidsResponse = {
  encode(message: FidsResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    writer.uint32(10).fork();
    for (const v of message.fids) {
      writer.uint64(v);
    }
    writer.ldelim();
    if (message.nextPageToken !== undefined) {
      writer.uint32(18).bytes(message.nextPageToken);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): FidsResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseFidsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag == 8) {
            message.fids.push(longToNumber(reader.uint64() as Long));
            continue;
          }

          if (tag == 10) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.fids.push(longToNumber(reader.uint64() as Long));
            }

            continue;
          }

          break;
        case 2:
          if (tag != 18) {
            break;
          }

          message.nextPageToken = reader.bytes();
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): FidsResponse {
    return {
      fids: Array.isArray(object?.fids) ? object.fids.map((e: any) => Number(e)) : [],
      nextPageToken: isSet(object.nextPageToken) ? bytesFromBase64(object.nextPageToken) : undefined,
    };
  },

  toJSON(message: FidsResponse): unknown {
    const obj: any = {};
    if (message.fids) {
      obj.fids = message.fids.map((e) => Math.round(e));
    } else {
      obj.fids = [];
    }
    message.nextPageToken !== undefined &&
      (obj.nextPageToken = message.nextPageToken !== undefined ? base64FromBytes(message.nextPageToken) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<FidsResponse>, I>>(base?: I): FidsResponse {
    return FidsResponse.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<FidsResponse>, I>>(object: I): FidsResponse {
    const message = createBaseFidsResponse();
    message.fids = object.fids?.map((e) => e) || [];
    message.nextPageToken = object.nextPageToken ?? undefined;
    return message;
  },
};

function createBaseMessagesResponse(): MessagesResponse {
  return { messages: [], nextPageToken: undefined };
}

export const MessagesResponse = {
  encode(message: MessagesResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.messages) {
      Message.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.nextPageToken !== undefined) {
      writer.uint32(18).bytes(message.nextPageToken);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MessagesResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMessagesResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 10) {
            break;
          }

          message.messages.push(Message.decode(reader, reader.uint32()));
          continue;
        case 2:
          if (tag != 18) {
            break;
          }

          message.nextPageToken = reader.bytes();
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): MessagesResponse {
    return {
      messages: Array.isArray(object?.messages) ? object.messages.map((e: any) => Message.fromJSON(e)) : [],
      nextPageToken: isSet(object.nextPageToken) ? bytesFromBase64(object.nextPageToken) : undefined,
    };
  },

  toJSON(message: MessagesResponse): unknown {
    const obj: any = {};
    if (message.messages) {
      obj.messages = message.messages.map((e) => e ? Message.toJSON(e) : undefined);
    } else {
      obj.messages = [];
    }
    message.nextPageToken !== undefined &&
      (obj.nextPageToken = message.nextPageToken !== undefined ? base64FromBytes(message.nextPageToken) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<MessagesResponse>, I>>(base?: I): MessagesResponse {
    return MessagesResponse.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<MessagesResponse>, I>>(object: I): MessagesResponse {
    const message = createBaseMessagesResponse();
    message.messages = object.messages?.map((e) => Message.fromPartial(e)) || [];
    message.nextPageToken = object.nextPageToken ?? undefined;
    return message;
  },
};

function createBaseCastsByParentRequest(): CastsByParentRequest {
  return {
    parentCastId: undefined,
    parentUrl: undefined,
    pageSize: undefined,
    pageToken: undefined,
    reverse: undefined,
  };
}

export const CastsByParentRequest = {
  encode(message: CastsByParentRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.parentCastId !== undefined) {
      CastId.encode(message.parentCastId, writer.uint32(10).fork()).ldelim();
    }
    if (message.parentUrl !== undefined) {
      writer.uint32(42).string(message.parentUrl);
    }
    if (message.pageSize !== undefined) {
      writer.uint32(16).uint32(message.pageSize);
    }
    if (message.pageToken !== undefined) {
      writer.uint32(26).bytes(message.pageToken);
    }
    if (message.reverse !== undefined) {
      writer.uint32(32).bool(message.reverse);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): CastsByParentRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCastsByParentRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 10) {
            break;
          }

          message.parentCastId = CastId.decode(reader, reader.uint32());
          continue;
        case 5:
          if (tag != 42) {
            break;
          }

          message.parentUrl = reader.string();
          continue;
        case 2:
          if (tag != 16) {
            break;
          }

          message.pageSize = reader.uint32();
          continue;
        case 3:
          if (tag != 26) {
            break;
          }

          message.pageToken = reader.bytes();
          continue;
        case 4:
          if (tag != 32) {
            break;
          }

          message.reverse = reader.bool();
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): CastsByParentRequest {
    return {
      parentCastId: isSet(object.parentCastId) ? CastId.fromJSON(object.parentCastId) : undefined,
      parentUrl: isSet(object.parentUrl) ? String(object.parentUrl) : undefined,
      pageSize: isSet(object.pageSize) ? Number(object.pageSize) : undefined,
      pageToken: isSet(object.pageToken) ? bytesFromBase64(object.pageToken) : undefined,
      reverse: isSet(object.reverse) ? Boolean(object.reverse) : undefined,
    };
  },

  toJSON(message: CastsByParentRequest): unknown {
    const obj: any = {};
    message.parentCastId !== undefined &&
      (obj.parentCastId = message.parentCastId ? CastId.toJSON(message.parentCastId) : undefined);
    message.parentUrl !== undefined && (obj.parentUrl = message.parentUrl);
    message.pageSize !== undefined && (obj.pageSize = Math.round(message.pageSize));
    message.pageToken !== undefined &&
      (obj.pageToken = message.pageToken !== undefined ? base64FromBytes(message.pageToken) : undefined);
    message.reverse !== undefined && (obj.reverse = message.reverse);
    return obj;
  },

  create<I extends Exact<DeepPartial<CastsByParentRequest>, I>>(base?: I): CastsByParentRequest {
    return CastsByParentRequest.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<CastsByParentRequest>, I>>(object: I): CastsByParentRequest {
    const message = createBaseCastsByParentRequest();
    message.parentCastId = (object.parentCastId !== undefined && object.parentCastId !== null)
      ? CastId.fromPartial(object.parentCastId)
      : undefined;
    message.parentUrl = object.parentUrl ?? undefined;
    message.pageSize = object.pageSize ?? undefined;
    message.pageToken = object.pageToken ?? undefined;
    message.reverse = object.reverse ?? undefined;
    return message;
  },
};

function createBaseReactionRequest(): ReactionRequest {
  return { fid: 0, reactionType: 0, targetCastId: undefined, targetUrl: undefined };
}

export const ReactionRequest = {
  encode(message: ReactionRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.fid !== 0) {
      writer.uint32(8).uint64(message.fid);
    }
    if (message.reactionType !== 0) {
      writer.uint32(16).int32(message.reactionType);
    }
    if (message.targetCastId !== undefined) {
      CastId.encode(message.targetCastId, writer.uint32(26).fork()).ldelim();
    }
    if (message.targetUrl !== undefined) {
      writer.uint32(34).string(message.targetUrl);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ReactionRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseReactionRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 8) {
            break;
          }

          message.fid = longToNumber(reader.uint64() as Long);
          continue;
        case 2:
          if (tag != 16) {
            break;
          }

          message.reactionType = reader.int32() as any;
          continue;
        case 3:
          if (tag != 26) {
            break;
          }

          message.targetCastId = CastId.decode(reader, reader.uint32());
          continue;
        case 4:
          if (tag != 34) {
            break;
          }

          message.targetUrl = reader.string();
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ReactionRequest {
    return {
      fid: isSet(object.fid) ? Number(object.fid) : 0,
      reactionType: isSet(object.reactionType) ? reactionTypeFromJSON(object.reactionType) : 0,
      targetCastId: isSet(object.targetCastId) ? CastId.fromJSON(object.targetCastId) : undefined,
      targetUrl: isSet(object.targetUrl) ? String(object.targetUrl) : undefined,
    };
  },

  toJSON(message: ReactionRequest): unknown {
    const obj: any = {};
    message.fid !== undefined && (obj.fid = Math.round(message.fid));
    message.reactionType !== undefined && (obj.reactionType = reactionTypeToJSON(message.reactionType));
    message.targetCastId !== undefined &&
      (obj.targetCastId = message.targetCastId ? CastId.toJSON(message.targetCastId) : undefined);
    message.targetUrl !== undefined && (obj.targetUrl = message.targetUrl);
    return obj;
  },

  create<I extends Exact<DeepPartial<ReactionRequest>, I>>(base?: I): ReactionRequest {
    return ReactionRequest.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ReactionRequest>, I>>(object: I): ReactionRequest {
    const message = createBaseReactionRequest();
    message.fid = object.fid ?? 0;
    message.reactionType = object.reactionType ?? 0;
    message.targetCastId = (object.targetCastId !== undefined && object.targetCastId !== null)
      ? CastId.fromPartial(object.targetCastId)
      : undefined;
    message.targetUrl = object.targetUrl ?? undefined;
    return message;
  },
};

function createBaseReactionsByFidRequest(): ReactionsByFidRequest {
  return { fid: 0, reactionType: undefined, pageSize: undefined, pageToken: undefined, reverse: undefined };
}

export const ReactionsByFidRequest = {
  encode(message: ReactionsByFidRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.fid !== 0) {
      writer.uint32(8).uint64(message.fid);
    }
    if (message.reactionType !== undefined) {
      writer.uint32(16).int32(message.reactionType);
    }
    if (message.pageSize !== undefined) {
      writer.uint32(24).uint32(message.pageSize);
    }
    if (message.pageToken !== undefined) {
      writer.uint32(34).bytes(message.pageToken);
    }
    if (message.reverse !== undefined) {
      writer.uint32(40).bool(message.reverse);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ReactionsByFidRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseReactionsByFidRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 8) {
            break;
          }

          message.fid = longToNumber(reader.uint64() as Long);
          continue;
        case 2:
          if (tag != 16) {
            break;
          }

          message.reactionType = reader.int32() as any;
          continue;
        case 3:
          if (tag != 24) {
            break;
          }

          message.pageSize = reader.uint32();
          continue;
        case 4:
          if (tag != 34) {
            break;
          }

          message.pageToken = reader.bytes();
          continue;
        case 5:
          if (tag != 40) {
            break;
          }

          message.reverse = reader.bool();
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ReactionsByFidRequest {
    return {
      fid: isSet(object.fid) ? Number(object.fid) : 0,
      reactionType: isSet(object.reactionType) ? reactionTypeFromJSON(object.reactionType) : undefined,
      pageSize: isSet(object.pageSize) ? Number(object.pageSize) : undefined,
      pageToken: isSet(object.pageToken) ? bytesFromBase64(object.pageToken) : undefined,
      reverse: isSet(object.reverse) ? Boolean(object.reverse) : undefined,
    };
  },

  toJSON(message: ReactionsByFidRequest): unknown {
    const obj: any = {};
    message.fid !== undefined && (obj.fid = Math.round(message.fid));
    message.reactionType !== undefined &&
      (obj.reactionType = message.reactionType !== undefined ? reactionTypeToJSON(message.reactionType) : undefined);
    message.pageSize !== undefined && (obj.pageSize = Math.round(message.pageSize));
    message.pageToken !== undefined &&
      (obj.pageToken = message.pageToken !== undefined ? base64FromBytes(message.pageToken) : undefined);
    message.reverse !== undefined && (obj.reverse = message.reverse);
    return obj;
  },

  create<I extends Exact<DeepPartial<ReactionsByFidRequest>, I>>(base?: I): ReactionsByFidRequest {
    return ReactionsByFidRequest.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ReactionsByFidRequest>, I>>(object: I): ReactionsByFidRequest {
    const message = createBaseReactionsByFidRequest();
    message.fid = object.fid ?? 0;
    message.reactionType = object.reactionType ?? undefined;
    message.pageSize = object.pageSize ?? undefined;
    message.pageToken = object.pageToken ?? undefined;
    message.reverse = object.reverse ?? undefined;
    return message;
  },
};

function createBaseReactionsByTargetRequest(): ReactionsByTargetRequest {
  return {
    targetCastId: undefined,
    targetUrl: undefined,
    reactionType: undefined,
    pageSize: undefined,
    pageToken: undefined,
    reverse: undefined,
  };
}

export const ReactionsByTargetRequest = {
  encode(message: ReactionsByTargetRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.targetCastId !== undefined) {
      CastId.encode(message.targetCastId, writer.uint32(10).fork()).ldelim();
    }
    if (message.targetUrl !== undefined) {
      writer.uint32(50).string(message.targetUrl);
    }
    if (message.reactionType !== undefined) {
      writer.uint32(16).int32(message.reactionType);
    }
    if (message.pageSize !== undefined) {
      writer.uint32(24).uint32(message.pageSize);
    }
    if (message.pageToken !== undefined) {
      writer.uint32(34).bytes(message.pageToken);
    }
    if (message.reverse !== undefined) {
      writer.uint32(40).bool(message.reverse);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ReactionsByTargetRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseReactionsByTargetRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 10) {
            break;
          }

          message.targetCastId = CastId.decode(reader, reader.uint32());
          continue;
        case 6:
          if (tag != 50) {
            break;
          }

          message.targetUrl = reader.string();
          continue;
        case 2:
          if (tag != 16) {
            break;
          }

          message.reactionType = reader.int32() as any;
          continue;
        case 3:
          if (tag != 24) {
            break;
          }

          message.pageSize = reader.uint32();
          continue;
        case 4:
          if (tag != 34) {
            break;
          }

          message.pageToken = reader.bytes();
          continue;
        case 5:
          if (tag != 40) {
            break;
          }

          message.reverse = reader.bool();
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ReactionsByTargetRequest {
    return {
      targetCastId: isSet(object.targetCastId) ? CastId.fromJSON(object.targetCastId) : undefined,
      targetUrl: isSet(object.targetUrl) ? String(object.targetUrl) : undefined,
      reactionType: isSet(object.reactionType) ? reactionTypeFromJSON(object.reactionType) : undefined,
      pageSize: isSet(object.pageSize) ? Number(object.pageSize) : undefined,
      pageToken: isSet(object.pageToken) ? bytesFromBase64(object.pageToken) : undefined,
      reverse: isSet(object.reverse) ? Boolean(object.reverse) : undefined,
    };
  },

  toJSON(message: ReactionsByTargetRequest): unknown {
    const obj: any = {};
    message.targetCastId !== undefined &&
      (obj.targetCastId = message.targetCastId ? CastId.toJSON(message.targetCastId) : undefined);
    message.targetUrl !== undefined && (obj.targetUrl = message.targetUrl);
    message.reactionType !== undefined &&
      (obj.reactionType = message.reactionType !== undefined ? reactionTypeToJSON(message.reactionType) : undefined);
    message.pageSize !== undefined && (obj.pageSize = Math.round(message.pageSize));
    message.pageToken !== undefined &&
      (obj.pageToken = message.pageToken !== undefined ? base64FromBytes(message.pageToken) : undefined);
    message.reverse !== undefined && (obj.reverse = message.reverse);
    return obj;
  },

  create<I extends Exact<DeepPartial<ReactionsByTargetRequest>, I>>(base?: I): ReactionsByTargetRequest {
    return ReactionsByTargetRequest.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ReactionsByTargetRequest>, I>>(object: I): ReactionsByTargetRequest {
    const message = createBaseReactionsByTargetRequest();
    message.targetCastId = (object.targetCastId !== undefined && object.targetCastId !== null)
      ? CastId.fromPartial(object.targetCastId)
      : undefined;
    message.targetUrl = object.targetUrl ?? undefined;
    message.reactionType = object.reactionType ?? undefined;
    message.pageSize = object.pageSize ?? undefined;
    message.pageToken = object.pageToken ?? undefined;
    message.reverse = object.reverse ?? undefined;
    return message;
  },
};

function createBaseUserDataRequest(): UserDataRequest {
  return { fid: 0, userDataType: 0 };
}

export const UserDataRequest = {
  encode(message: UserDataRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.fid !== 0) {
      writer.uint32(8).uint64(message.fid);
    }
    if (message.userDataType !== 0) {
      writer.uint32(16).int32(message.userDataType);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UserDataRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserDataRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 8) {
            break;
          }

          message.fid = longToNumber(reader.uint64() as Long);
          continue;
        case 2:
          if (tag != 16) {
            break;
          }

          message.userDataType = reader.int32() as any;
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): UserDataRequest {
    return {
      fid: isSet(object.fid) ? Number(object.fid) : 0,
      userDataType: isSet(object.userDataType) ? userDataTypeFromJSON(object.userDataType) : 0,
    };
  },

  toJSON(message: UserDataRequest): unknown {
    const obj: any = {};
    message.fid !== undefined && (obj.fid = Math.round(message.fid));
    message.userDataType !== undefined && (obj.userDataType = userDataTypeToJSON(message.userDataType));
    return obj;
  },

  create<I extends Exact<DeepPartial<UserDataRequest>, I>>(base?: I): UserDataRequest {
    return UserDataRequest.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UserDataRequest>, I>>(object: I): UserDataRequest {
    const message = createBaseUserDataRequest();
    message.fid = object.fid ?? 0;
    message.userDataType = object.userDataType ?? 0;
    return message;
  },
};

function createBaseNameRegistryEventRequest(): NameRegistryEventRequest {
  return { name: new Uint8Array() };
}

export const NameRegistryEventRequest = {
  encode(message: NameRegistryEventRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.name.length !== 0) {
      writer.uint32(10).bytes(message.name);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): NameRegistryEventRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseNameRegistryEventRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 10) {
            break;
          }

          message.name = reader.bytes();
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): NameRegistryEventRequest {
    return { name: isSet(object.name) ? bytesFromBase64(object.name) : new Uint8Array() };
  },

  toJSON(message: NameRegistryEventRequest): unknown {
    const obj: any = {};
    message.name !== undefined &&
      (obj.name = base64FromBytes(message.name !== undefined ? message.name : new Uint8Array()));
    return obj;
  },

  create<I extends Exact<DeepPartial<NameRegistryEventRequest>, I>>(base?: I): NameRegistryEventRequest {
    return NameRegistryEventRequest.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<NameRegistryEventRequest>, I>>(object: I): NameRegistryEventRequest {
    const message = createBaseNameRegistryEventRequest();
    message.name = object.name ?? new Uint8Array();
    return message;
  },
};

function createBaseRentRegistryEventsRequest(): RentRegistryEventsRequest {
  return { fid: 0 };
}

export const RentRegistryEventsRequest = {
  encode(message: RentRegistryEventsRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.fid !== 0) {
      writer.uint32(8).uint64(message.fid);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): RentRegistryEventsRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRentRegistryEventsRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 8) {
            break;
          }

          message.fid = longToNumber(reader.uint64() as Long);
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): RentRegistryEventsRequest {
    return { fid: isSet(object.fid) ? Number(object.fid) : 0 };
  },

  toJSON(message: RentRegistryEventsRequest): unknown {
    const obj: any = {};
    message.fid !== undefined && (obj.fid = Math.round(message.fid));
    return obj;
  },

  create<I extends Exact<DeepPartial<RentRegistryEventsRequest>, I>>(base?: I): RentRegistryEventsRequest {
    return RentRegistryEventsRequest.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<RentRegistryEventsRequest>, I>>(object: I): RentRegistryEventsRequest {
    const message = createBaseRentRegistryEventsRequest();
    message.fid = object.fid ?? 0;
    return message;
  },
};

function createBaseOnChainEventRequest(): OnChainEventRequest {
  return { fid: 0, eventType: 0, pageSize: undefined, pageToken: undefined, reverse: undefined };
}

export const OnChainEventRequest = {
  encode(message: OnChainEventRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.fid !== 0) {
      writer.uint32(8).uint64(message.fid);
    }
    if (message.eventType !== 0) {
      writer.uint32(16).int32(message.eventType);
    }
    if (message.pageSize !== undefined) {
      writer.uint32(24).uint32(message.pageSize);
    }
    if (message.pageToken !== undefined) {
      writer.uint32(34).bytes(message.pageToken);
    }
    if (message.reverse !== undefined) {
      writer.uint32(40).bool(message.reverse);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): OnChainEventRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseOnChainEventRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 8) {
            break;
          }

          message.fid = longToNumber(reader.uint64() as Long);
          continue;
        case 2:
          if (tag != 16) {
            break;
          }

          message.eventType = reader.int32() as any;
          continue;
        case 3:
          if (tag != 24) {
            break;
          }

          message.pageSize = reader.uint32();
          continue;
        case 4:
          if (tag != 34) {
            break;
          }

          message.pageToken = reader.bytes();
          continue;
        case 5:
          if (tag != 40) {
            break;
          }

          message.reverse = reader.bool();
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): OnChainEventRequest {
    return {
      fid: isSet(object.fid) ? Number(object.fid) : 0,
      eventType: isSet(object.eventType) ? onChainEventTypeFromJSON(object.eventType) : 0,
      pageSize: isSet(object.pageSize) ? Number(object.pageSize) : undefined,
      pageToken: isSet(object.pageToken) ? bytesFromBase64(object.pageToken) : undefined,
      reverse: isSet(object.reverse) ? Boolean(object.reverse) : undefined,
    };
  },

  toJSON(message: OnChainEventRequest): unknown {
    const obj: any = {};
    message.fid !== undefined && (obj.fid = Math.round(message.fid));
    message.eventType !== undefined && (obj.eventType = onChainEventTypeToJSON(message.eventType));
    message.pageSize !== undefined && (obj.pageSize = Math.round(message.pageSize));
    message.pageToken !== undefined &&
      (obj.pageToken = message.pageToken !== undefined ? base64FromBytes(message.pageToken) : undefined);
    message.reverse !== undefined && (obj.reverse = message.reverse);
    return obj;
  },

  create<I extends Exact<DeepPartial<OnChainEventRequest>, I>>(base?: I): OnChainEventRequest {
    return OnChainEventRequest.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<OnChainEventRequest>, I>>(object: I): OnChainEventRequest {
    const message = createBaseOnChainEventRequest();
    message.fid = object.fid ?? 0;
    message.eventType = object.eventType ?? 0;
    message.pageSize = object.pageSize ?? undefined;
    message.pageToken = object.pageToken ?? undefined;
    message.reverse = object.reverse ?? undefined;
    return message;
  },
};

function createBaseOnChainEventResponse(): OnChainEventResponse {
  return { events: [], nextPageToken: undefined };
}

export const OnChainEventResponse = {
  encode(message: OnChainEventResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.events) {
      OnChainEvent.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.nextPageToken !== undefined) {
      writer.uint32(18).bytes(message.nextPageToken);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): OnChainEventResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseOnChainEventResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 10) {
            break;
          }

          message.events.push(OnChainEvent.decode(reader, reader.uint32()));
          continue;
        case 2:
          if (tag != 18) {
            break;
          }

          message.nextPageToken = reader.bytes();
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): OnChainEventResponse {
    return {
      events: Array.isArray(object?.events) ? object.events.map((e: any) => OnChainEvent.fromJSON(e)) : [],
      nextPageToken: isSet(object.nextPageToken) ? bytesFromBase64(object.nextPageToken) : undefined,
    };
  },

  toJSON(message: OnChainEventResponse): unknown {
    const obj: any = {};
    if (message.events) {
      obj.events = message.events.map((e) => e ? OnChainEvent.toJSON(e) : undefined);
    } else {
      obj.events = [];
    }
    message.nextPageToken !== undefined &&
      (obj.nextPageToken = message.nextPageToken !== undefined ? base64FromBytes(message.nextPageToken) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<OnChainEventResponse>, I>>(base?: I): OnChainEventResponse {
    return OnChainEventResponse.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<OnChainEventResponse>, I>>(object: I): OnChainEventResponse {
    const message = createBaseOnChainEventResponse();
    message.events = object.events?.map((e) => OnChainEvent.fromPartial(e)) || [];
    message.nextPageToken = object.nextPageToken ?? undefined;
    return message;
  },
};

function createBaseStorageLimitsResponse(): StorageLimitsResponse {
  return { limits: [], units: 0, unitDetails: [] };
}

export const StorageLimitsResponse = {
  encode(message: StorageLimitsResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.limits) {
      StorageLimit.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.units !== 0) {
      writer.uint32(16).uint32(message.units);
    }
    for (const v of message.unitDetails) {
      StorageUnitDetails.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): StorageLimitsResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseStorageLimitsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 10) {
            break;
          }

          message.limits.push(StorageLimit.decode(reader, reader.uint32()));
          continue;
        case 2:
          if (tag != 16) {
            break;
          }

          message.units = reader.uint32();
          continue;
        case 3:
          if (tag != 26) {
            break;
          }

          message.unitDetails.push(StorageUnitDetails.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): StorageLimitsResponse {
    return {
      limits: Array.isArray(object?.limits) ? object.limits.map((e: any) => StorageLimit.fromJSON(e)) : [],
      units: isSet(object.units) ? Number(object.units) : 0,
      unitDetails: Array.isArray(object?.unitDetails)
        ? object.unitDetails.map((e: any) => StorageUnitDetails.fromJSON(e))
        : [],
    };
  },

  toJSON(message: StorageLimitsResponse): unknown {
    const obj: any = {};
    if (message.limits) {
      obj.limits = message.limits.map((e) => e ? StorageLimit.toJSON(e) : undefined);
    } else {
      obj.limits = [];
    }
    message.units !== undefined && (obj.units = Math.round(message.units));
    if (message.unitDetails) {
      obj.unitDetails = message.unitDetails.map((e) => e ? StorageUnitDetails.toJSON(e) : undefined);
    } else {
      obj.unitDetails = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<StorageLimitsResponse>, I>>(base?: I): StorageLimitsResponse {
    return StorageLimitsResponse.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<StorageLimitsResponse>, I>>(object: I): StorageLimitsResponse {
    const message = createBaseStorageLimitsResponse();
    message.limits = object.limits?.map((e) => StorageLimit.fromPartial(e)) || [];
    message.units = object.units ?? 0;
    message.unitDetails = object.unitDetails?.map((e) => StorageUnitDetails.fromPartial(e)) || [];
    return message;
  },
};

function createBaseStorageUnitDetails(): StorageUnitDetails {
  return { unitType: 0, unitSize: 0 };
}

export const StorageUnitDetails = {
  encode(message: StorageUnitDetails, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.unitType !== 0) {
      writer.uint32(8).int32(message.unitType);
    }
    if (message.unitSize !== 0) {
      writer.uint32(16).uint32(message.unitSize);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): StorageUnitDetails {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseStorageUnitDetails();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 8) {
            break;
          }

          message.unitType = reader.int32() as any;
          continue;
        case 2:
          if (tag != 16) {
            break;
          }

          message.unitSize = reader.uint32();
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): StorageUnitDetails {
    return {
      unitType: isSet(object.unitType) ? storageUnitTypeFromJSON(object.unitType) : 0,
      unitSize: isSet(object.unitSize) ? Number(object.unitSize) : 0,
    };
  },

  toJSON(message: StorageUnitDetails): unknown {
    const obj: any = {};
    message.unitType !== undefined && (obj.unitType = storageUnitTypeToJSON(message.unitType));
    message.unitSize !== undefined && (obj.unitSize = Math.round(message.unitSize));
    return obj;
  },

  create<I extends Exact<DeepPartial<StorageUnitDetails>, I>>(base?: I): StorageUnitDetails {
    return StorageUnitDetails.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<StorageUnitDetails>, I>>(object: I): StorageUnitDetails {
    const message = createBaseStorageUnitDetails();
    message.unitType = object.unitType ?? 0;
    message.unitSize = object.unitSize ?? 0;
    return message;
  },
};

function createBaseStorageLimit(): StorageLimit {
  return { storeType: 0, name: "", limit: 0, used: 0, earliestTimestamp: 0, earliestHash: new Uint8Array() };
}

export const StorageLimit = {
  encode(message: StorageLimit, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.storeType !== 0) {
      writer.uint32(8).int32(message.storeType);
    }
    if (message.name !== "") {
      writer.uint32(18).string(message.name);
    }
    if (message.limit !== 0) {
      writer.uint32(24).uint64(message.limit);
    }
    if (message.used !== 0) {
      writer.uint32(32).uint64(message.used);
    }
    if (message.earliestTimestamp !== 0) {
      writer.uint32(40).uint64(message.earliestTimestamp);
    }
    if (message.earliestHash.length !== 0) {
      writer.uint32(50).bytes(message.earliestHash);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): StorageLimit {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseStorageLimit();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 8) {
            break;
          }

          message.storeType = reader.int32() as any;
          continue;
        case 2:
          if (tag != 18) {
            break;
          }

          message.name = reader.string();
          continue;
        case 3:
          if (tag != 24) {
            break;
          }

          message.limit = longToNumber(reader.uint64() as Long);
          continue;
        case 4:
          if (tag != 32) {
            break;
          }

          message.used = longToNumber(reader.uint64() as Long);
          continue;
        case 5:
          if (tag != 40) {
            break;
          }

          message.earliestTimestamp = longToNumber(reader.uint64() as Long);
          continue;
        case 6:
          if (tag != 50) {
            break;
          }

          message.earliestHash = reader.bytes();
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): StorageLimit {
    return {
      storeType: isSet(object.storeType) ? storeTypeFromJSON(object.storeType) : 0,
      name: isSet(object.name) ? String(object.name) : "",
      limit: isSet(object.limit) ? Number(object.limit) : 0,
      used: isSet(object.used) ? Number(object.used) : 0,
      earliestTimestamp: isSet(object.earliestTimestamp) ? Number(object.earliestTimestamp) : 0,
      earliestHash: isSet(object.earliestHash) ? bytesFromBase64(object.earliestHash) : new Uint8Array(),
    };
  },

  toJSON(message: StorageLimit): unknown {
    const obj: any = {};
    message.storeType !== undefined && (obj.storeType = storeTypeToJSON(message.storeType));
    message.name !== undefined && (obj.name = message.name);
    message.limit !== undefined && (obj.limit = Math.round(message.limit));
    message.used !== undefined && (obj.used = Math.round(message.used));
    message.earliestTimestamp !== undefined && (obj.earliestTimestamp = Math.round(message.earliestTimestamp));
    message.earliestHash !== undefined &&
      (obj.earliestHash = base64FromBytes(
        message.earliestHash !== undefined ? message.earliestHash : new Uint8Array(),
      ));
    return obj;
  },

  create<I extends Exact<DeepPartial<StorageLimit>, I>>(base?: I): StorageLimit {
    return StorageLimit.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<StorageLimit>, I>>(object: I): StorageLimit {
    const message = createBaseStorageLimit();
    message.storeType = object.storeType ?? 0;
    message.name = object.name ?? "";
    message.limit = object.limit ?? 0;
    message.used = object.used ?? 0;
    message.earliestTimestamp = object.earliestTimestamp ?? 0;
    message.earliestHash = object.earliestHash ?? new Uint8Array();
    return message;
  },
};

function createBaseUsernameProofRequest(): UsernameProofRequest {
  return { name: new Uint8Array() };
}

export const UsernameProofRequest = {
  encode(message: UsernameProofRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.name.length !== 0) {
      writer.uint32(10).bytes(message.name);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UsernameProofRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUsernameProofRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 10) {
            break;
          }

          message.name = reader.bytes();
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): UsernameProofRequest {
    return { name: isSet(object.name) ? bytesFromBase64(object.name) : new Uint8Array() };
  },

  toJSON(message: UsernameProofRequest): unknown {
    const obj: any = {};
    message.name !== undefined &&
      (obj.name = base64FromBytes(message.name !== undefined ? message.name : new Uint8Array()));
    return obj;
  },

  create<I extends Exact<DeepPartial<UsernameProofRequest>, I>>(base?: I): UsernameProofRequest {
    return UsernameProofRequest.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UsernameProofRequest>, I>>(object: I): UsernameProofRequest {
    const message = createBaseUsernameProofRequest();
    message.name = object.name ?? new Uint8Array();
    return message;
  },
};

function createBaseUsernameProofsResponse(): UsernameProofsResponse {
  return { proofs: [] };
}

export const UsernameProofsResponse = {
  encode(message: UsernameProofsResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.proofs) {
      UserNameProof.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UsernameProofsResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUsernameProofsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 10) {
            break;
          }

          message.proofs.push(UserNameProof.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): UsernameProofsResponse {
    return { proofs: Array.isArray(object?.proofs) ? object.proofs.map((e: any) => UserNameProof.fromJSON(e)) : [] };
  },

  toJSON(message: UsernameProofsResponse): unknown {
    const obj: any = {};
    if (message.proofs) {
      obj.proofs = message.proofs.map((e) => e ? UserNameProof.toJSON(e) : undefined);
    } else {
      obj.proofs = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<UsernameProofsResponse>, I>>(base?: I): UsernameProofsResponse {
    return UsernameProofsResponse.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UsernameProofsResponse>, I>>(object: I): UsernameProofsResponse {
    const message = createBaseUsernameProofsResponse();
    message.proofs = object.proofs?.map((e) => UserNameProof.fromPartial(e)) || [];
    return message;
  },
};

function createBaseVerificationRequest(): VerificationRequest {
  return { fid: 0, address: new Uint8Array() };
}

export const VerificationRequest = {
  encode(message: VerificationRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.fid !== 0) {
      writer.uint32(8).uint64(message.fid);
    }
    if (message.address.length !== 0) {
      writer.uint32(18).bytes(message.address);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): VerificationRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseVerificationRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 8) {
            break;
          }

          message.fid = longToNumber(reader.uint64() as Long);
          continue;
        case 2:
          if (tag != 18) {
            break;
          }

          message.address = reader.bytes();
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): VerificationRequest {
    return {
      fid: isSet(object.fid) ? Number(object.fid) : 0,
      address: isSet(object.address) ? bytesFromBase64(object.address) : new Uint8Array(),
    };
  },

  toJSON(message: VerificationRequest): unknown {
    const obj: any = {};
    message.fid !== undefined && (obj.fid = Math.round(message.fid));
    message.address !== undefined &&
      (obj.address = base64FromBytes(message.address !== undefined ? message.address : new Uint8Array()));
    return obj;
  },

  create<I extends Exact<DeepPartial<VerificationRequest>, I>>(base?: I): VerificationRequest {
    return VerificationRequest.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<VerificationRequest>, I>>(object: I): VerificationRequest {
    const message = createBaseVerificationRequest();
    message.fid = object.fid ?? 0;
    message.address = object.address ?? new Uint8Array();
    return message;
  },
};

function createBaseSignerRequest(): SignerRequest {
  return { fid: 0, signer: new Uint8Array() };
}

export const SignerRequest = {
  encode(message: SignerRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.fid !== 0) {
      writer.uint32(8).uint64(message.fid);
    }
    if (message.signer.length !== 0) {
      writer.uint32(18).bytes(message.signer);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SignerRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSignerRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 8) {
            break;
          }

          message.fid = longToNumber(reader.uint64() as Long);
          continue;
        case 2:
          if (tag != 18) {
            break;
          }

          message.signer = reader.bytes();
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): SignerRequest {
    return {
      fid: isSet(object.fid) ? Number(object.fid) : 0,
      signer: isSet(object.signer) ? bytesFromBase64(object.signer) : new Uint8Array(),
    };
  },

  toJSON(message: SignerRequest): unknown {
    const obj: any = {};
    message.fid !== undefined && (obj.fid = Math.round(message.fid));
    message.signer !== undefined &&
      (obj.signer = base64FromBytes(message.signer !== undefined ? message.signer : new Uint8Array()));
    return obj;
  },

  create<I extends Exact<DeepPartial<SignerRequest>, I>>(base?: I): SignerRequest {
    return SignerRequest.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SignerRequest>, I>>(object: I): SignerRequest {
    const message = createBaseSignerRequest();
    message.fid = object.fid ?? 0;
    message.signer = object.signer ?? new Uint8Array();
    return message;
  },
};

function createBaseLinkRequest(): LinkRequest {
  return { fid: 0, linkType: "", targetFid: undefined };
}

export const LinkRequest = {
  encode(message: LinkRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.fid !== 0) {
      writer.uint32(8).uint64(message.fid);
    }
    if (message.linkType !== "") {
      writer.uint32(18).string(message.linkType);
    }
    if (message.targetFid !== undefined) {
      writer.uint32(24).uint64(message.targetFid);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): LinkRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseLinkRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 8) {
            break;
          }

          message.fid = longToNumber(reader.uint64() as Long);
          continue;
        case 2:
          if (tag != 18) {
            break;
          }

          message.linkType = reader.string();
          continue;
        case 3:
          if (tag != 24) {
            break;
          }

          message.targetFid = longToNumber(reader.uint64() as Long);
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): LinkRequest {
    return {
      fid: isSet(object.fid) ? Number(object.fid) : 0,
      linkType: isSet(object.linkType) ? String(object.linkType) : "",
      targetFid: isSet(object.targetFid) ? Number(object.targetFid) : undefined,
    };
  },

  toJSON(message: LinkRequest): unknown {
    const obj: any = {};
    message.fid !== undefined && (obj.fid = Math.round(message.fid));
    message.linkType !== undefined && (obj.linkType = message.linkType);
    message.targetFid !== undefined && (obj.targetFid = Math.round(message.targetFid));
    return obj;
  },

  create<I extends Exact<DeepPartial<LinkRequest>, I>>(base?: I): LinkRequest {
    return LinkRequest.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<LinkRequest>, I>>(object: I): LinkRequest {
    const message = createBaseLinkRequest();
    message.fid = object.fid ?? 0;
    message.linkType = object.linkType ?? "";
    message.targetFid = object.targetFid ?? undefined;
    return message;
  },
};

function createBaseLinksByFidRequest(): LinksByFidRequest {
  return { fid: 0, linkType: undefined, pageSize: undefined, pageToken: undefined, reverse: undefined };
}

export const LinksByFidRequest = {
  encode(message: LinksByFidRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.fid !== 0) {
      writer.uint32(8).uint64(message.fid);
    }
    if (message.linkType !== undefined) {
      writer.uint32(18).string(message.linkType);
    }
    if (message.pageSize !== undefined) {
      writer.uint32(24).uint32(message.pageSize);
    }
    if (message.pageToken !== undefined) {
      writer.uint32(34).bytes(message.pageToken);
    }
    if (message.reverse !== undefined) {
      writer.uint32(40).bool(message.reverse);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): LinksByFidRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseLinksByFidRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 8) {
            break;
          }

          message.fid = longToNumber(reader.uint64() as Long);
          continue;
        case 2:
          if (tag != 18) {
            break;
          }

          message.linkType = reader.string();
          continue;
        case 3:
          if (tag != 24) {
            break;
          }

          message.pageSize = reader.uint32();
          continue;
        case 4:
          if (tag != 34) {
            break;
          }

          message.pageToken = reader.bytes();
          continue;
        case 5:
          if (tag != 40) {
            break;
          }

          message.reverse = reader.bool();
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): LinksByFidRequest {
    return {
      fid: isSet(object.fid) ? Number(object.fid) : 0,
      linkType: isSet(object.linkType) ? String(object.linkType) : undefined,
      pageSize: isSet(object.pageSize) ? Number(object.pageSize) : undefined,
      pageToken: isSet(object.pageToken) ? bytesFromBase64(object.pageToken) : undefined,
      reverse: isSet(object.reverse) ? Boolean(object.reverse) : undefined,
    };
  },

  toJSON(message: LinksByFidRequest): unknown {
    const obj: any = {};
    message.fid !== undefined && (obj.fid = Math.round(message.fid));
    message.linkType !== undefined && (obj.linkType = message.linkType);
    message.pageSize !== undefined && (obj.pageSize = Math.round(message.pageSize));
    message.pageToken !== undefined &&
      (obj.pageToken = message.pageToken !== undefined ? base64FromBytes(message.pageToken) : undefined);
    message.reverse !== undefined && (obj.reverse = message.reverse);
    return obj;
  },

  create<I extends Exact<DeepPartial<LinksByFidRequest>, I>>(base?: I): LinksByFidRequest {
    return LinksByFidRequest.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<LinksByFidRequest>, I>>(object: I): LinksByFidRequest {
    const message = createBaseLinksByFidRequest();
    message.fid = object.fid ?? 0;
    message.linkType = object.linkType ?? undefined;
    message.pageSize = object.pageSize ?? undefined;
    message.pageToken = object.pageToken ?? undefined;
    message.reverse = object.reverse ?? undefined;
    return message;
  },
};

function createBaseLinksByTargetRequest(): LinksByTargetRequest {
  return { targetFid: undefined, linkType: undefined, pageSize: undefined, pageToken: undefined, reverse: undefined };
}

export const LinksByTargetRequest = {
  encode(message: LinksByTargetRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.targetFid !== undefined) {
      writer.uint32(8).uint64(message.targetFid);
    }
    if (message.linkType !== undefined) {
      writer.uint32(18).string(message.linkType);
    }
    if (message.pageSize !== undefined) {
      writer.uint32(24).uint32(message.pageSize);
    }
    if (message.pageToken !== undefined) {
      writer.uint32(34).bytes(message.pageToken);
    }
    if (message.reverse !== undefined) {
      writer.uint32(40).bool(message.reverse);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): LinksByTargetRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseLinksByTargetRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 8) {
            break;
          }

          message.targetFid = longToNumber(reader.uint64() as Long);
          continue;
        case 2:
          if (tag != 18) {
            break;
          }

          message.linkType = reader.string();
          continue;
        case 3:
          if (tag != 24) {
            break;
          }

          message.pageSize = reader.uint32();
          continue;
        case 4:
          if (tag != 34) {
            break;
          }

          message.pageToken = reader.bytes();
          continue;
        case 5:
          if (tag != 40) {
            break;
          }

          message.reverse = reader.bool();
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): LinksByTargetRequest {
    return {
      targetFid: isSet(object.targetFid) ? Number(object.targetFid) : undefined,
      linkType: isSet(object.linkType) ? String(object.linkType) : undefined,
      pageSize: isSet(object.pageSize) ? Number(object.pageSize) : undefined,
      pageToken: isSet(object.pageToken) ? bytesFromBase64(object.pageToken) : undefined,
      reverse: isSet(object.reverse) ? Boolean(object.reverse) : undefined,
    };
  },

  toJSON(message: LinksByTargetRequest): unknown {
    const obj: any = {};
    message.targetFid !== undefined && (obj.targetFid = Math.round(message.targetFid));
    message.linkType !== undefined && (obj.linkType = message.linkType);
    message.pageSize !== undefined && (obj.pageSize = Math.round(message.pageSize));
    message.pageToken !== undefined &&
      (obj.pageToken = message.pageToken !== undefined ? base64FromBytes(message.pageToken) : undefined);
    message.reverse !== undefined && (obj.reverse = message.reverse);
    return obj;
  },

  create<I extends Exact<DeepPartial<LinksByTargetRequest>, I>>(base?: I): LinksByTargetRequest {
    return LinksByTargetRequest.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<LinksByTargetRequest>, I>>(object: I): LinksByTargetRequest {
    const message = createBaseLinksByTargetRequest();
    message.targetFid = object.targetFid ?? undefined;
    message.linkType = object.linkType ?? undefined;
    message.pageSize = object.pageSize ?? undefined;
    message.pageToken = object.pageToken ?? undefined;
    message.reverse = object.reverse ?? undefined;
    return message;
  },
};

function createBaseIdRegistryEventByAddressRequest(): IdRegistryEventByAddressRequest {
  return { address: new Uint8Array() };
}

export const IdRegistryEventByAddressRequest = {
  encode(message: IdRegistryEventByAddressRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.address.length !== 0) {
      writer.uint32(10).bytes(message.address);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): IdRegistryEventByAddressRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseIdRegistryEventByAddressRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 10) {
            break;
          }

          message.address = reader.bytes();
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): IdRegistryEventByAddressRequest {
    return { address: isSet(object.address) ? bytesFromBase64(object.address) : new Uint8Array() };
  },

  toJSON(message: IdRegistryEventByAddressRequest): unknown {
    const obj: any = {};
    message.address !== undefined &&
      (obj.address = base64FromBytes(message.address !== undefined ? message.address : new Uint8Array()));
    return obj;
  },

  create<I extends Exact<DeepPartial<IdRegistryEventByAddressRequest>, I>>(base?: I): IdRegistryEventByAddressRequest {
    return IdRegistryEventByAddressRequest.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<IdRegistryEventByAddressRequest>, I>>(
    object: I,
  ): IdRegistryEventByAddressRequest {
    const message = createBaseIdRegistryEventByAddressRequest();
    message.address = object.address ?? new Uint8Array();
    return message;
  },
};

function createBaseContactInfoResponse(): ContactInfoResponse {
  return { contacts: [] };
}

export const ContactInfoResponse = {
  encode(message: ContactInfoResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.contacts) {
      ContactInfoContentBody.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ContactInfoResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseContactInfoResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 10) {
            break;
          }

          message.contacts.push(ContactInfoContentBody.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ContactInfoResponse {
    return {
      contacts: Array.isArray(object?.contacts)
        ? object.contacts.map((e: any) => ContactInfoContentBody.fromJSON(e))
        : [],
    };
  },

  toJSON(message: ContactInfoResponse): unknown {
    const obj: any = {};
    if (message.contacts) {
      obj.contacts = message.contacts.map((e) => e ? ContactInfoContentBody.toJSON(e) : undefined);
    } else {
      obj.contacts = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ContactInfoResponse>, I>>(base?: I): ContactInfoResponse {
    return ContactInfoResponse.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ContactInfoResponse>, I>>(object: I): ContactInfoResponse {
    const message = createBaseContactInfoResponse();
    message.contacts = object.contacts?.map((e) => ContactInfoContentBody.fromPartial(e)) || [];
    return message;
  },
};

function createBaseValidationResponse(): ValidationResponse {
  return { valid: false, message: undefined };
}

export const ValidationResponse = {
  encode(message: ValidationResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.valid === true) {
      writer.uint32(8).bool(message.valid);
    }
    if (message.message !== undefined) {
      Message.encode(message.message, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ValidationResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseValidationResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 8) {
            break;
          }

          message.valid = reader.bool();
          continue;
        case 2:
          if (tag != 18) {
            break;
          }

          message.message = Message.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ValidationResponse {
    return {
      valid: isSet(object.valid) ? Boolean(object.valid) : false,
      message: isSet(object.message) ? Message.fromJSON(object.message) : undefined,
    };
  },

  toJSON(message: ValidationResponse): unknown {
    const obj: any = {};
    message.valid !== undefined && (obj.valid = message.valid);
    message.message !== undefined && (obj.message = message.message ? Message.toJSON(message.message) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<ValidationResponse>, I>>(base?: I): ValidationResponse {
    return ValidationResponse.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ValidationResponse>, I>>(object: I): ValidationResponse {
    const message = createBaseValidationResponse();
    message.valid = object.valid ?? false;
    message.message = (object.message !== undefined && object.message !== null)
      ? Message.fromPartial(object.message)
      : undefined;
    return message;
  },
};

function createBaseSubmitBulkMessagesRequest(): SubmitBulkMessagesRequest {
  return { messages: [] };
}

export const SubmitBulkMessagesRequest = {
  encode(message: SubmitBulkMessagesRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.messages) {
      Message.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SubmitBulkMessagesRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSubmitBulkMessagesRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 10) {
            break;
          }

          message.messages.push(Message.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): SubmitBulkMessagesRequest {
    return { messages: Array.isArray(object?.messages) ? object.messages.map((e: any) => Message.fromJSON(e)) : [] };
  },

  toJSON(message: SubmitBulkMessagesRequest): unknown {
    const obj: any = {};
    if (message.messages) {
      obj.messages = message.messages.map((e) => e ? Message.toJSON(e) : undefined);
    } else {
      obj.messages = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<SubmitBulkMessagesRequest>, I>>(base?: I): SubmitBulkMessagesRequest {
    return SubmitBulkMessagesRequest.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SubmitBulkMessagesRequest>, I>>(object: I): SubmitBulkMessagesRequest {
    const message = createBaseSubmitBulkMessagesRequest();
    message.messages = object.messages?.map((e) => Message.fromPartial(e)) || [];
    return message;
  },
};

function createBaseMessageError(): MessageError {
  return { hash: new Uint8Array(), errCode: "", message: "" };
}

export const MessageError = {
  encode(message: MessageError, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.hash.length !== 0) {
      writer.uint32(10).bytes(message.hash);
    }
    if (message.errCode !== "") {
      writer.uint32(18).string(message.errCode);
    }
    if (message.message !== "") {
      writer.uint32(26).string(message.message);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MessageError {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMessageError();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 10) {
            break;
          }

          message.hash = reader.bytes();
          continue;
        case 2:
          if (tag != 18) {
            break;
          }

          message.errCode = reader.string();
          continue;
        case 3:
          if (tag != 26) {
            break;
          }

          message.message = reader.string();
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): MessageError {
    return {
      hash: isSet(object.hash) ? bytesFromBase64(object.hash) : new Uint8Array(),
      errCode: isSet(object.errCode) ? String(object.errCode) : "",
      message: isSet(object.message) ? String(object.message) : "",
    };
  },

  toJSON(message: MessageError): unknown {
    const obj: any = {};
    message.hash !== undefined &&
      (obj.hash = base64FromBytes(message.hash !== undefined ? message.hash : new Uint8Array()));
    message.errCode !== undefined && (obj.errCode = message.errCode);
    message.message !== undefined && (obj.message = message.message);
    return obj;
  },

  create<I extends Exact<DeepPartial<MessageError>, I>>(base?: I): MessageError {
    return MessageError.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<MessageError>, I>>(object: I): MessageError {
    const message = createBaseMessageError();
    message.hash = object.hash ?? new Uint8Array();
    message.errCode = object.errCode ?? "";
    message.message = object.message ?? "";
    return message;
  },
};

function createBaseBulkMessageResponse(): BulkMessageResponse {
  return { message: undefined, messageError: undefined };
}

export const BulkMessageResponse = {
  encode(message: BulkMessageResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.message !== undefined) {
      Message.encode(message.message, writer.uint32(10).fork()).ldelim();
    }
    if (message.messageError !== undefined) {
      MessageError.encode(message.messageError, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): BulkMessageResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseBulkMessageResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 10) {
            break;
          }

          message.message = Message.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag != 18) {
            break;
          }

          message.messageError = MessageError.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): BulkMessageResponse {
    return {
      message: isSet(object.message) ? Message.fromJSON(object.message) : undefined,
      messageError: isSet(object.messageError) ? MessageError.fromJSON(object.messageError) : undefined,
    };
  },

  toJSON(message: BulkMessageResponse): unknown {
    const obj: any = {};
    message.message !== undefined && (obj.message = message.message ? Message.toJSON(message.message) : undefined);
    message.messageError !== undefined &&
      (obj.messageError = message.messageError ? MessageError.toJSON(message.messageError) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<BulkMessageResponse>, I>>(base?: I): BulkMessageResponse {
    return BulkMessageResponse.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<BulkMessageResponse>, I>>(object: I): BulkMessageResponse {
    const message = createBaseBulkMessageResponse();
    message.message = (object.message !== undefined && object.message !== null)
      ? Message.fromPartial(object.message)
      : undefined;
    message.messageError = (object.messageError !== undefined && object.messageError !== null)
      ? MessageError.fromPartial(object.messageError)
      : undefined;
    return message;
  },
};

function createBaseSubmitBulkMessagesResponse(): SubmitBulkMessagesResponse {
  return { messages: [] };
}

export const SubmitBulkMessagesResponse = {
  encode(message: SubmitBulkMessagesResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.messages) {
      BulkMessageResponse.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SubmitBulkMessagesResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSubmitBulkMessagesResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 10) {
            break;
          }

          message.messages.push(BulkMessageResponse.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): SubmitBulkMessagesResponse {
    return {
      messages: Array.isArray(object?.messages) ? object.messages.map((e: any) => BulkMessageResponse.fromJSON(e)) : [],
    };
  },

  toJSON(message: SubmitBulkMessagesResponse): unknown {
    const obj: any = {};
    if (message.messages) {
      obj.messages = message.messages.map((e) => e ? BulkMessageResponse.toJSON(e) : undefined);
    } else {
      obj.messages = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<SubmitBulkMessagesResponse>, I>>(base?: I): SubmitBulkMessagesResponse {
    return SubmitBulkMessagesResponse.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SubmitBulkMessagesResponse>, I>>(object: I): SubmitBulkMessagesResponse {
    const message = createBaseSubmitBulkMessagesResponse();
    message.messages = object.messages?.map((e) => BulkMessageResponse.fromPartial(e)) || [];
    return message;
  },
};

function createBaseStreamSyncRequest(): StreamSyncRequest {
  return {
    getInfo: undefined,
    getCurrentPeers: undefined,
    stopSync: undefined,
    forceSync: undefined,
    getSyncStatus: undefined,
    getAllSyncIdsByPrefix: undefined,
    getAllMessagesBySyncIds: undefined,
    getSyncMetadataByPrefix: undefined,
    getSyncSnapshotByPrefix: undefined,
    getOnChainEvents: undefined,
    getOnChainSignersByFid: undefined,
  };
}

export const StreamSyncRequest = {
  encode(message: StreamSyncRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.getInfo !== undefined) {
      HubInfoRequest.encode(message.getInfo, writer.uint32(10).fork()).ldelim();
    }
    if (message.getCurrentPeers !== undefined) {
      Empty.encode(message.getCurrentPeers, writer.uint32(18).fork()).ldelim();
    }
    if (message.stopSync !== undefined) {
      Empty.encode(message.stopSync, writer.uint32(26).fork()).ldelim();
    }
    if (message.forceSync !== undefined) {
      SyncStatusRequest.encode(message.forceSync, writer.uint32(34).fork()).ldelim();
    }
    if (message.getSyncStatus !== undefined) {
      SyncStatusRequest.encode(message.getSyncStatus, writer.uint32(42).fork()).ldelim();
    }
    if (message.getAllSyncIdsByPrefix !== undefined) {
      TrieNodePrefix.encode(message.getAllSyncIdsByPrefix, writer.uint32(50).fork()).ldelim();
    }
    if (message.getAllMessagesBySyncIds !== undefined) {
      SyncIds.encode(message.getAllMessagesBySyncIds, writer.uint32(58).fork()).ldelim();
    }
    if (message.getSyncMetadataByPrefix !== undefined) {
      TrieNodePrefix.encode(message.getSyncMetadataByPrefix, writer.uint32(66).fork()).ldelim();
    }
    if (message.getSyncSnapshotByPrefix !== undefined) {
      TrieNodePrefix.encode(message.getSyncSnapshotByPrefix, writer.uint32(74).fork()).ldelim();
    }
    if (message.getOnChainEvents !== undefined) {
      OnChainEventRequest.encode(message.getOnChainEvents, writer.uint32(82).fork()).ldelim();
    }
    if (message.getOnChainSignersByFid !== undefined) {
      FidRequest.encode(message.getOnChainSignersByFid, writer.uint32(90).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): StreamSyncRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseStreamSyncRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 10) {
            break;
          }

          message.getInfo = HubInfoRequest.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag != 18) {
            break;
          }

          message.getCurrentPeers = Empty.decode(reader, reader.uint32());
          continue;
        case 3:
          if (tag != 26) {
            break;
          }

          message.stopSync = Empty.decode(reader, reader.uint32());
          continue;
        case 4:
          if (tag != 34) {
            break;
          }

          message.forceSync = SyncStatusRequest.decode(reader, reader.uint32());
          continue;
        case 5:
          if (tag != 42) {
            break;
          }

          message.getSyncStatus = SyncStatusRequest.decode(reader, reader.uint32());
          continue;
        case 6:
          if (tag != 50) {
            break;
          }

          message.getAllSyncIdsByPrefix = TrieNodePrefix.decode(reader, reader.uint32());
          continue;
        case 7:
          if (tag != 58) {
            break;
          }

          message.getAllMessagesBySyncIds = SyncIds.decode(reader, reader.uint32());
          continue;
        case 8:
          if (tag != 66) {
            break;
          }

          message.getSyncMetadataByPrefix = TrieNodePrefix.decode(reader, reader.uint32());
          continue;
        case 9:
          if (tag != 74) {
            break;
          }

          message.getSyncSnapshotByPrefix = TrieNodePrefix.decode(reader, reader.uint32());
          continue;
        case 10:
          if (tag != 82) {
            break;
          }

          message.getOnChainEvents = OnChainEventRequest.decode(reader, reader.uint32());
          continue;
        case 11:
          if (tag != 90) {
            break;
          }

          message.getOnChainSignersByFid = FidRequest.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): StreamSyncRequest {
    return {
      getInfo: isSet(object.getInfo) ? HubInfoRequest.fromJSON(object.getInfo) : undefined,
      getCurrentPeers: isSet(object.getCurrentPeers) ? Empty.fromJSON(object.getCurrentPeers) : undefined,
      stopSync: isSet(object.stopSync) ? Empty.fromJSON(object.stopSync) : undefined,
      forceSync: isSet(object.forceSync) ? SyncStatusRequest.fromJSON(object.forceSync) : undefined,
      getSyncStatus: isSet(object.getSyncStatus) ? SyncStatusRequest.fromJSON(object.getSyncStatus) : undefined,
      getAllSyncIdsByPrefix: isSet(object.getAllSyncIdsByPrefix)
        ? TrieNodePrefix.fromJSON(object.getAllSyncIdsByPrefix)
        : undefined,
      getAllMessagesBySyncIds: isSet(object.getAllMessagesBySyncIds)
        ? SyncIds.fromJSON(object.getAllMessagesBySyncIds)
        : undefined,
      getSyncMetadataByPrefix: isSet(object.getSyncMetadataByPrefix)
        ? TrieNodePrefix.fromJSON(object.getSyncMetadataByPrefix)
        : undefined,
      getSyncSnapshotByPrefix: isSet(object.getSyncSnapshotByPrefix)
        ? TrieNodePrefix.fromJSON(object.getSyncSnapshotByPrefix)
        : undefined,
      getOnChainEvents: isSet(object.getOnChainEvents)
        ? OnChainEventRequest.fromJSON(object.getOnChainEvents)
        : undefined,
      getOnChainSignersByFid: isSet(object.getOnChainSignersByFid)
        ? FidRequest.fromJSON(object.getOnChainSignersByFid)
        : undefined,
    };
  },

  toJSON(message: StreamSyncRequest): unknown {
    const obj: any = {};
    message.getInfo !== undefined &&
      (obj.getInfo = message.getInfo ? HubInfoRequest.toJSON(message.getInfo) : undefined);
    message.getCurrentPeers !== undefined &&
      (obj.getCurrentPeers = message.getCurrentPeers ? Empty.toJSON(message.getCurrentPeers) : undefined);
    message.stopSync !== undefined && (obj.stopSync = message.stopSync ? Empty.toJSON(message.stopSync) : undefined);
    message.forceSync !== undefined &&
      (obj.forceSync = message.forceSync ? SyncStatusRequest.toJSON(message.forceSync) : undefined);
    message.getSyncStatus !== undefined &&
      (obj.getSyncStatus = message.getSyncStatus ? SyncStatusRequest.toJSON(message.getSyncStatus) : undefined);
    message.getAllSyncIdsByPrefix !== undefined && (obj.getAllSyncIdsByPrefix = message.getAllSyncIdsByPrefix
      ? TrieNodePrefix.toJSON(message.getAllSyncIdsByPrefix)
      : undefined);
    message.getAllMessagesBySyncIds !== undefined && (obj.getAllMessagesBySyncIds = message.getAllMessagesBySyncIds
      ? SyncIds.toJSON(message.getAllMessagesBySyncIds)
      : undefined);
    message.getSyncMetadataByPrefix !== undefined && (obj.getSyncMetadataByPrefix = message.getSyncMetadataByPrefix
      ? TrieNodePrefix.toJSON(message.getSyncMetadataByPrefix)
      : undefined);
    message.getSyncSnapshotByPrefix !== undefined && (obj.getSyncSnapshotByPrefix = message.getSyncSnapshotByPrefix
      ? TrieNodePrefix.toJSON(message.getSyncSnapshotByPrefix)
      : undefined);
    message.getOnChainEvents !== undefined && (obj.getOnChainEvents = message.getOnChainEvents
      ? OnChainEventRequest.toJSON(message.getOnChainEvents)
      : undefined);
    message.getOnChainSignersByFid !== undefined && (obj.getOnChainSignersByFid = message.getOnChainSignersByFid
      ? FidRequest.toJSON(message.getOnChainSignersByFid)
      : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<StreamSyncRequest>, I>>(base?: I): StreamSyncRequest {
    return StreamSyncRequest.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<StreamSyncRequest>, I>>(object: I): StreamSyncRequest {
    const message = createBaseStreamSyncRequest();
    message.getInfo = (object.getInfo !== undefined && object.getInfo !== null)
      ? HubInfoRequest.fromPartial(object.getInfo)
      : undefined;
    message.getCurrentPeers = (object.getCurrentPeers !== undefined && object.getCurrentPeers !== null)
      ? Empty.fromPartial(object.getCurrentPeers)
      : undefined;
    message.stopSync = (object.stopSync !== undefined && object.stopSync !== null)
      ? Empty.fromPartial(object.stopSync)
      : undefined;
    message.forceSync = (object.forceSync !== undefined && object.forceSync !== null)
      ? SyncStatusRequest.fromPartial(object.forceSync)
      : undefined;
    message.getSyncStatus = (object.getSyncStatus !== undefined && object.getSyncStatus !== null)
      ? SyncStatusRequest.fromPartial(object.getSyncStatus)
      : undefined;
    message.getAllSyncIdsByPrefix =
      (object.getAllSyncIdsByPrefix !== undefined && object.getAllSyncIdsByPrefix !== null)
        ? TrieNodePrefix.fromPartial(object.getAllSyncIdsByPrefix)
        : undefined;
    message.getAllMessagesBySyncIds =
      (object.getAllMessagesBySyncIds !== undefined && object.getAllMessagesBySyncIds !== null)
        ? SyncIds.fromPartial(object.getAllMessagesBySyncIds)
        : undefined;
    message.getSyncMetadataByPrefix =
      (object.getSyncMetadataByPrefix !== undefined && object.getSyncMetadataByPrefix !== null)
        ? TrieNodePrefix.fromPartial(object.getSyncMetadataByPrefix)
        : undefined;
    message.getSyncSnapshotByPrefix =
      (object.getSyncSnapshotByPrefix !== undefined && object.getSyncSnapshotByPrefix !== null)
        ? TrieNodePrefix.fromPartial(object.getSyncSnapshotByPrefix)
        : undefined;
    message.getOnChainEvents = (object.getOnChainEvents !== undefined && object.getOnChainEvents !== null)
      ? OnChainEventRequest.fromPartial(object.getOnChainEvents)
      : undefined;
    message.getOnChainSignersByFid =
      (object.getOnChainSignersByFid !== undefined && object.getOnChainSignersByFid !== null)
        ? FidRequest.fromPartial(object.getOnChainSignersByFid)
        : undefined;
    return message;
  },
};

function createBaseStreamError(): StreamError {
  return { errCode: "", message: "", request: "" };
}

export const StreamError = {
  encode(message: StreamError, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.errCode !== "") {
      writer.uint32(10).string(message.errCode);
    }
    if (message.message !== "") {
      writer.uint32(18).string(message.message);
    }
    if (message.request !== "") {
      writer.uint32(26).string(message.request);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): StreamError {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseStreamError();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 10) {
            break;
          }

          message.errCode = reader.string();
          continue;
        case 2:
          if (tag != 18) {
            break;
          }

          message.message = reader.string();
          continue;
        case 3:
          if (tag != 26) {
            break;
          }

          message.request = reader.string();
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): StreamError {
    return {
      errCode: isSet(object.errCode) ? String(object.errCode) : "",
      message: isSet(object.message) ? String(object.message) : "",
      request: isSet(object.request) ? String(object.request) : "",
    };
  },

  toJSON(message: StreamError): unknown {
    const obj: any = {};
    message.errCode !== undefined && (obj.errCode = message.errCode);
    message.message !== undefined && (obj.message = message.message);
    message.request !== undefined && (obj.request = message.request);
    return obj;
  },

  create<I extends Exact<DeepPartial<StreamError>, I>>(base?: I): StreamError {
    return StreamError.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<StreamError>, I>>(object: I): StreamError {
    const message = createBaseStreamError();
    message.errCode = object.errCode ?? "";
    message.message = object.message ?? "";
    message.request = object.request ?? "";
    return message;
  },
};

function createBaseStreamSyncResponse(): StreamSyncResponse {
  return {
    getInfo: undefined,
    getCurrentPeers: undefined,
    stopSync: undefined,
    forceSync: undefined,
    getSyncStatus: undefined,
    getAllSyncIdsByPrefix: undefined,
    getAllMessagesBySyncIds: undefined,
    getSyncMetadataByPrefix: undefined,
    getSyncSnapshotByPrefix: undefined,
    getOnChainEvents: undefined,
    getOnChainSignersByFid: undefined,
    error: undefined,
  };
}

export const StreamSyncResponse = {
  encode(message: StreamSyncResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.getInfo !== undefined) {
      HubInfoResponse.encode(message.getInfo, writer.uint32(10).fork()).ldelim();
    }
    if (message.getCurrentPeers !== undefined) {
      ContactInfoResponse.encode(message.getCurrentPeers, writer.uint32(18).fork()).ldelim();
    }
    if (message.stopSync !== undefined) {
      SyncStatusResponse.encode(message.stopSync, writer.uint32(26).fork()).ldelim();
    }
    if (message.forceSync !== undefined) {
      SyncStatusResponse.encode(message.forceSync, writer.uint32(34).fork()).ldelim();
    }
    if (message.getSyncStatus !== undefined) {
      SyncStatusResponse.encode(message.getSyncStatus, writer.uint32(42).fork()).ldelim();
    }
    if (message.getAllSyncIdsByPrefix !== undefined) {
      SyncIds.encode(message.getAllSyncIdsByPrefix, writer.uint32(50).fork()).ldelim();
    }
    if (message.getAllMessagesBySyncIds !== undefined) {
      MessagesResponse.encode(message.getAllMessagesBySyncIds, writer.uint32(58).fork()).ldelim();
    }
    if (message.getSyncMetadataByPrefix !== undefined) {
      TrieNodeMetadataResponse.encode(message.getSyncMetadataByPrefix, writer.uint32(66).fork()).ldelim();
    }
    if (message.getSyncSnapshotByPrefix !== undefined) {
      TrieNodeSnapshotResponse.encode(message.getSyncSnapshotByPrefix, writer.uint32(74).fork()).ldelim();
    }
    if (message.getOnChainEvents !== undefined) {
      OnChainEventResponse.encode(message.getOnChainEvents, writer.uint32(82).fork()).ldelim();
    }
    if (message.getOnChainSignersByFid !== undefined) {
      OnChainEventResponse.encode(message.getOnChainSignersByFid, writer.uint32(90).fork()).ldelim();
    }
    if (message.error !== undefined) {
      StreamError.encode(message.error, writer.uint32(98).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): StreamSyncResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseStreamSyncResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 10) {
            break;
          }

          message.getInfo = HubInfoResponse.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag != 18) {
            break;
          }

          message.getCurrentPeers = ContactInfoResponse.decode(reader, reader.uint32());
          continue;
        case 3:
          if (tag != 26) {
            break;
          }

          message.stopSync = SyncStatusResponse.decode(reader, reader.uint32());
          continue;
        case 4:
          if (tag != 34) {
            break;
          }

          message.forceSync = SyncStatusResponse.decode(reader, reader.uint32());
          continue;
        case 5:
          if (tag != 42) {
            break;
          }

          message.getSyncStatus = SyncStatusResponse.decode(reader, reader.uint32());
          continue;
        case 6:
          if (tag != 50) {
            break;
          }

          message.getAllSyncIdsByPrefix = SyncIds.decode(reader, reader.uint32());
          continue;
        case 7:
          if (tag != 58) {
            break;
          }

          message.getAllMessagesBySyncIds = MessagesResponse.decode(reader, reader.uint32());
          continue;
        case 8:
          if (tag != 66) {
            break;
          }

          message.getSyncMetadataByPrefix = TrieNodeMetadataResponse.decode(reader, reader.uint32());
          continue;
        case 9:
          if (tag != 74) {
            break;
          }

          message.getSyncSnapshotByPrefix = TrieNodeSnapshotResponse.decode(reader, reader.uint32());
          continue;
        case 10:
          if (tag != 82) {
            break;
          }

          message.getOnChainEvents = OnChainEventResponse.decode(reader, reader.uint32());
          continue;
        case 11:
          if (tag != 90) {
            break;
          }

          message.getOnChainSignersByFid = OnChainEventResponse.decode(reader, reader.uint32());
          continue;
        case 12:
          if (tag != 98) {
            break;
          }

          message.error = StreamError.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): StreamSyncResponse {
    return {
      getInfo: isSet(object.getInfo) ? HubInfoResponse.fromJSON(object.getInfo) : undefined,
      getCurrentPeers: isSet(object.getCurrentPeers) ? ContactInfoResponse.fromJSON(object.getCurrentPeers) : undefined,
      stopSync: isSet(object.stopSync) ? SyncStatusResponse.fromJSON(object.stopSync) : undefined,
      forceSync: isSet(object.forceSync) ? SyncStatusResponse.fromJSON(object.forceSync) : undefined,
      getSyncStatus: isSet(object.getSyncStatus) ? SyncStatusResponse.fromJSON(object.getSyncStatus) : undefined,
      getAllSyncIdsByPrefix: isSet(object.getAllSyncIdsByPrefix)
        ? SyncIds.fromJSON(object.getAllSyncIdsByPrefix)
        : undefined,
      getAllMessagesBySyncIds: isSet(object.getAllMessagesBySyncIds)
        ? MessagesResponse.fromJSON(object.getAllMessagesBySyncIds)
        : undefined,
      getSyncMetadataByPrefix: isSet(object.getSyncMetadataByPrefix)
        ? TrieNodeMetadataResponse.fromJSON(object.getSyncMetadataByPrefix)
        : undefined,
      getSyncSnapshotByPrefix: isSet(object.getSyncSnapshotByPrefix)
        ? TrieNodeSnapshotResponse.fromJSON(object.getSyncSnapshotByPrefix)
        : undefined,
      getOnChainEvents: isSet(object.getOnChainEvents)
        ? OnChainEventResponse.fromJSON(object.getOnChainEvents)
        : undefined,
      getOnChainSignersByFid: isSet(object.getOnChainSignersByFid)
        ? OnChainEventResponse.fromJSON(object.getOnChainSignersByFid)
        : undefined,
      error: isSet(object.error) ? StreamError.fromJSON(object.error) : undefined,
    };
  },

  toJSON(message: StreamSyncResponse): unknown {
    const obj: any = {};
    message.getInfo !== undefined &&
      (obj.getInfo = message.getInfo ? HubInfoResponse.toJSON(message.getInfo) : undefined);
    message.getCurrentPeers !== undefined &&
      (obj.getCurrentPeers = message.getCurrentPeers ? ContactInfoResponse.toJSON(message.getCurrentPeers) : undefined);
    message.stopSync !== undefined &&
      (obj.stopSync = message.stopSync ? SyncStatusResponse.toJSON(message.stopSync) : undefined);
    message.forceSync !== undefined &&
      (obj.forceSync = message.forceSync ? SyncStatusResponse.toJSON(message.forceSync) : undefined);
    message.getSyncStatus !== undefined &&
      (obj.getSyncStatus = message.getSyncStatus ? SyncStatusResponse.toJSON(message.getSyncStatus) : undefined);
    message.getAllSyncIdsByPrefix !== undefined && (obj.getAllSyncIdsByPrefix = message.getAllSyncIdsByPrefix
      ? SyncIds.toJSON(message.getAllSyncIdsByPrefix)
      : undefined);
    message.getAllMessagesBySyncIds !== undefined && (obj.getAllMessagesBySyncIds = message.getAllMessagesBySyncIds
      ? MessagesResponse.toJSON(message.getAllMessagesBySyncIds)
      : undefined);
    message.getSyncMetadataByPrefix !== undefined && (obj.getSyncMetadataByPrefix = message.getSyncMetadataByPrefix
      ? TrieNodeMetadataResponse.toJSON(message.getSyncMetadataByPrefix)
      : undefined);
    message.getSyncSnapshotByPrefix !== undefined && (obj.getSyncSnapshotByPrefix = message.getSyncSnapshotByPrefix
      ? TrieNodeSnapshotResponse.toJSON(message.getSyncSnapshotByPrefix)
      : undefined);
    message.getOnChainEvents !== undefined && (obj.getOnChainEvents = message.getOnChainEvents
      ? OnChainEventResponse.toJSON(message.getOnChainEvents)
      : undefined);
    message.getOnChainSignersByFid !== undefined && (obj.getOnChainSignersByFid = message.getOnChainSignersByFid
      ? OnChainEventResponse.toJSON(message.getOnChainSignersByFid)
      : undefined);
    message.error !== undefined && (obj.error = message.error ? StreamError.toJSON(message.error) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<StreamSyncResponse>, I>>(base?: I): StreamSyncResponse {
    return StreamSyncResponse.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<StreamSyncResponse>, I>>(object: I): StreamSyncResponse {
    const message = createBaseStreamSyncResponse();
    message.getInfo = (object.getInfo !== undefined && object.getInfo !== null)
      ? HubInfoResponse.fromPartial(object.getInfo)
      : undefined;
    message.getCurrentPeers = (object.getCurrentPeers !== undefined && object.getCurrentPeers !== null)
      ? ContactInfoResponse.fromPartial(object.getCurrentPeers)
      : undefined;
    message.stopSync = (object.stopSync !== undefined && object.stopSync !== null)
      ? SyncStatusResponse.fromPartial(object.stopSync)
      : undefined;
    message.forceSync = (object.forceSync !== undefined && object.forceSync !== null)
      ? SyncStatusResponse.fromPartial(object.forceSync)
      : undefined;
    message.getSyncStatus = (object.getSyncStatus !== undefined && object.getSyncStatus !== null)
      ? SyncStatusResponse.fromPartial(object.getSyncStatus)
      : undefined;
    message.getAllSyncIdsByPrefix =
      (object.getAllSyncIdsByPrefix !== undefined && object.getAllSyncIdsByPrefix !== null)
        ? SyncIds.fromPartial(object.getAllSyncIdsByPrefix)
        : undefined;
    message.getAllMessagesBySyncIds =
      (object.getAllMessagesBySyncIds !== undefined && object.getAllMessagesBySyncIds !== null)
        ? MessagesResponse.fromPartial(object.getAllMessagesBySyncIds)
        : undefined;
    message.getSyncMetadataByPrefix =
      (object.getSyncMetadataByPrefix !== undefined && object.getSyncMetadataByPrefix !== null)
        ? TrieNodeMetadataResponse.fromPartial(object.getSyncMetadataByPrefix)
        : undefined;
    message.getSyncSnapshotByPrefix =
      (object.getSyncSnapshotByPrefix !== undefined && object.getSyncSnapshotByPrefix !== null)
        ? TrieNodeSnapshotResponse.fromPartial(object.getSyncSnapshotByPrefix)
        : undefined;
    message.getOnChainEvents = (object.getOnChainEvents !== undefined && object.getOnChainEvents !== null)
      ? OnChainEventResponse.fromPartial(object.getOnChainEvents)
      : undefined;
    message.getOnChainSignersByFid =
      (object.getOnChainSignersByFid !== undefined && object.getOnChainSignersByFid !== null)
        ? OnChainEventResponse.fromPartial(object.getOnChainSignersByFid)
        : undefined;
    message.error = (object.error !== undefined && object.error !== null)
      ? StreamError.fromPartial(object.error)
      : undefined;
    return message;
  },
};

function createBaseStreamFetchRequest(): StreamFetchRequest {
  return {
    idempotencyKey: "",
    castMessagesByFid: undefined,
    reactionMessagesByFid: undefined,
    verificationMessagesByFid: undefined,
    userDataMessagesByFid: undefined,
    linkMessagesByFid: undefined,
  };
}

export const StreamFetchRequest = {
  encode(message: StreamFetchRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.idempotencyKey !== "") {
      writer.uint32(10).string(message.idempotencyKey);
    }
    if (message.castMessagesByFid !== undefined) {
      FidTimestampRequest.encode(message.castMessagesByFid, writer.uint32(18).fork()).ldelim();
    }
    if (message.reactionMessagesByFid !== undefined) {
      FidTimestampRequest.encode(message.reactionMessagesByFid, writer.uint32(26).fork()).ldelim();
    }
    if (message.verificationMessagesByFid !== undefined) {
      FidTimestampRequest.encode(message.verificationMessagesByFid, writer.uint32(34).fork()).ldelim();
    }
    if (message.userDataMessagesByFid !== undefined) {
      FidTimestampRequest.encode(message.userDataMessagesByFid, writer.uint32(42).fork()).ldelim();
    }
    if (message.linkMessagesByFid !== undefined) {
      FidTimestampRequest.encode(message.linkMessagesByFid, writer.uint32(50).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): StreamFetchRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseStreamFetchRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 10) {
            break;
          }

          message.idempotencyKey = reader.string();
          continue;
        case 2:
          if (tag != 18) {
            break;
          }

          message.castMessagesByFid = FidTimestampRequest.decode(reader, reader.uint32());
          continue;
        case 3:
          if (tag != 26) {
            break;
          }

          message.reactionMessagesByFid = FidTimestampRequest.decode(reader, reader.uint32());
          continue;
        case 4:
          if (tag != 34) {
            break;
          }

          message.verificationMessagesByFid = FidTimestampRequest.decode(reader, reader.uint32());
          continue;
        case 5:
          if (tag != 42) {
            break;
          }

          message.userDataMessagesByFid = FidTimestampRequest.decode(reader, reader.uint32());
          continue;
        case 6:
          if (tag != 50) {
            break;
          }

          message.linkMessagesByFid = FidTimestampRequest.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): StreamFetchRequest {
    return {
      idempotencyKey: isSet(object.idempotencyKey) ? String(object.idempotencyKey) : "",
      castMessagesByFid: isSet(object.castMessagesByFid)
        ? FidTimestampRequest.fromJSON(object.castMessagesByFid)
        : undefined,
      reactionMessagesByFid: isSet(object.reactionMessagesByFid)
        ? FidTimestampRequest.fromJSON(object.reactionMessagesByFid)
        : undefined,
      verificationMessagesByFid: isSet(object.verificationMessagesByFid)
        ? FidTimestampRequest.fromJSON(object.verificationMessagesByFid)
        : undefined,
      userDataMessagesByFid: isSet(object.userDataMessagesByFid)
        ? FidTimestampRequest.fromJSON(object.userDataMessagesByFid)
        : undefined,
      linkMessagesByFid: isSet(object.linkMessagesByFid)
        ? FidTimestampRequest.fromJSON(object.linkMessagesByFid)
        : undefined,
    };
  },

  toJSON(message: StreamFetchRequest): unknown {
    const obj: any = {};
    message.idempotencyKey !== undefined && (obj.idempotencyKey = message.idempotencyKey);
    message.castMessagesByFid !== undefined && (obj.castMessagesByFid = message.castMessagesByFid
      ? FidTimestampRequest.toJSON(message.castMessagesByFid)
      : undefined);
    message.reactionMessagesByFid !== undefined && (obj.reactionMessagesByFid = message.reactionMessagesByFid
      ? FidTimestampRequest.toJSON(message.reactionMessagesByFid)
      : undefined);
    message.verificationMessagesByFid !== undefined &&
      (obj.verificationMessagesByFid = message.verificationMessagesByFid
        ? FidTimestampRequest.toJSON(message.verificationMessagesByFid)
        : undefined);
    message.userDataMessagesByFid !== undefined && (obj.userDataMessagesByFid = message.userDataMessagesByFid
      ? FidTimestampRequest.toJSON(message.userDataMessagesByFid)
      : undefined);
    message.linkMessagesByFid !== undefined && (obj.linkMessagesByFid = message.linkMessagesByFid
      ? FidTimestampRequest.toJSON(message.linkMessagesByFid)
      : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<StreamFetchRequest>, I>>(base?: I): StreamFetchRequest {
    return StreamFetchRequest.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<StreamFetchRequest>, I>>(object: I): StreamFetchRequest {
    const message = createBaseStreamFetchRequest();
    message.idempotencyKey = object.idempotencyKey ?? "";
    message.castMessagesByFid = (object.castMessagesByFid !== undefined && object.castMessagesByFid !== null)
      ? FidTimestampRequest.fromPartial(object.castMessagesByFid)
      : undefined;
    message.reactionMessagesByFid =
      (object.reactionMessagesByFid !== undefined && object.reactionMessagesByFid !== null)
        ? FidTimestampRequest.fromPartial(object.reactionMessagesByFid)
        : undefined;
    message.verificationMessagesByFid =
      (object.verificationMessagesByFid !== undefined && object.verificationMessagesByFid !== null)
        ? FidTimestampRequest.fromPartial(object.verificationMessagesByFid)
        : undefined;
    message.userDataMessagesByFid =
      (object.userDataMessagesByFid !== undefined && object.userDataMessagesByFid !== null)
        ? FidTimestampRequest.fromPartial(object.userDataMessagesByFid)
        : undefined;
    message.linkMessagesByFid = (object.linkMessagesByFid !== undefined && object.linkMessagesByFid !== null)
      ? FidTimestampRequest.fromPartial(object.linkMessagesByFid)
      : undefined;
    return message;
  },
};

function createBaseStreamFetchResponse(): StreamFetchResponse {
  return { idempotencyKey: "", messages: undefined, error: undefined };
}

export const StreamFetchResponse = {
  encode(message: StreamFetchResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.idempotencyKey !== "") {
      writer.uint32(10).string(message.idempotencyKey);
    }
    if (message.messages !== undefined) {
      MessagesResponse.encode(message.messages, writer.uint32(18).fork()).ldelim();
    }
    if (message.error !== undefined) {
      StreamError.encode(message.error, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): StreamFetchResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseStreamFetchResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 10) {
            break;
          }

          message.idempotencyKey = reader.string();
          continue;
        case 2:
          if (tag != 18) {
            break;
          }

          message.messages = MessagesResponse.decode(reader, reader.uint32());
          continue;
        case 3:
          if (tag != 26) {
            break;
          }

          message.error = StreamError.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): StreamFetchResponse {
    return {
      idempotencyKey: isSet(object.idempotencyKey) ? String(object.idempotencyKey) : "",
      messages: isSet(object.messages) ? MessagesResponse.fromJSON(object.messages) : undefined,
      error: isSet(object.error) ? StreamError.fromJSON(object.error) : undefined,
    };
  },

  toJSON(message: StreamFetchResponse): unknown {
    const obj: any = {};
    message.idempotencyKey !== undefined && (obj.idempotencyKey = message.idempotencyKey);
    message.messages !== undefined &&
      (obj.messages = message.messages ? MessagesResponse.toJSON(message.messages) : undefined);
    message.error !== undefined && (obj.error = message.error ? StreamError.toJSON(message.error) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<StreamFetchResponse>, I>>(base?: I): StreamFetchResponse {
    return StreamFetchResponse.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<StreamFetchResponse>, I>>(object: I): StreamFetchResponse {
    const message = createBaseStreamFetchResponse();
    message.idempotencyKey = object.idempotencyKey ?? "";
    message.messages = (object.messages !== undefined && object.messages !== null)
      ? MessagesResponse.fromPartial(object.messages)
      : undefined;
    message.error = (object.error !== undefined && object.error !== null)
      ? StreamError.fromPartial(object.error)
      : undefined;
    return message;
  },
};

function createBasePruneMessagesRequest(): PruneMessagesRequest {
  return { fid: 0 };
}

export const PruneMessagesRequest = {
  encode(message: PruneMessagesRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.fid !== 0) {
      writer.uint32(8).uint64(message.fid);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PruneMessagesRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePruneMessagesRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 8) {
            break;
          }

          message.fid = longToNumber(reader.uint64() as Long);
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): PruneMessagesRequest {
    return { fid: isSet(object.fid) ? Number(object.fid) : 0 };
  },

  toJSON(message: PruneMessagesRequest): unknown {
    const obj: any = {};
    message.fid !== undefined && (obj.fid = Math.round(message.fid));
    return obj;
  },

  create<I extends Exact<DeepPartial<PruneMessagesRequest>, I>>(base?: I): PruneMessagesRequest {
    return PruneMessagesRequest.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<PruneMessagesRequest>, I>>(object: I): PruneMessagesRequest {
    const message = createBasePruneMessagesRequest();
    message.fid = object.fid ?? 0;
    return message;
  },
};

function createBasePruneMessagesResponse(): PruneMessagesResponse {
  return { numMessagesPruned: 0 };
}

export const PruneMessagesResponse = {
  encode(message: PruneMessagesResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.numMessagesPruned !== 0) {
      writer.uint32(8).uint64(message.numMessagesPruned);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PruneMessagesResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePruneMessagesResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag != 8) {
            break;
          }

          message.numMessagesPruned = longToNumber(reader.uint64() as Long);
          continue;
      }
      if ((tag & 7) == 4 || tag == 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): PruneMessagesResponse {
    return { numMessagesPruned: isSet(object.numMessagesPruned) ? Number(object.numMessagesPruned) : 0 };
  },

  toJSON(message: PruneMessagesResponse): unknown {
    const obj: any = {};
    message.numMessagesPruned !== undefined && (obj.numMessagesPruned = Math.round(message.numMessagesPruned));
    return obj;
  },

  create<I extends Exact<DeepPartial<PruneMessagesResponse>, I>>(base?: I): PruneMessagesResponse {
    return PruneMessagesResponse.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<PruneMessagesResponse>, I>>(object: I): PruneMessagesResponse {
    const message = createBasePruneMessagesResponse();
    message.numMessagesPruned = object.numMessagesPruned ?? 0;
    return message;
  },
};

declare var self: any | undefined;
declare var window: any | undefined;
declare var global: any | undefined;
var tsProtoGlobalThis: any = (() => {
  if (typeof globalThis !== "undefined") {
    return globalThis;
  }
  if (typeof self !== "undefined") {
    return self;
  }
  if (typeof window !== "undefined") {
    return window;
  }
  if (typeof global !== "undefined") {
    return global;
  }
  throw "Unable to locate global object";
})();

function bytesFromBase64(b64: string): Uint8Array {
  if (tsProtoGlobalThis.Buffer) {
    return Uint8Array.from(tsProtoGlobalThis.Buffer.from(b64, "base64"));
  } else {
    const bin = tsProtoGlobalThis.atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; ++i) {
      arr[i] = bin.charCodeAt(i);
    }
    return arr;
  }
}

function base64FromBytes(arr: Uint8Array): string {
  if (tsProtoGlobalThis.Buffer) {
    return tsProtoGlobalThis.Buffer.from(arr).toString("base64");
  } else {
    const bin: string[] = [];
    arr.forEach((byte) => {
      bin.push(String.fromCharCode(byte));
    });
    return tsProtoGlobalThis.btoa(bin.join(""));
  }
}

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

type DeepPartial<T> = T extends Builtin ? T
  : T extends Array<infer U> ? Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
type Exact<P, I extends P> = P extends Builtin ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & { [K in Exclude<keyof I, KeysOfUnion<P>>]: never };

function longToNumber(long: Long): number {
  if (long.gt(Number.MAX_SAFE_INTEGER)) {
    throw new tsProtoGlobalThis.Error("Value is larger than Number.MAX_SAFE_INTEGER");
  }
  return long.toNumber();
}

if (_m0.util.Long !== Long) {
  _m0.util.Long = Long as any;
  _m0.configure();
}

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
