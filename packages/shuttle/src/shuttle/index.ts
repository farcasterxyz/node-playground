import { HubEvent, Message } from "@farcaster/hub-nodejs";
import { DB } from "./db";

export * from "./db";
export * from "./redis";
export * from "./hub";
export * from "./hubSubscriber";
export * from "./hubEventProcessor";
export * from "./messageProcessor";
export * from "./messageReconciliation";
export * from "./eventStream";
export * from "./migration";

export type StoreMessageOperation = "merge" | "delete" | "revoke" | "prune";
export type MessageState = "created" | "deleted";

export type ProcessResult = {
  skipped: boolean;
};

// Implement this interface in your app to handle messages. The package currently provides the following guarantees:
// - Messages can be assumed to be processes in the same order as they were received by the hub as long as wasMissed in false
// - if wasMissed is true, then the package provides no guarantees about the ordering (it is possible to receive an add
//      after a remove, your app needs to handle the CRDT resolution). We will provide a way to handle this in the future.
// - If the same messages is received multiple times, isNew will be set to false for all but the first time
// - state is a user friendly translation of the impact of the message to the CRDT set (e.g. a "merge" of a remove message
// is semantically a delete of the existing add, and state will be set to "deleted" in that case)

export interface MessageHandler {
  // Called for every hub event. Return true to skip processing the event.
  // Returning true will not insert into the messages table. Should always return false unless you have a good reason.
  onHubEvent(event: HubEvent, txn: DB): Promise<boolean>;

  handleMessageMerge(
    message: Message,
    txn: DB,
    operation: StoreMessageOperation,
    state: MessageState,
    isNew: boolean,
    wasMissed: boolean,
  ): Promise<void>;
}
