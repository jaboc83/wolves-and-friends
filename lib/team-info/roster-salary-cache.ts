import { isSalaryMap } from "./salaryswish.ts";

const maxAge = 12 * 60 * 60 * 1000;

type StoredSalaryCache = {
  savedAt: number;
  season: string;
  salaries: Record<string, number>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function isStoredSalaryCache(value: unknown): value is StoredSalaryCache {
  return (
    isRecord(value) &&
    typeof value.savedAt === "number" &&
    typeof value.season === "string" &&
    isSalaryMap(value.salaries)
  );
}

const cacheKey = (team: string) => `wf-roster-salaries-v1:${team}`;

export function readRosterSalaryCache(
  storage: Pick<Storage, "getItem">,
  team: string,
  season: string,
  now = Date.now(),
): Record<string, number> {
  try {
    const raw = storage.getItem(cacheKey(team));
    if (!raw) return {};
    const value: unknown = JSON.parse(raw);
    if (
      !isStoredSalaryCache(value) ||
      value.season !== season ||
      now - value.savedAt < 0 ||
      now - value.savedAt > maxAge
    )
      return {};
    return value.salaries;
  } catch {
    return {};
  }
}

export function writeRosterSalaryCache(
  storage: Pick<Storage, "setItem">,
  team: string,
  season: string,
  salaries: Record<string, number>,
  now = Date.now(),
): void {
  try {
    storage.setItem(
      cacheKey(team),
      JSON.stringify({ savedAt: now, season, salaries }),
    );
  } catch {
    // Salary data can still be displayed for the current page view.
  }
}
