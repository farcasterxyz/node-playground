import "dotenv/config";
import os from "os";

export const COLORIZE =
  process.env["COLORIZE"] === "true" ? true : process.env["COLORIZE"] === "false" ? false : process.stdout.isTTY;
export const LOG_LEVEL = process.env["LOG_LEVEL"] || "info";

export const HUB_HOST = process.env["HUB_HOST"] || "localhost:2283";
export const HUB_ADMIN_HOST = process.env["HUB_ADMIN_HOST"] || "127.0.0.1:2284";
export const ONCHAIN_EVENTS_HUB_HOST = process.env["ONCHAIN_EVENTS_HUB_HOST"] || "localhost:2283";
export const SNAPCHAIN_HOST = process.env["SNAPCHAIN_HOST"] || "127.0.0.1:3383";
export const HUB_SSL = process.env["HUB_SSL"] === "true" ? true : false;

export const POSTGRES_URL = process.env["POSTGRES_URL"] || "postgres://localhost:5432";
export const POSTGRES_SCHEMA = process.env["POSTGRES_SCHEMA"] || "public";
export const REDIS_URL = process.env["REDIS_URL"] || "redis://localhost:6379";

export const TOTAL_SHARDS = parseInt(process.env["SHARDS"] || "0");
export const SHARD_INDEX = parseInt(process.env["SHARD_NUM"] || "0");

export const BACKFILL_FIDS = process.env["FIDS"] || "";
export const MAX_FID = process.env["MAX_FID"] || "1";
export const MIN_FID = process.env["MIN_FID"] || "1";

export const STATSD_HOST = process.env["STATSD_HOST"];
export const STATSD_METRICS_PREFIX = process.env["STATSD_METRICS_PREFIX"] || "shuttle.";

export const CONCURRENCY = parseInt(process.env["CONCURRENCY"] || "2");
