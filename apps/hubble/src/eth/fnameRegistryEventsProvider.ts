import axios from "axios";
import { logger } from "../utils/logger.js";
import { HubInterface } from "../hubble.js";
import {
  eip712,
  hexStringToBytes,
  UserNameProof,
  UserNameType,
  utf8StringToBytes,
  makeUserNameProofClaim,
  HubError,
} from "@farcaster/hub-nodejs";
import { Result } from "neverthrow";

const DEFAULT_POLL_TIMEOUT_IN_MS = 5_000;
const DEFAULT_READ_TIMEOUT_IN_MS = 5_000;

const log = logger.child({
  component: "FNameRegistryEventsProvider",
});

export type FNameTransfer = {
  id: number;
  username: string;
  owner: `0x${string}`;
  server_signature: string;
  timestamp: number;
  from: number;
  to: number;
};

export type FNameTransferRequest = {
  from_id?: number;
  name?: string;
};

export interface FNameRegistryClientInterface {
  getTransfers(params: FNameTransferRequest): Promise<FNameTransfer[]>;
  getSigner(): Promise<string>;
}

export class FNameRegistryClient implements FNameRegistryClientInterface {
  private url: string;
  constructor(url: string) {
    this.url = url;
  }

  public async getTransfers(params: FNameTransferRequest): Promise<FNameTransfer[]> {
    const response = await axios.get(`${this.url}/transfers`, {
      params,
      timeout: DEFAULT_READ_TIMEOUT_IN_MS,
    });
    return response.data.transfers;
  }

  public async getSigner(): Promise<string> {
    const response = await axios.get(`${this.url}/signer`, {
      timeout: DEFAULT_READ_TIMEOUT_IN_MS,
    });
    return response.data.signer;
  }
}

export class FNameRegistryEventsProvider {
  private client: FNameRegistryClientInterface;
  private hub: HubInterface;
  private lastTransferId = 0;
  private stopTransferId?: number;
  private resyncEvents: boolean;
  private pollTimeoutId: ReturnType<typeof setTimeout> | undefined;
  private serverSignerAddress: Uint8Array;
  private shouldStop = false;

  constructor(
    fnameRegistryClient: FNameRegistryClientInterface,
    hub: HubInterface,
    resyncEvents = false,
    stopTransferId?: number,
  ) {
    this.client = fnameRegistryClient;
    this.hub = hub;
    this.resyncEvents = resyncEvents;
    this.serverSignerAddress = new Uint8Array();
    this.stopTransferId = stopTransferId;
  }

  public async start() {
    const result = await this.hub.getHubState();
    if (result.isErr()) {
      log.error(`Failed to get hub state: ${result.error}, defaulting to the beginning`);
      this.lastTransferId = 0;
    } else {
      this.lastTransferId = result.value.lastFnameProof;
    }
    if (this.resyncEvents) {
      log.error("Resyncing fname events from the beginning");
      this.lastTransferId = 0;
    }
    const rawAddress = await this.client.getSigner();
    const signerAddress = hexStringToBytes(rawAddress);
    if (signerAddress.isOk() && signerAddress.value.length > 0) {
      this.serverSignerAddress = signerAddress.value;
    } else {
      log.error(`Failed to parse server address: ${signerAddress}`);
      throw new HubError("bad_request.invalid_param", `Failed to parse server address: ${signerAddress}`);
    }
    log.info(`Starting fname events provider from ${this.lastTransferId} using signer: ${rawAddress}`);
    return this.pollForNewEvents();
  }

  public async stop() {
    this.shouldStop = true;
    if (this.pollTimeoutId) {
      clearTimeout(this.pollTimeoutId);
    }
    log.info("Stopped fname events provider");
  }

  private async pollForNewEvents() {
    await this.fetchAndMergeTransfers(this.lastTransferId);
    this.pollTimeoutId = setTimeout(this.pollForNewEvents.bind(this), DEFAULT_POLL_TIMEOUT_IN_MS);
  }

  private async fetchAndMergeTransfers(fromId: number) {
    if (this.serverSignerAddress.length === 0) {
      log.warn("No signer address, unable to merge name proofs");
      return;
    }

    this.lastTransferId = fromId;
    let transfers = await this.safeGetTransfers({ from_id: fromId });
    let transfersCount = 0;
    while (transfers.length > 0 && !this.shouldStop) {
      transfersCount += transfers.length;
      await this.mergeTransfers(transfers);
      const lastTransfer = transfers[transfers.length - 1];
      if (!lastTransfer) {
        break;
      }
      this.lastTransferId = lastTransfer.id;
      transfers = await this.safeGetTransfers({ from_id: this.lastTransferId });
    }
    log.info(`Fetched ${transfersCount} fname events upto ${this.lastTransferId}`);
    const result = await this.hub.getHubState();
    if (result.isOk()) {
      result.value.lastFnameProof = this.lastTransferId;
      await this.hub.putHubState(result.value);
    } else {
      log.error({ errCode: result.error.errCode }, `failed to get hub state: ${result.error.message}`);
    }
  }

  public async retryTransferByName(name: Uint8Array) {
    const nameStr = Buffer.from(name).toString("utf-8");
    const transfers = await this.safeGetTransfers({ name: nameStr });
    await this.mergeTransfers(transfers);
    log.info(`Retried ${transfers.length} fname events for ${nameStr}`);
  }

  private async safeGetTransfers(params: FNameTransferRequest) {
    try {
      return await this.client.getTransfers(params);
    } catch (err) {
      log.error({ err, params }, "Failed to get transfers from fname registry");
      return [];
    }
  }

  private async mergeTransfers(transfers: FNameTransfer[]) {
    for (const transfer of transfers) {
      if (this.stopTransferId && transfer.id > this.stopTransferId) {
        break;
      }
      const serialized = Result.combine([
        utf8StringToBytes(transfer.username),
        hexStringToBytes(transfer.owner),
        hexStringToBytes(transfer.server_signature),
      ]);
      if (serialized.isErr()) {
        log.error(`Failed to serialize username proof for ${transfer.username}: ${serialized.error}`);
        continue;
      }
      const [username, owner, serverSignature] = serialized.value;
      const usernameProof = UserNameProof.create({
        timestamp: transfer.timestamp,
        name: username,
        owner: owner,
        signature: serverSignature,
        fid: transfer.to,
        type: UserNameType.USERNAME_TYPE_FNAME,
      });
      // TODO: Move the validation into the engine
      const verificationResult = await eip712.verifyUserNameProofClaim(
        makeUserNameProofClaim({
          owner: transfer.owner,
          timestamp: transfer.timestamp,
          name: transfer.username,
        }),
        serverSignature,
        this.serverSignerAddress,
      );
      if (verificationResult.isOk() && verificationResult.value) {
        await this.hub.submitUserNameProof(usernameProof, "fname-registry");
      } else {
        const context: Record<string, string> = { signature: serverSignature.toString() };
        if (verificationResult.isErr()) {
          context["errCode"] = verificationResult.error.errCode;
          context["errMsg"] = verificationResult.error.message;
        }
        log.warn(
          context,
          `Failed to verify username proof for ${transfer.username} for fid ${transfer.to} id: ${transfer.id} with address: ${this.serverSignerAddress}`,
        );
      }
    }
  }
}
