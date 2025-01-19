/* eslint-disable */
import {
  CallOptions,
  ChannelCredentials,
  Client,
  ClientDuplexStream,
  ClientOptions,
  ClientReadableStream,
  ClientUnaryCall,
  handleBidiStreamingCall,
  handleServerStreamingCall,
  handleUnaryCall,
  makeGenericClientConstructor,
  Metadata,
  ServiceError,
  UntypedServiceImplementation,
} from "@grpc/grpc-js";
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

export type HubServiceService = typeof HubServiceService;
export const HubServiceService = {
  /** Submit Methods */
  submitMessage: {
    path: "/HubService/SubmitMessage",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: Message) => Buffer.from(Message.encode(value).finish()),
    requestDeserialize: (value: Buffer) => Message.decode(value),
    responseSerialize: (value: Message) => Buffer.from(Message.encode(value).finish()),
    responseDeserialize: (value: Buffer) => Message.decode(value),
  },
  /** Validation Methods */
  validateMessage: {
    path: "/HubService/ValidateMessage",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: Message) => Buffer.from(Message.encode(value).finish()),
    requestDeserialize: (value: Buffer) => Message.decode(value),
    responseSerialize: (value: ValidationResponse) => Buffer.from(ValidationResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => ValidationResponse.decode(value),
  },
  /**
   * Event Methods
   * @http-api: none
   */
  subscribe: {
    path: "/HubService/Subscribe",
    requestStream: false,
    responseStream: true,
    requestSerialize: (value: SubscribeRequest) => Buffer.from(SubscribeRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => SubscribeRequest.decode(value),
    responseSerialize: (value: HubEvent) => Buffer.from(HubEvent.encode(value).finish()),
    responseDeserialize: (value: Buffer) => HubEvent.decode(value),
  },
  /** @http-api: events */
  getEvent: {
    path: "/HubService/GetEvent",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: EventRequest) => Buffer.from(EventRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => EventRequest.decode(value),
    responseSerialize: (value: HubEvent) => Buffer.from(HubEvent.encode(value).finish()),
    responseDeserialize: (value: Buffer) => HubEvent.decode(value),
  },
  /**
   * Casts
   * @http-api: castById
   */
  getCast: {
    path: "/HubService/GetCast",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: CastId) => Buffer.from(CastId.encode(value).finish()),
    requestDeserialize: (value: Buffer) => CastId.decode(value),
    responseSerialize: (value: Message) => Buffer.from(Message.encode(value).finish()),
    responseDeserialize: (value: Buffer) => Message.decode(value),
  },
  getCastsByFid: {
    path: "/HubService/GetCastsByFid",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: FidRequest) => Buffer.from(FidRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => FidRequest.decode(value),
    responseSerialize: (value: MessagesResponse) => Buffer.from(MessagesResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => MessagesResponse.decode(value),
  },
  getCastsByParent: {
    path: "/HubService/GetCastsByParent",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: CastsByParentRequest) => Buffer.from(CastsByParentRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => CastsByParentRequest.decode(value),
    responseSerialize: (value: MessagesResponse) => Buffer.from(MessagesResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => MessagesResponse.decode(value),
  },
  getCastsByMention: {
    path: "/HubService/GetCastsByMention",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: FidRequest) => Buffer.from(FidRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => FidRequest.decode(value),
    responseSerialize: (value: MessagesResponse) => Buffer.from(MessagesResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => MessagesResponse.decode(value),
  },
  /**
   * Reactions
   * @http-api: reactionById
   */
  getReaction: {
    path: "/HubService/GetReaction",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: ReactionRequest) => Buffer.from(ReactionRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => ReactionRequest.decode(value),
    responseSerialize: (value: Message) => Buffer.from(Message.encode(value).finish()),
    responseDeserialize: (value: Buffer) => Message.decode(value),
  },
  getReactionsByFid: {
    path: "/HubService/GetReactionsByFid",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: ReactionsByFidRequest) => Buffer.from(ReactionsByFidRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => ReactionsByFidRequest.decode(value),
    responseSerialize: (value: MessagesResponse) => Buffer.from(MessagesResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => MessagesResponse.decode(value),
  },
  /** To be deprecated */
  getReactionsByCast: {
    path: "/HubService/GetReactionsByCast",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: ReactionsByTargetRequest) => Buffer.from(ReactionsByTargetRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => ReactionsByTargetRequest.decode(value),
    responseSerialize: (value: MessagesResponse) => Buffer.from(MessagesResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => MessagesResponse.decode(value),
  },
  getReactionsByTarget: {
    path: "/HubService/GetReactionsByTarget",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: ReactionsByTargetRequest) => Buffer.from(ReactionsByTargetRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => ReactionsByTargetRequest.decode(value),
    responseSerialize: (value: MessagesResponse) => Buffer.from(MessagesResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => MessagesResponse.decode(value),
  },
  /**
   * User Data
   * @http-api: none
   */
  getUserData: {
    path: "/HubService/GetUserData",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: UserDataRequest) => Buffer.from(UserDataRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => UserDataRequest.decode(value),
    responseSerialize: (value: Message) => Buffer.from(Message.encode(value).finish()),
    responseDeserialize: (value: Buffer) => Message.decode(value),
  },
  getUserDataByFid: {
    path: "/HubService/GetUserDataByFid",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: FidRequest) => Buffer.from(FidRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => FidRequest.decode(value),
    responseSerialize: (value: MessagesResponse) => Buffer.from(MessagesResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => MessagesResponse.decode(value),
  },
  /**
   * Username Proof
   * @http-api: userNameProofByName
   */
  getUsernameProof: {
    path: "/HubService/GetUsernameProof",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: UsernameProofRequest) => Buffer.from(UsernameProofRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => UsernameProofRequest.decode(value),
    responseSerialize: (value: UserNameProof) => Buffer.from(UserNameProof.encode(value).finish()),
    responseDeserialize: (value: Buffer) => UserNameProof.decode(value),
  },
  getUserNameProofsByFid: {
    path: "/HubService/GetUserNameProofsByFid",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: FidRequest) => Buffer.from(FidRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => FidRequest.decode(value),
    responseSerialize: (value: UsernameProofsResponse) => Buffer.from(UsernameProofsResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => UsernameProofsResponse.decode(value),
  },
  /**
   * Verifications
   * @http-api: none
   */
  getVerification: {
    path: "/HubService/GetVerification",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: VerificationRequest) => Buffer.from(VerificationRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => VerificationRequest.decode(value),
    responseSerialize: (value: Message) => Buffer.from(Message.encode(value).finish()),
    responseDeserialize: (value: Buffer) => Message.decode(value),
  },
  getVerificationsByFid: {
    path: "/HubService/GetVerificationsByFid",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: FidRequest) => Buffer.from(FidRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => FidRequest.decode(value),
    responseSerialize: (value: MessagesResponse) => Buffer.from(MessagesResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => MessagesResponse.decode(value),
  },
  /**
   * OnChain Events
   * @http-api: none
   */
  getOnChainSigner: {
    path: "/HubService/GetOnChainSigner",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: SignerRequest) => Buffer.from(SignerRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => SignerRequest.decode(value),
    responseSerialize: (value: OnChainEvent) => Buffer.from(OnChainEvent.encode(value).finish()),
    responseDeserialize: (value: Buffer) => OnChainEvent.decode(value),
  },
  getOnChainSignersByFid: {
    path: "/HubService/GetOnChainSignersByFid",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: FidRequest) => Buffer.from(FidRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => FidRequest.decode(value),
    responseSerialize: (value: OnChainEventResponse) => Buffer.from(OnChainEventResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => OnChainEventResponse.decode(value),
  },
  /** @http-api: none */
  getOnChainEvents: {
    path: "/HubService/GetOnChainEvents",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: OnChainEventRequest) => Buffer.from(OnChainEventRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => OnChainEventRequest.decode(value),
    responseSerialize: (value: OnChainEventResponse) => Buffer.from(OnChainEventResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => OnChainEventResponse.decode(value),
  },
  /** @http-api: none */
  getIdRegistryOnChainEvent: {
    path: "/HubService/GetIdRegistryOnChainEvent",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: FidRequest) => Buffer.from(FidRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => FidRequest.decode(value),
    responseSerialize: (value: OnChainEvent) => Buffer.from(OnChainEvent.encode(value).finish()),
    responseDeserialize: (value: Buffer) => OnChainEvent.decode(value),
  },
  /** @http-api: onChainIdRegistryEventByAddress */
  getIdRegistryOnChainEventByAddress: {
    path: "/HubService/GetIdRegistryOnChainEventByAddress",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: IdRegistryEventByAddressRequest) =>
      Buffer.from(IdRegistryEventByAddressRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => IdRegistryEventByAddressRequest.decode(value),
    responseSerialize: (value: OnChainEvent) => Buffer.from(OnChainEvent.encode(value).finish()),
    responseDeserialize: (value: Buffer) => OnChainEvent.decode(value),
  },
  /** @http-api: storageLimitsByFid */
  getCurrentStorageLimitsByFid: {
    path: "/HubService/GetCurrentStorageLimitsByFid",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: FidRequest) => Buffer.from(FidRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => FidRequest.decode(value),
    responseSerialize: (value: StorageLimitsResponse) => Buffer.from(StorageLimitsResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => StorageLimitsResponse.decode(value),
  },
  getFids: {
    path: "/HubService/GetFids",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: FidsRequest) => Buffer.from(FidsRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => FidsRequest.decode(value),
    responseSerialize: (value: FidsResponse) => Buffer.from(FidsResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => FidsResponse.decode(value),
  },
  /**
   * Links
   * @http-api: linkById
   */
  getLink: {
    path: "/HubService/GetLink",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: LinkRequest) => Buffer.from(LinkRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => LinkRequest.decode(value),
    responseSerialize: (value: Message) => Buffer.from(Message.encode(value).finish()),
    responseDeserialize: (value: Buffer) => Message.decode(value),
  },
  getLinksByFid: {
    path: "/HubService/GetLinksByFid",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: LinksByFidRequest) => Buffer.from(LinksByFidRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => LinksByFidRequest.decode(value),
    responseSerialize: (value: MessagesResponse) => Buffer.from(MessagesResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => MessagesResponse.decode(value),
  },
  /** @http-api: linksByTargetFid */
  getLinksByTarget: {
    path: "/HubService/GetLinksByTarget",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: LinksByTargetRequest) => Buffer.from(LinksByTargetRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => LinksByTargetRequest.decode(value),
    responseSerialize: (value: MessagesResponse) => Buffer.from(MessagesResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => MessagesResponse.decode(value),
  },
  /**
   * Bulk Methods
   * The Bulk methods don't have corresponding HTTP API endpoints because the
   * regular endpoints can be used to get all the messages
   * @http-api: none
   */
  getAllCastMessagesByFid: {
    path: "/HubService/GetAllCastMessagesByFid",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: FidTimestampRequest) => Buffer.from(FidTimestampRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => FidTimestampRequest.decode(value),
    responseSerialize: (value: MessagesResponse) => Buffer.from(MessagesResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => MessagesResponse.decode(value),
  },
  /** @http-api: none */
  getAllReactionMessagesByFid: {
    path: "/HubService/GetAllReactionMessagesByFid",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: FidTimestampRequest) => Buffer.from(FidTimestampRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => FidTimestampRequest.decode(value),
    responseSerialize: (value: MessagesResponse) => Buffer.from(MessagesResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => MessagesResponse.decode(value),
  },
  /** @http-api: none */
  getAllVerificationMessagesByFid: {
    path: "/HubService/GetAllVerificationMessagesByFid",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: FidTimestampRequest) => Buffer.from(FidTimestampRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => FidTimestampRequest.decode(value),
    responseSerialize: (value: MessagesResponse) => Buffer.from(MessagesResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => MessagesResponse.decode(value),
  },
  /** @http-api: none */
  getAllUserDataMessagesByFid: {
    path: "/HubService/GetAllUserDataMessagesByFid",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: FidTimestampRequest) => Buffer.from(FidTimestampRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => FidTimestampRequest.decode(value),
    responseSerialize: (value: MessagesResponse) => Buffer.from(MessagesResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => MessagesResponse.decode(value),
  },
  /** @http-api: none */
  getAllLinkMessagesByFid: {
    path: "/HubService/GetAllLinkMessagesByFid",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: FidTimestampRequest) => Buffer.from(FidTimestampRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => FidTimestampRequest.decode(value),
    responseSerialize: (value: MessagesResponse) => Buffer.from(MessagesResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => MessagesResponse.decode(value),
  },
  /** @http-api: none */
  getLinkCompactStateMessageByFid: {
    path: "/HubService/GetLinkCompactStateMessageByFid",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: FidRequest) => Buffer.from(FidRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => FidRequest.decode(value),
    responseSerialize: (value: MessagesResponse) => Buffer.from(MessagesResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => MessagesResponse.decode(value),
  },
  /** @http-api: none */
  submitBulkMessages: {
    path: "/HubService/SubmitBulkMessages",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: SubmitBulkMessagesRequest) =>
      Buffer.from(SubmitBulkMessagesRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => SubmitBulkMessagesRequest.decode(value),
    responseSerialize: (value: SubmitBulkMessagesResponse) =>
      Buffer.from(SubmitBulkMessagesResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => SubmitBulkMessagesResponse.decode(value),
  },
  /** Sync Methods */
  getInfo: {
    path: "/HubService/GetInfo",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: HubInfoRequest) => Buffer.from(HubInfoRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => HubInfoRequest.decode(value),
    responseSerialize: (value: HubInfoResponse) => Buffer.from(HubInfoResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => HubInfoResponse.decode(value),
  },
  getCurrentPeers: {
    path: "/HubService/GetCurrentPeers",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: Empty) => Buffer.from(Empty.encode(value).finish()),
    requestDeserialize: (value: Buffer) => Empty.decode(value),
    responseSerialize: (value: ContactInfoResponse) => Buffer.from(ContactInfoResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => ContactInfoResponse.decode(value),
  },
  /** @http-api: none */
  stopSync: {
    path: "/HubService/StopSync",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: Empty) => Buffer.from(Empty.encode(value).finish()),
    requestDeserialize: (value: Buffer) => Empty.decode(value),
    responseSerialize: (value: SyncStatusResponse) => Buffer.from(SyncStatusResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => SyncStatusResponse.decode(value),
  },
  /**
   * This is experimental, do not rely on this endpoint existing in the future
   * @http-api: none
   */
  forceSync: {
    path: "/HubService/ForceSync",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: SyncStatusRequest) => Buffer.from(SyncStatusRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => SyncStatusRequest.decode(value),
    responseSerialize: (value: SyncStatusResponse) => Buffer.from(SyncStatusResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => SyncStatusResponse.decode(value),
  },
  /** @http-api: none */
  getSyncStatus: {
    path: "/HubService/GetSyncStatus",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: SyncStatusRequest) => Buffer.from(SyncStatusRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => SyncStatusRequest.decode(value),
    responseSerialize: (value: SyncStatusResponse) => Buffer.from(SyncStatusResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => SyncStatusResponse.decode(value),
  },
  /** @http-api: none */
  getAllSyncIdsByPrefix: {
    path: "/HubService/GetAllSyncIdsByPrefix",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: TrieNodePrefix) => Buffer.from(TrieNodePrefix.encode(value).finish()),
    requestDeserialize: (value: Buffer) => TrieNodePrefix.decode(value),
    responseSerialize: (value: SyncIds) => Buffer.from(SyncIds.encode(value).finish()),
    responseDeserialize: (value: Buffer) => SyncIds.decode(value),
  },
  /** @http-api: none */
  getAllMessagesBySyncIds: {
    path: "/HubService/GetAllMessagesBySyncIds",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: SyncIds) => Buffer.from(SyncIds.encode(value).finish()),
    requestDeserialize: (value: Buffer) => SyncIds.decode(value),
    responseSerialize: (value: MessagesResponse) => Buffer.from(MessagesResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => MessagesResponse.decode(value),
  },
  /** @http-api: none */
  getSyncMetadataByPrefix: {
    path: "/HubService/GetSyncMetadataByPrefix",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: TrieNodePrefix) => Buffer.from(TrieNodePrefix.encode(value).finish()),
    requestDeserialize: (value: Buffer) => TrieNodePrefix.decode(value),
    responseSerialize: (value: TrieNodeMetadataResponse) =>
      Buffer.from(TrieNodeMetadataResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => TrieNodeMetadataResponse.decode(value),
  },
  /** @http-api: none */
  getSyncSnapshotByPrefix: {
    path: "/HubService/GetSyncSnapshotByPrefix",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: TrieNodePrefix) => Buffer.from(TrieNodePrefix.encode(value).finish()),
    requestDeserialize: (value: Buffer) => TrieNodePrefix.decode(value),
    responseSerialize: (value: TrieNodeSnapshotResponse) =>
      Buffer.from(TrieNodeSnapshotResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => TrieNodeSnapshotResponse.decode(value),
  },
  /** @http-api: none */
  streamSync: {
    path: "/HubService/StreamSync",
    requestStream: true,
    responseStream: true,
    requestSerialize: (value: StreamSyncRequest) => Buffer.from(StreamSyncRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => StreamSyncRequest.decode(value),
    responseSerialize: (value: StreamSyncResponse) => Buffer.from(StreamSyncResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => StreamSyncResponse.decode(value),
  },
  /** @http-api: none */
  streamFetch: {
    path: "/HubService/StreamFetch",
    requestStream: true,
    responseStream: true,
    requestSerialize: (value: StreamFetchRequest) => Buffer.from(StreamFetchRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => StreamFetchRequest.decode(value),
    responseSerialize: (value: StreamFetchResponse) => Buffer.from(StreamFetchResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => StreamFetchResponse.decode(value),
  },
} as const;

export interface HubServiceServer extends UntypedServiceImplementation {
  /** Submit Methods */
  submitMessage: handleUnaryCall<Message, Message>;
  /** Validation Methods */
  validateMessage: handleUnaryCall<Message, ValidationResponse>;
  /**
   * Event Methods
   * @http-api: none
   */
  subscribe: handleServerStreamingCall<SubscribeRequest, HubEvent>;
  /** @http-api: events */
  getEvent: handleUnaryCall<EventRequest, HubEvent>;
  /**
   * Casts
   * @http-api: castById
   */
  getCast: handleUnaryCall<CastId, Message>;
  getCastsByFid: handleUnaryCall<FidRequest, MessagesResponse>;
  getCastsByParent: handleUnaryCall<CastsByParentRequest, MessagesResponse>;
  getCastsByMention: handleUnaryCall<FidRequest, MessagesResponse>;
  /**
   * Reactions
   * @http-api: reactionById
   */
  getReaction: handleUnaryCall<ReactionRequest, Message>;
  getReactionsByFid: handleUnaryCall<ReactionsByFidRequest, MessagesResponse>;
  /** To be deprecated */
  getReactionsByCast: handleUnaryCall<ReactionsByTargetRequest, MessagesResponse>;
  getReactionsByTarget: handleUnaryCall<ReactionsByTargetRequest, MessagesResponse>;
  /**
   * User Data
   * @http-api: none
   */
  getUserData: handleUnaryCall<UserDataRequest, Message>;
  getUserDataByFid: handleUnaryCall<FidRequest, MessagesResponse>;
  /**
   * Username Proof
   * @http-api: userNameProofByName
   */
  getUsernameProof: handleUnaryCall<UsernameProofRequest, UserNameProof>;
  getUserNameProofsByFid: handleUnaryCall<FidRequest, UsernameProofsResponse>;
  /**
   * Verifications
   * @http-api: none
   */
  getVerification: handleUnaryCall<VerificationRequest, Message>;
  getVerificationsByFid: handleUnaryCall<FidRequest, MessagesResponse>;
  /**
   * OnChain Events
   * @http-api: none
   */
  getOnChainSigner: handleUnaryCall<SignerRequest, OnChainEvent>;
  getOnChainSignersByFid: handleUnaryCall<FidRequest, OnChainEventResponse>;
  /** @http-api: none */
  getOnChainEvents: handleUnaryCall<OnChainEventRequest, OnChainEventResponse>;
  /** @http-api: none */
  getIdRegistryOnChainEvent: handleUnaryCall<FidRequest, OnChainEvent>;
  /** @http-api: onChainIdRegistryEventByAddress */
  getIdRegistryOnChainEventByAddress: handleUnaryCall<IdRegistryEventByAddressRequest, OnChainEvent>;
  /** @http-api: storageLimitsByFid */
  getCurrentStorageLimitsByFid: handleUnaryCall<FidRequest, StorageLimitsResponse>;
  getFids: handleUnaryCall<FidsRequest, FidsResponse>;
  /**
   * Links
   * @http-api: linkById
   */
  getLink: handleUnaryCall<LinkRequest, Message>;
  getLinksByFid: handleUnaryCall<LinksByFidRequest, MessagesResponse>;
  /** @http-api: linksByTargetFid */
  getLinksByTarget: handleUnaryCall<LinksByTargetRequest, MessagesResponse>;
  /**
   * Bulk Methods
   * The Bulk methods don't have corresponding HTTP API endpoints because the
   * regular endpoints can be used to get all the messages
   * @http-api: none
   */
  getAllCastMessagesByFid: handleUnaryCall<FidTimestampRequest, MessagesResponse>;
  /** @http-api: none */
  getAllReactionMessagesByFid: handleUnaryCall<FidTimestampRequest, MessagesResponse>;
  /** @http-api: none */
  getAllVerificationMessagesByFid: handleUnaryCall<FidTimestampRequest, MessagesResponse>;
  /** @http-api: none */
  getAllUserDataMessagesByFid: handleUnaryCall<FidTimestampRequest, MessagesResponse>;
  /** @http-api: none */
  getAllLinkMessagesByFid: handleUnaryCall<FidTimestampRequest, MessagesResponse>;
  /** @http-api: none */
  getLinkCompactStateMessageByFid: handleUnaryCall<FidRequest, MessagesResponse>;
  /** @http-api: none */
  submitBulkMessages: handleUnaryCall<SubmitBulkMessagesRequest, SubmitBulkMessagesResponse>;
  /** Sync Methods */
  getInfo: handleUnaryCall<HubInfoRequest, HubInfoResponse>;
  getCurrentPeers: handleUnaryCall<Empty, ContactInfoResponse>;
  /** @http-api: none */
  stopSync: handleUnaryCall<Empty, SyncStatusResponse>;
  /**
   * This is experimental, do not rely on this endpoint existing in the future
   * @http-api: none
   */
  forceSync: handleUnaryCall<SyncStatusRequest, SyncStatusResponse>;
  /** @http-api: none */
  getSyncStatus: handleUnaryCall<SyncStatusRequest, SyncStatusResponse>;
  /** @http-api: none */
  getAllSyncIdsByPrefix: handleUnaryCall<TrieNodePrefix, SyncIds>;
  /** @http-api: none */
  getAllMessagesBySyncIds: handleUnaryCall<SyncIds, MessagesResponse>;
  /** @http-api: none */
  getSyncMetadataByPrefix: handleUnaryCall<TrieNodePrefix, TrieNodeMetadataResponse>;
  /** @http-api: none */
  getSyncSnapshotByPrefix: handleUnaryCall<TrieNodePrefix, TrieNodeSnapshotResponse>;
  /** @http-api: none */
  streamSync: handleBidiStreamingCall<StreamSyncRequest, StreamSyncResponse>;
  /** @http-api: none */
  streamFetch: handleBidiStreamingCall<StreamFetchRequest, StreamFetchResponse>;
}

export interface HubServiceClient extends Client {
  /** Submit Methods */
  submitMessage(request: Message, callback: (error: ServiceError | null, response: Message) => void): ClientUnaryCall;
  submitMessage(
    request: Message,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: Message) => void,
  ): ClientUnaryCall;
  submitMessage(
    request: Message,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: Message) => void,
  ): ClientUnaryCall;
  /** Validation Methods */
  validateMessage(
    request: Message,
    callback: (error: ServiceError | null, response: ValidationResponse) => void,
  ): ClientUnaryCall;
  validateMessage(
    request: Message,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: ValidationResponse) => void,
  ): ClientUnaryCall;
  validateMessage(
    request: Message,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: ValidationResponse) => void,
  ): ClientUnaryCall;
  /**
   * Event Methods
   * @http-api: none
   */
  subscribe(request: SubscribeRequest, options?: Partial<CallOptions>): ClientReadableStream<HubEvent>;
  subscribe(
    request: SubscribeRequest,
    metadata?: Metadata,
    options?: Partial<CallOptions>,
  ): ClientReadableStream<HubEvent>;
  /** @http-api: events */
  getEvent(request: EventRequest, callback: (error: ServiceError | null, response: HubEvent) => void): ClientUnaryCall;
  getEvent(
    request: EventRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: HubEvent) => void,
  ): ClientUnaryCall;
  getEvent(
    request: EventRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: HubEvent) => void,
  ): ClientUnaryCall;
  /**
   * Casts
   * @http-api: castById
   */
  getCast(request: CastId, callback: (error: ServiceError | null, response: Message) => void): ClientUnaryCall;
  getCast(
    request: CastId,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: Message) => void,
  ): ClientUnaryCall;
  getCast(
    request: CastId,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: Message) => void,
  ): ClientUnaryCall;
  getCastsByFid(
    request: FidRequest,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getCastsByFid(
    request: FidRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getCastsByFid(
    request: FidRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getCastsByParent(
    request: CastsByParentRequest,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getCastsByParent(
    request: CastsByParentRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getCastsByParent(
    request: CastsByParentRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getCastsByMention(
    request: FidRequest,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getCastsByMention(
    request: FidRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getCastsByMention(
    request: FidRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  /**
   * Reactions
   * @http-api: reactionById
   */
  getReaction(
    request: ReactionRequest,
    callback: (error: ServiceError | null, response: Message) => void,
  ): ClientUnaryCall;
  getReaction(
    request: ReactionRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: Message) => void,
  ): ClientUnaryCall;
  getReaction(
    request: ReactionRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: Message) => void,
  ): ClientUnaryCall;
  getReactionsByFid(
    request: ReactionsByFidRequest,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getReactionsByFid(
    request: ReactionsByFidRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getReactionsByFid(
    request: ReactionsByFidRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  /** To be deprecated */
  getReactionsByCast(
    request: ReactionsByTargetRequest,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getReactionsByCast(
    request: ReactionsByTargetRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getReactionsByCast(
    request: ReactionsByTargetRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getReactionsByTarget(
    request: ReactionsByTargetRequest,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getReactionsByTarget(
    request: ReactionsByTargetRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getReactionsByTarget(
    request: ReactionsByTargetRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  /**
   * User Data
   * @http-api: none
   */
  getUserData(
    request: UserDataRequest,
    callback: (error: ServiceError | null, response: Message) => void,
  ): ClientUnaryCall;
  getUserData(
    request: UserDataRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: Message) => void,
  ): ClientUnaryCall;
  getUserData(
    request: UserDataRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: Message) => void,
  ): ClientUnaryCall;
  getUserDataByFid(
    request: FidRequest,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getUserDataByFid(
    request: FidRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getUserDataByFid(
    request: FidRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  /**
   * Username Proof
   * @http-api: userNameProofByName
   */
  getUsernameProof(
    request: UsernameProofRequest,
    callback: (error: ServiceError | null, response: UserNameProof) => void,
  ): ClientUnaryCall;
  getUsernameProof(
    request: UsernameProofRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: UserNameProof) => void,
  ): ClientUnaryCall;
  getUsernameProof(
    request: UsernameProofRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: UserNameProof) => void,
  ): ClientUnaryCall;
  getUserNameProofsByFid(
    request: FidRequest,
    callback: (error: ServiceError | null, response: UsernameProofsResponse) => void,
  ): ClientUnaryCall;
  getUserNameProofsByFid(
    request: FidRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: UsernameProofsResponse) => void,
  ): ClientUnaryCall;
  getUserNameProofsByFid(
    request: FidRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: UsernameProofsResponse) => void,
  ): ClientUnaryCall;
  /**
   * Verifications
   * @http-api: none
   */
  getVerification(
    request: VerificationRequest,
    callback: (error: ServiceError | null, response: Message) => void,
  ): ClientUnaryCall;
  getVerification(
    request: VerificationRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: Message) => void,
  ): ClientUnaryCall;
  getVerification(
    request: VerificationRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: Message) => void,
  ): ClientUnaryCall;
  getVerificationsByFid(
    request: FidRequest,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getVerificationsByFid(
    request: FidRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getVerificationsByFid(
    request: FidRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  /**
   * OnChain Events
   * @http-api: none
   */
  getOnChainSigner(
    request: SignerRequest,
    callback: (error: ServiceError | null, response: OnChainEvent) => void,
  ): ClientUnaryCall;
  getOnChainSigner(
    request: SignerRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: OnChainEvent) => void,
  ): ClientUnaryCall;
  getOnChainSigner(
    request: SignerRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: OnChainEvent) => void,
  ): ClientUnaryCall;
  getOnChainSignersByFid(
    request: FidRequest,
    callback: (error: ServiceError | null, response: OnChainEventResponse) => void,
  ): ClientUnaryCall;
  getOnChainSignersByFid(
    request: FidRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: OnChainEventResponse) => void,
  ): ClientUnaryCall;
  getOnChainSignersByFid(
    request: FidRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: OnChainEventResponse) => void,
  ): ClientUnaryCall;
  /** @http-api: none */
  getOnChainEvents(
    request: OnChainEventRequest,
    callback: (error: ServiceError | null, response: OnChainEventResponse) => void,
  ): ClientUnaryCall;
  getOnChainEvents(
    request: OnChainEventRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: OnChainEventResponse) => void,
  ): ClientUnaryCall;
  getOnChainEvents(
    request: OnChainEventRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: OnChainEventResponse) => void,
  ): ClientUnaryCall;
  /** @http-api: none */
  getIdRegistryOnChainEvent(
    request: FidRequest,
    callback: (error: ServiceError | null, response: OnChainEvent) => void,
  ): ClientUnaryCall;
  getIdRegistryOnChainEvent(
    request: FidRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: OnChainEvent) => void,
  ): ClientUnaryCall;
  getIdRegistryOnChainEvent(
    request: FidRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: OnChainEvent) => void,
  ): ClientUnaryCall;
  /** @http-api: onChainIdRegistryEventByAddress */
  getIdRegistryOnChainEventByAddress(
    request: IdRegistryEventByAddressRequest,
    callback: (error: ServiceError | null, response: OnChainEvent) => void,
  ): ClientUnaryCall;
  getIdRegistryOnChainEventByAddress(
    request: IdRegistryEventByAddressRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: OnChainEvent) => void,
  ): ClientUnaryCall;
  getIdRegistryOnChainEventByAddress(
    request: IdRegistryEventByAddressRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: OnChainEvent) => void,
  ): ClientUnaryCall;
  /** @http-api: storageLimitsByFid */
  getCurrentStorageLimitsByFid(
    request: FidRequest,
    callback: (error: ServiceError | null, response: StorageLimitsResponse) => void,
  ): ClientUnaryCall;
  getCurrentStorageLimitsByFid(
    request: FidRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: StorageLimitsResponse) => void,
  ): ClientUnaryCall;
  getCurrentStorageLimitsByFid(
    request: FidRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: StorageLimitsResponse) => void,
  ): ClientUnaryCall;
  getFids(
    request: FidsRequest,
    callback: (error: ServiceError | null, response: FidsResponse) => void,
  ): ClientUnaryCall;
  getFids(
    request: FidsRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: FidsResponse) => void,
  ): ClientUnaryCall;
  getFids(
    request: FidsRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: FidsResponse) => void,
  ): ClientUnaryCall;
  /**
   * Links
   * @http-api: linkById
   */
  getLink(request: LinkRequest, callback: (error: ServiceError | null, response: Message) => void): ClientUnaryCall;
  getLink(
    request: LinkRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: Message) => void,
  ): ClientUnaryCall;
  getLink(
    request: LinkRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: Message) => void,
  ): ClientUnaryCall;
  getLinksByFid(
    request: LinksByFidRequest,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getLinksByFid(
    request: LinksByFidRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getLinksByFid(
    request: LinksByFidRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  /** @http-api: linksByTargetFid */
  getLinksByTarget(
    request: LinksByTargetRequest,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getLinksByTarget(
    request: LinksByTargetRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getLinksByTarget(
    request: LinksByTargetRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  /**
   * Bulk Methods
   * The Bulk methods don't have corresponding HTTP API endpoints because the
   * regular endpoints can be used to get all the messages
   * @http-api: none
   */
  getAllCastMessagesByFid(
    request: FidTimestampRequest,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getAllCastMessagesByFid(
    request: FidTimestampRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getAllCastMessagesByFid(
    request: FidTimestampRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  /** @http-api: none */
  getAllReactionMessagesByFid(
    request: FidTimestampRequest,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getAllReactionMessagesByFid(
    request: FidTimestampRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getAllReactionMessagesByFid(
    request: FidTimestampRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  /** @http-api: none */
  getAllVerificationMessagesByFid(
    request: FidTimestampRequest,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getAllVerificationMessagesByFid(
    request: FidTimestampRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getAllVerificationMessagesByFid(
    request: FidTimestampRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  /** @http-api: none */
  getAllUserDataMessagesByFid(
    request: FidTimestampRequest,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getAllUserDataMessagesByFid(
    request: FidTimestampRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getAllUserDataMessagesByFid(
    request: FidTimestampRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  /** @http-api: none */
  getAllLinkMessagesByFid(
    request: FidTimestampRequest,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getAllLinkMessagesByFid(
    request: FidTimestampRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getAllLinkMessagesByFid(
    request: FidTimestampRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  /** @http-api: none */
  getLinkCompactStateMessageByFid(
    request: FidRequest,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getLinkCompactStateMessageByFid(
    request: FidRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getLinkCompactStateMessageByFid(
    request: FidRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  /** @http-api: none */
  submitBulkMessages(
    request: SubmitBulkMessagesRequest,
    callback: (error: ServiceError | null, response: SubmitBulkMessagesResponse) => void,
  ): ClientUnaryCall;
  submitBulkMessages(
    request: SubmitBulkMessagesRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: SubmitBulkMessagesResponse) => void,
  ): ClientUnaryCall;
  submitBulkMessages(
    request: SubmitBulkMessagesRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: SubmitBulkMessagesResponse) => void,
  ): ClientUnaryCall;
  /** Sync Methods */
  getInfo(
    request: HubInfoRequest,
    callback: (error: ServiceError | null, response: HubInfoResponse) => void,
  ): ClientUnaryCall;
  getInfo(
    request: HubInfoRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: HubInfoResponse) => void,
  ): ClientUnaryCall;
  getInfo(
    request: HubInfoRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: HubInfoResponse) => void,
  ): ClientUnaryCall;
  getCurrentPeers(
    request: Empty,
    callback: (error: ServiceError | null, response: ContactInfoResponse) => void,
  ): ClientUnaryCall;
  getCurrentPeers(
    request: Empty,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: ContactInfoResponse) => void,
  ): ClientUnaryCall;
  getCurrentPeers(
    request: Empty,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: ContactInfoResponse) => void,
  ): ClientUnaryCall;
  /** @http-api: none */
  stopSync(
    request: Empty,
    callback: (error: ServiceError | null, response: SyncStatusResponse) => void,
  ): ClientUnaryCall;
  stopSync(
    request: Empty,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: SyncStatusResponse) => void,
  ): ClientUnaryCall;
  stopSync(
    request: Empty,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: SyncStatusResponse) => void,
  ): ClientUnaryCall;
  /**
   * This is experimental, do not rely on this endpoint existing in the future
   * @http-api: none
   */
  forceSync(
    request: SyncStatusRequest,
    callback: (error: ServiceError | null, response: SyncStatusResponse) => void,
  ): ClientUnaryCall;
  forceSync(
    request: SyncStatusRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: SyncStatusResponse) => void,
  ): ClientUnaryCall;
  forceSync(
    request: SyncStatusRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: SyncStatusResponse) => void,
  ): ClientUnaryCall;
  /** @http-api: none */
  getSyncStatus(
    request: SyncStatusRequest,
    callback: (error: ServiceError | null, response: SyncStatusResponse) => void,
  ): ClientUnaryCall;
  getSyncStatus(
    request: SyncStatusRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: SyncStatusResponse) => void,
  ): ClientUnaryCall;
  getSyncStatus(
    request: SyncStatusRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: SyncStatusResponse) => void,
  ): ClientUnaryCall;
  /** @http-api: none */
  getAllSyncIdsByPrefix(
    request: TrieNodePrefix,
    callback: (error: ServiceError | null, response: SyncIds) => void,
  ): ClientUnaryCall;
  getAllSyncIdsByPrefix(
    request: TrieNodePrefix,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: SyncIds) => void,
  ): ClientUnaryCall;
  getAllSyncIdsByPrefix(
    request: TrieNodePrefix,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: SyncIds) => void,
  ): ClientUnaryCall;
  /** @http-api: none */
  getAllMessagesBySyncIds(
    request: SyncIds,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getAllMessagesBySyncIds(
    request: SyncIds,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  getAllMessagesBySyncIds(
    request: SyncIds,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: MessagesResponse) => void,
  ): ClientUnaryCall;
  /** @http-api: none */
  getSyncMetadataByPrefix(
    request: TrieNodePrefix,
    callback: (error: ServiceError | null, response: TrieNodeMetadataResponse) => void,
  ): ClientUnaryCall;
  getSyncMetadataByPrefix(
    request: TrieNodePrefix,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: TrieNodeMetadataResponse) => void,
  ): ClientUnaryCall;
  getSyncMetadataByPrefix(
    request: TrieNodePrefix,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: TrieNodeMetadataResponse) => void,
  ): ClientUnaryCall;
  /** @http-api: none */
  getSyncSnapshotByPrefix(
    request: TrieNodePrefix,
    callback: (error: ServiceError | null, response: TrieNodeSnapshotResponse) => void,
  ): ClientUnaryCall;
  getSyncSnapshotByPrefix(
    request: TrieNodePrefix,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: TrieNodeSnapshotResponse) => void,
  ): ClientUnaryCall;
  getSyncSnapshotByPrefix(
    request: TrieNodePrefix,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: TrieNodeSnapshotResponse) => void,
  ): ClientUnaryCall;
  /** @http-api: none */
  streamSync(): ClientDuplexStream<StreamSyncRequest, StreamSyncResponse>;
  streamSync(options: Partial<CallOptions>): ClientDuplexStream<StreamSyncRequest, StreamSyncResponse>;
  streamSync(
    metadata: Metadata,
    options?: Partial<CallOptions>,
  ): ClientDuplexStream<StreamSyncRequest, StreamSyncResponse>;
  /** @http-api: none */
  streamFetch(): ClientDuplexStream<StreamFetchRequest, StreamFetchResponse>;
  streamFetch(options: Partial<CallOptions>): ClientDuplexStream<StreamFetchRequest, StreamFetchResponse>;
  streamFetch(
    metadata: Metadata,
    options?: Partial<CallOptions>,
  ): ClientDuplexStream<StreamFetchRequest, StreamFetchResponse>;
}

export const HubServiceClient = makeGenericClientConstructor(HubServiceService, "HubService") as unknown as {
  new (address: string, credentials: ChannelCredentials, options?: Partial<ClientOptions>): HubServiceClient;
  service: typeof HubServiceService;
};

export type AdminServiceService = typeof AdminServiceService;
export const AdminServiceService = {
  rebuildSyncTrie: {
    path: "/AdminService/RebuildSyncTrie",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: Empty) => Buffer.from(Empty.encode(value).finish()),
    requestDeserialize: (value: Buffer) => Empty.decode(value),
    responseSerialize: (value: Empty) => Buffer.from(Empty.encode(value).finish()),
    responseDeserialize: (value: Buffer) => Empty.decode(value),
  },
  deleteAllMessagesFromDb: {
    path: "/AdminService/DeleteAllMessagesFromDb",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: Empty) => Buffer.from(Empty.encode(value).finish()),
    requestDeserialize: (value: Buffer) => Empty.decode(value),
    responseSerialize: (value: Empty) => Buffer.from(Empty.encode(value).finish()),
    responseDeserialize: (value: Buffer) => Empty.decode(value),
  },
  pruneMessages: {
    path: "/AdminService/PruneMessages",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: PruneMessagesRequest) => Buffer.from(PruneMessagesRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => PruneMessagesRequest.decode(value),
    responseSerialize: (value: PruneMessagesResponse) => Buffer.from(PruneMessagesResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => PruneMessagesResponse.decode(value),
  },
  submitOnChainEvent: {
    path: "/AdminService/SubmitOnChainEvent",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: OnChainEvent) => Buffer.from(OnChainEvent.encode(value).finish()),
    requestDeserialize: (value: Buffer) => OnChainEvent.decode(value),
    responseSerialize: (value: OnChainEvent) => Buffer.from(OnChainEvent.encode(value).finish()),
    responseDeserialize: (value: Buffer) => OnChainEvent.decode(value),
  },
  submitUserNameProof: {
    path: "/AdminService/SubmitUserNameProof",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: UserNameProof) => Buffer.from(UserNameProof.encode(value).finish()),
    requestDeserialize: (value: Buffer) => UserNameProof.decode(value),
    responseSerialize: (value: UserNameProof) => Buffer.from(UserNameProof.encode(value).finish()),
    responseDeserialize: (value: Buffer) => UserNameProof.decode(value),
  },
} as const;

export interface AdminServiceServer extends UntypedServiceImplementation {
  rebuildSyncTrie: handleUnaryCall<Empty, Empty>;
  deleteAllMessagesFromDb: handleUnaryCall<Empty, Empty>;
  pruneMessages: handleUnaryCall<PruneMessagesRequest, PruneMessagesResponse>;
  submitOnChainEvent: handleUnaryCall<OnChainEvent, OnChainEvent>;
  submitUserNameProof: handleUnaryCall<UserNameProof, UserNameProof>;
}

export interface AdminServiceClient extends Client {
  rebuildSyncTrie(request: Empty, callback: (error: ServiceError | null, response: Empty) => void): ClientUnaryCall;
  rebuildSyncTrie(
    request: Empty,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: Empty) => void,
  ): ClientUnaryCall;
  rebuildSyncTrie(
    request: Empty,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: Empty) => void,
  ): ClientUnaryCall;
  deleteAllMessagesFromDb(
    request: Empty,
    callback: (error: ServiceError | null, response: Empty) => void,
  ): ClientUnaryCall;
  deleteAllMessagesFromDb(
    request: Empty,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: Empty) => void,
  ): ClientUnaryCall;
  deleteAllMessagesFromDb(
    request: Empty,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: Empty) => void,
  ): ClientUnaryCall;
  pruneMessages(
    request: PruneMessagesRequest,
    callback: (error: ServiceError | null, response: PruneMessagesResponse) => void,
  ): ClientUnaryCall;
  pruneMessages(
    request: PruneMessagesRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: PruneMessagesResponse) => void,
  ): ClientUnaryCall;
  pruneMessages(
    request: PruneMessagesRequest,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: PruneMessagesResponse) => void,
  ): ClientUnaryCall;
  submitOnChainEvent(
    request: OnChainEvent,
    callback: (error: ServiceError | null, response: OnChainEvent) => void,
  ): ClientUnaryCall;
  submitOnChainEvent(
    request: OnChainEvent,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: OnChainEvent) => void,
  ): ClientUnaryCall;
  submitOnChainEvent(
    request: OnChainEvent,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: OnChainEvent) => void,
  ): ClientUnaryCall;
  submitUserNameProof(
    request: UserNameProof,
    callback: (error: ServiceError | null, response: UserNameProof) => void,
  ): ClientUnaryCall;
  submitUserNameProof(
    request: UserNameProof,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: UserNameProof) => void,
  ): ClientUnaryCall;
  submitUserNameProof(
    request: UserNameProof,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: UserNameProof) => void,
  ): ClientUnaryCall;
}

export const AdminServiceClient = makeGenericClientConstructor(AdminServiceService, "AdminService") as unknown as {
  new (address: string, credentials: ChannelCredentials, options?: Partial<ClientOptions>): AdminServiceClient;
  service: typeof AdminServiceService;
};
