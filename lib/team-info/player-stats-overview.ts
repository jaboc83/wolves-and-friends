// Reads ESPN statistics-overview payloads into season stat rows for a player's team and league.
type OverviewStat = {
  name?: string;
  abbreviation?: string;
  displayValue?: string | number | null;
  displayName?: string;
};

type OverviewSplit = {
  teamId?: string | number;
  leagueSlug?: string;
  displayName?: string;
  stats?: (string | number | null)[];
};

type StatisticsOverview = {
  displayName?: string;
  labels?: string[];
  names?: string[];
  displayNames?: string[];
  splits?: OverviewSplit[] | { categories?: unknown[] };
};

type OverviewData = {
  statistics?: StatisticsOverview | OverviewStat[];
  season?: { displayName?: string; year?: string | number };
};

type OverviewSeasonStats = {
  title: string;
  stats: OverviewStat[];
};

const seasonYear = (value: unknown) => {
  const match = String(value ?? "").match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : undefined;
};

export function overviewSeasonStats(
  data: OverviewData,
  rosterTeamId: string,
  league: string,
  targetSeasonYear?: number,
): OverviewSeasonStats | undefined {
  const overview = Array.isArray(data.statistics) ? undefined : data.statistics;
  const overviewSplits = Array.isArray(overview?.splits)
    ? overview.splits.filter(
        (split) => !rosterTeamId || String(split.teamId || "") === rosterTeamId,
      )
    : [];
  const leagueSlug = league.split("/")[1] || "";
  const regular =
    overviewSplits.find(
      (split) => leagueSlug && split.leagueSlug === leagueSlug,
    ) ||
    overviewSplits.find((split) =>
      /^regular season$/i.test(split.displayName || ""),
    );
  const regularStats = regular?.stats;
  const overviewSeason = seasonYear(
    data.season?.year ||
      data.season?.displayName ||
      overview?.displayName ||
      regular?.displayName,
  );
  if (
    !overview ||
    (targetSeasonYear && overviewSeason !== targetSeasonYear) ||
    !regular ||
    !Array.isArray(overview.labels) ||
    !Array.isArray(regularStats)
  )
    return;

  return {
    title: regular.displayName || "Latest published regular season",
    stats: overview.labels.map((label, index) => ({
      name: overview.names?.[index] || label,
      abbreviation: label,
      displayValue: regularStats[index],
      displayName: overview.displayNames?.[index] || label,
    })),
  };
}
