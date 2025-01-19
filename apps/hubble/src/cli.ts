import { FarcasterNetwork, farcasterNetworkFromJSON } from "@farcaster/hub-nodejs";
import { Ed25519PeerId, PeerId, RSAPeerId, Secp256k1PeerId } from "@libp2p/interface";
import { createEd25519PeerId, createFromProtobuf, exportToProtobuf } from "@libp2p/peer-id-factory";
import { Command } from "commander";
import fs, { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import { Result, ResultAsync } from "neverthrow";
import { dirname, resolve } from "path";
import {
  APP_VERSION,
  FARCASTER_VERSION,
  Hub,
  HubOptions,
  HubShutdownReason,
  S3_REGION,
  SNAPSHOT_S3_UPLOAD_BUCKET,
} from "./hubble.js";
import { logger } from "./utils/logger.js";
import { addressInfoFromParts, hostPortFromString, ipMultiAddrStrFromAddressInfo, parseAddress } from "./utils/p2p.js";
import { DEFAULT_RPC_CONSOLE, startConsole } from "./console/console.js";
import RocksDB, { DB_DIRECTORY } from "./storage/db/rocksdb.js";
import { parseNetwork } from "./utils/command.js";
import { Config as DefaultConfig, DEFAULT_CATCHUP_SYNC_SNAPSHOT_MESSAGE_LIMIT } from "./defaultConfig.js";
import { profileStorageUsed } from "./profile/profile.js";
import { profileRPCServer } from "./profile/rpcProfile.js";
import { profileGossipServer } from "./profile/gossipProfile.js";
import { getStatsdInitialization, initializeStatsd } from "./utils/statsd.js";
import os from "os";
import { startupCheck, StartupCheckStatus } from "./utils/startupCheck.js";
import { printSyncHealth } from "./utils/syncHealth.js";
import { mainnet, optimism } from "viem/chains";
import { finishAllProgressBars } from "./utils/progressBars.js";
import { MAINNET_BOOTSTRAP_PEERS } from "./bootstrapPeers.mainnet.js";
import axios from "axios";
import { r2Endpoint, snapshotURLAndMetadata } from "./utils/snapshot.js";
import { DEFAULT_DIAGNOSTIC_REPORT_URL, initDiagnosticReporter } from "./utils/diagnosticReport.js";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

/** A CLI to accept options from the user and start the Hub */

const PEER_ID_FILENAME = "id.protobuf";
const DEFAULT_PEER_ID_DIR = "./.hub";
const DEFAULT_PEER_ID_FILENAME = `default_${PEER_ID_FILENAME}`;
const DEFAULT_PEER_ID_LOCATION = `${DEFAULT_PEER_ID_DIR}/${DEFAULT_PEER_ID_FILENAME}`;
const DEFAULT_CHUNK_SIZE = 9999; // Infura doesn't like chunk sizes >= 10000
const DEFAULT_FNAME_SERVER_URL = "https://fnames.farcaster.xyz";

const DEFAULT_HTTP_API_PORT = 2281;
const DEFAULT_GOSSIP_PORT = 2282;
const DEFAULT_RPC_PORT = 2283;

// Grace period before exiting the process after receiving a SIGINT or SIGTERM
const PROCESS_SHUTDOWN_FILE_CHECK_INTERVAL_MS = 10_000;
const SHUTDOWN_GRACE_PERIOD_MS = 30_000;
let isExiting = false;

const parseNumber = (string: string) => {
  const number = Number(string);
  if (isNaN(number)) throw new Error("Not a number.");
  return number;
};

// Use [return flushAndExit(code)] instead of [process.exit(code)] to ensure that logs get written. Prefixing with [return] maintains the type inferencing you get from using [process.exit].
const flushAndExit = (exitCode: number) => {
  logger.flush();
  process.exit(exitCode);
};

const app = new Command();
app.name("hub").description("Farcaster Hub").version(APP_VERSION);

/*//////////////////////////////////////////////////////////////
                          START COMMAND
//////////////////////////////////////////////////////////////*/

app
  .command("start")
  .description("Start a Hub")

  // Hubble Options
  .option("-n --network <network>", "ID of the Farcaster Network (default: 3 (devnet))", parseNetwork)
  .option("-i, --id <filepath>", "Path to the PeerId file.")
  .option("--hub-operator-fid <fid>", "The FID of the hub operator")
  .option("-c, --config <filepath>", "Path to the config file.")
  .option("--db-name <name>", "The name of the RocksDB instance. (default: rocks.hub._default)")
  .option("--process-file-prefix <prefix>", 'Prefix for file to which hub process number is written. (default: "")')
  .option(
    "--log-individual-messages",
    "Log individual submitMessage. If disabled, log one line per second (default: disabled)",
  )

  // Ethereum Options
  .option("-m, --eth-mainnet-rpc-url <url>", "RPC URL of a Mainnet ETH Node (or comma separated list of URLs)")
  .option("--rank-rpcs", "Rank the RPCs by latency/stability and use the fastest one (default: disabled)")
  .option("--fname-server-url <url>", `The URL for the FName registry server (default: ${DEFAULT_FNAME_SERVER_URL}`)

  // L2 Options
  .option("-l, --l2-rpc-url <url>", "RPC URL of a mainnet Optimism Node (or comma separated list of URLs)")
  .option("--l2-id-registry-address <address>", "The address of the L2 Farcaster ID Registry contract")
  .option("--l2-key-registry-address <address>", "The address of the L2 Farcaster Key Registry contract")
  .option("--l2-storage-registry-address <address>", "The address of the L2 Farcaster Storage Registry contract")
  .option("--l2-resync-events", "Resync events from the L2 Farcaster contracts before starting (default: disabled)")
  .option("--l2-clear-events", "Deletes all events from the L2 Farcaster contracts before starting (default: disabled)")
  .option(
    "--l2-first-block <number>",
    "The block number to begin syncing events from L2 Farcaster contracts",
    parseNumber,
  )
  .option("--l2-stop-block <number>", "The block number to stop syncing L2 events at", parseNumber)
  .option(
    "--l2-chunk-size <number>",
    "The number of events to fetch from L2 Farcaster contracts at a time",
    parseNumber,
  )
  .option("--l2-chain-id <number>", "The chain ID of the L2 Farcaster contracts are deployed to", parseNumber)
  .option(
    "--l2-rent-expiry-override <number>",
    "The storage rent expiry in seconds to use instead of the default 1 year (ONLY FOR TESTS)",
    parseNumber,
  )

  // Networking Options
  .option("-a, --allowed-peers <peerIds...>", "Only peer with specific peer ids. (default: all peers allowed)")
  .option("--denied-peers <peerIds...>", "Do not peer with specific peer ids. (default: no peers denied)")
  .option("-b, --bootstrap <peer-multiaddrs...>", "Peers to bootstrap gossip and sync from. (default: none)")
  .option("-g, --gossip-port <port>", `Port to use for gossip (default: ${DEFAULT_GOSSIP_PORT})`)
  .option("-r, --rpc-port <port>", `Port to use for gRPC  (default: ${DEFAULT_RPC_PORT})`)
  .option("-h, --http-api-port <port>", `Port to use for HTTP API (default: ${DEFAULT_HTTP_API_PORT})`)
  .option("--announce-rpc-port <port>", `Port to announce the gRPC API is reachable via (default: ${DEFAULT_RPC_PORT})`)
  .option("--http-cors-origin <origin>", "CORS origin for HTTP API (default: *)")
  .option("--ip <ip-address>", 'IP address to listen on (default: "127.0.0.1")')
  .option("--announce-ip <ip-address>", "Public IP address announced to peers (default: fetched with external service)")
  .option(
    "--announce-server-name <name>",
    'Server name announced to peers, useful if SSL/TLS enabled. (default: "none")',
  )
  .option("--direct-peers <peer-multiaddrs...>", "A list of peers for libp2p to directly peer with (default: [])")
  .option(
    "--rpc-rate-limit <number>",
    "RPC rate limit for peers specified in rpm. Set to -1 for none. (default: 20k/min)",
  )
  .option("--rpc-subscribe-per-ip-limit <number>", "Maximum RPC subscriptions per IP address. (default: 4)")
  .option("--admin-server-enabled", "Enable the admin server. (default: disabled)")
  .option("--admin-server-host <host>", "The host the admin server should listen on. (default: '127.0.0.1')")
  .option("--http-server-disabled", "Disable the HTTP server. (default: enabled)")

  // Snapshots
  .option("--enable-snapshot-to-s3", "Enable daily snapshots to be uploaded to S3. (default: disabled)")
  .option("--s3-snapshot-bucket <bucket>", "The S3 bucket to upload snapshots to")
  .option("--disable-snapshot-sync", "Disable syncing from snapshots. (default: enabled)")
  .option("--catchup-sync-with-snapshot [boolean]", "Enable catchup sync with snapshot. (default: enabled)")
  .option(
    "--catchup-sync-snapshot-message-limit <number>",
    `Difference in message count before triggering snapshot sync. (default: ${DEFAULT_CATCHUP_SYNC_SNAPSHOT_MESSAGE_LIMIT})`,
  )

  // Metrics
  .option(
    "--statsd-metrics-server <host>",
    'The host to send statsd metrics to, eg "127.0.0.1:8125". (default: disabled)',
  )

  // Opt-out Diagnostics Reporting
  .option(
    "--opt-out-diagnostics [boolean]",
    "Opt-out of sending diagnostics data to the Farcaster foundation. " +
      "Diagnostics are used to troubleshoot user issues and improve health of the network. (default: disabled)",
  )
  .option(
    "--diagnostic-report-url <url>",
    `The URL to send diagnostic reports to. (default: ${DEFAULT_DIAGNOSTIC_REPORT_URL})`,
  )

  // Debugging options
  .option(
    "--disable-console-status",
    "Immediately log to STDOUT, and disable console status and progressbars. (default: disabled)",
  )
  .option("--profile-sync", "Profile a full hub sync and exit. (default: disabled)")
  .option("--rebuild-sync-trie", "Rebuild the sync trie before starting (default: disabled)")
  .option("--resync-name-events", "Resync events from the Fname server before starting (default: disabled)")
  .option("--stop-fname-transfer-id <number>", "Fname transfer id to stop at", parseNumber)
  .option(
    "--chunk-size <number>",
    `The number of blocks to batch when syncing historical events from Farcaster contracts. (default: ${DEFAULT_CHUNK_SIZE})`,
    parseNumber,
  )
  .option("--commit-lock-timeout <number>", "Rocks DB commit lock timeout in milliseconds (default: 500)", parseNumber)
  .option("--commit-lock-max-pending <number>", "Rocks DB commit lock max pending jobs (default: 1000)", parseNumber)
  .option("--rpc-auth <username:password,...>", "Require username-password auth for RPC submit. (default: disabled)")

  .action(async (cliOptions) => {
    const handleShutdownSignal = (signalName: string) => {
      logger.flush();

      logger.warn(`signal '${signalName}' received`);
      let shutdownReason: HubShutdownReason;
      switch (signalName) {
        case "SIGTERM":
          shutdownReason = HubShutdownReason.SIG_TERM;
          break;
        case "uncaughtException":
          shutdownReason = HubShutdownReason.EXCEPTION;
          break;
        case "unhandledRejection":
          shutdownReason = HubShutdownReason.EXCEPTION;
          break;
        case "S3SnapshotUpload":
          shutdownReason = HubShutdownReason.SELF_TERMINATED;
          break;
        default:
          shutdownReason = HubShutdownReason.UNKNOWN;
      }

      if (!isExiting) {
        isExiting = true;
        hub
          .teardown(shutdownReason)
          .then(() => {
            logger.info("Hub stopped gracefully");
            return flushAndExit(0);
          })
          .catch((err) => {
            logger.error({ reason: `Error stopping hub: ${err}` });
            return flushAndExit(1);
          });

        setTimeout(() => {
          logger.fatal("Forcing exit after grace period");
          return flushAndExit(1);
        }, SHUTDOWN_GRACE_PERIOD_MS);
      }
    };

    console.log("\n Hubble Startup Checks");
    console.log("------------------------");

    startupCheck.printStartupCheckStatus(
      StartupCheckStatus.OK,
      `Farcaster: ${FARCASTER_VERSION} Hubble: ${APP_VERSION}`,
    );

    // First, we'll check if we have >16G of RAM. If you have 16GB installed, it
    // detects it as slightly under that depending on OS, so we'll only error if
    // it's less than 15GB.
    const totalMemory = Math.floor(os.totalmem() / 1024 / 1024 / 1024);
    if (totalMemory < 15) {
      startupCheck.printStartupCheckStatus(
        StartupCheckStatus.ERROR,
        `Hubble requires at least 16GB of RAM to run. Detected ${totalMemory}GB`,
      );
      return flushAndExit(1);
    } else {
      startupCheck.printStartupCheckStatus(StartupCheckStatus.OK, `Detected ${totalMemory}GB of RAM`);
    }

    // We'll write our process number to a file so that we can detect if another hub process has taken over.
    const processFileDir = `${DB_DIRECTORY}/process/`;
    const processFilePrefix = cliOptions.processFilePrefix?.concat("_") ?? "";
    const processFileName = `${processFilePrefix}process_number.txt`;

    startupCheck.directoryWritable(DB_DIRECTORY);

    // Generate a random number to identify this hub instance
    // Note that we can't use the PID as the identifier, since the hub running in a docker container will
    // always have PID 1.
    const processNum = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

    // Write our processNum to the file
    fs.mkdirSync(processFileDir, { recursive: true });
    fs.writeFile(`${processFileDir}${processFileName}`, processNum.toString(), (err) => {
      if (err) {
        logger.error(`Error writing process file: ${err}`);
      }
    });

    // Watch for the processNum file. If it changes, and we are not the process number written in the file,
    // it means that another hub process has taken over and we should exit.
    const checkForProcessNumChange = () => {
      if (isExiting) return;

      fs.readFile(`${processFileDir}${processFileName}`, "utf8", async (err, data) => {
        if (err) {
          logger.error(`Error reading processnum file: ${err}`);
          return;
        }

        const readProcessNum = parseInt(data.trim());
        if (!isNaN(readProcessNum) && readProcessNum !== processNum) {
          logger.error(
            { readProcessNum, processNum },
            `Another hub process started up with processNum ${readProcessNum}, exiting with SIGTERM`,
          );
          handleShutdownSignal("SIGTERM");
        }
      });
    };

    setTimeout(function checkLoop() {
      checkForProcessNumChange();
      setTimeout(checkLoop, PROCESS_SHUTDOWN_FILE_CHECK_INTERVAL_MS);
    }, PROCESS_SHUTDOWN_FILE_CHECK_INTERVAL_MS);

    // try to load the config file
    // biome-ignore lint/suspicious/noExplicitAny: legacy code, avoid using ignore for new code
    let hubConfig: any = DefaultConfig;
    const hubConfigFile = cliOptions.config || process.env["HUB_CONFIG"];
    if (hubConfigFile) {
      if (!hubConfigFile.endsWith(".js")) {
        startupCheck.printStartupCheckStatus(StartupCheckStatus.ERROR, "Config file must be a .js file");
        throw new Error(`Config file ${hubConfigFile} must be a .js file`);
      }

      if (!fs.existsSync(resolve(hubConfigFile))) {
        startupCheck.printStartupCheckStatus(StartupCheckStatus.ERROR, `Config file ${hubConfigFile} does not exist`);
        throw new Error(`Config file ${hubConfigFile} does not exist`);
      }

      startupCheck.printStartupCheckStatus(StartupCheckStatus.OK, `Loading config file ${hubConfigFile}`);
      hubConfig = (await import(resolve(hubConfigFile))).Config;
    }

    const disableConsoleStatus = cliOptions.disableConsoleStatus ?? hubConfig.disableConsoleStatus ?? false;
    if (disableConsoleStatus) {
      logger.info("Interactive Progress Bars disabled");
      logger.flush();
      finishAllProgressBars();
    }

    // Read PeerID from 1. CLI option, 2. Environment variable, 3. Config file
    let peerId;
    if (cliOptions.id) {
      const peerIdR = await ResultAsync.fromPromise(readPeerId(resolve(cliOptions.id)), (e) => e);
      if (peerIdR.isErr()) {
        startupCheck.printStartupCheckStatus(
          StartupCheckStatus.ERROR,
          `Failed to read identity from ${cliOptions.id}. Please run "yarn identity create".`,
          "https://www.thehubble.xyz/intro/install.html#installing-hubble\n",
        );
        return flushAndExit(1);
      } else {
        peerId = peerIdR.value;
      }
    } else if (process.env["IDENTITY_B64"]) {
      // Read from the environment variable
      const identityProtoBytes = Buffer.from(process.env["IDENTITY_B64"], "base64");
      const peerIdResult = await ResultAsync.fromPromise(createFromProtobuf(identityProtoBytes), (e) => {
        throw new Error("Failed to read identity from environment");
      });

      if (peerIdResult.isErr()) {
        throw peerIdResult.error;
      }

      peerId = peerIdResult.value;
      logger.info({ identity: peerId.toString() }, "Read identity from environment");
    } else {
      const idFile = resolve(hubConfig.id ?? DEFAULT_PEER_ID_LOCATION);
      startupCheck.directoryWritable(dirname(idFile));

      const peerIdR = await ResultAsync.fromPromise(readPeerId(idFile), (e) => e);
      if (peerIdR.isErr()) {
        startupCheck.printStartupCheckStatus(
          StartupCheckStatus.ERROR,
          `Failed to read identity from ${idFile}. Please run "yarn identity create".`,
          "https://www.thehubble.xyz/intro/install.html#installing-hubble\n",
        );

        return flushAndExit(1);
      } else {
        peerId = peerIdR.value;
      }
    }

    startupCheck.printStartupCheckStatus(StartupCheckStatus.OK, `Found PeerId ${peerId.toString()}`);

    // Read RPC Auth from 1. CLI option, 2. Environment variable, 3. Config file
    let rpcAuth;
    if (cliOptions.rpcAuth) {
      rpcAuth = cliOptions.rpcAuth;
    } else if (process.env["RPC_AUTH"]) {
      rpcAuth = process.env["RPC_AUTH"];
    } else {
      rpcAuth = hubConfig.rpcAuth;
    }

    // Read the rpcRateLimit
    let rpcRateLimit;
    if (cliOptions.rpcRateLimit) {
      rpcRateLimit = cliOptions.rpcRateLimit;
    } else {
      rpcRateLimit = hubConfig.rpcRateLimit;
    }

    // Metrics
    const statsDServer = cliOptions.statsdMetricsServer ?? hubConfig.statsdMetricsServer;
    if (statsDServer) {
      const server = hostPortFromString(statsDServer);
      if (server.isErr()) {
        logger.error({ err: server.error }, "Failed to parse statsd server. Statsd disabled");
      } else {
        logger.info({ server: server.value }, "Statsd server specified. Statsd enabled");
        initializeStatsd(server.value.address, server.value.port);
        startupCheck.printStartupCheckStatus(StartupCheckStatus.OK, "Hubble Monitoring enabled");
      }
    } else {
      startupCheck.printStartupCheckStatus(
        StartupCheckStatus.WARNING,
        "Hubble Monitoring is disabled",
        "https://www.thehubble.xyz/intro/install.html#monitoring-hubble",
      );
      logger.info({}, "No statsd server specified. Statsd disabled");
    }

    const network = cliOptions.network ?? hubConfig.network;
    startupCheck.printStartupCheckStatus(
      StartupCheckStatus.OK,
      `Network is ${FarcasterNetwork[network]?.toString()}(${network})`,
    );

    let testUsers;
    if (process.env["TEST_USERS"]) {
      if (network === FarcasterNetwork.DEVNET || network === FarcasterNetwork.TESTNET) {
        try {
          const testUsersResult = JSON.parse(process.env["TEST_USERS"].replaceAll("'", '"') ?? "");

          if (testUsersResult && testUsersResult.length > 0) {
            logger.info("TEST_USERS is set, will periodically add data to test users");
            testUsers = testUsersResult;
          }
        } catch (err) {
          logger.warn({ err }, "Failed to parse TEST_USERS");
        }
      } else {
        logger.warn({ network }, "TEST_USERS is set, but network is not DEVNET or TESTNET, ignoring");
      }
    }

    const hubAddressInfo = addressInfoFromParts(
      cliOptions.ip ?? hubConfig.ip,
      cliOptions.gossipPort ?? hubConfig.gossipPort ?? DEFAULT_GOSSIP_PORT,
    );

    if (hubAddressInfo.isErr()) {
      throw hubAddressInfo.error;
    }

    const ipMultiAddrResult = ipMultiAddrStrFromAddressInfo(hubAddressInfo.value);
    if (ipMultiAddrResult.isErr()) {
      throw ipMultiAddrResult.error;
    }

    let bootstrapList = (cliOptions.bootstrap ?? hubConfig.bootstrap ?? []) as string[];
    if (network === FarcasterNetwork.MAINNET) {
      // Add in all the mainnet bootstrap peers
      bootstrapList.push(...MAINNET_BOOTSTRAP_PEERS);

      // deduplicate
      bootstrapList = Array.from(new Set(bootstrapList));
    }

    const bootstrapAddrs = bootstrapList
      .map((a) => parseAddress(a))
      .map((a) => {
        if (a.isErr()) {
          logger.warn(
            { errorCode: a.error.errCode, message: a.error.message },
            "Couldn't parse bootstrap address, ignoring",
          );
        }
        return a;
      })
      .filter((a) => a.isOk())
      .map((a) => a._unsafeUnwrap());
    if (bootstrapAddrs.length > 0) {
      startupCheck.printStartupCheckStatus(StartupCheckStatus.OK, `Bootstrapping from ${bootstrapAddrs.length} peers`);
    } else {
      startupCheck.printStartupCheckStatus(
        StartupCheckStatus.WARNING,
        "No bootstrap peers specified. Hubble will not be able to sync without them.",
        "https://www.thehubble.xyz/intro/networks.html",
      );
    }

    const directPeers = (cliOptions.directPeers ?? hubConfig.directPeers ?? []) as string[];
    const rebuildSyncTrie = cliOptions.rebuildSyncTrie ?? hubConfig.rebuildSyncTrie ?? false;
    const profileSync = cliOptions.profileSync ?? hubConfig.profileSync ?? false;

    let enableSnapshotToS3 = cliOptions.enableSnapshotToS3 ?? hubConfig.enableSnapshotToS3 ?? false;
    if (enableSnapshotToS3) {
      // If we're uploading snapshots to S3, we need to make sure that the S3 credentials are set
      const awsVerified = await verifyAWSCredentials();
      enableSnapshotToS3 = awsVerified;
    }

    // Read catchupSyncWithSnapshot from 1. CLI option, 2. Environment variable, 3. Config file
    let catchupSyncWithSnapshot: boolean;
    if (cliOptions.catchupSyncWithSnapshot) {
      catchupSyncWithSnapshot = cliOptions.catchupSyncWithSnapshot === "true";
    } else if (process.env["CATCHUP_SYNC_WITH_SNAPSHOT"]) {
      catchupSyncWithSnapshot = process.env["CATCHUP_SYNC_WITH_SNAPSHOT"] === "true";
    } else {
      catchupSyncWithSnapshot = hubConfig.catchupSyncWithSnapshot;
    }

    const options: HubOptions = {
      peerId,
      logIndividualMessages: cliOptions.logIndividualMessages ?? hubConfig.logIndividualMessages ?? false,
      ipMultiAddr: ipMultiAddrResult.value,
      rpcServerHost: hubAddressInfo.value.address,
      announceIp: cliOptions.announceIp ?? hubConfig.announceIp,
      announceServerName: cliOptions.announceServerName ?? hubConfig.announceServerName,
      gossipPort: hubAddressInfo.value.port,
      network,
      ethMainnetRpcUrl: cliOptions.ethMainnetRpcUrl ?? hubConfig.ethMainnetRpcUrl,
      fnameServerUrl: cliOptions.fnameServerUrl ?? hubConfig.fnameServerUrl ?? DEFAULT_FNAME_SERVER_URL,
      rankRpcs: cliOptions.rankRpcs ?? hubConfig.rankRpcs ?? false,
      chunkSize: cliOptions.chunkSize ?? hubConfig.chunkSize ?? DEFAULT_CHUNK_SIZE,
      l2RpcUrl: cliOptions.l2RpcUrl ?? hubConfig.l2RpcUrl,
      l2IdRegistryAddress: cliOptions.l2IdRegistryAddress ?? hubConfig.l2IdRegistryAddress,
      l2KeyRegistryAddress: cliOptions.l2KeyRegistryAddress ?? hubConfig.l2KeyRegistryAddress,
      l2StorageRegistryAddress: cliOptions.l2StorageRegistryAddress ?? hubConfig.l2StorageRegistryAddress,
      l2FirstBlock: cliOptions.l2FirstBlock ?? hubConfig.l2FirstBlock,
      l2StopBlock: cliOptions.l2StopBlock,
      l2ChunkSize: cliOptions.l2ChunkSize ?? hubConfig.l2ChunkSize,
      l2ChainId: cliOptions.l2ChainId ?? hubConfig.l2ChainId,
      l2ResyncEvents: cliOptions.l2ResyncEvents ?? hubConfig.l2ResyncEvents ?? false,
      l2ClearEvents: cliOptions.l2ClearEvents ?? hubConfig.l2ClearEvents ?? false,
      l2RentExpiryOverride: cliOptions.l2RentExpiryOverride ?? hubConfig.l2RentExpiryOverride,
      bootstrapAddrs,
      allowedPeers: cliOptions.allowedPeers ?? hubConfig.allowedPeers,
      deniedPeers: cliOptions.deniedPeers ?? hubConfig.deniedPeers,
      rpcPort: cliOptions.rpcPort ?? hubConfig.rpcPort ?? DEFAULT_RPC_PORT,
      announceRpcPort:
        cliOptions.announceRpcPort ??
        hubConfig.announceRpcPort ??
        cliOptions.rpcPort ??
        hubConfig.rpcPort ??
        DEFAULT_RPC_PORT,
      httpApiPort: cliOptions.httpApiPort ?? hubConfig.httpApiPort ?? DEFAULT_HTTP_API_PORT,
      httpCorsOrigin: cliOptions.httpCorsOrigin ?? hubConfig.httpCorsOrigin ?? "*",
      rpcAuth,
      rpcRateLimit,
      rpcSubscribePerIpLimit: cliOptions.rpcSubscribePerIpLimit ?? hubConfig.rpcSubscribePerIpLimit,
      rocksDBName: cliOptions.dbName ?? hubConfig.dbName,
      resetDB: false,
      rebuildSyncTrie,
      profileSync,
      catchupSyncWithSnapshot: catchupSyncWithSnapshot,
      catchupSyncSnapshotMessageLimit:
        cliOptions.catchupSyncSnapshotMessageLimit ?? hubConfig.catchupSyncSnapshotMessageLimit,
      resyncNameEvents: cliOptions.resyncNameEvents ?? hubConfig.resyncNameEvents ?? false,
      statsdParams: getStatsdInitialization(),
      commitLockTimeout: cliOptions.commitLockTimeout ?? hubConfig.commitLockTimeout,
      commitLockMaxPending: cliOptions.commitLockMaxPending ?? hubConfig.commitLockMaxPending,
      adminServerEnabled: cliOptions.adminServerEnabled ?? hubConfig.adminServerEnabled,
      httpServerDisabled: cliOptions.httpServerDisabled ?? hubConfig.httpServerDisabled ?? false,
      adminServerHost: cliOptions.adminServerHost ?? hubConfig.adminServerHost,
      testUsers: testUsers,
      directPeers,
      disableSnapshotSync: cliOptions.disableSnapshotSync ?? hubConfig.disableSnapshotSync ?? false,
      enableSnapshotToS3,
      s3SnapshotBucket: cliOptions.s3SnapshotBucket ?? hubConfig.s3SnapshotBucket,
      hubOperatorFid: parseInt(cliOptions.hubOperatorFid ?? hubConfig.hubOperatorFid),
      connectToDbPeers: hubConfig.connectToDbPeers ?? true,
      useStreaming: hubConfig.useStreaming ?? true,
    };

    // Startup check for Hub Operator FID
    if (options.hubOperatorFid && !isNaN(options.hubOperatorFid)) {
      try {
        const fid = options.hubOperatorFid;
        const response = await axios.get(`https://fnames.farcaster.xyz/transfers?fid=${fid}`);
        const transfers = response.data.transfers;
        if (transfers && transfers.length > 0) {
          const usernameField = transfers[transfers.length - 1].username;
          if (usernameField !== null && usernameField !== undefined) {
            startupCheck.printStartupCheckStatus(StartupCheckStatus.OK, `Hub Operator FID is ${fid}(${usernameField})`);
          } else {
            startupCheck.printStartupCheckStatus(
              StartupCheckStatus.WARNING,
              `Hub Operator FID is ${fid}, but no username was found`,
            );
          }
        }
      } catch (e) {
        logger.error(e, `Error fetching username for Hub Operator FID ${options.hubOperatorFid}`);
        startupCheck.printStartupCheckStatus(
          StartupCheckStatus.WARNING,
          `Hub Operator FID is ${options.hubOperatorFid}, but no username was found`,
        );
      }
    } else {
      startupCheck.printStartupCheckStatus(
        StartupCheckStatus.WARNING,
        "Hub Operator FID is not set",
        "https://www.thehubble.xyz/intro/install.html#troubleshooting",
      );
    }

    await startupCheck.rpcCheck(options.ethMainnetRpcUrl, mainnet, "L1");
    await startupCheck.rpcCheck(options.l2RpcUrl, optimism, "L2", options.l2ChainId);

    if (startupCheck.anyFailedChecks()) {
      logger.fatal({ reason: "Startup checks failed" }, "shutting down hub");
      return flushAndExit(1);
    }

    // Opt-out Diagnostics Reporting
    let optOut: boolean;
    if (process.env["HUB_OPT_OUT_DIAGNOSTICS"] || process.env["HUB_OPT_OUT_DIAGNOSTIC"]) {
      if (process.env["HUB_OPT_OUT_DIAGNOSTICS"]) {
        optOut = process.env["HUB_OPT_OUT_DIAGNOSTICS"] === "true";
      } else {
        optOut = process.env["HUB_OPT_OUT_DIAGNOSTIC"] === "true";
      }
    } else {
      optOut = cliOptions.optOutDiagnostics ? cliOptions.optOutDiagnostics === "true" : hubConfig.optOutDiagnostics;
    }
    let reportURL: string;
    if (process.env["HUB_DIAGNOSTIC_REPORT_URL"]) {
      reportURL = process.env["HUB_DIAGNOSTIC_REPORT_URL"];
    } else {
      reportURL = cliOptions.diagnosticReportUrl ?? DEFAULT_DIAGNOSTIC_REPORT_URL;
    }
    initDiagnosticReporter({
      optOut,
      reportURL,
      ...(options.hubOperatorFid && { fid: options.hubOperatorFid }),
      ...(options.peerId && { peerId: options.peerId?.toString() }),
    });

    const hubResult = Result.fromThrowable(
      () => new Hub(options),
      (e) => new Error(`Failed to create hub: ${e}`),
    )();
    if (hubResult.isErr()) {
      if (!startupCheck.anyFailedChecks()) {
        logger.fatal(hubResult.error);
        logger.fatal({ reason: "Hub Creation failed" }, "shutting down hub");
      }

      return flushAndExit(1);
    }

    if (statsDServer && !disableConsoleStatus) {
      console.log("\nMonitor Your Node");
      console.log("----------------");
      console.log("🔗 | Grafana at http://localhost:3000");
    }

    if (!disableConsoleStatus) {
      console.log("\n Starting Hubble");
      console.log("------------------");
      console.log("Please wait... This may take several minutes");
    }

    process.on("SIGINT", () => {
      handleShutdownSignal("SIGINT");
    });

    process.on("SIGTERM", () => {
      handleShutdownSignal("SIGTERM");
    });

    process.on("SIGQUIT", () => {
      handleShutdownSignal("SIGQUIT");
    });

    process.on("uncaughtException", (err) => {
      logger.error({ reason: "Uncaught exception", err }, "shutting down hub");

      handleShutdownSignal("uncaughtException");
    });

    process.on("unhandledRejection", (err) => {
      logger.error({ reason: "Unhandled Rejection", err }, "shutting down hub");

      handleShutdownSignal("unhandledRejection");
    });

    const hub = hubResult.value;
    const startResult = await ResultAsync.fromPromise(
      hub.start(),
      (e) => new Error("Failed to start hub", { cause: e }),
    );
    if (startResult.isErr()) {
      logger.fatal(startResult.error);
      logger.fatal({ reason: "Hub Startup failed" }, "shutting down hub");
      try {
        await hub.teardown(HubShutdownReason.EXCEPTION);
      } finally {
        // Using return here would be unsafe
        flushAndExit(1);
      }
    }

    process.stdin.resume();
  });

/*//////////////////////////////////////////////////////////////
                          SNAPSHOT-URL COMMAND
//////////////////////////////////////////////////////////////*/
const s3SnapshotURL = new Command("snapshot-url")
  .description("Print latest snapshot URL and metadata from S3")
  .option("-n --network <network>", "ID of the Farcaster Network (default: 1 (mainnet))", parseNetwork)
  .option("-b --s3-snapshot-bucket <bucket>", "The S3 bucket that holds snapshot(s)")
  .action(async (options) => {
    const network = farcasterNetworkFromJSON(options.network ?? FarcasterNetwork.MAINNET);
    if (network !== FarcasterNetwork.MAINNET) {
      console.error("Only mainnet snapshots are supported at this time");
      return flushAndExit(1);
    }

    const response = await snapshotURLAndMetadata(network, 0, options.s3SnapshotBucket);
    if (response.isErr()) {
      console.error("error fetching snapshot data", response.error);
      return flushAndExit(1);
    }
    const [url, metadata] = response.value;
    console.log(`${JSON.stringify(metadata, null, 2)}`);
    console.log(`Download chunks under directory at: ${url}`);
    return flushAndExit(1);
  });

app.addCommand(s3SnapshotURL);

/*//////////////////////////////////////////////////////////////
                        IDENTITY COMMAND
//////////////////////////////////////////////////////////////*/

/** Write a given PeerId to a file */
const writePeerId = async (peerId: PeerId, filepath: string) => {
  const directory = dirname(filepath);
  const proto = exportToProtobuf(peerId as RSAPeerId | Ed25519PeerId | Secp256k1PeerId);
  // Handling: using try-catch is more ergonomic than capturing and handling throwable, since we
  // want a fast failure back to the CLI
  try {
    // Safety: directory, writefile are provided from the command line, and safe to trust
    if (!existsSync(directory)) {
      await mkdir(directory, { recursive: true });
    }
    await writeFile(filepath, proto, "binary");
    // biome-ignore lint/suspicious/noExplicitAny: legacy code, avoid using ignore for new code
  } catch (err: any) {
    throw new Error(err);
  }
  logger.info(`Wrote peerId: ${peerId.toString()} to ${filepath}`);
};

const createIdCommand = new Command("create")
  .description(
    "Create a new peerId and write it to a file.\n\nNote: This command will always overwrite the default PeerId file.",
  )
  .option("-O, --output <directory>", "Path to where the generated PeerIds should be stored", DEFAULT_PEER_ID_DIR)
  .option("-N, --count <number>", "Number of PeerIds to generate", parseNumber, 1)
  .action(async (options) => {
    for (let i = 0; i < options.count; i++) {
      const peerId = await createEd25519PeerId();

      if (i === 0) {
        // Create a copy of the first peerId as the default one to use
        await writePeerId(peerId, resolve(`${options.output}/${DEFAULT_PEER_ID_FILENAME}`));
      }

      const path = `${options.output}/${peerId.toString()}_${PEER_ID_FILENAME}`;
      await writePeerId(peerId, resolve(path));
    }

    return flushAndExit(0);
  });

const verifyIdCommand = new Command("verify")
  .description("Verify a peerId file")
  .option("-I, --id <filepath>", "Path to the PeerId file", DEFAULT_PEER_ID_LOCATION)
  .action(async (options) => {
    const peerId = await readPeerId(options.id);
    logger.info(`Successfully Read peerId: ${peerId.toString()} from ${options.id}`);
    return flushAndExit(0);
  });

app
  .command("identity")
  .description("Create or verify a peerID")
  .addCommand(createIdCommand)
  .addCommand(verifyIdCommand);

/*//////////////////////////////////////////////////////////////
                          STATUS COMMAND
//////////////////////////////////////////////////////////////*/
// Deprecated. Please use grafana monitoring instead.
app
  .command("status")
  .description("Reports the db and sync status of the hub")
  .option(
    "-s, --server <url>",
    "Farcaster RPC server address:port to connect to (eg. 127.0.0.1:2283)",
    DEFAULT_RPC_CONSOLE,
  )
  .option("--insecure", "Allow insecure connections to the RPC server", false)
  .option("--watch", "Keep running and periodically report status", false)
  .option("-p, --peerId <peerId>", "Peer id of the hub to compare with (defaults to bootstrap peers)")
  .action(async (_cliOptions) => {
    logger.error(
      "DEPRECATED:" +
        "The 'status' command has been deprecated." +
        "Please use Grafana monitoring. See https://www.thehubble.xyz/intro/monitoring.html",
    );
    console.error(
      "DEPRECATED:\n" +
        "The 'status' command has been deprecated\n" +
        "Please use Grafana monitoring. See https://www.thehubble.xyz/intro/monitoring.html\n",
    );
    return flushAndExit(0);
  });

/*//////////////////////////////////////////////////////////////
                          PROFILE COMMAND
//////////////////////////////////////////////////////////////*/

const storageProfileCommand = new Command("storage")
  .description("Profile the storage layout of the hub, accounting for all the storage")
  .option("--db-name <name>", "The name of the RocksDB instance")
  .option("-c, --config <filepath>", "Path to a config file with options")
  .option("-o, --output <filepath>", "Path to a file to write the profile to")
  .action(async (cliOptions) => {
    const hubConfig = cliOptions.config ? (await import(resolve(cliOptions.config))).Config : DefaultConfig;
    const rocksDBName = cliOptions.dbName ?? hubConfig.dbName ?? "";
    const rocksDB = new RocksDB(rocksDBName);

    if (!rocksDBName) throw new Error("No RocksDB name provided.");
    const dbResult = await ResultAsync.fromPromise(rocksDB.open(), (e) => e as Error);
    if (dbResult.isErr()) {
      logger.warn({ rocksDBName }, "Failed to open RocksDB. The Hub needs to be stopped to run this command.");
    } else {
      await profileStorageUsed(rocksDB, cliOptions.output);
    }

    await rocksDB.close();
    return flushAndExit(0);
  });

const rpcProfileCommand = new Command("rpc")
  .description("Profile the RPC server's performance")
  .option(
    "-s, --server <url>",
    "Farcaster RPC server address:port to connect to (eg. 127.0.0.1:2283)",
    DEFAULT_RPC_CONSOLE,
  )
  .option("--insecure", "Allow insecure connections to the RPC server", false)
  .action(async (cliOptions) => {
    profileRPCServer(cliOptions.server, cliOptions.insecure);
  });

const gossipProfileCommand = new Command("gossip")
  .description("Profile the gossip server's performance")
  .option("-n, --num-nodes <threads>:<nodes>", "Number of nodes to simulate. Total is threads * nodes", "3:10")
  .action(async (cliOptions) => {
    profileGossipServer(cliOptions.numNodes);
  });

app
  .command("profile")
  .description("Profile various resources used by the hub")
  .addCommand(gossipProfileCommand)
  .addCommand(rpcProfileCommand)
  .addCommand(storageProfileCommand);

/*//////////////////////////////////////////////////////////////
                          DBRESET COMMAND
//////////////////////////////////////////////////////////////*/

app
  .command("dbreset")
  .description("Completely remove the database")
  .option("--db-name <name>", "The name of the RocksDB instance")
  .option("-c, --config <filepath>", "Path to a config file with options")
  .action(async (cliOptions) => {
    const hubConfig = cliOptions.config ? (await import(resolve(cliOptions.config))).Config : DefaultConfig;
    const rocksDBName = cliOptions.dbName ?? hubConfig.dbName ?? "";

    if (!rocksDBName) throw new Error("No RocksDB name provided.");

    const rocksDB = new RocksDB(rocksDBName);
    const fallback = () => {
      fs.rmSync(rocksDB.location, { recursive: true, force: true });
    };

    const dbResult = await ResultAsync.fromPromise(rocksDB.open(), (e) => e as Error);
    if (dbResult.isErr()) {
      logger.warn({ rocksDBName }, "Failed to open RocksDB, falling back to rm");
      fallback();
    } else {
      const clearResult = Result.fromThrowable(
        () => rocksDB.clear(),
        (e) => e as Error,
      )();
      if (clearResult.isErr()) {
        logger.warn({ rocksDBName }, "Failed to open RocksDB, falling back to rm");
        fallback();
      }

      await rocksDB.close();
    }

    logger.info({ rocksDBName }, "Database cleared.");
    return flushAndExit(0);
  });

/*//////////////////////////////////////////////////////////////
                          CONSOLE COMMAND
//////////////////////////////////////////////////////////////*/

app
  .command("console")
  .description("Start a REPL console")
  .option(
    "-s, --server <url>",
    "Farcaster RPC server address:port to connect to (eg. 127.0.0.1:2283)",
    DEFAULT_RPC_CONSOLE,
  )
  .option("--insecure", "Allow insecure connections to the RPC server", false)
  .action(async (cliOptions) => {
    startConsole(cliOptions.server, cliOptions.insecure);
  });

const readPeerId = async (filePath: string) => {
  const proto = await readFile(filePath);
  return createFromProtobuf(proto);
};

/*//////////////////////////////////////////////////////////////
                          SYNC HEALTH COMMAND
//////////////////////////////////////////////////////////////*/

app
  .command("sync-health")
  .description("Measure sync health")
  .requiredOption("--start-time-ofday <time>", "How many seconds ago to start the sync health query")
  .requiredOption("--stop-time-ofday <time>", "How many seconds to count over")
  .option("--max-num-peers <count>", "Maximum number of peers to measure for", "20")
  .option("--primary-node <host:port>", "Node to measure all peers against (required)", "hoyt.farcaster.xyz:2283")
  .option("--outfile <filename>", "File to output measurements to", "health.out")
  .option("--peers <ip:port,...>", "Peers to compare with (default: pick random connected peers)")
  .option("--username <username>", "Username for primary node")
  .option("--password <password>", "Password for primary node")
  .option("--use-secure-client-for-peers", "Use a secure rpc client for all peers", false)
  .action(async (cliOptions) => {
    await printSyncHealth(
      cliOptions.startTimeOfday,
      cliOptions.stopTimeOfday,
      cliOptions.maxNumPeers,
      cliOptions.primaryNode,
      cliOptions.useSecureClientForPeers,
      cliOptions.outfile,
      cliOptions.peers ? cliOptions.peers.split(",") : undefined,
      cliOptions.username,
      cliOptions.password,
    );
  });

app.parse(process.argv);

///////////////////////////////////////////////////////////////
//                        UTILS
///////////////////////////////////////////////////////////////

// Verify that we have access to the AWS credentials.
// Either via environment variables or via the AWS credentials file
async function verifyAWSCredentials(): Promise<boolean> {
  const s3 = new S3Client({
    region: S3_REGION,
    endpoint: r2Endpoint(),
    forcePathStyle: true,
  });

  try {
    const params = {
      Bucket: SNAPSHOT_S3_UPLOAD_BUCKET,
      Prefix: "snapshots/",
    };

    const result = await s3.send(new ListObjectsV2Command(params));
    logger.info({ keys: result.KeyCount }, "Verified R2 credentials for snapshots");

    return true;
  } catch (error) {
    logger.error({ err: error }, "Failed to verify R2 credentials. No snapshots performed.");
    return false;
  }
}
