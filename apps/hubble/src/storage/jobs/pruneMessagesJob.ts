import { HubAsyncResult } from "@farcaster/hub-nodejs";
import { err, ok } from "neverthrow";
import cron from "node-cron";
import Engine from "../engine/index.js";
import { logger } from "../../utils/logger.js";
import { statsd } from "../../utils/statsd.js";
import { sleep } from "../../utils/crypto.js";

export const DEFAULT_PRUNE_MESSAGES_JOB_CRON = "*/5 * * * *"; // Every two hours

// How much time to allocate to pruning each fid.
// 1000 fids per second = 1 fid per ms. 500k fids will take under 10 minutes
const TIME_SCHEDULED_PER_FID_MS = 5; // Temporarily increase to 5ms per fid to reduce load on DB, while we move to pruning at merge

const log = logger.child({
  component: "PruneMessagesJob",
});

type SchedulerStatus = "started" | "stopped";

export class PruneMessagesJobScheduler {
  private _engine: Engine;
  private _cronTask?: cron.ScheduledTask;
  private _running = false;

  constructor(engine: Engine) {
    this._engine = engine;
  }

  start(cronSchedule?: string) {
    this._cronTask = cron.schedule(cronSchedule ?? DEFAULT_PRUNE_MESSAGES_JOB_CRON, () => this.doJobs(), {
      timezone: "Etc/UTC",
    });

    // Log the DB Size at startup
    setTimeout(() => {
      this.logDbSize();
    }, 1000);
  }

  stop() {
    if (this._cronTask) {
      this._cronTask.stop();
    }
  }

  status(): SchedulerStatus {
    return this._cronTask ? "started" : "stopped";
  }

  async logDbSize() {
    this._engine
      .getDb()
      .approximateSize()
      .then((size) => {
        statsd().gauge("rocksdb.approximate_size", size || 0);
      });
  }

  async doJobs(): HubAsyncResult<void> {
    if (this._running) {
      log.info({}, "prune messages job already running, skipping");
      return ok(undefined);
    }

    log.info({}, "starting prune messages job");
    const start = Date.now();
    this._running = true;
    let totalPruned = 0;

    let finished = false;
    let pageToken: Uint8Array | undefined;
    do {
      const fidsPage = await this._engine.getFids({ pageToken });
      if (fidsPage.isErr()) {
        return err(fidsPage.error);
      }
      const { fids, nextPageToken } = fidsPage.value;
      if (!nextPageToken) {
        finished = true;
      } else {
        pageToken = nextPageToken;
      }

      for (const fid of fids) {
        totalPruned += (await this._engine.pruneMessages(fid)).unwrapOr(0);

        // We prune at the rate of 1000 fids per second. If we are running ahead of schedule, we sleep to catch up
        // We do this so that:
        // 1. Each fid is pruned at the same time at every hub, reducing thrash
        // 2. Don't overload the DB or Sync Trie, causing spikes in latency
        if (fid % 100 === 0) {
          // See if we are running ahead of schedule
          const allotedTimeMs = TIME_SCHEDULED_PER_FID_MS * fid;
          const elapsedTimeMs = Date.now() - start;
          if (allotedTimeMs > elapsedTimeMs) {
            const sleepTimeMs = allotedTimeMs - elapsedTimeMs;
            // Sleep for the remaining time
            await sleep(sleepTimeMs);
          }
        }
      }
    } while (!finished);

    log.info({ totalPruned, timeTakenMs: Date.now() - start }, "finished prune messages job");
    this._running = false;

    this.logDbSize();

    return ok(undefined);
  }
}
