import type { PlayerStats } from "./player-stats";

const cacheKey = "wf-player-stats-cache";
const maxAge = 12 * 60 * 60 * 1000;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function isPlayerStats(value: unknown): value is PlayerStats {
  if (!value || typeof value !== "object") return false;
  const candidate = value as PlayerStats;
  return (
    typeof candidate.title === "string" &&
    Array.isArray(candidate.values) &&
    candidate.values.every(
      (stat) =>
        stat &&
        typeof stat.label === "string" &&
        typeof stat.value === "string" &&
        typeof stat.description === "string",
    )
  );
}

export function readPlayerStatsCache(
  storage: Pick<StorageLike, "getItem">,
  now = Date.now(),
): Record<string, PlayerStats> {
  try {
    const raw = storage.getItem(cacheKey);
    if (!raw) return {};
    const payload = JSON.parse(raw) as {
      savedAt?: unknown;
      stats?: unknown;
    };
    if (
      typeof payload.savedAt !== "number" ||
      now - payload.savedAt < 0 ||
      now - payload.savedAt > maxAge ||
      !payload.stats ||
      typeof payload.stats !== "object" ||
      Array.isArray(payload.stats)
    ) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(payload.stats).filter((entry): entry is [string, PlayerStats] =>
        isPlayerStats(entry[1]),
      ),
    );
  } catch {
    return {};
  }
}

export function writePlayerStatsCache(
  storage: Pick<StorageLike, "setItem">,
  stats: Record<string, PlayerStats>,
  now = Date.now(),
) {
  try {
    storage.setItem(cacheKey, JSON.stringify({ savedAt: now, stats }));
  } catch {
    // Storage can be disabled or full; live stats remain available in memory.
  }
}
