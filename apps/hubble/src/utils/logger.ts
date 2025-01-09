import {
  bytesToHexString,
  fromFarcasterTime,
  Message,
  MessageType,
  OnChainEvent,
  onChainEventTypeToJSON,
  UserNameProof,
} from "@farcaster/hub-nodejs";
import pino, { Bindings } from "pino";

/**
 * Logging Guidelines
 *
 * 1. Use a child instance per module
 *
 * const log = logger.child({ component: 'P2PEngine' })
 *
 * 2. Structure logs so that they can be queried easily
 *
 * Good: log.info({ function: 'PerformSync', peerId: peerId.toString() }, 'connected to peers');
 * Bad: log.info('Hub connected to peers over P2P with id', peerId.toString());
 *
 * 3. Use the appropriate level with log.<level> (e.g. logger.info):
 *
 * logger.fatal() - when the application crashes
 * logger.error() - when logging an Error object
 * logger.warn() - when logging something unexpected
 * logger.info() - when logging information (most common use case)
 * logger.debug() - when logging something that is temporarily added in for debugging
 * logger.trace() - not currently used
 *
 * 3. When logging an error, include the error object as the first argument to preserve stack traces
 *
 * Good: log.error(error, "additional context")
 * Bad: log.error("additional context", error.message)
 *
 * More info on best practices:
 * https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/
 */
const defaultOptions: pino.LoggerOptions = {};

const MAX_BUFFERLOG_SIZE = 1_000_000;

// Disable logging in tests and CI to reduce noise.
// PLEASE SEE `logger.rs` for the equivalent in Rust as well for rust logging.
if (process.env["NODE_ENV"] === "test" || process.env["CI"]) {
  // defaultOptions.level = "debug";
  defaultOptions.level = "silent";
} else if (process.env["LOG_LEVEL"]) {
  defaultOptions.level = process.env["LOG_LEVEL"];
}

type ProxiedLogger = { $: BufferedLogger; onFlushListener: (cb: () => void) => void } & Logger;

class BufferedLogger {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  private buffer: { method: string; args: any[] }[] = [];
  private buffering = false;
  private logger: Logger;

  // Keep track of all worker thread loggers so we can propogate the flush event
  private workerThreadLoggerCallbacks: (() => void)[] = [];

  constructor() {
    this.logger = pino.pino(defaultOptions);
    this.buffering = true;
    this.buffer = [];
  }

  createProxy(loggerInstance: Logger = this.logger): ProxiedLogger {
    return new Proxy(loggerInstance, {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      get: (target: any, prop: string) => {
        // We don't intercept "fatal" because it's a special case that we don't want to buffer
        if (["info", "error", "debug", "warn", "trace"].includes(prop)) {
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          return (...args: any[]) => {
            if (!this.buffering || loggerInstance.level === "silent") {
              target[prop](...args);
            } else {
              // Handle the common case of ignoring debug logs if the log level is info
              if (loggerInstance.level === "info" && prop === "debug") {
                return;
              } else {
                this.buffer.push({ method: prop, args });

                if (this.buffer.length > MAX_BUFFERLOG_SIZE) {
                  this.flush();
                }
              }
            }
          };
        } else if (prop === "child") {
          return (bindings: Bindings) => {
            const childLogger = target.child(bindings);
            return this.createProxy(childLogger);
          };
        } else if (prop === "flush") {
          this.flush();
          return target[prop];
        } else if (prop === "$") {
          return this;
        } else if (prop === "onFlushListener") {
          return (cb: () => void) => {
            this.workerThreadLoggerCallbacks.push(cb);
          };
        } else {
          return target[prop];
        }
      },
    });
  }

  flush(): void {
    if (!this.buffering) return;
    this.buffering = false;

    // Call all the callbacks (to flush the logger) from worker threads
    (async () => {
      for (const cb of this.workerThreadLoggerCallbacks) {
        cb();
      }
    })();

    // And then in an async function, flush the buffer so that we don't block the main thread
    (async () => {
      for (const log of this.buffer) {
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        (this.logger as any)[log.method](...log.args);
      }
      this.buffer = [];
    })();
  }
}

export type TagFields = {
  fid?: number;
  timestamp?: number;
  peerId?: string;
  messageType?: MessageType;
  message?: Message;
  // biome-ignore lint/suspicious/noExplicitAny: justified use case
  [key: string]: any;
};

// Always go through this class to construct log tags so that tag names are standardized.
export class Tags {
  private fields: TagFields;

  constructor(fields: TagFields) {
    this.fields = fields;
  }

  toString() {
    const extraFields = Object.fromEntries(
      Object.entries(this.fields).filter(([key, value]) => {
        return !["fid", "timestamp", "peerId", "messageType", "message"].includes(key);
      }),
    );
    JSON.stringify({
      fid: this.fields.fid,
      timestamp: this.fields.timestamp,
      peerId: this.fields.peerId,
      messageType: this.fields.messageType,
      messageFields: {
        timestamp: fromFarcasterTime(this.fields.message?.data?.timestamp || 0)._unsafeUnwrap(),
        hash: this.fields.message ? bytesToHexString(this.fields.message.hash)._unsafeUnwrap() : undefined,
        fid: this.fields.message?.data?.fid,
        type: this.fields.message?.data?.type,
      },
      ...extraFields,
    });
  }
}

export const logger = new BufferedLogger().createProxy();
export type Logger = pino.Logger;

export const messageTypeToName = (type?: MessageType) => {
  if (!type) return "";
  if (Object.values(MessageType).includes(type)) {
    return (MessageType[type] as string).replace("MESSAGE_TYPE_", "");
  } else {
    return `RAW_MESSAGE_TYPE: ${type}`;
  }
};

export const messageToLog = (message: Message) => {
  return {
    timestamp: fromFarcasterTime(message.data?.timestamp || 0)._unsafeUnwrap(),
    hash: bytesToHexString(message.hash)._unsafeUnwrap(),
    fid: message.data?.fid,
    type: message.data?.type,
  };
};

export const onChainEventToLog = (event: OnChainEvent) => {
  return {
    blockNumber: event.blockNumber,
    blockHash: bytesToHexString(event.blockHash)._unsafeUnwrap(),
    fid: event.fid,
    type: onChainEventTypeToJSON(event.type),
  };
};

export const usernameProofToLog = (usernameProof: UserNameProof) => {
  return {
    timestamp: usernameProof.timestamp,
    name: Buffer.from(usernameProof.name).toString("utf-8").replace(/\0/g, ""),
    owner: bytesToHexString(usernameProof.owner)._unsafeUnwrap(),
  };
};

export class SubmitMessageSuccessLogCache {
  counts: Map<string, number> = new Map();
  logger: Logger;
  lastLogTimestampMs: number;

  constructor(logger: Logger) {
    this.logger = logger;
    this.lastLogTimestampMs = 0;
  }

  log(source: string) {
    const count = this.counts.get(source) || 0;
    this.counts.set(source, count + 1);

    const now = Date.now();
    if (now - this.lastLogTimestampMs > 1000) {
      this.lastLogTimestampMs = now;

      const total = Array.from(this.counts.values()).reduce((acc, val) => acc + val, 0);

      // Collect the counts as an object for logging
      const counts: { [source: string]: number } = {};
      this.counts.forEach((value, key) => {
        counts[key] = value;
      });

      this.logger.info({ ...counts, total }, "Successfully submitted messages");
      this.counts.clear();
    }
  }
}
