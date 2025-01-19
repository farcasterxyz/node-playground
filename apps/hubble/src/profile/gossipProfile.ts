import { formatNumber, formatPercentage, formatTime, prettyPrintTable } from "./profile.js";
import { Worker } from "worker_threads";

let workerMessageIdCounter = 0;

export enum ProfileWorkerAction {
  Start = 1,
  SendMessage = 2,
  WaitForMessages = 3,
  Stop = 4,
  GetMultiAddress = 5,
  ConnectToMultiAddr = 6,
  ReportPeers = 7,
}

export type WaitForMessagesArgs = {
  count: number;
  timeout: number;
};

export type ConnectToMultiAddrArgs = {
  multiAddr: string[];
};

type WorkerCallArgs = WaitForMessagesArgs | ConnectToMultiAddrArgs;

export type StopResponse = {
  peerIds: string[];
  datas: number[][];
};

export type MultiAddrResponse = {
  peerIds: string[];
  multiAddrs: string[];
};

export type ProfileWorkerMessage = {
  id: number;
  action: ProfileWorkerAction;
  args?: WaitForMessagesArgs | ConnectToMultiAddrArgs;
};

export type ProfileWorkerResponse = {
  id: number;
  action: ProfileWorkerAction;
  response?: StopResponse | MultiAddrResponse;
};

export async function profileGossipServer(nodeConfig = "3:10") {
  const [numWorkers, numNodes] = nodeConfig.split(":").map((n) => parseInt(n));

  if (!numWorkers || !numNodes) {
    throw new Error(`Invalid node config: "${nodeConfig}". Please provide a config like "3:10" for 30 nodes`);
  }

  const workerPath = new URL("./gossipProfileWorker.js", import.meta.url);

  const workers: Worker[] = [];
  for (let i = 0; i < numWorkers; i++) {
    workers.push(new Worker(workerPath, { workerData: { numNodes } }));
  }

  const pendingWorkerCalls = new Map<number, { resolve: (value: ProfileWorkerResponse) => void }>();

  for (const worker of workers) {
    worker.on("message", (data: ProfileWorkerResponse) => {
      const { id, action, response } = data;
      const pendingCall = pendingWorkerCalls.get(id);

      if (pendingCall) {
        pendingCall.resolve(data);
        pendingWorkerCalls.delete(id);
      } else {
        console.log(`Received unexpected message from worker: ${JSON.stringify(data)}`);
      }
    });
  }

  const callAllWorkersMethod = (
    action: ProfileWorkerAction,
    args?: WorkerCallArgs,
  ): Promise<ProfileWorkerResponse>[] => {
    return workers.map((worker) => callWorkerMethod(worker, action, args));
  };

  const callWorkerMethod = async (
    worker: Worker,
    action: ProfileWorkerAction,
    args?: WorkerCallArgs,
  ): Promise<ProfileWorkerResponse> => {
    return new Promise((resolve) => {
      const id = workerMessageIdCounter++;
      pendingWorkerCalls.set(id, { resolve });

      worker.postMessage({ id, action, args });
    });
  };

  // 1. Start the worker
  await Promise.all(callAllWorkersMethod(ProfileWorkerAction.Start));

  // 3. We'll connect each group of workers to the previous group
  for (let i = 1; i < workers.length; i++) {
    const workerResponse = await callWorkerMethod(workers[i - 1] as Worker, ProfileWorkerAction.GetMultiAddress);
    const prevMultiAddrs = workerResponse.response as MultiAddrResponse;

    await callWorkerMethod(workers[i] as Worker, ProfileWorkerAction.ConnectToMultiAddr, {
      multiAddr: prevMultiAddrs?.multiAddrs ?? [],
    });

    // Wait 100ms between each set of nodes
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Wait a while for the connections to settle
  await new Promise((resolve) => setTimeout(resolve, 10 * 1000));

  await Promise.all(callAllWorkersMethod(ProfileWorkerAction.ReportPeers));

  await new Promise((resolve) => setTimeout(resolve, 10 * 1000));

  // 4. Send 10 messages, each from a random node
  const sendMessagesCount = 2;
  for (let i = 0; i < sendMessagesCount; i++) {
    for (const worker of workers) {
      await callWorkerMethod(worker, ProfileWorkerAction.SendMessage);

      // Wait 200ms between each message
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // 5. Wait for the message to be received
  await Promise.all(
    callAllWorkersMethod(ProfileWorkerAction.WaitForMessages, {
      count: 0.9 * (sendMessagesCount * numWorkers), // Wait for at least 90% of the messages
      timeout: (numNodes * numWorkers * 1000) / 2, // with a timeout of 60s
    }),
  );

  // 6. Stop the worker
  const allResponses = await Promise.all(callAllWorkersMethod(ProfileWorkerAction.Stop));

  // 7. Collect all the datas
  const peerIds: string[] = [];
  const datas: number[][] = [];
  for (const fnResponse of allResponses) {
    const response = fnResponse.response as StopResponse;
    peerIds.push(...(response?.peerIds ?? []));
    datas.push(...(response?.datas ?? []));
  }

  const output = prettyPrintTable(computeStats(peerIds, datas, numWorkers * sendMessagesCount));
  console.log(output);
}

function computeStats(peerIds: string[], datas: number[][], expected: number): string[][] {
  const formattedData = [];

  // Headings
  const headings = ["Node", "Messages", "Median delay", "p95 delay", "Loss %", "# Peers"];
  formattedData.push(headings);

  if (!peerIds || !datas) {
    return formattedData;
  }

  const allNodes = [0, 0, 0, 0, 0];

  // Go over all the nodes and compute the stats
  for (let i = 0; i < peerIds?.length; i++) {
    const data = datas[i] as number[];

    const total = data[0] ?? 0;
    const loss = (expected - total) / expected;

    // Total Messages
    allNodes[0] += total;

    // Median delay
    allNodes[1] += data[1] ?? 0;

    // p95 delay
    allNodes[2] += data[2] ?? 0;

    // Num of peers
    allNodes[3] += data[3] ?? 0;

    const row = [
      peerIds[i]?.substring(30) ?? "Unknown",
      formatNumber(total),
      formatTime(data[1]),
      formatTime(data[2]),
      formatPercentage(loss),
      formatNumber(data[3]),
    ];
    formattedData.push(row);
  }

  // Average out the stats for allNodes
  const loss = (expected * peerIds.length - (allNodes[0] ?? 0)) / expected;
  const avgRow = [
    "All Nodes",
    formatNumber(allNodes[0]),
    formatTime((allNodes[1] ?? 0) / peerIds.length),
    formatTime((allNodes[2] ?? 0) / peerIds.length),
    formatPercentage(loss),
    formatNumber((allNodes[3] ?? 0) / peerIds.length),
  ];
  formattedData.push(avgRow);

  return formattedData;
}
