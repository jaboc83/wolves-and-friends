import type { PlayerStats } from "./player-stats";

// Loads shared roster-stat batches with retry, priority, and progress handling.
export type StatsStatus =
  "idle" | "loading" | "ready" | "partial" | "empty" | "unavailable";
export type StatsBatch = {
  players: { key: string; stats?: PlayerStats }[];
  totalBatches: number;
  manifestVersion: string;
  manifestKeys?: string[];
};
// All callers crawl the same public manifest; selected teams never leave the device.
export function createRosterStatsLoader(now = Date.now) {
  let inflight: Promise<void> | undefined;
  let retryAt = 0;
  let complete = false;
  let version = "";
  let total = 0;
  let remaining = new Set<number>();
  let known: Record<string, PlayerStats> = {};
  return function load(options: {
    initial: Record<string, PlayerStats>;
    fetchBatch: (
      batch: number,
      version: string,
      signal: AbortSignal,
    ) => Promise<StatsBatch>;
    priorityKeys?: string[];
    onStats: (stats: Record<string, PlayerStats>) => void;
    onStatus: (status: StatsStatus) => void;
  }) {
    if (inflight) return inflight;
    if (now() < retryAt) return Promise.resolve();
    known = { ...options.initial, ...known };
    if (complete) {
      version = "";
      remaining.clear();
    }
    const signal = AbortSignal.timeout(60000);
    const deadline = now() + 60000;
    options.onStatus(Object.keys(known).length ? "ready" : "loading");
    inflight = (async () => {
      let received = false;
      let batchWidth = 0;
      let manifestKeys: string[] = [];
      async function batch(index: number) {
        try {
          const data = await options.fetchBatch(index, version, signal);
          if (
            !Number.isSafeInteger(data.totalBatches) ||
            data.totalBatches < 0 ||
            typeof data.manifestVersion !== "string" ||
            !Array.isArray(data.players)
          )
            throw Error("Invalid roster batch");
          if (version && version !== data.manifestVersion)
            throw Error("Manifest changed");
          if (!version) {
            version = data.manifestVersion;
            total = data.totalBatches;
            remaining = new Set(Array.from({ length: total }, (_, i) => i));
            manifestKeys = data.manifestKeys || [];
            batchWidth = data.players.length || 3;
          }
          received = true;
          const available = data.players.filter((player) => player.stats);
          known = {
            ...known,
            ...Object.fromEntries(available.map((p) => [p.key, p.stats!])),
          };
          if (available.length) options.onStats(known);
          remaining.delete(index);
        } catch (error) {
          if (error instanceof Error && error.message === "Manifest changed") {
            version = "";
            remaining.clear();
          }
        }
      }
      // Fetch zero only to discover a new manifest, otherwise retry missing pages.
      if (!version) await batch(0);
      const priorityBatches = new Set(
        (options.priorityKeys || [])
          .map((key) => manifestKeys.indexOf(key))
          .filter((index) => index >= 0)
          .map((index) => Math.floor(index / Math.max(1, batchWidth))),
      );
      const queue = [...remaining]
        .filter((i) => i !== 0 || !received)
        .sort(
          (a, b) =>
            Number(priorityBatches.has(b)) - Number(priorityBatches.has(a)),
        );
      let next = 0;
      await Promise.all(
        Array.from({ length: 2 }, async () => {
          while (
            version &&
            next < queue.length &&
            now() < deadline &&
            !signal.aborted
          )
            await batch(queue[next++]);
        }),
      );
      complete = Boolean(version) && remaining.size === 0;
      retryAt = now() + (complete ? 15 * 60000 : 2 * 60000);
      const hasStats = Object.keys(known).length > 0;
      options.onStatus(
        complete
          ? hasStats
            ? "ready"
            : "empty"
          : hasStats
            ? "partial"
            : received
              ? "empty"
              : "unavailable",
      );
    })().finally(() => {
      inflight = undefined;
    });
    return inflight;
  };
}
