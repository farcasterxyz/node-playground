import { ok } from "neverthrow";
import {
  Factories,
  HubEvent,
  HubEventType,
  getFarcasterTime,
  LEGACY_STORAGE_UNIT_CUTOFF_TIMESTAMP,
} from "@farcaster/hub-nodejs";
import { jestRocksDB } from "../db/jestUtils.js";
import { makeTsHash, putMessage } from "../db/message.js";
import { UserPostfix } from "../db/types.js";
import { StorageCache } from "./storageCache.js";
import { putOnChainEventTransaction } from "../db/onChainEvent.js";
import { sleep } from "../../utils/crypto.js";
import { jest } from "@jest/globals";

const db = jestRocksDB("engine.storageCache.test");

let cache: StorageCache;

beforeEach(() => {
  cache = new StorageCache(db);
});

describe("syncFromDb", () => {
  test("populates cache with messages from db", async () => {
    const usage = [
      {
        fid: Factories.Fid.build(),
        usage: { cast: 3, reaction: 2, verification: 4, userData: 1, storage: 2 },
      },
      {
        fid: Factories.Fid.build(),
        usage: { cast: 2, reaction: 3, verification: 0, userData: 2, storage: 2 },
      },
    ];
    for (const fidUsage of usage) {
      for (let i = 0; i < fidUsage.usage.cast; i++) {
        const message = await Factories.CastAddMessage.create({ data: { fid: fidUsage.fid } });
        await putMessage(db, message);
      }

      for (let i = 0; i < fidUsage.usage.reaction; i++) {
        const message = await Factories.ReactionAddMessage.create({ data: { fid: fidUsage.fid } });
        await putMessage(db, message);
      }

      for (let i = 0; i < fidUsage.usage.verification; i++) {
        const message = await Factories.VerificationAddEthAddressMessage.create({ data: { fid: fidUsage.fid } });
        await putMessage(db, message);
      }

      for (let i = 0; i < fidUsage.usage.userData; i++) {
        const message = await Factories.UserDataAddMessage.create({ data: { fid: fidUsage.fid } });
        await putMessage(db, message);
      }

      for (let i = 0; i < fidUsage.usage.storage; i++) {
        const storageRentEvent = Factories.StorageRentOnChainEvent.build({
          fid: fidUsage.fid,
          blockTimestamp: Date.now() / 1000,
          storageRentEventBody: Factories.StorageRentEventBody.build({
            units: 2,
          }),
        });
        await db.commit(putOnChainEventTransaction(db.transaction(), storageRentEvent));
      }
    }
    await cache.syncFromDb();
    for (const fidUsage of usage) {
      await expect(cache.getMessageCount(fidUsage.fid, UserPostfix.CastMessage)).resolves.toEqual(
        ok(fidUsage.usage.cast),
      );
      await expect(cache.getMessageCount(fidUsage.fid, UserPostfix.ReactionMessage)).resolves.toEqual(
        ok(fidUsage.usage.reaction),
      );
      await expect(cache.getMessageCount(fidUsage.fid, UserPostfix.VerificationMessage)).resolves.toEqual(
        ok(fidUsage.usage.verification),
      );
      await expect(cache.getMessageCount(fidUsage.fid, UserPostfix.UserDataMessage)).resolves.toEqual(
        ok(fidUsage.usage.userData),
      );
      const slot = (await cache.getCurrentStorageSlotForFid(fidUsage.fid))._unsafeUnwrap();
      expect(slot.units).toEqual(4);
      expect(slot.legacy_units).toEqual(0);
    }
  });
});

describe("getCurrentStorageUnitsForFid", () => {
  beforeEach(async () => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });
  test("cache invalidation happens when expected", async () => {
    const fid = Factories.Fid.build();
    const ONE_YEAR = 1000 * 60 * 60 * 24 * 365;
    // 2 years and 2 seconds before the cutoff
    jest.setSystemTime((LEGACY_STORAGE_UNIT_CUTOFF_TIMESTAMP - 2) * 1000 - ONE_YEAR * 2);
    // Unit rented on Aug 2022, expires Aug 2024 (2 years)
    let event = Factories.StorageRentOnChainEvent.build({
      fid: fid,
      blockTimestamp: Math.floor(Date.now() / 1000) + 1,
      storageRentEventBody: Factories.StorageRentEventBody.build({
        units: 1,
      }),
    });
    await db.commit(putOnChainEventTransaction(db.transaction(), event));

    jest.advanceTimersByTime(ONE_YEAR);
    // Unit rented on Aug 2023, expires Aug 2025 (2 years)
    event = Factories.StorageRentOnChainEvent.build({
      fid: fid,
      blockTimestamp: Math.floor(Date.now() / 1000) + 1,
      storageRentEventBody: Factories.StorageRentEventBody.build({
        units: 2,
      }),
    });
    await db.commit(putOnChainEventTransaction(db.transaction(), event));

    // Unit rented on Aug 2024 after the cutoff, expires Aug 2025 (1 year)
    jest.advanceTimersByTime(ONE_YEAR);
    event = Factories.StorageRentOnChainEvent.build({
      fid: fid,
      blockTimestamp: Math.floor(Date.now() / 1000) + 3, // 3s after the cutoff
      storageRentEventBody: Factories.StorageRentEventBody.build({
        units: 2,
      }),
    });
    await db.commit(putOnChainEventTransaction(db.transaction(), event));

    jest.advanceTimersByTime(ONE_YEAR);
    // The first unit should be expired at this point
    await cache.syncFromDb();

    let slot = (await cache.getCurrentStorageSlotForFid(fid))._unsafeUnwrap();
    // 2nd and 3rd units are still valid
    expect(slot.legacy_units).toEqual(2);
    expect(slot.units).toEqual(2);

    jest.advanceTimersByTime(2000);

    slot = (await cache.getCurrentStorageSlotForFid(fid))._unsafeUnwrap();
    // 2nd unit is expired
    expect(slot.legacy_units).toEqual(0);
    expect(slot.units).toEqual(2);

    jest.advanceTimersByTime(2000);

    slot = (await cache.getCurrentStorageSlotForFid(fid))._unsafeUnwrap();
    // All units expired
    expect(slot.legacy_units).toEqual(0);
    expect(slot.units).toEqual(0);
  });
});

describe("getMessageCount", () => {
  test("returns the correct count even if the cache is not synced", async () => {
    const fid = Factories.Fid.build();
    const message = await Factories.CastAddMessage.create({ data: { fid } });
    const message2 = await Factories.CastAddMessage.create({ data: { fid } });
    const message3_different_fid = await Factories.CastAddMessage.create();
    await putMessage(db, message);
    await putMessage(db, message2);
    await putMessage(db, message3_different_fid);
    await expect(cache.getMessageCount(fid, UserPostfix.CastMessage)).resolves.toEqual(ok(2));
    await expect(cache.getMessageCount(message3_different_fid.data.fid, UserPostfix.CastMessage)).resolves.toEqual(
      ok(1),
    );
    await expect(cache.getMessageCount(Factories.Fid.build(), UserPostfix.CastMessage)).resolves.toEqual(ok(0));
  });

  test("count is correct even if called multiple times at once", async () => {
    const fid = Factories.Fid.build();
    const message = await Factories.CastAddMessage.create({ data: { fid } });
    await putMessage(db, message);

    const origDbCountKeysAtPrefix = db.countKeysAtPrefix;
    try {
      let callCount = 0;
      db.countKeysAtPrefix = async (prefix: Buffer): Promise<number> => {
        callCount++;
        await sleep(1000);
        return origDbCountKeysAtPrefix.call(db, prefix);
      };

      // Call the function multiple 110 times at once
      const promises = await Promise.all(
        Array.from({ length: 110 }, () => cache.getMessageCount(fid, UserPostfix.CastMessage)),
      );
      expect(promises.length).toEqual(110);
      expect(callCount).toEqual(1);
      promises.forEach((promise) => expect(promise).toEqual(ok(1)));
    } finally {
      db.countKeysAtPrefix = origDbCountKeysAtPrefix;
    }
  });
});

describe("getEarliestTsHash", () => {
  test("returns undefined if there are no messages", async () => {
    await expect(cache.getEarliestTsHash(Factories.Fid.build(), UserPostfix.CastMessage)).resolves.toEqual(
      ok(undefined),
    );
  });

  test("returns the earliest tsHash by scanning the db on first use", async () => {
    const fid = Factories.Fid.build();
    const first = await Factories.CastAddMessage.create({ data: { fid, timestamp: 123 } });
    const second = await Factories.CastAddMessage.create({ data: { fid, timestamp: 213 } });
    const third = await Factories.CastAddMessage.create({ data: { fid, timestamp: 321 } });
    await putMessage(db, second);
    await putMessage(db, first);

    await expect(cache.getEarliestTsHash(fid, UserPostfix.CastMessage)).resolves.toEqual(
      makeTsHash(first.data.timestamp, first.hash),
    );

    await putMessage(db, third);
    // Unchanged
    await expect(cache.getEarliestTsHash(fid, UserPostfix.CastMessage)).resolves.toEqual(
      makeTsHash(first.data.timestamp, first.hash),
    );
  });
});

describe("processEvent", () => {
  test("increments count with merge cast message event", async () => {
    const fid = Factories.Fid.build();
    const message = await Factories.CastAddMessage.create({ data: { fid } });
    const event = HubEvent.create({ type: HubEventType.MERGE_MESSAGE, mergeMessageBody: { message } });

    await cache.syncFromDb();
    await expect(cache.getMessageCount(fid, UserPostfix.CastMessage)).resolves.toEqual(ok(0));
    await cache.processEvent(event);
    await expect(cache.getMessageCount(fid, UserPostfix.CastMessage)).resolves.toEqual(ok(1));
  });

  test("increments count with merge cast remove message event", async () => {
    const fid = Factories.Fid.build();
    const message = await Factories.CastRemoveMessage.create({ data: { fid } });
    const event = HubEvent.create({ type: HubEventType.MERGE_MESSAGE, mergeMessageBody: { message } });

    await cache.syncFromDb();
    await expect(cache.getMessageCount(fid, UserPostfix.CastMessage)).resolves.toEqual(ok(0));
    await cache.processEvent(event);
    await expect(cache.getMessageCount(fid, UserPostfix.CastMessage)).resolves.toEqual(ok(1));
  });

  test("count is unchanged when removing existing cast", async () => {
    const fid = Factories.Fid.build();
    const cast = await Factories.CastAddMessage.create({ data: { fid } });
    const castRemove = await Factories.CastRemoveMessage.create({
      data: { fid, castRemoveBody: { targetHash: cast.hash } },
    });
    const event = HubEvent.create({
      type: HubEventType.MERGE_MESSAGE,
      mergeMessageBody: { message: castRemove, deletedMessages: [cast] },
    });

    await putMessage(db, cast);
    await cache.syncFromDb();
    await expect(cache.getMessageCount(fid, UserPostfix.CastMessage)).resolves.toEqual(ok(1));
    await cache.processEvent(event);
    await expect(cache.getMessageCount(fid, UserPostfix.CastMessage)).resolves.toEqual(ok(1));
  });

  test("count is decremented with prune message event", async () => {
    const fid = Factories.Fid.build();
    const message = await Factories.ReactionAddMessage.create({ data: { fid } });
    const event = HubEvent.create({ type: HubEventType.PRUNE_MESSAGE, pruneMessageBody: { message } });

    await putMessage(db, message);
    await cache.syncFromDb();
    await expect(cache.getMessageCount(fid, UserPostfix.ReactionMessage)).resolves.toEqual(ok(1));
    await cache.processEvent(event);
    await expect(cache.getMessageCount(fid, UserPostfix.ReactionMessage)).resolves.toEqual(ok(0));
  });

  test("count is decremented with revoke message event", async () => {
    const fid = Factories.Fid.build();
    const message = await Factories.CastAddMessage.create({ data: { fid } });
    const event = HubEvent.create({ type: HubEventType.REVOKE_MESSAGE, revokeMessageBody: { message } });

    await putMessage(db, message);
    await cache.syncFromDb();
    await expect(cache.getMessageCount(fid, UserPostfix.CastMessage)).resolves.toEqual(ok(1));
    await cache.processEvent(event);
    await expect(cache.getMessageCount(fid, UserPostfix.CastMessage)).resolves.toEqual(ok(0));
  });

  test("sets earliest tsHash with merge cast message event", async () => {
    const fid = Factories.Fid.build();

    const middleMessage = await Factories.CastAddMessage.create({ data: { fid } });
    let event = HubEvent.create({ type: HubEventType.MERGE_MESSAGE, mergeMessageBody: { message: middleMessage } });

    // Earliest tsHash is undefined initially
    await expect(cache.getEarliestTsHash(fid, UserPostfix.CastMessage)).resolves.toEqual(ok(undefined));
    await cache.processEvent(event);

    // Earliest tsHash is set
    await expect(cache.getEarliestTsHash(fid, UserPostfix.CastMessage)).resolves.toEqual(
      makeTsHash(middleMessage.data.timestamp, middleMessage.hash),
    );

    // Adding a later messages does not change the earliest tsHash
    const laterMessage = await Factories.CastAddMessage.create({
      data: { fid, timestamp: middleMessage.data.timestamp + 10 },
    });
    event = HubEvent.create({ type: HubEventType.MERGE_MESSAGE, mergeMessageBody: { message: laterMessage } });
    await cache.processEvent(event);
    await expect(cache.getEarliestTsHash(fid, UserPostfix.CastMessage)).resolves.toEqual(
      makeTsHash(middleMessage.data.timestamp, middleMessage.hash),
    );

    // Adding an earlier message changes the earliest tsHash
    const earlierMessage = await Factories.CastAddMessage.create({
      data: { fid, timestamp: middleMessage.data.timestamp - 10 },
    });
    event = HubEvent.create({ type: HubEventType.MERGE_MESSAGE, mergeMessageBody: { message: earlierMessage } });
    await cache.processEvent(event);
    await expect(cache.getEarliestTsHash(fid, UserPostfix.CastMessage)).resolves.toEqual(
      makeTsHash(earlierMessage.data.timestamp, earlierMessage.hash),
    );
  });

  test("unsets the earliest tsHash if the earliest message is removed", async () => {
    const fid = Factories.Fid.build();
    const firstMessage = await Factories.ReactionAddMessage.create({ data: { fid } });
    const laterMessage = await Factories.ReactionAddMessage.create({
      data: { fid, timestamp: firstMessage.data.timestamp + 10 },
    });
    const firstEvent = HubEvent.create({
      type: HubEventType.PRUNE_MESSAGE,
      pruneMessageBody: { message: firstMessage },
    });
    const laterEvent = HubEvent.create({
      type: HubEventType.PRUNE_MESSAGE,
      pruneMessageBody: { message: laterMessage },
    });

    await putMessage(db, firstMessage);
    await putMessage(db, laterMessage);
    await cache.syncFromDb();
    await expect(cache.getEarliestTsHash(fid, UserPostfix.ReactionMessage)).resolves.toEqual(
      makeTsHash(firstMessage.data.timestamp, firstMessage.hash),
    );

    await cache.processEvent(laterEvent);
    // Unchanged
    await expect(cache.getEarliestTsHash(fid, UserPostfix.ReactionMessage)).resolves.toEqual(
      makeTsHash(firstMessage.data.timestamp, firstMessage.hash),
    );

    await cache.processEvent(firstEvent);
    // Unset
    await expect(cache.getEarliestTsHash(fid, UserPostfix.ReactionMessage)).resolves.toEqual(ok(undefined));
  });
});
