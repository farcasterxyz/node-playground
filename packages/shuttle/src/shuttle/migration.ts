import { DB, getDbClient, getHubClient, allDbMessagesOfTypeForFid } from "../index"; // If you want to use this as a standalone app, replace this import with "@farcaster/shuttle"
import {
  AdminRpcClient,
  getAdminRpcClient,
  HubError,
  HubResult,
  HubRpcClient,
  Message,
  MessageData,
  MessageType,
  OnChainEventRequest,
  OnChainEventType,
  StoreType,
  UserDataType,
} from "@farcaster/hub-nodejs";
import { log } from "../example-app/log";
import { Argument, Command } from "@commander-js/extra-typings";
import { readFileSync } from "fs";
import {
  BACKFILL_FIDS,
  HUB_ADMIN_HOST,
  HUB_HOST,
  MAX_FID,
  MIN_FID,
  ONCHAIN_EVENTS_HUB_HOST,
  POSTGRES_SCHEMA,
  POSTGRES_URL,
  SNAPCHAIN_HOST,
} from "../example-app/env";
import * as process from "node:process";
import url from "node:url";
import { err, ok } from "neverthrow";
import { sleep } from "src/utils";

export class Migration {
  private snapchainClient: HubRpcClient;
  private snapchainAdminClient: AdminRpcClient;
  private hubClient: HubRpcClient;
  private hubAdminClient: AdminRpcClient;
  private onchainEventsHubClient: HubRpcClient;
  private backendDb: DB;

  constructor(
    backendDb: DB,
    snapchainClient: HubRpcClient,
    hubClient: HubRpcClient,
    snapchainAdminClient: AdminRpcClient,
    hubAdminClient: AdminRpcClient,
    onchainEventsHubClient: HubRpcClient,
  ) {
    this.backendDb = backendDb;
    this.snapchainClient = snapchainClient;
    this.hubClient = hubClient;
    this.snapchainAdminClient = snapchainAdminClient;
    this.hubAdminClient = hubAdminClient;
    this.onchainEventsHubClient = onchainEventsHubClient;
  }

  static async create(
    dbSchema: string,
    onchainEventsHubUrl: string,
    snapchainUrl: string,
    hubUrl: string,
    hubAdminUrl: string,
  ) {
    const backendDb = getDbClient(POSTGRES_URL, dbSchema);
    const snapchainClient = getHubClient(snapchainUrl, { ssl: false }).client;
    const snapchainAdminClient = await getAdminRpcClient(snapchainUrl);
    const onchainEventsHubClient = getHubClient(onchainEventsHubUrl, { ssl: true });
    const hubClient = getHubClient(hubUrl, { ssl: false });
    const hubAdminClient = await getAdminRpcClient(hubAdminUrl);
    return new Migration(
      backendDb,
      snapchainClient,
      hubClient.client,
      snapchainAdminClient,
      hubAdminClient,
      onchainEventsHubClient.client,
    );
  }

  async ingestOnchainEvents(fid: number, eventType: OnChainEventType) {
    // Just sync all of them, no need to reconcile
    // TODO(aditi): Handle multiple pages
    const result = await this.onchainEventsHubClient.getOnChainEvents(OnChainEventRequest.create({ fid, eventType }));

    if (result.isErr()) {
      return err(result.error);
    }

    let numOnchainEvents = 0;
    let numSkipped = 0;
    for (const onChainEvent of result.value.events) {
      const snapchainResult = await this.submitWithRetry(3, () => {
        return this.snapchainAdminClient.submitOnChainEvent(onChainEvent);
      });
      if (snapchainResult.isErr()) {
        log.info(
          `Unable to submit onchain event to snapchain ${snapchainResult.error.message} ${snapchainResult.error.stack}`,
        );
        if (this.shouldRetry(snapchainResult.error)) {
          log.info("Skipping hub submit to avoid mismatch");
          numSkipped += 1;
          continue;
        }
      }

      const hubResult = await this.hubAdminClient.submitOnChainEvent(onChainEvent);
      if (hubResult.isErr()) {
        log.info(`Unable to submit onchain event to hub ${hubResult.error.message} ${hubResult.error.stack}`);
      }

      numOnchainEvents += 1;
    }

    log.info(`Processed ${numOnchainEvents} onchain events for fid ${fid}. Skipped ${numSkipped}.`);

    return ok(undefined);
  }

  async ingestUsernameProofs(fids: number[]) {
    for (const fid of fids) {
      const result = await this.onchainEventsHubClient.getUserNameProofsByFid({ fid });
      if (result.isErr()) {
        log.info(`Unable to get username proofs for fid ${fid}`);
        continue;
      }

      let numSkipped = 0;
      for (const usernameProof of result.value.proofs) {
        const snapchainResult = await this.submitWithRetry(3, () => {
          return this.snapchainAdminClient.submitUserNameProof(usernameProof);
        });
        if (snapchainResult.isErr()) {
          log.info(`Unable to submit username proof for fid ${fid} to snapchain ${snapchainResult.error.message}`);
          if (this.shouldRetry(snapchainResult.error)) {
            log.info("Skipping hub submit to avoid mismatch");
            numSkipped += 1;
            continue;
          }
        }

        const hubResult = await this.hubAdminClient.submitUserNameProof(usernameProof);
        if (hubResult.isErr()) {
          log.info(`Unable to submit username proof for fid ${fid} to hub ${hubResult.error.message}`);
        }
      }

      log.info(`Processed ${result.value.proofs.length} username proofs for fid ${fid}. Skipped ${numSkipped}.`);
    }
  }

  async ingestAllOnchainEvents(fids: number[]) {
    for (const fid of fids) {
      const storageResult = await this.ingestOnchainEvents(fid, OnChainEventType.EVENT_TYPE_STORAGE_RENT);
      if (storageResult.isErr()) {
        log.info(
          `Unable to get storage events for fid ${fid} ${storageResult.error.message} ${storageResult.error.stack}`,
        );
      }

      const signerResult = await this.ingestOnchainEvents(fid, OnChainEventType.EVENT_TYPE_SIGNER);
      if (signerResult.isErr()) {
        log.info(
          `Unable to get signer events for fid ${fid} ${signerResult.error.message} ${signerResult.error.stack}`,
        );
      }

      // TODO(aditi): Signer migrated for fid 0

      const idRegisterResult = await this.ingestOnchainEvents(fid, OnChainEventType.EVENT_TYPE_ID_REGISTER);
      if (idRegisterResult.isErr()) {
        log.info(
          `Unable to get signer events for fid ${fid} ${idRegisterResult.error.message} ${idRegisterResult.error.stack}`,
        );
      }
    }
  }

  shouldRetry(error: HubError) {
    return error.message.includes("channel is full");
  }

  async submitWithRetry<T>(numRetries: number, submitFn: () => Promise<HubResult<T>>) {
    let result = await submitFn();
    let numRetriesRemaining = numRetries;
    let waitTime = 1000;

    if (result.isErr() && this.shouldRetry(result.error) && numRetriesRemaining > 0) {
      await sleep(waitTime);
      numRetriesRemaining -= 1;
      waitTime *= 2;
      result = await submitFn();
    }

    return result;
  }

  async compareMessageCounts(fid: number) {
    const hubCounts = await this.hubClient.getCurrentStorageLimitsByFid({ fid });

    if (hubCounts.isErr()) {
      return err(hubCounts.error);
    }

    const snapchainCounts = await this.snapchainClient.getCurrentStorageLimitsByFid({ fid });

    if (snapchainCounts.isErr()) {
      return err(snapchainCounts.error);
    }

    const hubUsages = new Map();
    for (const limits of hubCounts.value.limits) {
      hubUsages.set(limits.storeType, limits.used);
    }

    const snapchainUsages = new Map();
    for (const limits of snapchainCounts.value.limits) {
      snapchainUsages.set(limits.storeType, limits.used);
    }

    for (const [storeType, hubUsage] of hubUsages.entries()) {
      const snapchainUsage = snapchainUsages.get(storeType);
      if (hubUsage !== snapchainUsage) {
        log.info(
          `USAGE MISMATCH: fid: ${fid} store_type: ${StoreType[storeType]}, hub usage: ${hubUsage}, snapchain usage ${snapchainUsage}`,
        );
      }
    }

    return ok(undefined);
  }

  async ingestMessagesFromDb(fids: number[], shuffleMessages = false) {
    for (const fid of fids) {
      let numMessages = 0;
      let numErrorsOnHub = 0;
      let numErrorsOnSnapchain = 0;
      let numSkipped = 0;
      const messageTypes = [
        MessageType.CAST_ADD,
        MessageType.CAST_REMOVE,
        MessageType.REACTION_ADD,
        MessageType.REACTION_REMOVE,
        MessageType.LINK_ADD,
        MessageType.LINK_REMOVE,
        MessageType.LINK_COMPACT_STATE,
        MessageType.VERIFICATION_ADD_ETH_ADDRESS,
        MessageType.VERIFICATION_REMOVE,
        MessageType.USER_DATA_ADD,
      ];
      const numMessagesByType = new Map();
      let pageNumber = 0;
      const pageSize = 100;
      while (true) {
        const messages = await allDbMessagesOfTypeForFid(
          this.backendDb,
          fid,
          messageTypes,
          undefined,
          undefined,
          pageSize,
          pageSize * pageNumber,
          // true, include pruned
          // true, include deleted
          // true, include revoked
        );
        if (messages.isErr()) {
          throw messages.error;
        }

        if (messages.value.length === 0) {
          break;
        }

        const shuffledMessages = shuffleMessages
          ? messages.value.sort(() => {
              return Math.random() - 0.5;
            })
          : messages.value;

        for (const dbMessage of shuffledMessages) {
          const message = Message.decode(dbMessage.raw);

          if (!message.data) {
            continue;
          }

          const newMessage = Message.create(message);
          newMessage.dataBytes = MessageData.encode(message.data).finish();
          newMessage.data = undefined;

          const snapchainResult = await this.submitWithRetry(3, async () => {
            return this.snapchainClient.submitMessage(newMessage);
          });
          const hubResult = await this.hubClient.submitMessage(newMessage);

          if (snapchainResult.isErr()) {
            log.info(
              `Unable to submit message to snapchain ${snapchainResult.error.message} ${snapchainResult.error.stack}`,
            );
            if (this.shouldRetry(snapchainResult.error)) {
              log.info("Skipping hub submit to avoid mismatch");
              numSkipped += 1;
              continue;
            }
            numErrorsOnSnapchain += 1;
          }

          if (hubResult.isErr()) {
            log.info(`Unable to submit message to hub ${hubResult.error.message} ${hubResult.error.stack}`);
            numErrorsOnHub += 1;
          }

          numMessages += 1;
          const countForType = numMessagesByType.get(message.data.type) ?? 0;
          numMessagesByType.set(message.data.type, countForType + 1);
        }

        pageNumber += 1;
      }

      for (const [type, count] of numMessagesByType.entries()) {
        log.info(`Submitted ${count} messages for fid ${fid} for type ${MessageType[type]}`);
      }

      const result = await this.hubAdminClient.pruneMessages({ fid });
      let numMessagesPruned = 0;
      if (result.isErr()) {
        log.info(`Unable to prune hub messages for fid ${fid}`);
      } else {
        numMessagesPruned = result.value.numMessagesPruned;
      }

      // TODO(aditi): This log should have better structure.
      log.info(
        `Submitted ${numMessages} messages for fid ${fid}. ${numErrorsOnHub} hub errors. ${numErrorsOnSnapchain} snapchain errors. ${numMessagesPruned} pruned on hub. Skipped ${numSkipped}.`,
      );
    }
  }
}

function selectFids() {
  return BACKFILL_FIDS
    ? BACKFILL_FIDS.split(",").map((fid) => parseInt(fid))
    : Array.from({ length: parseInt(MAX_FID) - parseInt(MIN_FID) + 1 }, (_, i) => parseInt(MIN_FID) + i);
}

if (import.meta.url.endsWith(url.pathToFileURL(process.argv[1] || "").toString())) {
  async function backfill() {
    const migration = await Migration.create(
      POSTGRES_SCHEMA,
      ONCHAIN_EVENTS_HUB_HOST,
      SNAPCHAIN_HOST,
      HUB_HOST,
      HUB_ADMIN_HOST,
    );

    const fids = selectFids();
    await migration.ingestAllOnchainEvents(fids);
    log.info("Done migrating onchain events");
    await migration.ingestUsernameProofs(fids);
    log.info("Done migrating usernme proofs");
    // Sleep 30s
    await sleep(30_000);
    await migration.ingestMessagesFromDb(fids);
    log.info("Done migrating messages");
    // Sleep 2 minutes
    await sleep(120_000);
    for (const fid of fids) {
      const compareResult = await migration.compareMessageCounts(fid);
      if (compareResult.isErr()) {
        log.info(`Error comparing message counts ${compareResult.error}`);
      }
    }

    return;
  }

  const program = new Command()
    .name("migration")
    .description("Synchronizes a Farcaster Hub with a Postgres database")
    .version(JSON.parse(readFileSync("./package.json").toString()).version);

  program.command("backfill").description("Queue up backfill for the worker").action(backfill);

  program.parse(process.argv);
}
