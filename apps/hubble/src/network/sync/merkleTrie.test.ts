// eslint-disable-file security/detect-non-literal-fs-filename
import * as protobufs from '@farcaster/protobufs';
import { blake3 } from '@noble/hashes/blake3';
import { MerkleTrie } from '~/network/sync/merkleTrie';
import { NetworkFactories } from '~/network/utils/factories';
import { jestRocksDB } from '~/storage/db/jestUtils';
import RocksDB from '~/storage/db/rocksdb';
import { RootPrefix } from '~/storage/db/types';
import { TIMESTAMP_LENGTH } from './syncId';
import { EMPTY_HASH } from './trieNode';

const TEST_TIMEOUT_LONG = 60 * 1000;

const db = jestRocksDB('protobufs.network.merkleTrie.test');
const db2 = jestRocksDB('protobufs.network.merkleTrie2.test');

describe('MerkleTrie', () => {
  const trieWithIds = async (timestamps: number[]) => {
    const syncIds = await Promise.all(
      timestamps.map(async (t) => {
        return await NetworkFactories.SyncId.create(undefined, { transient: { date: new Date(t * 1000) } });
      })
    );
    const trie = new MerkleTrie(db);
    await Promise.all(syncIds.map((id) => trie.insert(id)));
    return trie;
  };

  const forEachDbItem = async (
    db: RocksDB,
    callback?: (i: number, key: Buffer, value: Buffer) => Promise<void>
  ): Promise<number> => {
    let count = 0;
    for await (const [key, value] of db.iteratorByPrefix(Buffer.from([RootPrefix.SyncMerkleTrieNode]))) {
      if (callback) {
        await callback(count, key, value);
      }
      count++;
    }

    return count;
  };

  describe('insert', () => {
    test('succeeds inserting a single item', async () => {
      const trie = new MerkleTrie(db);
      const syncId = await NetworkFactories.SyncId.create();

      expect(await trie.items()).toEqual(0);
      expect(await trie.rootHash()).toEqual('');

      await trie.insert(syncId);

      expect(await trie.items()).toEqual(1);
      expect(await trie.rootHash()).toBeTruthy();
    });

    test('inserts are idempotent', async () => {
      const syncId1 = await NetworkFactories.SyncId.create();
      const syncId2 = await NetworkFactories.SyncId.create();

      const firstTrie = new MerkleTrie(db);
      await firstTrie.insert(syncId1);
      await firstTrie.insert(syncId2);

      const secondTrie = new MerkleTrie(db2);
      await secondTrie.insert(syncId2);
      await secondTrie.insert(syncId1);

      // Order does not matter
      expect(await firstTrie.rootHash()).toEqual(await secondTrie.rootHash());
      expect(await firstTrie.items()).toEqual(await secondTrie.items());
      expect(await firstTrie.rootHash()).toBeTruthy();

      await firstTrie.insert(syncId2);
      await secondTrie.insert(syncId1);

      // Re-adding same item does not change the hash
      expect(await firstTrie.rootHash()).toEqual(await secondTrie.rootHash());
      expect(await firstTrie.items()).toEqual(await secondTrie.items());
      expect(await firstTrie.items()).toEqual(2);
    });

    test(
      'insert multiple items out of order results in the same root hash',
      async () => {
        const syncIds = await NetworkFactories.SyncId.createList(25);

        const firstTrie = new MerkleTrie(db);
        const secondTrie = new MerkleTrie(db2);

        await Promise.all(syncIds.map(async (syncId) => firstTrie.insert(syncId)));
        const shuffledIds = syncIds.sort(() => 0.5 - Math.random());
        await Promise.all(shuffledIds.map(async (syncId) => secondTrie.insert(syncId)));

        expect(await firstTrie.rootHash()).toEqual(await secondTrie.rootHash());
        expect(await firstTrie.rootHash()).toBeTruthy();
        expect(await firstTrie.items()).toEqual(await secondTrie.items());
        expect(await firstTrie.items()).toEqual(25);
      },
      TEST_TIMEOUT_LONG
    );

    test('insert also inserts into the db', async () => {
      const dt = new Date();
      const syncId = await NetworkFactories.SyncId.create(undefined, { transient: { date: dt } });
      const syncIdStr = Buffer.from(syncId.syncId()).toString('hex');

      const trie = new MerkleTrie(db);
      await trie.insert(syncId);

      expect(await trie.exists(syncId)).toBeTruthy();

      let leafs = 0;
      let count = await forEachDbItem(db, async (i, key, value) => {
        expect(key.slice(1).toString('hex')).toEqual(syncIdStr.slice(0, i * 2));

        // Parse the value as a DbTriNode
        const node = protobufs.DbTrieNode.decode(value);

        // The last key should be the leaf node, so it's value should match the entire syncID
        if (i === TIMESTAMP_LENGTH) {
          expect(Buffer.from(node.key).toString('hex')).toEqual(syncIdStr);
        }

        if (node.key.length > 0) {
          leafs += 1;
        }
      });

      // Expect 1 node for each timestamp level + root prefix
      expect(count).toEqual(1 + TIMESTAMP_LENGTH);
      expect(leafs).toEqual(1);

      // Add another item
      const syncId2 = await NetworkFactories.SyncId.create(undefined, { transient: { date: dt } });
      expect(await trie.insert(syncId2)).toBeTruthy();
      expect(await trie.exists(syncId2)).toBeTruthy();

      leafs = 0;
      //eslint-disable-next-line @typescript-eslint/no-unused-vars
      count = await forEachDbItem(db, async (i, key, value) => {
        // Parse the value as a DbTriNode
        const node = protobufs.DbTrieNode.decode(value);
        if (node.key.length > 0) {
          leafs += 1;
        }
      });

      expect(leafs).toEqual(2);

      const rootHash = await trie.rootHash();

      // Unload the trie
      (await trie.getNode(new Uint8Array()))?.unloadChildren();

      // Expect the root hash to be the same
      expect(await trie.rootHash()).toEqual(rootHash);
      expect(await trie.items()).toEqual(2);
    });

    test(
      'Load trie from DB',
      async () => {
        const trie = new MerkleTrie(db);
        const syncIds = await NetworkFactories.SyncId.createList(20);

        await Promise.all(syncIds.map(async (syncId) => await trie.insert(syncId)));

        // Now initialize a new merkle trie from the same DB
        const trie2 = new MerkleTrie(db);
        await trie2.initialize();

        // expect the root hashes to be the same
        expect(await trie.rootHash()).toEqual(await trie2.rootHash());
        expect(await trie.items()).toEqual(await trie2.items());

        // expect all the items to be in the trie
        await Promise.all(syncIds.map(async (syncId) => expect(await trie2.exists(syncId)).toBeTruthy()));

        // Delete half the items from the first trie
        await Promise.all(syncIds.slice(0, syncIds.length / 2).map(async (syncId) => trie.delete(syncId)));

        // Initialize a new trie from the same DB
        const trie3 = new MerkleTrie(db);
        await trie3.initialize();

        // expect the root hashes to be the same
        expect(await trie.rootHash()).toEqual(await trie3.rootHash());
        expect(await trie.items()).toEqual(await trie3.items());

        // Expect that the deleted items are not present
        await Promise.all(
          syncIds.slice(0, syncIds.length / 2).map(async (syncId) => expect(await trie3.exists(syncId)).toBeFalsy())
        );

        // expect all the items to be in the trie
        await Promise.all(
          syncIds.slice(syncIds.length / 2).map(async (syncId) => expect(await trie3.exists(syncId)).toBeTruthy())
        );
      },
      TEST_TIMEOUT_LONG
    );
  });

  describe('delete', () => {
    test('deletes an item', async () => {
      const syncId = await NetworkFactories.SyncId.create();

      const trie = new MerkleTrie(db);
      await trie.insert(syncId);
      expect(await trie.items()).toEqual(1);
      expect(await trie.rootHash()).toBeTruthy();

      expect(await trie.exists(syncId)).toBeTruthy();

      await trie.delete(syncId);
      expect(await trie.items()).toEqual(0);
      expect(await trie.rootHash()).toEqual(EMPTY_HASH);

      expect(await trie.exists(syncId)).toBeFalsy();
    });

    test('deleting an item that does not exist does not change the trie', async () => {
      const syncId = await NetworkFactories.SyncId.create();
      const trie = new MerkleTrie(db);
      expect(await trie.insert(syncId)).toBeTruthy();

      const rootHashBeforeDelete = await trie.rootHash();
      const syncId2 = await NetworkFactories.SyncId.create();
      expect(await trie.delete(syncId2)).toBeFalsy();

      const rootHashAfterDelete = await trie.rootHash();
      expect(rootHashAfterDelete).toEqual(rootHashBeforeDelete);
      expect(await trie.items()).toEqual(1);
    });

    test('delete is an exact inverse of insert', async () => {
      const syncId1 = await NetworkFactories.SyncId.create();
      const syncId2 = await NetworkFactories.SyncId.create();

      const trie = new MerkleTrie(db);
      trie.insert(syncId1);
      const rootHashBeforeDelete = await trie.rootHash();
      trie.insert(syncId2);

      trie.delete(syncId2);
      expect(await trie.rootHash()).toEqual(rootHashBeforeDelete);
    });

    test('trie with a deleted item is the same as a trie with the item never added', async () => {
      const syncId1 = await NetworkFactories.SyncId.create();
      const syncId2 = await NetworkFactories.SyncId.create();

      const firstTrie = new MerkleTrie(db);
      await firstTrie.insert(syncId1);
      await firstTrie.insert(syncId2);

      await firstTrie.delete(syncId1);

      const secondTrie = new MerkleTrie(db2);
      await secondTrie.insert(syncId2);

      expect(await firstTrie.rootHash()).toEqual(await secondTrie.rootHash());
      expect(await firstTrie.rootHash()).toBeTruthy();
      expect(await firstTrie.items()).toEqual(await secondTrie.items());
      expect(await firstTrie.items()).toEqual(1);
    });

    test('Deleting single node deletes all nodes from the DB', async () => {
      const trie = new MerkleTrie(db);
      const id = await NetworkFactories.SyncId.create();

      await trie.insert(id);
      expect(await trie.items()).toEqual(1);

      let count = await forEachDbItem(db);
      expect(count).toEqual(1 + TIMESTAMP_LENGTH);

      // Delete
      await trie.delete(id);
      count = await forEachDbItem(db);
      expect(count).toEqual(0);
    });

    test('Deleting one of two nodes leaves only 1 item in the DB', async () => {
      const trie = new MerkleTrie(db);
      const syncId1 = await NetworkFactories.SyncId.create();
      const syncId2 = await NetworkFactories.SyncId.create();

      await trie.insert(syncId1);
      await trie.insert(syncId2);

      let count = await forEachDbItem(db);
      expect(count).toBeGreaterThan(1 + TIMESTAMP_LENGTH);

      // Delete
      await trie.delete(syncId1);
      count = await forEachDbItem(db);
      expect(count).toEqual(1 + TIMESTAMP_LENGTH);
    });

    test('succeeds with single item', async () => {
      const trie = new MerkleTrie(db);
      const syncId = await NetworkFactories.SyncId.create();

      expect(await trie.exists(syncId)).toBeFalsy();

      await trie.insert(syncId);

      expect(await trie.exists(syncId)).toBeTruthy();

      const nonExistingSyncId = await NetworkFactories.SyncId.create();

      expect(await trie.exists(nonExistingSyncId)).toBeFalsy();
    });

    test('test multiple items with delete', async () => {
      const trie = new MerkleTrie(db);
      const syncIds = await NetworkFactories.SyncId.createList(20);

      await Promise.all(syncIds.map(async (syncId) => trie.insert(syncId)));

      // Delete half of the items
      await Promise.all(syncIds.slice(0, syncIds.length / 2).map(async (syncId) => trie.delete(syncId)));

      // Check that the items are still there
      await Promise.all(
        syncIds.slice(0, syncIds.length / 2).map(async (syncId) => expect(await trie.exists(syncId)).toBeFalsy())
      );
      await Promise.all(
        syncIds.slice(syncIds.length / 2).map(async (syncId) => {
          expect(await trie.exists(syncId)).toBeTruthy();
        })
      );
    });

    test('delete after loading from DB', async () => {
      const trie = new MerkleTrie(db);

      const syncId1 = await NetworkFactories.SyncId.create();
      const syncId2 = await NetworkFactories.SyncId.create();

      await trie.insert(syncId1);
      await trie.insert(syncId2);

      const rootHash = await trie.rootHash();

      const trie2 = new MerkleTrie(db);
      await trie2.initialize();

      expect(await trie2.rootHash()).toEqual(rootHash);

      expect(await trie2.delete(syncId1)).toBeTruthy();

      expect(await trie2.rootHash()).not.toEqual(rootHash);
      expect(await trie2.exists(syncId1)).toBeFalsy();
      expect(await trie2.exists(syncId2)).toBeTruthy();
    });

    test('delete after unloading some nodes', async () => {
      const trie = new MerkleTrie(db);

      const syncId1 = await NetworkFactories.SyncId.create();
      const syncId2 = await NetworkFactories.SyncId.create();

      await trie.insert(syncId1);
      await trie.insert(syncId2);

      const rootHash = await trie.rootHash();

      // Unload all the children of the first node
      (await trie.getNode(new Uint8Array()))?.unloadChildren();

      // Now try deleting syncId1
      expect(await trie.delete(syncId1)).toBeTruthy();

      expect(await trie.rootHash()).not.toEqual(rootHash);
      expect(await trie.exists(syncId1)).toBeFalsy();
      expect(await trie.exists(syncId2)).toBeTruthy();

      // Ensure the trie was compacted
      expect(await forEachDbItem(db)).toEqual(1 + TIMESTAMP_LENGTH);
    });
  });

  describe('getNodeMetadata', () => {
    test('returns undefined if prefix is not present', async () => {
      const syncId = await NetworkFactories.SyncId.create(undefined, { transient: { date: new Date(1665182332000) } });
      const trie = new MerkleTrie(db);
      await trie.insert(syncId);

      expect(await trie.getTrieNodeMetadata(Buffer.from('166518234'))).toBeUndefined();
    });

    test('returns the root metadata if the prefix is empty', async () => {
      const syncId = await NetworkFactories.SyncId.create(undefined, { transient: { date: new Date(1665182332000) } });
      const trie = new MerkleTrie(db);
      trie.insert(syncId);

      const nodeMetadata = await trie.getTrieNodeMetadata(new Uint8Array());
      expect(nodeMetadata).toBeDefined();
      expect(nodeMetadata?.numMessages).toEqual(1);
      expect(nodeMetadata?.prefix).toEqual(new Uint8Array());
      expect(nodeMetadata?.children?.size).toEqual(1);
      expect(nodeMetadata?.children?.get(syncId.syncId()[0] as number)).toBeDefined();
    });

    test('returns the correct metadata if prefix is present', async () => {
      const trie = await trieWithIds([1665182332, 1665182343]);
      const nodeMetadata = await trie.getTrieNodeMetadata(Buffer.from('16651823'));

      expect(nodeMetadata).toBeDefined();
      expect(nodeMetadata?.numMessages).toEqual(2);
      expect(nodeMetadata?.prefix).toEqual(Buffer.from('16651823'));
      expect(nodeMetadata?.children?.size).toEqual(2);
      expect(nodeMetadata?.children?.get(Buffer.from('3')[0] as number)).toBeDefined();
      expect(nodeMetadata?.children?.get(Buffer.from('4')[0] as number)).toBeDefined();
    });
  });

  describe('getSnapshot', () => {
    test('returns basic information', async () => {
      const trie = await trieWithIds([1665182332, 1665182343]);

      const snapshot = await trie.getSnapshot(Buffer.from('1665182343'));
      expect(snapshot.prefix).toEqual(Buffer.from('1665182343'));
      expect(snapshot.numMessages).toEqual(1);
      expect(snapshot.excludedHashes.length).toEqual('1665182343'.length);
    });

    test('returns early when prefix is only partially present', async () => {
      const trie = await trieWithIds([1665182332, 1665182343]);

      const snapshot = await trie.getSnapshot(Buffer.from('1677123'));
      expect(snapshot.prefix).toEqual(Buffer.from('167'));
      expect(snapshot.numMessages).toEqual(2);
      expect(snapshot.excludedHashes.length).toEqual('167'.length);
    });

    test('excluded hashes excludes the prefix char at every level', async () => {
      const trie = await trieWithIds([1665182332, 1665182343, 1665182345, 1665182351]);
      let snapshot = await trie.getSnapshot(Buffer.from('1665182351'));
      let node = await trie.getTrieNodeMetadata(Buffer.from('16651823'));
      // We expect the excluded hash to be the hash of the 3 and 4 child nodes, and excludes the 5 child node
      const expectedHash = Buffer.from(
        blake3
          .create({ dkLen: 20 })
          .update(Buffer.from(node?.children?.get(Buffer.from('3')[0] as number)?.hash || '', 'hex'))
          .update(Buffer.from(node?.children?.get(Buffer.from('4')[0] as number)?.hash || '', 'hex'))
          .digest()
      ).toString('hex');
      expect(snapshot.excludedHashes).toEqual([
        EMPTY_HASH, // 1, these are empty because there are no other children at this level
        EMPTY_HASH, // 6
        EMPTY_HASH, // 6
        EMPTY_HASH, // 5
        EMPTY_HASH, // 1
        EMPTY_HASH, // 8
        EMPTY_HASH, // 2
        EMPTY_HASH, // 3
        expectedHash, // 5 (hash of the 3 and 4 child node hashes)
        EMPTY_HASH, // 1
      ]);

      snapshot = await trie.getSnapshot(Buffer.from('1665182343'));
      node = await trie.getTrieNodeMetadata(Buffer.from('166518234'));
      const expectedLastHash = Buffer.from(
        blake3(Buffer.from(node?.children?.get(Buffer.from('5')[0] as number)?.hash || '', 'hex'), { dkLen: 20 })
      ).toString('hex');
      node = await trie.getTrieNodeMetadata(Buffer.from('16651823'));
      const expectedPenultimateHash = Buffer.from(
        blake3
          .create({ dkLen: 20 })
          .update(Buffer.from(node?.children?.get(Buffer.from('3')[0] as number)?.hash || '', 'hex'))
          .update(Buffer.from(node?.children?.get(Buffer.from('5')[0] as number)?.hash || '', 'hex'))
          .digest()
      ).toString('hex');
      expect(snapshot.excludedHashes).toEqual([
        EMPTY_HASH, // 1
        EMPTY_HASH, // 6
        EMPTY_HASH, // 6
        EMPTY_HASH, // 5
        EMPTY_HASH, // 1
        EMPTY_HASH, // 8
        EMPTY_HASH, // 2
        EMPTY_HASH, // 3
        expectedPenultimateHash, // 4 (hash of the 3 and 5 child node hashes)
        expectedLastHash, // 3 (hash of the 5 child node hash)
      ]);
    });
  });

  test('getAllValues returns all values for child nodes', async () => {
    const trie = await trieWithIds([1665182332, 1665182343, 1665182345]);

    let values = await trie.getAllValues(Buffer.from('16651823'));
    expect(values?.length).toEqual(3);
    values = await trie.getAllValues(Buffer.from('166518233'));
    expect(values?.length).toEqual(1);
  });

  describe('getDivergencePrefix', () => {
    test('returns the prefix with the most common excluded hashes', async () => {
      const trie = await trieWithIds([1665182332, 1665182343, 1665182345]);
      const prefixToTest = Buffer.from('1665182343');
      const oldSnapshot = await trie.getSnapshot(prefixToTest);
      trie.insert(await NetworkFactories.SyncId.create(undefined, { transient: { date: new Date(1665182353000) } }));

      // Since message above was added at 1665182353, the two tries diverged at 16651823 for our prefix
      let divergencePrefix = await trie.getDivergencePrefix(prefixToTest, oldSnapshot.excludedHashes);
      expect(divergencePrefix).toEqual(Buffer.from('16651823'));

      // divergence prefix should be the full prefix, if snapshots are the same
      const currentSnapshot = await trie.getSnapshot(prefixToTest);
      divergencePrefix = await trie.getDivergencePrefix(prefixToTest, currentSnapshot.excludedHashes);
      expect(divergencePrefix).toEqual(prefixToTest);

      // divergence prefix should empty if excluded hashes are empty
      divergencePrefix = await trie.getDivergencePrefix(prefixToTest, []);
      expect(divergencePrefix.length).toEqual(0);

      // divergence prefix should be our prefix if provided hashes are longer
      const with5 = Buffer.concat([prefixToTest, Buffer.from('5')]);
      divergencePrefix = await trie.getDivergencePrefix(with5, [...currentSnapshot.excludedHashes, 'different']);
      expect(divergencePrefix).toEqual(prefixToTest);
    });
  });
});
