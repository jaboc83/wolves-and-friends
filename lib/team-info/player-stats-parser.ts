import { overviewSeasonStats } from "./player-stats-overview.ts";
import type {
  PlayerStats,
  PlayerStatsData,
  Stat,
  StatisticsOverview,
} from "./player-stats-types";
import {
  selectedValues,
  statByLabel,
  statByName,
  statValue,
} from "./player-stats-values.ts";

const seasonYear = (value: unknown) => {
  const match = String(value ?? "").match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : undefined;
};

export function parsePlayerStats(
  data: PlayerStatsData,
  rosterTeamId = "",
  league = "",
  position = "",
  targetSeasonYear?: number,
): PlayerStats | undefined {
  const commonCategories = Array.isArray(data.categories)
    ? data.categories
    : [];
  const commonCategory = commonCategories.find(
    (category) =>
      (Array.isArray(category.statistics) && category.statistics.length) ||
      (Array.isArray(category.stats) && category.stats.length),
  );
  if (commonCategory) {
    const rows = commonCategory.statistics || commonCategory.stats || [];
    const teamRows = rows.filter(
      (candidate) =>
        !rosterTeamId || String(candidate.teamId || "") === rosterTeamId,
    );
    const seasonRows = teamRows.filter(
      (candidate) => candidate.season?.year !== undefined,
    );
    const eligibleRows = targetSeasonYear
      ? seasonRows.filter(
          (candidate) => Number(candidate.season?.year) === targetSeasonYear,
        )
      : teamRows;
    const row = [...eligibleRows].sort(
      (a, b) => Number(b.season?.year || 0) - Number(a.season?.year || 0),
    )[0];
    if (targetSeasonYear && !row) return;
    if (row) {
      const raw = (commonCategory.labels || []).map(
        (label: string, index: number) => ({
          name: commonCategory.names?.[index] || label,
          abbreviation: label,
          displayValue: row.stats?.[index],
          displayName: commonCategory.displayNames?.[index] || label,
        }),
      );
      const games =
        statByName(raw, ["gamesPlayed"]) || statByLabel(raw, ["GP"]);
      if (games && Number(games.displayValue) === 0) return;
      let values = league
        ? selectedValues(raw, league, position)
        : raw.slice(0, 6).map((stat: Stat) => ({
            label: String(stat.abbreviation),
            value: statValue(stat),
            description: String(stat.displayName || stat.abbreviation),
          }));
      if (
        !values.length &&
        (league === "football/nfl" || league === "baseball/mlb")
      ) {
        const removeGames =
          league === "football/nfl" || commonCategory.name !== "pitching";
        values = raw
          .filter(
            (stat: Stat) =>
              !removeGames ||
              !["GP", "GAMES", "gamesPlayed"].includes(
                String(stat.abbreviation || stat.name),
              ),
          )
          .slice(0, 6)
          .map((stat: Stat) => ({
            label: String(stat.abbreviation || stat.name),
            value: statValue(stat),
            description: String(
              stat.displayName || stat.abbreviation || stat.name,
            ),
          }));
      }
      if (values.length) {
        return {
          title: `${row.season?.displayName || "Season"} · ${commonCategory.displayName || "Season stats"}`,
          values,
        };
      }
    }
  }

  const coreCategories = Array.isArray(data.splits)
    ? data.splits
    : data.splits?.categories || [];
  const coreStats = coreCategories.flatMap((category) => category.stats || []);
  const coreSeason = seasonYear(data.season?.year || data.season?.displayName);
  if (
    coreStats.length &&
    (!targetSeasonYear || coreSeason === targetSeasonYear) &&
    !/career|projected/i.test(data.season?.displayName || "")
  ) {
    const games =
      statByName(coreStats, ["gamesPlayed"]) || statByLabel(coreStats, ["GP"]);
    if (games && Number(games.value ?? games.displayValue) === 0) return;
    const selected = league
      ? selectedValues(coreStats, league, position)
      : undefined;
    if (selected?.length) {
      return {
        title: (data.season?.displayName || "Season") + " · Regular season",
        values: selected,
      };
    }
    const preferred = [
      "avgPoints",
      "avgRebounds",
      "avgAssists",
      "fieldGoalPct",
      "threePointFieldGoalPct",
      "gamesPlayed",
    ];
    const selectedFallback = coreStats.some((stat) => stat.name === "avgPoints")
      ? preferred.flatMap((name) =>
          coreStats.filter((stat) => stat.name === name),
        )
      : coreStats
          .filter((stat) => !/rank|rating|projected/i.test(stat.name || ""))
          .filter((stat) => {
            const removeGames =
              league === "football/nfl" ||
              (league === "baseball/mlb" &&
                !coreCategories.some(
                  (category) =>
                    category.name === "pitching" &&
                    category.stats?.includes(stat),
                ));
            return !(removeGames && stat.abbreviation === "GP");
          });
    const values = selectedFallback
      .filter(
        (stat) =>
          stat.abbreviation &&
          stat.displayValue !== undefined &&
          String(stat.displayValue).trim(),
      )
      .slice(0, 6)
      .map((stat) => ({
        label: String(stat.abbreviation),
        value: String(stat.displayValue),
        description: String(
          stat.displayName || stat.description || stat.abbreviation,
        ),
      }));
    if (values.length)
      return {
        title: (data.season?.displayName || "Season") + " · Regular season",
        values,
      };
  }

  const overviewStats = overviewSeasonStats(
    data,
    rosterTeamId,
    league,
    targetSeasonYear,
  );
  if (overviewStats) {
    const values = (
      league
        ? selectedValues(overviewStats.stats, league, position)
        : overviewStats.stats.map((stat: Stat) => ({
            label: String(stat.abbreviation),
            value: statValue(stat),
            description: String(stat.displayName || stat.abbreviation),
          }))
    )
      .filter((stat: PlayerStats["values"][number]) => stat.value.trim() !== "")
      .slice(0, 6);
    if (values.length)
      return {
        title: overviewStats.title,
        values,
      };
  }

  const overview: StatisticsOverview | undefined = Array.isArray(
    data.statistics,
  )
    ? undefined
    : data.statistics;
  const summary =
    data.athlete?.statsSummary ||
    data.statsSummary ||
    data.athlete?.statisticsSummary ||
    data.statisticsSummary;
  const statisticsCategories = overview?.categories;
  const statisticsSplitCategories = !Array.isArray(overview?.splits)
    ? overview?.splits?.categories
    : undefined;
  const splitCategories = !Array.isArray(data.splits)
    ? data.splits?.categories
    : undefined;
  const categories =
    data.categories ||
    statisticsCategories ||
    statisticsSplitCategories ||
    splitCategories ||
    [];
  const category =
    categories.find((candidate) =>
      /averages/i.test(candidate.name || candidate.displayName || ""),
    ) ||
    categories.find((candidate) =>
      /general|offense/i.test(candidate.name || ""),
    ) ||
    categories[0];
  const seasons = (category?.statistics || []).filter((row) =>
    Array.isArray(row.stats),
  );
  const teamSeasons = seasons.filter(
    (row) => rosterTeamId && String(row.teamId || "") === rosterTeamId,
  );
  const seasonCandidates = teamSeasons.length ? teamSeasons : seasons;
  const eligibleSeasons = targetSeasonYear
    ? seasonCandidates.filter(
        (row) =>
          seasonYear(row.season?.year || row.season?.displayName) ===
          targetSeasonYear,
      )
    : seasonCandidates;
  const seasonRow = [...eligibleSeasons].sort(
    (a, b) => Number(b.season?.year || 0) - Number(a.season?.year || 0),
  )[0];

  let values: PlayerStats["values"] = [];
  const summaryStatistics =
    summary?.statistics ||
    data.athlete?.statistics ||
    (Array.isArray(data.statistics) ? data.statistics : undefined) ||
    overview?.statistics;
  const summarySeason = seasonYear(
    data.season?.year || data.season?.displayName || summary?.displayName,
  );
  if (
    summaryStatistics?.length &&
    (!targetSeasonYear || summarySeason === targetSeasonYear)
  ) {
    const games =
      statByName(summaryStatistics, ["gamesPlayed"]) ||
      statByLabel(summaryStatistics, ["GP"]);
    if (games && Number(games.value ?? games.displayValue) === 0) return;
    values = summaryStatistics
      .filter(
        (stat) =>
          (stat.abbreviation || stat.name) &&
          stat.displayValue !== undefined &&
          String(stat.displayValue).trim() !== "",
      )
      .slice(0, 6)
      .map((stat) => ({
        label: String(stat.abbreviation || stat.name),
        value: String(stat.displayValue),
        description: String(
          stat.displayName ||
            stat.description ||
            stat.abbreviation ||
            stat.name,
        ),
      }));
  } else if (seasonRow) {
    const rowStats = seasonRow.stats || [];
    values = (category.labels || [])
      .map((label, index) => ({
        label: String(label),
        value: String(rowStats[index] ?? ""),
        description: String(
          category.displayNames?.[index] ||
            category.descriptions?.[index] ||
            data.glossary?.find((item) => item.abbreviation === label)
              ?.displayName ||
            label,
        ),
      }))
      .filter((stat) => stat.value.trim() !== "")
      .slice(0, 6);
  } else if (!targetSeasonYear && category?.totals?.length) {
    const totals = category.totals;
    values = (category.labels || [])
      .map((label, index) => ({
        label: String(label),
        value: String(totals[index] ?? ""),
        description: String(
          data.glossary?.find((item) => item.abbreviation === label)
            ?.displayName || label,
        ),
      }))
      .filter((stat) => stat.value.trim() !== "")
      .slice(0, 6);
  }

  const seasonLabel =
    summary?.displayName ||
    [seasonRow?.season?.displayName, category?.displayName]
      .filter(Boolean)
      .join(" · ") ||
    data.season?.displayName ||
    overview?.displayName ||
    data.displayName ||
    (data.season?.year
      ? String(data.season.year) + " season stats"
      : "Season stats");
  if (/career|projected/i.test(seasonLabel)) return;
  return values.length ? { title: String(seasonLabel), values } : undefined;
}
