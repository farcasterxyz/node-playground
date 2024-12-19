import {
  ClientDuplexStream,
  FidTimestampRequest,
  fromFarcasterTime,
  HubError,
  HubErrorCode,
  HubResult,
  HubRpcClient,
  Message,
  MessagesResponse,
  MessageType,
  StreamFetchRequest,
  StreamFetchResponse,
} from "@farcaster/hub-nodejs";
import { DB, MessageRow, sql } from "./db";
import { pino } from "pino";
import { ok, err } from "neverthrow";
import { randomUUID } from "crypto";

const MAX_PAGE_SIZE = 500;

type DBMessage = {
  hash: Uint8Array;
  prunedAt: Date | null;
  revokedAt: Date | null;
  fid: number;
  type: MessageType;
  raw: Uint8Array;
  signer: Uint8Array;
};

// Ensures that all messages for a given FID are present in the database. Can be used for both backfilling and reconciliation.
export class MessageReconciliation {
  private client: HubRpcClient;
  private stream: ClientDuplexStream<StreamFetchRequest, StreamFetchResponse> | undefined;
  private db: DB;
  private log: pino.Logger;
  private connectionTimeout: number; // milliseconds

  constructor(client: HubRpcClient, db: DB, log: pino.Logger, connectionTimeout = 30000) {
    this.client = client;
    this.db = db;
    this.log = log;
    this.connectionTimeout = connectionTimeout;
    this.establishStream();
  }

  async establishStream() {
    const maybeStream = await this.client.streamFetch();
    if (maybeStream.isOk()) {
      this.stream = maybeStream.value;
    } else {
      this.log.warn(maybeStream.error, "could not establish stream");
    }
  }

  async close() {
    if (this.stream) {
      this.stream.cancel();
      this.stream = undefined;
    }
  }

  async reconcileMessagesForFid(
    fid: number,
    onHubMessage: (message: Message, missingInDb: boolean, prunedInDb: boolean, revokedInDb: boolean) => Promise<void>,
    onDbMessage: (message: DBMessage, missingInHub: boolean) => Promise<void>,
    startTimestamp?: number,
    stopTimestamp?: number,
  ) {
    for (const type of [
      MessageType.CAST_ADD,
      MessageType.REACTION_ADD,
      MessageType.LINK_ADD,
      MessageType.VERIFICATION_ADD_ETH_ADDRESS,
      MessageType.USER_DATA_ADD,
    ]) {
      this.log.debug(`Reconciling messages for FID ${fid} of type ${type}`);
      await this.reconcileMessagesOfTypeForFid(fid, type, onHubMessage, onDbMessage, startTimestamp, stopTimestamp);
    }
  }

  async reconcileMessagesOfTypeForFid(
    fid: number,
    type: MessageType,
    onHubMessage: (message: Message, missingInDb: boolean, prunedInDb: boolean, revokedInDb: boolean) => Promise<void>,
    onDbMessage: (message: DBMessage, missingInHub: boolean) => Promise<void>,
    startTimestamp?: number,
    stopTimestamp?: number,
  ) {
    // todo: Username proofs, and on chain events

    const hubMessagesByHash: Record<string, Message> = {};
    // First, reconcile messages that are in the hub but not in the database
    for await (const messages of this.allHubMessagesOfTypeForFid(fid, type, startTimestamp, stopTimestamp)) {
      const messageHashes = messages.map((msg) => msg.hash);

      if (messageHashes.length === 0) {
        this.log.debug(`No messages of type ${type} for FID ${fid}`);
        continue;
      }

      const dbMessages = await this.db
        .selectFrom("messages")
        .select(["prunedAt", "revokedAt", "hash", "fid", "type", "raw"])
        .where("hash", "=", sql`any(${messageHashes})`)
        .execute();

      const dbMessageHashes = dbMessages.reduce((acc, msg) => {
        const key = Buffer.from(msg.hash).toString("hex");
        acc[key] = msg;
        return acc;
      }, {} as Record<string, Pick<MessageRow, "revokedAt" | "prunedAt" | "fid" | "type" | "hash" | "raw">>);

      for (const message of messages) {
        const msgHashKey = Buffer.from(message.hash).toString("hex");
        hubMessagesByHash[msgHashKey] = message;

        const dbMessage = dbMessageHashes[msgHashKey];
        if (dbMessage === undefined) {
          await onHubMessage(message, true, false, false);
        } else {
          let wasPruned = false;
          let wasRevoked = false;
          if (dbMessage?.prunedAt) {
            wasPruned = true;
          }
          if (dbMessage?.revokedAt) {
            wasRevoked = true;
          }
          await onHubMessage(message, false, wasPruned, wasRevoked);
        }
      }
    }

    // Next, reconcile messages that are in the database but not in the hub
    const dbMessages = await allDbMessagesOfTypeForFid(this.db, fid, [type], startTimestamp, stopTimestamp);
    if (dbMessages.isErr()) {
      this.log.error({ startTimestamp, stopTimestamp }, "Invalid time range provided to reconciliation");
      return;
    }

    for (const dbMessage of dbMessages.value) {
      const key = Buffer.from(dbMessage.hash).toString("hex");
      await onDbMessage(dbMessage, !hubMessagesByHash[key]);
    }
  }

  private async *allHubMessagesOfTypeForFid(
    fid: number,
    type: MessageType,
    startTimestamp?: number,
    stopTimestamp?: number,
  ) {
    let fn;
    switch (type) {
      case MessageType.CAST_ADD:
        fn = this.getAllCastMessagesByFidInBatchesOf;
        break;
      case MessageType.REACTION_ADD:
        fn = this.getAllReactionMessagesByFidInBatchesOf;
        break;
      case MessageType.LINK_ADD:
        fn = this.getAllLinkMessagesByFidInBatchesOf;
        break;
      case MessageType.VERIFICATION_ADD_ETH_ADDRESS:
        fn = this.getAllVerificationMessagesByFidInBatchesOf;
        break;
      case MessageType.USER_DATA_ADD:
        fn = this.getAllUserDataMessagesByFidInBatchesOf;
        break;
      default:
        throw `Unknown message type ${type}`;
    }
    for await (const messages of fn.call(this, fid, MAX_PAGE_SIZE, startTimestamp, stopTimestamp)) {
      yield messages as Message[];
    }
  }

  private async doCallWithFailover(
    request: Partial<StreamFetchRequest>,
    fallback: () => Promise<HubResult<MessagesResponse>>,
  ) {
    const id = randomUUID();
    const result = new Promise<HubResult<MessagesResponse>>((resolve) => {
      if (!this.stream) {
        fallback().then((result) => resolve(result));
        return;
      }
      const process = async (response: StreamFetchResponse) => {
        // Do not allow hanging unresponsive connections to linger:
        const cancel = setTimeout(() => {
          this.log.warn("Stream fetch timed out, falling back to RPC");
          this.stream?.cancel();
          this.stream = undefined;
          fallback().then((result) => resolve(result));
        }, this.connectionTimeout);

        if (!this.stream) {
          clearTimeout(cancel);
          this.log.warn("Stream unavailable, falling back to RPC");
          fallback().then((result) => resolve(result));
          return;
        }
        this.stream.off("data", process);
        if (response.idempotencyKey !== id || !response.messages) {
          if (response?.error) {
            clearTimeout(cancel);
            resolve(err(new HubError(response.error.errCode as HubErrorCode, { message: response.error.message })));
            return;
          }

          this.stream.cancel();
          this.stream = undefined;
          fallback()
            .then((result) => resolve(result))
            .finally(() => clearTimeout(cancel));
        } else {
          clearTimeout(cancel);
          resolve(ok(response.messages));
        }
      };
      this.stream.on("data", process);
    });

    this.stream?.write({
      ...request,
      idempotencyKey: id,
    });

    return await result;
  }

  private async getAllCastMessagesByFid(request: FidTimestampRequest) {
    return await this.doCallWithFailover({ castMessagesByFid: request }, () =>
      this.client.getAllCastMessagesByFid(request),
    );
  }

  private async getAllReactionMessagesByFid(request: FidTimestampRequest) {
    return await this.doCallWithFailover({ reactionMessagesByFid: request }, () =>
      this.client.getAllReactionMessagesByFid(request),
    );
  }

  private async getAllLinkMessagesByFid(request: FidTimestampRequest) {
    return await this.doCallWithFailover({ linkMessagesByFid: request }, () =>
      this.client.getAllLinkMessagesByFid(request),
    );
  }

  private async getAllVerificationMessagesByFid(request: FidTimestampRequest) {
    return await this.doCallWithFailover({ verificationMessagesByFid: request }, () =>
      this.client.getAllVerificationMessagesByFid(request),
    );
  }

  private async getAllUserDataMessagesByFid(request: FidTimestampRequest) {
    return await this.doCallWithFailover({ userDataMessagesByFid: request }, () =>
      this.client.getAllUserDataMessagesByFid(request),
    );
  }

  private async *getAllCastMessagesByFidInBatchesOf(
    fid: number,
    pageSize: number,
    startTimestamp?: number,
    stopTimestamp?: number,
  ) {
    let result = await this.getAllCastMessagesByFid({ pageSize, fid, startTimestamp, stopTimestamp });
    for (;;) {
      if (result.isErr()) {
        throw new Error(`Unable to get all casts for FID ${fid}: ${result.error?.message}`);
      }

      const { messages, nextPageToken: pageToken } = result.value;

      yield messages;

      if (!pageToken?.length) break;
      result = await this.getAllCastMessagesByFid({ pageSize, pageToken, fid, startTimestamp, stopTimestamp });
    }
  }

  private async *getAllReactionMessagesByFidInBatchesOf(
    fid: number,
    pageSize: number,
    startTimestamp?: number,
    stopTimestamp?: number,
  ) {
    let result = await this.getAllReactionMessagesByFid({ pageSize, fid, startTimestamp, stopTimestamp });
    for (;;) {
      if (result.isErr()) {
        throw new Error(`Unable to get all reactions for FID ${fid}: ${result.error?.message}`);
      }

      const { messages, nextPageToken: pageToken } = result.value;

      yield messages;

      if (!pageToken?.length) break;
      result = await this.getAllReactionMessagesByFid({
        pageSize,
        pageToken,
        fid,
        startTimestamp,
        stopTimestamp,
      });
    }
  }

  private async *getAllLinkMessagesByFidInBatchesOf(
    fid: number,
    pageSize: number,
    startTimestamp?: number,
    stopTimestamp?: number,
  ) {
    let result = await this.getAllLinkMessagesByFid({ pageSize, fid, startTimestamp, stopTimestamp });
    for (;;) {
      if (result.isErr()) {
        throw new Error(`Unable to get all links for FID ${fid}: ${result.error?.message}`);
      }

      const { messages, nextPageToken: pageToken } = result.value;

      yield messages;

      if (!pageToken?.length) break;
      result = await this.getAllLinkMessagesByFid({ pageSize, pageToken, fid, startTimestamp, stopTimestamp });
    }

    if (!this.stream) {
      let deltaResult = await this.client.getLinkCompactStateMessageByFid({ fid, pageSize });
      for (;;) {
        if (deltaResult.isErr()) {
          throw new Error(`Unable to get all link compact results for FID ${fid}: ${deltaResult.error?.message}`);
        }

        const { messages, nextPageToken: pageToken } = deltaResult.value;

        yield messages;

        if (!pageToken?.length) break;
        deltaResult = await this.client.getLinkCompactStateMessageByFid({ pageSize, pageToken, fid });
      }
    }
  }

  private async *getAllVerificationMessagesByFidInBatchesOf(
    fid: number,
    pageSize: number,
    startTimestamp?: number,
    stopTimestamp?: number,
  ) {
    let result = await this.getAllVerificationMessagesByFid({ pageSize, fid, startTimestamp, stopTimestamp });
    for (;;) {
      if (result.isErr()) {
        throw new Error(`Unable to get all verifications for FID ${fid}: ${result.error?.message}`);
      }

      const { messages, nextPageToken: pageToken } = result.value;

      yield messages;

      if (!pageToken?.length) break;
      result = await this.getAllVerificationMessagesByFid({
        pageSize,
        pageToken,
        fid,
        startTimestamp,
        stopTimestamp,
      });
    }
  }

  private async *getAllUserDataMessagesByFidInBatchesOf(
    fid: number,
    pageSize: number,
    startTimestamp?: number,
    stopTimestamp?: number,
  ) {
    let result = await this.getAllUserDataMessagesByFid({ pageSize, fid, startTimestamp, stopTimestamp });
    for (;;) {
      if (result.isErr()) {
        throw new Error(`Unable to get all user data messages for FID ${fid}: ${result.error?.message}`);
      }

      const { messages, nextPageToken: pageToken } = result.value;

      yield messages;

      if (!pageToken?.length) break;
      result = await this.getAllUserDataMessagesByFid({
        pageSize,
        pageToken,
        fid,
        startTimestamp,
        stopTimestamp,
      });
    }
  }
}

export async function allDbMessagesOfTypeForFid(
  db: DB,
  fid: number,
  types: MessageType[],
  startTimestamp?: number,
  stopTimestamp?: number,
  limit?: number,
  offset?: number,
  includePruned = false,
  includeDeleted = false,
  includeRevoked = false,
) {
  let startDate;
  if (startTimestamp) {
    const startUnixTimestampResult = fromFarcasterTime(startTimestamp);
    if (startUnixTimestampResult.isErr()) {
      return err(startUnixTimestampResult.error);
    }

    startDate = new Date(startUnixTimestampResult.value);
  }

  let stopDate;
  if (stopTimestamp) {
    const stopUnixTimestampResult = fromFarcasterTime(stopTimestamp);
    if (stopUnixTimestampResult.isErr()) {
      return err(stopUnixTimestampResult.error);
    }

    stopDate = new Date(stopUnixTimestampResult.value);
  }

  const query = db
    .selectFrom("messages")
    .select([
      "messages.prunedAt",
      "messages.revokedAt",
      "messages.hash",
      "messages.type",
      "messages.fid",
      "messages.raw",
      "messages.signer",
    ])
    .where("messages.fid", "=", fid)
    .where("messages.type", "in", types);
  const queryWithPruned = includePruned ? query : query.where("messages.prunedAt", "is", null);
  const queryWithRevoked = includeRevoked ? queryWithPruned : queryWithPruned.where("messages.revokedAt", "is", null);
  const queryWithDeleted = includeDeleted ? queryWithRevoked : queryWithRevoked.where("messages.deletedAt", "is", null);
  const queryWithStartTime = startDate ? queryWithDeleted.where("messages.timestamp", ">=", startDate) : query;
  const queryWithStopTime = stopDate
    ? queryWithStartTime.where("messages.timestamp", "<=", stopDate)
    : queryWithStartTime;
  const queryWithLimit = limit ? queryWithStopTime.limit(limit) : queryWithStopTime;
  const queryWithOffset = offset ? queryWithLimit.offset(offset) : queryWithLimit;
  const result = await queryWithOffset.execute();
  return ok(result);
}
