import { parentPort, threadId, workerData } from "worker_threads";
import { ConnectToMultiAddrArgs, MultiAddrResponse, ProfileWorkerAction } from "./gossipProfile.js";
import { Factories, Message } from "@farcaster/hub-nodejs";
import { GossipNode } from "../network/p2p/gossipNode.js";
import { multiaddr } from "@multiformats/multiaddr";

const nodes: GossipTestNode[] = [];
const { numNodes } = workerData;

// Wait for messages from the parent
parentPort?.on("message", (data) => {
  (async () => {
    const { id, action, args } = data;

    if (action === ProfileWorkerAction.Start) {
      await start();
      parentPort?.postMessage({ id, action });
    } else if (action === ProfileWorkerAction.SendMessage) {
      await sendMessage();
      parentPort?.postMessage({ id, action });
    } else if (action === ProfileWorkerAction.WaitForMessages) {
      const { count, timeout } = args;
      await Promise.all(nodes.map((node) => node.waitForMessages(count, timeout)));

      parentPort?.postMessage({ id, action });
    } else if (action === ProfileWorkerAction.Stop) {
      // Collect the data from the nodes
      const datas = nodes.map((node) => node.getData());
      const peerIds = await Promise.all(nodes.map(async (node) => (await node.gossipNode.peerId())?.toString()));

      await Promise.all(nodes.map((node) => node.stop()));

      parentPort?.postMessage({ id, action, response: { peerIds, datas } });
    } else if (action === ProfileWorkerAction.GetMultiAddress) {
      const response = getMultiAddrs();
      parentPort?.postMessage({ id, action, response });
    } else if (action === ProfileWorkerAction.ConnectToMultiAddr) {
      const { multiAddr } = args as ConnectToMultiAddrArgs;
      connectToMultiAddr(multiAddr);

      parentPort?.postMessage({ id, action });
    } else if (action === ProfileWorkerAction.ReportPeers) {
      for (const node of nodes) {
        await node.gossipNode.subscribe(node.gossipNode.primaryTopic());
      }

      parentPort?.postMessage({ id, action });
    }
  })();
});

let messageIdCounter = threadId * 1_000_000;

async function start() {
  for (let i = 0; i < numNodes; i++) {
    const node = new GossipTestNode();
    await node.start();
    nodes.push(node);

    if (i >= 1) {
      // Connect to the first node
      // await (nodes[0] as GossipTestNode).gossipNode.connect(node.gossipNode);

      // Connect to upto 2 nodes that came before us
      const numConnections = 2;
      for (let j = 0; j < numConnections; j++) {
        const randomNodeNum = Math.floor(Math.random() * i);
        if (randomNodeNum !== i) {
          const randomNode = nodes[randomNodeNum] as GossipTestNode;
          await randomNode.gossipNode.connect(node.gossipNode);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }
  }

  // Wait for the nodes to connect
  await Promise.all(nodes.map((node) => node.waitForConnection()));
}

async function getMultiAddrs(): Promise<MultiAddrResponse> {
  const peerIds = await Promise.all(
    nodes.map(async (node) => (await node.gossipNode.peerId())?.toString() ?? "unknown"),
  );
  const multiAddrs = (
    await Promise.all(nodes.map(async (node) => (await node.gossipNode.multiaddrs()).map((addr) => addr.toString())))
  ).flat();

  return { peerIds, multiAddrs };
}

async function connectToMultiAddr(multiAddrs: string[]) {
  // We'll connect the ith node to the ith multiaddr
  for (let i = 0; i < multiAddrs.length; i++) {
    const node = nodes[i] as GossipTestNode;
    const multiAddr = multiAddrs[i];

    if (multiAddr) {
      // 50% chance of connecting to the node
      if (i <= 2 || Math.random() < 0.25) {
        const r = await node.gossipNode.connectAddress(multiaddr(multiAddr));
        console.log("Connected to:", multiAddr, "-", r);

        // Wait for the node to connect
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
}

async function sendMessage() {
  // Send a message from a random node
  const nodeNum = Math.floor(Math.random() * nodes.length);
  const node = nodes[nodeNum] as GossipTestNode;
  await node.sendMessage();
}

async function getMessage(): Promise<{ msg: Message; counter: number }> {
  const fid = 1;
  const network = 1;

  const now = Date.now().toString();
  const counter = messageIdCounter;
  const text = `${counter}:${now}`;

  const msg = await Factories.CastAddMessage.create({ data: { fid, network, castAddBody: { text } } });

  messageIdCounter++;
  return { msg, counter };
}

class GossipTestNode {
  gossipNode: GossipNode;
  connectedPeers = 0;

  sentMessages = 0;
  receivedMessages = new Map<number, number>(); // Id -> timestamp

  constructor() {
    this.gossipNode = new GossipNode();
  }

  async start() {
    // Override the peer score thresholds. When running benchmark tests, we want to accept all messages
    // and not unnecessarily graylist peers (which libp2p does since all the connections appear to come
    // from the same IP)
    await this.gossipNode.start([], {
      scoreThresholds: {
        publishThreshold: -300000,
        gossipThreshold: -300000,
        graylistThreshold: -300000,
        acceptPXThreshold: -300000,
      },
    });

    await this.registerListeners();
  }

  async stop() {
    await this.gossipNode.stop();
  }

  async waitForConnection() {
    await new Promise((resolve) => {
      const interval = setInterval(async () => {
        if (this.connectedPeers > 0) {
          clearInterval(interval);

          // Wait 100ms for the connection to be fully established
          setTimeout(resolve, 1000);
        }
      }, 100);
    });
  }

  async waitForMessages(numMessages: number, timeout: number) {
    await new Promise((resolve) => {
      const timeoutFn = setTimeout(resolve, timeout);

      const interval = setInterval(() => {
        // console.log("Received messages", this.receivedMessages.size, "/", numMessages);

        if (this.receivedMessages.size >= numMessages) {
          clearInterval(interval);
          clearTimeout(timeoutFn);

          // Wait 100ms for the connection to be fully established
          setTimeout(resolve, 1000);
        }
      }, 100);
    });
  }

  async sendMessage() {
    const { msg, counter } = await getMessage();

    // Send a message from the first node
    const r = await this.gossipNode.gossipMessage(msg);
    // console.log("Sent message:", counter, "-", r[0]?._unsafeUnwrap().recipients);

    // When sending a message, we add it to our own stats, since technically we also have received
    // the message
    this.sentMessages++;
  }

  async getData(): Promise<number[]> {
    const delays = Array.from(this.receivedMessages.values());

    // Sort the delays so we can get the median and p95
    delays.sort((a, b) => a - b);

    const count = delays.length + this.sentMessages;
    const median = delays[Math.floor(delays.length / 2)] ?? NaN;
    const p95 = delays[Math.floor(delays.length * 0.95)] ?? NaN;

    return [count, median, p95, (await this.gossipNode.allPeerIds()).length];
  }

  async registerListeners() {
    // Register the handlers
    await this.gossipNode.subscribe(this.gossipNode.primaryTopic());
    this.gossipNode.on("message", async (_topic, message) => {
      const castData = message._unsafeUnwrap().message?.data?.castAddBody;
      const split = castData?.text.split(":");

      const id = parseInt(split?.[0] ?? "-1");
      const delay = Date.now() - parseInt(split?.[1] ?? "-1");

      this.receivedMessages.set(id, delay);
      console.log("Received message ", id, " - ", delay);
    });

    this.gossipNode.on("peerConnect", (peer) => {
      // console.log("Peer connected", peer);
      this.connectedPeers++;
    });

    this.gossipNode.on("peerDisconnect", (peer) => {
      // console.log("Peer disconnected", peer);
      this.connectedPeers--;
    });
  }
}
