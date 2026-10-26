import type { PlayerStats } from "./player-stats";

export type StatsStatus =
  | "idle" | "loading" | "ready" | "partial" | "empty" | "unavailable";
export type StatsBatch = {
  players: { key: string; stats?: PlayerStats }[];
  totalBatches: number;
  manifestVersion: string;
  manifestKeys?: string[];
  batchSize?: number;
};

// The manifest and batch indices are shared and generic. The selected team's
// player keys stay in the browser and are used only to choose requested batches.
export function createRosterStatsLoader() {
  let inflight: Promise<void> | undefined;
  let version = "";
  let total = 0;
  let batchSize = 3;
  let manifestKeys: string[] = [];
  const loaded = new Set<number>();
  let known: Record<string, PlayerStats> = {};

  return function load(options: {
    initial: Record<string, PlayerStats>;
    fetchManifest: (version: string, signal: AbortSignal) => Promise<StatsBatch>;
    fetchBatch: (
      batch: number,
      version: string,
      signal: AbortSignal,
    ) => Promise<StatsBatch>;
    priorityKeys?: string[];
    onStats: (stats: Record<string, PlayerStats>) => void;
    onStatus: (status: StatsStatus) => void;
  }) {
    known = { ...options.initial, ...known };
    if (inflight) return inflight;

    const wanted = new Set(options.priorityKeys || []);
    if (!wanted.size) {
      options.onStatus(Object.keys(known).length ? "ready" : "idle");
      return Promise.resolve();
    }

    const signal = AbortSignal.timeout(60000);
    options.onStatus(Object.keys(known).length ? "ready" : "loading");
    inflight = (async () => {
      try {
        if (!version) {
          const data = await options.fetchManifest("", signal);
          if (
            !Number.isSafeInteger(data.totalBatches) ||
            data.totalBatches < 0 ||
            typeof data.manifestVersion !== "string" ||
            !Array.isArray(data.manifestKeys)
          )
            throw Error("Invalid roster manifest");
          version = data.manifestVersion;
          total = data.totalBatches;
          batchSize = Math.max(1, data.batchSize || 3);
          manifestKeys = data.manifestKeys;
          loaded.clear();
        }

        const desired = new Set(
          [...wanted]
            .map((key) => manifestKeys.indexOf(key))
            .filter((index) => index >= 0)
            .map((index) => Math.floor(index / batchSize)),
        );
        const queue = [...desired].filter(
          (index) => index < total && !loaded.has(index),
        );
        let next = 0;
        await Promise.all(
          Array.from({ length: 2 }, async () => {
            while (next < queue.length && !signal.aborted) {
              const index = queue[next++];
              const data = await options.fetchBatch(index, version, signal);
              if (
                !Number.isSafeInteger(data.totalBatches) ||
                data.totalBatches < 0 ||
                typeof data.manifestVersion !== "string" ||
                !Array.isArray(data.players)
              )
                throw Error("Invalid roster batch");
              if (data.manifestVersion !== version) {
                version = "";
                total = 0;
                manifestKeys = [];
                loaded.clear();
                throw Error("Manifest changed");
              }
              const available = data.players.filter((player) => player.stats);
              known = {
                ...known,
                ...Object.fromEntries(available.map((p) => [p.key, p.stats!])),
              };
              if (available.length) options.onStats(known);
              loaded.add(index);
            }
          }),
        );

        const hasStats = Object.keys(known).length > 0;
        options.onStatus(
          queue.every((index) => loaded.has(index))
            ? hasStats ? "ready" : "empty"
            : hasStats ? "partial" : "unavailable",
        );
      } catch {
        options.onStatus(Object.keys(known).length ? "partial" : "unavailable");
      }
    })().finally(() => {
      inflight = undefined;
    });
    return inflight;
  };
}
