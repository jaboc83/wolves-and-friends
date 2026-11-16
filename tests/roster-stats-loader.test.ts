// Tests roster stats batch loading, queuing, and per-team status.
import assert from "node:assert/strict";
import test from "node:test";
import {
  createRosterStatsLoader,
  RosterManifestChangedError,
  type StatsBatch,
  type StatsStatus,
} from "../lib/team-info/roster-stats-loader.ts";

const stat = { title: "t", values: [] } as never;
const keys = ["a:1", "a:2", "a:3", "b:1"];

function setup(
  fetchBatch: (batch: number, version: string) => Promise<StatsBatch>,
  manifestVersion = () => "v1",
) {
  const statuses: StatsStatus[] = [];
  let manifestCalls = 0;
  const load = createRosterStatsLoader();
  const run = (priorityKeys: string[]) =>
    load({
      priorityKeys,
      fetchManifest: async () => {
        manifestCalls += 1;
        return {
          players: [],
          totalBatches: 2,
          manifestVersion: manifestVersion(),
          manifestKeys: keys,
          batchSize: 3,
        };
      },
      fetchBatch,
      onStats: () => {},
      onStatus: (status) => statuses.push(status),
    });
  return { run, statuses, manifestCalls: () => manifestCalls, load };
}

const okBatch =
  (version = "v1") =>
  async (batch: number): Promise<StatsBatch> => ({
    players: (batch === 0 ? keys.slice(0, 3) : keys.slice(3)).map((key) => ({
      key,
      stats: stat,
    })),
    totalBatches: 2,
    manifestVersion: version,
  });

test("a request made during an in-flight load is queued, not dropped", async () => {
  const requested: number[] = [];
  const { run, statuses } = setup(async (batch, version) => {
    requested.push(batch);
    return okBatch(version)(batch);
  });
  await Promise.all([run(["a:1"]), run(["b:1"])]);
  assert.deepEqual(requested.sort(), [0, 1]);
  assert.equal(statuses.at(-1), "ready");
});

test("status reflects only the requested team's players", async () => {
  const { run, statuses } = setup(async (batch) => ({
    players: [{ key: "a:1", stats: batch === 0 ? stat : undefined }],
    totalBatches: 2,
    manifestVersion: "v1",
  }));
  await run(["b:1"]);
  assert.equal(statuses.at(-1), "empty");
});

test("a failed batch keeps the others and reports partial", async () => {
  const { run, statuses } = setup(async (batch) => {
    if (batch === 1) throw Error("boom");
    return okBatch()(batch);
  });
  await run(["a:1", "b:1"]);
  assert.equal(statuses.at(-1), "partial");
});

test("all batches failing reports unavailable", async () => {
  const { run, statuses } = setup(async () => {
    throw Error("boom");
  });
  await run(["a:1"]);
  assert.equal(statuses.at(-1), "unavailable");
});

test("a manifest version change refetches the manifest next time", async () => {
  const { run, manifestCalls } = setup(okBatch("v2"));
  await run(["a:1"]);
  await run(["a:1"]);
  assert.equal(manifestCalls(), 2);
});

test("HTTP manifest conflicts refresh the manifest instead of retrying an obsolete version", async () => {
  let conflict = true;
  const requestedVersions: string[] = [];
  const { run, manifestCalls, statuses } = setup(
    async (batch, version) => {
      requestedVersions.push(version);
      if (conflict) throw new RosterManifestChangedError();
      return okBatch(version)(batch);
    },
    () => (conflict ? "v1" : "v2"),
  );

  await run(["a:1"]);
  conflict = false;
  await run(["a:1"]);

  assert.equal(manifestCalls(), 2);
  assert.deepEqual(requestedVersions, ["v1", "v2"]);
  assert.equal(statuses.at(-1), "ready");
});

test("slow early batches do not consume the time budget of queued roster players", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  t.mock.method(AbortSignal, "timeout", (milliseconds: number) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), milliseconds);
    return controller.signal;
  });
  const manifestKeys = Array.from({ length: 30 }, (_, index) => `nhl:${index}`);
  const requested: number[] = [];
  let finalStatus: StatsStatus = "idle";
  const request = createRosterStatsLoader()({
    priorityKeys: manifestKeys,
    fetchManifest: async () => ({
      players: [],
      totalBatches: 10,
      batchSize: 3,
      manifestVersion: "v1",
      manifestKeys,
    }),
    fetchBatch: (batch, version, signal) =>
      new Promise((resolve, reject) => {
        requested.push(batch);
        signal.addEventListener("abort", () => reject(new Error("Timed out")));
        setTimeout(
          () =>
            resolve({
              players: manifestKeys
                .slice(batch * 3, batch * 3 + 3)
                .map((key) => ({ key, stats: stat })),
              totalBatches: 10,
              manifestVersion: version,
            }),
          19000,
        );
      }),
    onStats: () => {},
    onStatus: (status) => {
      finalStatus = status;
    },
  });

  for (let wave = 0; wave < 5; wave++) {
    await new Promise<void>((resolve) => setImmediate(resolve));
    t.mock.timers.tick(19000);
  }
  await request;

  assert.equal(requested.length, 10);
  assert.equal(finalStatus, "ready");
});

test("seeded stats count for the requested team", async () => {
  const { run, statuses, load } = setup(okBatch());
  load.seed({ "a:1": stat });
  await run(["a:1"]);
  assert.equal(statuses[0], "ready");
});
