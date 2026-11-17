import assert from "node:assert/strict";
import test from "node:test";
import { mergeTeamInfo } from "../lib/team-info/team-info-cache.ts";
import { createRequestQueue } from "../lib/feeds/request-queue.ts";
import type { Table } from "../lib/team-info/types.ts";

const checked = "2026-11-17T00:00:00.000Z";

test("team-info requests wait for capacity before starting their network timeout", async () => {
  const queueRequest = createRequestQueue();
  const started: number[] = [];
  const release: (() => void)[] = [];
  const requests = Array.from({ length: 6 }, (_, index) =>
    queueRequest(async () => {
      started.push(index);
      await new Promise<void>((resolve) => release.push(resolve));
      return index;
    }),
  );

  assert.deepEqual(started, [0, 1, 2, 3]);
  release[0]();
  await requests[0];
  assert.deepEqual(started, [0, 1, 2, 3, 4]);
  release[1]();
  await requests[1];
  assert.deepEqual(started, [0, 1, 2, 3, 4, 5]);
  for (const resolve of release.slice(2)) resolve();
  assert.deepEqual(await Promise.all(requests), [0, 1, 2, 3, 4, 5]);
});

test("a failed provider releases its slot without hiding the error", async () => {
  const queueRequest = createRequestQueue();
  const release: (() => void)[] = [];
  const failure = new Error("Provider unavailable");
  const failed = queueRequest(async () => {
    await new Promise<void>((resolve) => release.push(resolve));
    throw failure;
  });
  const blocked = Array.from({ length: 3 }, () =>
    queueRequest(() => new Promise<void>((resolve) => release.push(resolve))),
  );
  const next = queueRequest(async () => "standings");
  const rejection = assert.rejects(failed, (error) => error === failure);

  release[0]();
  await rejection;
  assert.equal(await next, "standings");
  for (const resolve of release.slice(1)) resolve();
  await Promise.all(blocked);
});

test("cached Vikings division standings remain visible when the refresh fails", () => {
  const division: Table = {
    name: "NFC North",
    columns: ["#", "W", "L", "T", "PCT"],
    rows: [
      {
        id: "16",
        name: "Minnesota Vikings",
        url: "https://www.espn.com/nfl/",
        cells: ["1", "8", "2", "0", ".800"],
        highlight: true,
      },
    ],
    source: "ESPN",
    url: "https://www.espn.com/nfl/standings",
    checked,
  };
  const merged = mergeTeamInfo(
    { id: "vikings", tables: [], unavailable: ["NFC North standings"] },
    { id: "vikings", tables: [division], unavailable: [] },
  );

  assert.equal(merged.tables.length, 1);
  assert.equal(merged.tables[0].name, "NFC North");
  assert.equal(merged.tables[0].stale, true);
});
