/* eslint-disable */
import grpcWeb from "@improbable-eng/grpc-web";
import { BrowserHeaders } from "browser-headers";
import { Observable } from "rxjs";
import { share } from "rxjs/operators";
import { HubEvent } from "./hub_event";
import { CastId, Message } from "./message";
import { OnChainEvent } from "./onchain_event";
import {
  CastsByParentRequest,
  ContactInfoResponse,
  Empty,
  EventRequest,
  FidRequest,
  FidsRequest,
  FidsResponse,
  FidTimestampRequest,
  HubInfoRequest,
  HubInfoResponse,
  IdRegistryEventByAddressRequest,
  LinkRequest,
  LinksByFidRequest,
  LinksByTargetRequest,
  MessagesResponse,
  OnChainEventRequest,
  OnChainEventResponse,
  PruneMessagesRequest,
  PruneMessagesResponse,
  ReactionRequest,
  ReactionsByFidRequest,
  ReactionsByTargetRequest,
  SignerRequest,
  StorageLimitsResponse,
  StreamFetchRequest,
  StreamFetchResponse,
  StreamSyncRequest,
  StreamSyncResponse,
  SubmitBulkMessagesRequest,
  SubmitBulkMessagesResponse,
  SubscribeRequest,
  SyncIds,
  SyncStatusRequest,
  SyncStatusResponse,
  TrieNodeMetadataResponse,
  TrieNodePrefix,
  TrieNodeSnapshotResponse,
  UserDataRequest,
  UsernameProofRequest,
  UsernameProofsResponse,
  ValidationResponse,
  VerificationRequest,
} from "./request_response";
import { UserNameProof } from "./username_proof";

export interface HubService {
  /** Submit Methods */
  submitMessage(request: DeepPartial<Message>, metadata?: grpcWeb.grpc.Metadata): Promise<Message>;
  /** Validation Methods */
  validateMessage(request: DeepPartial<Message>, metadata?: grpcWeb.grpc.Metadata): Promise<ValidationResponse>;
  /**
   * Event Methods
   * @http-api: none
   */
  subscribe(request: DeepPartial<SubscribeRequest>, metadata?: grpcWeb.grpc.Metadata): Observable<HubEvent>;
  /** @http-api: events */
  getEvent(request: DeepPartial<EventRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<HubEvent>;
  /**
   * Casts
   * @http-api: castById
   */
  getCast(request: DeepPartial<CastId>, metadata?: grpcWeb.grpc.Metadata): Promise<Message>;
  getCastsByFid(request: DeepPartial<FidRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<MessagesResponse>;
  getCastsByParent(request: DeepPartial<CastsByParentRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<MessagesResponse>;
  getCastsByMention(request: DeepPartial<FidRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<MessagesResponse>;
  /**
   * Reactions
   * @http-api: reactionById
   */
  getReaction(request: DeepPartial<ReactionRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<Message>;
  getReactionsByFid(request: DeepPartial<ReactionsByFidRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<MessagesResponse>;
  /** To be deprecated */
  getReactionsByCast(
    request: DeepPartial<ReactionsByTargetRequest>,
    metadata?: grpcWeb.grpc.Metadata,
  ): Promise<MessagesResponse>;
  getReactionsByTarget(
    request: DeepPartial<ReactionsByTargetRequest>,
    metadata?: grpcWeb.grpc.Metadata,
  ): Promise<MessagesResponse>;
  /**
   * User Data
   * @http-api: none
   */
  getUserData(request: DeepPartial<UserDataRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<Message>;
  getUserDataByFid(request: DeepPartial<FidRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<MessagesResponse>;
  /**
   * Username Proof
   * @http-api: userNameProofByName
   */
  getUsernameProof(request: DeepPartial<UsernameProofRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<UserNameProof>;
  getUserNameProofsByFid(request: DeepPartial<FidRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<UsernameProofsResponse>;
  /**
   * Verifications
   * @http-api: none
   */
  getVerification(request: DeepPartial<VerificationRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<Message>;
  getVerificationsByFid(request: DeepPartial<FidRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<MessagesResponse>;
  /**
   * OnChain Events
   * @http-api: none
   */
  getOnChainSigner(request: DeepPartial<SignerRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<OnChainEvent>;
  getOnChainSignersByFid(request: DeepPartial<FidRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<OnChainEventResponse>;
  /** @http-api: none */
  getOnChainEvents(request: DeepPartial<OnChainEventRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<OnChainEventResponse>;
  /** @http-api: none */
  getIdRegistryOnChainEvent(request: DeepPartial<FidRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<OnChainEvent>;
  /** @http-api: onChainIdRegistryEventByAddress */
  getIdRegistryOnChainEventByAddress(
    request: DeepPartial<IdRegistryEventByAddressRequest>,
    metadata?: grpcWeb.grpc.Metadata,
  ): Promise<OnChainEvent>;
  /** @http-api: storageLimitsByFid */
  getCurrentStorageLimitsByFid(
    request: DeepPartial<FidRequest>,
    metadata?: grpcWeb.grpc.Metadata,
  ): Promise<StorageLimitsResponse>;
  getFids(request: DeepPartial<FidsRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<FidsResponse>;
  /**
   * Links
   * @http-api: linkById
   */
  getLink(request: DeepPartial<LinkRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<Message>;
  getLinksByFid(request: DeepPartial<LinksByFidRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<MessagesResponse>;
  /** @http-api: linksByTargetFid */
  getLinksByTarget(request: DeepPartial<LinksByTargetRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<MessagesResponse>;
  /**
   * Bulk Methods
   * The Bulk methods don't have corresponding HTTP API endpoints because the
   * regular endpoints can be used to get all the messages
   * @http-api: none
   */
  getAllCastMessagesByFid(
    request: DeepPartial<FidTimestampRequest>,
    metadata?: grpcWeb.grpc.Metadata,
  ): Promise<MessagesResponse>;
  /** @http-api: none */
  getAllReactionMessagesByFid(
    request: DeepPartial<FidTimestampRequest>,
    metadata?: grpcWeb.grpc.Metadata,
  ): Promise<MessagesResponse>;
  /** @http-api: none */
  getAllVerificationMessagesByFid(
    request: DeepPartial<FidTimestampRequest>,
    metadata?: grpcWeb.grpc.Metadata,
  ): Promise<MessagesResponse>;
  /** @http-api: none */
  getAllUserDataMessagesByFid(
    request: DeepPartial<FidTimestampRequest>,
    metadata?: grpcWeb.grpc.Metadata,
  ): Promise<MessagesResponse>;
  /** @http-api: none */
  getAllLinkMessagesByFid(
    request: DeepPartial<FidTimestampRequest>,
    metadata?: grpcWeb.grpc.Metadata,
  ): Promise<MessagesResponse>;
  /** @http-api: none */
  getLinkCompactStateMessageByFid(
    request: DeepPartial<FidRequest>,
    metadata?: grpcWeb.grpc.Metadata,
  ): Promise<MessagesResponse>;
  /** @http-api: none */
  submitBulkMessages(
    request: DeepPartial<SubmitBulkMessagesRequest>,
    metadata?: grpcWeb.grpc.Metadata,
  ): Promise<SubmitBulkMessagesResponse>;
  /** Sync Methods */
  getInfo(request: DeepPartial<HubInfoRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<HubInfoResponse>;
  getCurrentPeers(request: DeepPartial<Empty>, metadata?: grpcWeb.grpc.Metadata): Promise<ContactInfoResponse>;
  /** @http-api: none */
  stopSync(request: DeepPartial<Empty>, metadata?: grpcWeb.grpc.Metadata): Promise<SyncStatusResponse>;
  /**
   * This is experimental, do not rely on this endpoint existing in the future
   * @http-api: none
   */
  forceSync(request: DeepPartial<SyncStatusRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<SyncStatusResponse>;
  /** @http-api: none */
  getSyncStatus(request: DeepPartial<SyncStatusRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<SyncStatusResponse>;
  /** @http-api: none */
  getAllSyncIdsByPrefix(request: DeepPartial<TrieNodePrefix>, metadata?: grpcWeb.grpc.Metadata): Promise<SyncIds>;
  /** @http-api: none */
  getAllMessagesBySyncIds(request: DeepPartial<SyncIds>, metadata?: grpcWeb.grpc.Metadata): Promise<MessagesResponse>;
  /** @http-api: none */
  getSyncMetadataByPrefix(
    request: DeepPartial<TrieNodePrefix>,
    metadata?: grpcWeb.grpc.Metadata,
  ): Promise<TrieNodeMetadataResponse>;
  /** @http-api: none */
  getSyncSnapshotByPrefix(
    request: DeepPartial<TrieNodePrefix>,
    metadata?: grpcWeb.grpc.Metadata,
  ): Promise<TrieNodeSnapshotResponse>;
  /** @http-api: none */
  streamSync(
    request: Observable<DeepPartial<StreamSyncRequest>>,
    metadata?: grpcWeb.grpc.Metadata,
  ): Observable<StreamSyncResponse>;
  /** @http-api: none */
  streamFetch(
    request: Observable<DeepPartial<StreamFetchRequest>>,
    metadata?: grpcWeb.grpc.Metadata,
  ): Observable<StreamFetchResponse>;
}

export class HubServiceClientImpl implements HubService {
  private readonly rpc: Rpc;

  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.submitMessage = this.submitMessage.bind(this);
    this.validateMessage = this.validateMessage.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.getEvent = this.getEvent.bind(this);
    this.getCast = this.getCast.bind(this);
    this.getCastsByFid = this.getCastsByFid.bind(this);
    this.getCastsByParent = this.getCastsByParent.bind(this);
    this.getCastsByMention = this.getCastsByMention.bind(this);
    this.getReaction = this.getReaction.bind(this);
    this.getReactionsByFid = this.getReactionsByFid.bind(this);
    this.getReactionsByCast = this.getReactionsByCast.bind(this);
    this.getReactionsByTarget = this.getReactionsByTarget.bind(this);
    this.getUserData = this.getUserData.bind(this);
    this.getUserDataByFid = this.getUserDataByFid.bind(this);
    this.getUsernameProof = this.getUsernameProof.bind(this);
    this.getUserNameProofsByFid = this.getUserNameProofsByFid.bind(this);
    this.getVerification = this.getVerification.bind(this);
    this.getVerificationsByFid = this.getVerificationsByFid.bind(this);
    this.getOnChainSigner = this.getOnChainSigner.bind(this);
    this.getOnChainSignersByFid = this.getOnChainSignersByFid.bind(this);
    this.getOnChainEvents = this.getOnChainEvents.bind(this);
    this.getIdRegistryOnChainEvent = this.getIdRegistryOnChainEvent.bind(this);
    this.getIdRegistryOnChainEventByAddress = this.getIdRegistryOnChainEventByAddress.bind(this);
    this.getCurrentStorageLimitsByFid = this.getCurrentStorageLimitsByFid.bind(this);
    this.getFids = this.getFids.bind(this);
    this.getLink = this.getLink.bind(this);
    this.getLinksByFid = this.getLinksByFid.bind(this);
    this.getLinksByTarget = this.getLinksByTarget.bind(this);
    this.getAllCastMessagesByFid = this.getAllCastMessagesByFid.bind(this);
    this.getAllReactionMessagesByFid = this.getAllReactionMessagesByFid.bind(this);
    this.getAllVerificationMessagesByFid = this.getAllVerificationMessagesByFid.bind(this);
    this.getAllUserDataMessagesByFid = this.getAllUserDataMessagesByFid.bind(this);
    this.getAllLinkMessagesByFid = this.getAllLinkMessagesByFid.bind(this);
    this.getLinkCompactStateMessageByFid = this.getLinkCompactStateMessageByFid.bind(this);
    this.submitBulkMessages = this.submitBulkMessages.bind(this);
    this.getInfo = this.getInfo.bind(this);
    this.getCurrentPeers = this.getCurrentPeers.bind(this);
    this.stopSync = this.stopSync.bind(this);
    this.forceSync = this.forceSync.bind(this);
    this.getSyncStatus = this.getSyncStatus.bind(this);
    this.getAllSyncIdsByPrefix = this.getAllSyncIdsByPrefix.bind(this);
    this.getAllMessagesBySyncIds = this.getAllMessagesBySyncIds.bind(this);
    this.getSyncMetadataByPrefix = this.getSyncMetadataByPrefix.bind(this);
    this.getSyncSnapshotByPrefix = this.getSyncSnapshotByPrefix.bind(this);
    this.streamSync = this.streamSync.bind(this);
    this.streamFetch = this.streamFetch.bind(this);
  }

  submitMessage(request: DeepPartial<Message>, metadata?: grpcWeb.grpc.Metadata): Promise<Message> {
    return this.rpc.unary(HubServiceSubmitMessageDesc, Message.fromPartial(request), metadata);
  }

  validateMessage(request: DeepPartial<Message>, metadata?: grpcWeb.grpc.Metadata): Promise<ValidationResponse> {
    return this.rpc.unary(HubServiceValidateMessageDesc, Message.fromPartial(request), metadata);
  }

  subscribe(request: DeepPartial<SubscribeRequest>, metadata?: grpcWeb.grpc.Metadata): Observable<HubEvent> {
    return this.rpc.invoke(HubServiceSubscribeDesc, SubscribeRequest.fromPartial(request), metadata);
  }

  getEvent(request: DeepPartial<EventRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<HubEvent> {
    return this.rpc.unary(HubServiceGetEventDesc, EventRequest.fromPartial(request), metadata);
  }

  getCast(request: DeepPartial<CastId>, metadata?: grpcWeb.grpc.Metadata): Promise<Message> {
    return this.rpc.unary(HubServiceGetCastDesc, CastId.fromPartial(request), metadata);
  }

  getCastsByFid(request: DeepPartial<FidRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<MessagesResponse> {
    return this.rpc.unary(HubServiceGetCastsByFidDesc, FidRequest.fromPartial(request), metadata);
  }

  getCastsByParent(request: DeepPartial<CastsByParentRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<MessagesResponse> {
    return this.rpc.unary(HubServiceGetCastsByParentDesc, CastsByParentRequest.fromPartial(request), metadata);
  }

  getCastsByMention(request: DeepPartial<FidRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<MessagesResponse> {
    return this.rpc.unary(HubServiceGetCastsByMentionDesc, FidRequest.fromPartial(request), metadata);
  }

  getReaction(request: DeepPartial<ReactionRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<Message> {
    return this.rpc.unary(HubServiceGetReactionDesc, ReactionRequest.fromPartial(request), metadata);
  }

  getReactionsByFid(request: DeepPartial<ReactionsByFidRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<MessagesResponse> {
    return this.rpc.unary(HubServiceGetReactionsByFidDesc, ReactionsByFidRequest.fromPartial(request), metadata);
  }

  getReactionsByCast(
    request: DeepPartial<ReactionsByTargetRequest>,
    metadata?: grpcWeb.grpc.Metadata,
  ): Promise<MessagesResponse> {
    return this.rpc.unary(HubServiceGetReactionsByCastDesc, ReactionsByTargetRequest.fromPartial(request), metadata);
  }

  getReactionsByTarget(
    request: DeepPartial<ReactionsByTargetRequest>,
    metadata?: grpcWeb.grpc.Metadata,
  ): Promise<MessagesResponse> {
    return this.rpc.unary(HubServiceGetReactionsByTargetDesc, ReactionsByTargetRequest.fromPartial(request), metadata);
  }

  getUserData(request: DeepPartial<UserDataRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<Message> {
    return this.rpc.unary(HubServiceGetUserDataDesc, UserDataRequest.fromPartial(request), metadata);
  }

  getUserDataByFid(request: DeepPartial<FidRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<MessagesResponse> {
    return this.rpc.unary(HubServiceGetUserDataByFidDesc, FidRequest.fromPartial(request), metadata);
  }

  getUsernameProof(request: DeepPartial<UsernameProofRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<UserNameProof> {
    return this.rpc.unary(HubServiceGetUsernameProofDesc, UsernameProofRequest.fromPartial(request), metadata);
  }

  getUserNameProofsByFid(request: DeepPartial<FidRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<UsernameProofsResponse> {
    return this.rpc.unary(HubServiceGetUserNameProofsByFidDesc, FidRequest.fromPartial(request), metadata);
  }

  getVerification(request: DeepPartial<VerificationRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<Message> {
    return this.rpc.unary(HubServiceGetVerificationDesc, VerificationRequest.fromPartial(request), metadata);
  }

  getVerificationsByFid(request: DeepPartial<FidRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<MessagesResponse> {
    return this.rpc.unary(HubServiceGetVerificationsByFidDesc, FidRequest.fromPartial(request), metadata);
  }

  getOnChainSigner(request: DeepPartial<SignerRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<OnChainEvent> {
    return this.rpc.unary(HubServiceGetOnChainSignerDesc, SignerRequest.fromPartial(request), metadata);
  }

  getOnChainSignersByFid(request: DeepPartial<FidRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<OnChainEventResponse> {
    return this.rpc.unary(HubServiceGetOnChainSignersByFidDesc, FidRequest.fromPartial(request), metadata);
  }

  getOnChainEvents(request: DeepPartial<OnChainEventRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<OnChainEventResponse> {
    return this.rpc.unary(HubServiceGetOnChainEventsDesc, OnChainEventRequest.fromPartial(request), metadata);
  }

  getIdRegistryOnChainEvent(request: DeepPartial<FidRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<OnChainEvent> {
    return this.rpc.unary(HubServiceGetIdRegistryOnChainEventDesc, FidRequest.fromPartial(request), metadata);
  }

  getIdRegistryOnChainEventByAddress(
    request: DeepPartial<IdRegistryEventByAddressRequest>,
    metadata?: grpcWeb.grpc.Metadata,
  ): Promise<OnChainEvent> {
    return this.rpc.unary(
      HubServiceGetIdRegistryOnChainEventByAddressDesc,
      IdRegistryEventByAddressRequest.fromPartial(request),
      metadata,
    );
  }

  getCurrentStorageLimitsByFid(
    request: DeepPartial<FidRequest>,
    metadata?: grpcWeb.grpc.Metadata,
  ): Promise<StorageLimitsResponse> {
    return this.rpc.unary(HubServiceGetCurrentStorageLimitsByFidDesc, FidRequest.fromPartial(request), metadata);
  }

  getFids(request: DeepPartial<FidsRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<FidsResponse> {
    return this.rpc.unary(HubServiceGetFidsDesc, FidsRequest.fromPartial(request), metadata);
  }

  getLink(request: DeepPartial<LinkRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<Message> {
    return this.rpc.unary(HubServiceGetLinkDesc, LinkRequest.fromPartial(request), metadata);
  }

  getLinksByFid(request: DeepPartial<LinksByFidRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<MessagesResponse> {
    return this.rpc.unary(HubServiceGetLinksByFidDesc, LinksByFidRequest.fromPartial(request), metadata);
  }

  getLinksByTarget(request: DeepPartial<LinksByTargetRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<MessagesResponse> {
    return this.rpc.unary(HubServiceGetLinksByTargetDesc, LinksByTargetRequest.fromPartial(request), metadata);
  }

  getAllCastMessagesByFid(
    request: DeepPartial<FidTimestampRequest>,
    metadata?: grpcWeb.grpc.Metadata,
  ): Promise<MessagesResponse> {
    return this.rpc.unary(HubServiceGetAllCastMessagesByFidDesc, FidTimestampRequest.fromPartial(request), metadata);
  }

  getAllReactionMessagesByFid(
    request: DeepPartial<FidTimestampRequest>,
    metadata?: grpcWeb.grpc.Metadata,
  ): Promise<MessagesResponse> {
    return this.rpc.unary(
      HubServiceGetAllReactionMessagesByFidDesc,
      FidTimestampRequest.fromPartial(request),
      metadata,
    );
  }

  getAllVerificationMessagesByFid(
    request: DeepPartial<FidTimestampRequest>,
    metadata?: grpcWeb.grpc.Metadata,
  ): Promise<MessagesResponse> {
    return this.rpc.unary(
      HubServiceGetAllVerificationMessagesByFidDesc,
      FidTimestampRequest.fromPartial(request),
      metadata,
    );
  }

  getAllUserDataMessagesByFid(
    request: DeepPartial<FidTimestampRequest>,
    metadata?: grpcWeb.grpc.Metadata,
  ): Promise<MessagesResponse> {
    return this.rpc.unary(
      HubServiceGetAllUserDataMessagesByFidDesc,
      FidTimestampRequest.fromPartial(request),
      metadata,
    );
  }

  getAllLinkMessagesByFid(
    request: DeepPartial<FidTimestampRequest>,
    metadata?: grpcWeb.grpc.Metadata,
  ): Promise<MessagesResponse> {
    return this.rpc.unary(HubServiceGetAllLinkMessagesByFidDesc, FidTimestampRequest.fromPartial(request), metadata);
  }

  getLinkCompactStateMessageByFid(
    request: DeepPartial<FidRequest>,
    metadata?: grpcWeb.grpc.Metadata,
  ): Promise<MessagesResponse> {
    return this.rpc.unary(HubServiceGetLinkCompactStateMessageByFidDesc, FidRequest.fromPartial(request), metadata);
  }

  submitBulkMessages(
    request: DeepPartial<SubmitBulkMessagesRequest>,
    metadata?: grpcWeb.grpc.Metadata,
  ): Promise<SubmitBulkMessagesResponse> {
    return this.rpc.unary(HubServiceSubmitBulkMessagesDesc, SubmitBulkMessagesRequest.fromPartial(request), metadata);
  }

  getInfo(request: DeepPartial<HubInfoRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<HubInfoResponse> {
    return this.rpc.unary(HubServiceGetInfoDesc, HubInfoRequest.fromPartial(request), metadata);
  }

  getCurrentPeers(request: DeepPartial<Empty>, metadata?: grpcWeb.grpc.Metadata): Promise<ContactInfoResponse> {
    return this.rpc.unary(HubServiceGetCurrentPeersDesc, Empty.fromPartial(request), metadata);
  }

  stopSync(request: DeepPartial<Empty>, metadata?: grpcWeb.grpc.Metadata): Promise<SyncStatusResponse> {
    return this.rpc.unary(HubServiceStopSyncDesc, Empty.fromPartial(request), metadata);
  }

  forceSync(request: DeepPartial<SyncStatusRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<SyncStatusResponse> {
    return this.rpc.unary(HubServiceForceSyncDesc, SyncStatusRequest.fromPartial(request), metadata);
  }

  getSyncStatus(request: DeepPartial<SyncStatusRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<SyncStatusResponse> {
    return this.rpc.unary(HubServiceGetSyncStatusDesc, SyncStatusRequest.fromPartial(request), metadata);
  }

  getAllSyncIdsByPrefix(request: DeepPartial<TrieNodePrefix>, metadata?: grpcWeb.grpc.Metadata): Promise<SyncIds> {
    return this.rpc.unary(HubServiceGetAllSyncIdsByPrefixDesc, TrieNodePrefix.fromPartial(request), metadata);
  }

  getAllMessagesBySyncIds(request: DeepPartial<SyncIds>, metadata?: grpcWeb.grpc.Metadata): Promise<MessagesResponse> {
    return this.rpc.unary(HubServiceGetAllMessagesBySyncIdsDesc, SyncIds.fromPartial(request), metadata);
  }

  getSyncMetadataByPrefix(
    request: DeepPartial<TrieNodePrefix>,
    metadata?: grpcWeb.grpc.Metadata,
  ): Promise<TrieNodeMetadataResponse> {
    return this.rpc.unary(HubServiceGetSyncMetadataByPrefixDesc, TrieNodePrefix.fromPartial(request), metadata);
  }

  getSyncSnapshotByPrefix(
    request: DeepPartial<TrieNodePrefix>,
    metadata?: grpcWeb.grpc.Metadata,
  ): Promise<TrieNodeSnapshotResponse> {
    return this.rpc.unary(HubServiceGetSyncSnapshotByPrefixDesc, TrieNodePrefix.fromPartial(request), metadata);
  }

  streamSync(
    request: Observable<DeepPartial<StreamSyncRequest>>,
    metadata?: grpcWeb.grpc.Metadata,
  ): Observable<StreamSyncResponse> {
    throw new Error("ts-proto does not yet support client streaming!");
  }

  streamFetch(
    request: Observable<DeepPartial<StreamFetchRequest>>,
    metadata?: grpcWeb.grpc.Metadata,
  ): Observable<StreamFetchResponse> {
    throw new Error("ts-proto does not yet support client streaming!");
  }
}

export const HubServiceDesc = { serviceName: "HubService" };

export const HubServiceSubmitMessageDesc: UnaryMethodDefinitionish = {
  methodName: "SubmitMessage",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return Message.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = Message.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceValidateMessageDesc: UnaryMethodDefinitionish = {
  methodName: "ValidateMessage",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return Message.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = ValidationResponse.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceSubscribeDesc: UnaryMethodDefinitionish = {
  methodName: "Subscribe",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: true,
  requestType: {
    serializeBinary() {
      return SubscribeRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = HubEvent.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetEventDesc: UnaryMethodDefinitionish = {
  methodName: "GetEvent",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return EventRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = HubEvent.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetCastDesc: UnaryMethodDefinitionish = {
  methodName: "GetCast",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return CastId.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = Message.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetCastsByFidDesc: UnaryMethodDefinitionish = {
  methodName: "GetCastsByFid",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return FidRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = MessagesResponse.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetCastsByParentDesc: UnaryMethodDefinitionish = {
  methodName: "GetCastsByParent",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return CastsByParentRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = MessagesResponse.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetCastsByMentionDesc: UnaryMethodDefinitionish = {
  methodName: "GetCastsByMention",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return FidRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = MessagesResponse.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetReactionDesc: UnaryMethodDefinitionish = {
  methodName: "GetReaction",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return ReactionRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = Message.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetReactionsByFidDesc: UnaryMethodDefinitionish = {
  methodName: "GetReactionsByFid",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return ReactionsByFidRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = MessagesResponse.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetReactionsByCastDesc: UnaryMethodDefinitionish = {
  methodName: "GetReactionsByCast",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return ReactionsByTargetRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = MessagesResponse.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetReactionsByTargetDesc: UnaryMethodDefinitionish = {
  methodName: "GetReactionsByTarget",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return ReactionsByTargetRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = MessagesResponse.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetUserDataDesc: UnaryMethodDefinitionish = {
  methodName: "GetUserData",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return UserDataRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = Message.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetUserDataByFidDesc: UnaryMethodDefinitionish = {
  methodName: "GetUserDataByFid",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return FidRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = MessagesResponse.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetUsernameProofDesc: UnaryMethodDefinitionish = {
  methodName: "GetUsernameProof",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return UsernameProofRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = UserNameProof.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetUserNameProofsByFidDesc: UnaryMethodDefinitionish = {
  methodName: "GetUserNameProofsByFid",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return FidRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = UsernameProofsResponse.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetVerificationDesc: UnaryMethodDefinitionish = {
  methodName: "GetVerification",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return VerificationRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = Message.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetVerificationsByFidDesc: UnaryMethodDefinitionish = {
  methodName: "GetVerificationsByFid",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return FidRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = MessagesResponse.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetOnChainSignerDesc: UnaryMethodDefinitionish = {
  methodName: "GetOnChainSigner",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return SignerRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = OnChainEvent.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetOnChainSignersByFidDesc: UnaryMethodDefinitionish = {
  methodName: "GetOnChainSignersByFid",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return FidRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = OnChainEventResponse.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetOnChainEventsDesc: UnaryMethodDefinitionish = {
  methodName: "GetOnChainEvents",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return OnChainEventRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = OnChainEventResponse.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetIdRegistryOnChainEventDesc: UnaryMethodDefinitionish = {
  methodName: "GetIdRegistryOnChainEvent",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return FidRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = OnChainEvent.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetIdRegistryOnChainEventByAddressDesc: UnaryMethodDefinitionish = {
  methodName: "GetIdRegistryOnChainEventByAddress",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return IdRegistryEventByAddressRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = OnChainEvent.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetCurrentStorageLimitsByFidDesc: UnaryMethodDefinitionish = {
  methodName: "GetCurrentStorageLimitsByFid",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return FidRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = StorageLimitsResponse.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetFidsDesc: UnaryMethodDefinitionish = {
  methodName: "GetFids",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return FidsRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = FidsResponse.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetLinkDesc: UnaryMethodDefinitionish = {
  methodName: "GetLink",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return LinkRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = Message.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetLinksByFidDesc: UnaryMethodDefinitionish = {
  methodName: "GetLinksByFid",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return LinksByFidRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = MessagesResponse.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetLinksByTargetDesc: UnaryMethodDefinitionish = {
  methodName: "GetLinksByTarget",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return LinksByTargetRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = MessagesResponse.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetAllCastMessagesByFidDesc: UnaryMethodDefinitionish = {
  methodName: "GetAllCastMessagesByFid",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return FidTimestampRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = MessagesResponse.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetAllReactionMessagesByFidDesc: UnaryMethodDefinitionish = {
  methodName: "GetAllReactionMessagesByFid",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return FidTimestampRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = MessagesResponse.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetAllVerificationMessagesByFidDesc: UnaryMethodDefinitionish = {
  methodName: "GetAllVerificationMessagesByFid",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return FidTimestampRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = MessagesResponse.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetAllUserDataMessagesByFidDesc: UnaryMethodDefinitionish = {
  methodName: "GetAllUserDataMessagesByFid",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return FidTimestampRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = MessagesResponse.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetAllLinkMessagesByFidDesc: UnaryMethodDefinitionish = {
  methodName: "GetAllLinkMessagesByFid",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return FidTimestampRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = MessagesResponse.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetLinkCompactStateMessageByFidDesc: UnaryMethodDefinitionish = {
  methodName: "GetLinkCompactStateMessageByFid",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return FidRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = MessagesResponse.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceSubmitBulkMessagesDesc: UnaryMethodDefinitionish = {
  methodName: "SubmitBulkMessages",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return SubmitBulkMessagesRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = SubmitBulkMessagesResponse.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetInfoDesc: UnaryMethodDefinitionish = {
  methodName: "GetInfo",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return HubInfoRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = HubInfoResponse.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetCurrentPeersDesc: UnaryMethodDefinitionish = {
  methodName: "GetCurrentPeers",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return Empty.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = ContactInfoResponse.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceStopSyncDesc: UnaryMethodDefinitionish = {
  methodName: "StopSync",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return Empty.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = SyncStatusResponse.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceForceSyncDesc: UnaryMethodDefinitionish = {
  methodName: "ForceSync",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return SyncStatusRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = SyncStatusResponse.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetSyncStatusDesc: UnaryMethodDefinitionish = {
  methodName: "GetSyncStatus",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return SyncStatusRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = SyncStatusResponse.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetAllSyncIdsByPrefixDesc: UnaryMethodDefinitionish = {
  methodName: "GetAllSyncIdsByPrefix",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return TrieNodePrefix.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = SyncIds.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetAllMessagesBySyncIdsDesc: UnaryMethodDefinitionish = {
  methodName: "GetAllMessagesBySyncIds",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return SyncIds.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = MessagesResponse.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetSyncMetadataByPrefixDesc: UnaryMethodDefinitionish = {
  methodName: "GetSyncMetadataByPrefix",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return TrieNodePrefix.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = TrieNodeMetadataResponse.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const HubServiceGetSyncSnapshotByPrefixDesc: UnaryMethodDefinitionish = {
  methodName: "GetSyncSnapshotByPrefix",
  service: HubServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return TrieNodePrefix.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = TrieNodeSnapshotResponse.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export interface AdminService {
  rebuildSyncTrie(request: DeepPartial<Empty>, metadata?: grpcWeb.grpc.Metadata): Promise<Empty>;
  deleteAllMessagesFromDb(request: DeepPartial<Empty>, metadata?: grpcWeb.grpc.Metadata): Promise<Empty>;
  pruneMessages(request: DeepPartial<PruneMessagesRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<PruneMessagesResponse>;
  submitOnChainEvent(request: DeepPartial<OnChainEvent>, metadata?: grpcWeb.grpc.Metadata): Promise<OnChainEvent>;
  submitUserNameProof(request: DeepPartial<UserNameProof>, metadata?: grpcWeb.grpc.Metadata): Promise<UserNameProof>;
}

export class AdminServiceClientImpl implements AdminService {
  private readonly rpc: Rpc;

  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.rebuildSyncTrie = this.rebuildSyncTrie.bind(this);
    this.deleteAllMessagesFromDb = this.deleteAllMessagesFromDb.bind(this);
    this.pruneMessages = this.pruneMessages.bind(this);
    this.submitOnChainEvent = this.submitOnChainEvent.bind(this);
    this.submitUserNameProof = this.submitUserNameProof.bind(this);
  }

  rebuildSyncTrie(request: DeepPartial<Empty>, metadata?: grpcWeb.grpc.Metadata): Promise<Empty> {
    return this.rpc.unary(AdminServiceRebuildSyncTrieDesc, Empty.fromPartial(request), metadata);
  }

  deleteAllMessagesFromDb(request: DeepPartial<Empty>, metadata?: grpcWeb.grpc.Metadata): Promise<Empty> {
    return this.rpc.unary(AdminServiceDeleteAllMessagesFromDbDesc, Empty.fromPartial(request), metadata);
  }

  pruneMessages(request: DeepPartial<PruneMessagesRequest>, metadata?: grpcWeb.grpc.Metadata): Promise<PruneMessagesResponse> {
    return this.rpc.unary(AdminServicePruneMessagesDesc, PruneMessagesRequest.fromPartial(request), metadata);
  }

  submitOnChainEvent(request: DeepPartial<OnChainEvent>, metadata?: grpcWeb.grpc.Metadata): Promise<OnChainEvent> {
    return this.rpc.unary(AdminServiceSubmitOnChainEventDesc, OnChainEvent.fromPartial(request), metadata);
  }

  submitUserNameProof(request: DeepPartial<UserNameProof>, metadata?: grpcWeb.grpc.Metadata): Promise<UserNameProof> {
    return this.rpc.unary(AdminServiceSubmitUserNameProofDesc, UserNameProof.fromPartial(request), metadata);
  }
}

export const AdminServiceDesc = { serviceName: "AdminService" };

export const AdminServiceRebuildSyncTrieDesc: UnaryMethodDefinitionish = {
  methodName: "RebuildSyncTrie",
  service: AdminServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return Empty.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = Empty.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const AdminServiceDeleteAllMessagesFromDbDesc: UnaryMethodDefinitionish = {
  methodName: "DeleteAllMessagesFromDb",
  service: AdminServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return Empty.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = Empty.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const AdminServicePruneMessagesDesc: UnaryMethodDefinitionish = {
  methodName: "PruneMessages",
  service: AdminServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return PruneMessagesRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = PruneMessagesResponse.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const AdminServiceSubmitOnChainEventDesc: UnaryMethodDefinitionish = {
  methodName: "SubmitOnChainEvent",
  service: AdminServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return OnChainEvent.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = OnChainEvent.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

export const AdminServiceSubmitUserNameProofDesc: UnaryMethodDefinitionish = {
  methodName: "SubmitUserNameProof",
  service: AdminServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return UserNameProof.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      const value = UserNameProof.decode(data);
      return {
        ...value,
        toObject() {
          return value;
        },
      };
    },
  } as any,
};

interface UnaryMethodDefinitionishR extends grpcWeb.grpc.UnaryMethodDefinition<any, any> {
  requestStream: any;
  responseStream: any;
}

type UnaryMethodDefinitionish = UnaryMethodDefinitionishR;

interface Rpc {
  unary<T extends UnaryMethodDefinitionish>(
    methodDesc: T,
    request: any,
    metadata: grpcWeb.grpc.Metadata | undefined,
  ): Promise<any>;
  invoke<T extends UnaryMethodDefinitionish>(
    methodDesc: T,
    request: any,
    metadata: grpcWeb.grpc.Metadata | undefined,
  ): Observable<any>;
}

export class GrpcWebImpl {
  private host: string;
  private options: {
    transport?: grpcWeb.grpc.TransportFactory;
    streamingTransport?: grpcWeb.grpc.TransportFactory;
    debug?: boolean;
    metadata?: grpcWeb.grpc.Metadata;
    upStreamRetryCodes?: number[];
  };

  constructor(
    host: string,
    options: {
      transport?: grpcWeb.grpc.TransportFactory;
      streamingTransport?: grpcWeb.grpc.TransportFactory;
      debug?: boolean;
      metadata?: grpcWeb.grpc.Metadata;
      upStreamRetryCodes?: number[];
    },
  ) {
    this.host = host;
    this.options = options;
  }

  unary<T extends UnaryMethodDefinitionish>(
    methodDesc: T,
    _request: any,
    metadata: grpcWeb.grpc.Metadata | undefined,
  ): Promise<any> {
    const request = { ..._request, ...methodDesc.requestType };
    const maybeCombinedMetadata = metadata && this.options.metadata
      ? new BrowserHeaders({ ...this.options?.metadata.headersMap, ...metadata?.headersMap })
      : metadata || this.options.metadata;
    return new Promise((resolve, reject) => {
      grpcWeb.grpc.unary(methodDesc, {
        request,
        host: this.host,
        metadata: maybeCombinedMetadata,
        transport: this.options.transport,
        debug: this.options.debug,
        onEnd: function (response) {
          if (response.status === grpcWeb.grpc.Code.OK) {
            resolve(response.message!.toObject());
          } else {
            const err = new GrpcWebError(response.statusMessage, response.status, response.trailers);
            reject(err);
          }
        },
      });
    });
  }

  invoke<T extends UnaryMethodDefinitionish>(
    methodDesc: T,
    _request: any,
    metadata: grpcWeb.grpc.Metadata | undefined,
  ): Observable<any> {
    const upStreamCodes = this.options.upStreamRetryCodes || [];
    const DEFAULT_TIMEOUT_TIME: number = 3_000;
    const request = { ..._request, ...methodDesc.requestType };
    const maybeCombinedMetadata = metadata && this.options.metadata
      ? new BrowserHeaders({ ...this.options?.metadata.headersMap, ...metadata?.headersMap })
      : metadata || this.options.metadata;
    return new Observable((observer) => {
      const upStream = (() => {
        const client = grpcWeb.grpc.invoke(methodDesc, {
          host: this.host,
          request,
          transport: this.options.streamingTransport || this.options.transport,
          metadata: maybeCombinedMetadata,
          debug: this.options.debug,
          onMessage: (next) => observer.next(next),
          onEnd: (code: grpcWeb.grpc.Code, message: string, trailers: grpcWeb.grpc.Metadata) => {
            if (code === 0) {
              observer.complete();
            } else if (upStreamCodes.includes(code)) {
              setTimeout(upStream, DEFAULT_TIMEOUT_TIME);
            } else {
              const err = new Error(message) as any;
              err.code = code;
              err.metadata = trailers;
              observer.error(err);
            }
          },
        });
        observer.add(() => {
          if (!observer.closed) {
            return client.close();
          }
        });
      });
      upStream();
    }).pipe(share());
  }
}

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

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

type DeepPartial<T> = T extends Builtin ? T
  : T extends Array<infer U> ? Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

export class GrpcWebError extends tsProtoGlobalThis.Error {
  constructor(message: string, public code: grpcWeb.grpc.Code, public metadata: grpcWeb.grpc.Metadata) {
    super(message);
  }
}
