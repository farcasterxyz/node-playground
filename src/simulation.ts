import { exit } from 'process';
import Client from '~/client';
import Debugger from '~/debugger';
import FCNode, { InstanceName } from '~/node';
import Faker from 'faker';

// 1. Create 5 Farcaster nodes
const nodeList = new Map<InstanceName, FCNode>();

for (const name of FCNode.instanceNames) {
  nodeList.set(name, new FCNode(name));
}

Debugger.init(nodeList);

// 2. Connect each node to their peers
for (const node of nodeList.values()) {
  node.setPeers(nodeList);
}

// 3. Get a connection to a single node
const knightNode = nodeList.get('Knight');
if (!knightNode) {
  console.log('The knight was not found!');
  exit();
}

Debugger.printState();

// 4. Set up a Client to generate messages
const client = new Client('alice');

const signerChange = {
  blockNumber: 99,
  blockHash: Faker.datatype.hexaDecimal(64).toLowerCase(),
  logIndex: 0,
  address: client.address,
};
// In this step, we'd make each node listen to the registry for username registrations
// and signer changes. For now, we take a shortcut and just tell the engine that a
// registration has occured for alice.
console.log(`Farcaster Registry: @alice was registered by ${client.address}`);
for (const node of nodeList.values()) {
  node.engine.addSignerChange('alice', signerChange);
}

// 5. Send two messages, sequentially to the node.
console.log('Farcaster Client: @alice is starting a new chain');
const root1 = client.generateRoot(signerChange.blockNumber, signerChange.blockHash);
knightNode.addRoot(root1);

console.log('Farcaster Client: @alice is casting one message');
const m2 = client.generateCast('Hello, world!', root1);
knightNode.addCast(m2);

// 6. Send multiple messages to the node.
console.log('Farcaster Client: @alice is casting two new messages');
const m3 = client.generateCast("I'm a cast!", root1);
knightNode.addCast(m3);
const m4 = client.generateCast('On another chain!', root1);
knightNode.addCast(m4);

// 7. Start syncing all nodes at random intervals.
for (const node of nodeList.values()) {
  node.sync();
}

setInterval(() => {
  Debugger.printState();
}, 5_000);

// 8. @alice deletes a cast
setTimeout(() => {
  console.log('Farcaster Client: @alice is deleting her last cast');
  const d1 = client.generateCastDelete(m3, root1);
  knightNode.addCast(d1);
}, 30_000);

// 9. @alice changes her address and starts a new chain.
setTimeout(() => {
  console.log('Farcaster Client: @alice is changing signers');
  const client2 = new Client('alice');

  const signerChange = {
    blockNumber: 100,
    blockHash: Faker.datatype.hexaDecimal(64).toLowerCase(),
    logIndex: 0,
    address: client2.address,
  };

  for (const node of nodeList.values()) {
    node.engine.addSignerChange('alice', signerChange);
  }

  console.log('Farcaster Client: @alice is starting a new chain');
  const b1 = client2.generateRoot(signerChange.blockNumber, signerChange.blockHash);
  knightNode.addRoot(b1);
}, 60_000);
