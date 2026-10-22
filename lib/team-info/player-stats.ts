// Parses provider stats and selects concise player summaries for roster displays.
export type PlayerStats = {
  title: string;
  values: { label: string; value: string; description: string }[];
};

type Stat = {
  name?: string;
  abbreviation?: string;
  displayValue?: string | number | null;
  displayName?: string;
  description?: string;
  value?: number;
  teamId?: string | number;
  season?: { year?: string | number; displayName?: string };
  stats?: (string | number | null)[];
};
type StatRow = Stat & {
  stats?: (string | number | null)[];
};
type Category = {
  name?: string;
  displayName?: string;
  statistics?: StatRow[];
  stats?: Stat[];
  labels?: string[];
  names?: string[];
  displayNames?: string[];
  descriptions?: string[];
  totals?: (string | number | null)[];
};
type StatsSplit = {
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
  splits?: StatsSplit[] | { categories?: Category[] };
  categories?: Category[];
  statistics?: Stat[];
};
type StatsSummary = { displayName?: string; statistics?: Stat[] };
type PlayerStatsData = {
  categories?: Category[];
  splits?: Category[] | { categories?: Category[] };
  season?: { displayName?: string; year?: string | number };
  statistics?: StatisticsOverview | Stat[];
  statsSummary?: StatsSummary;
  statisticsSummary?: StatsSummary;
  athlete?: {
    statsSummary?: StatsSummary;
    statistics?: Stat[];
    statisticsSummary?: StatsSummary;
  };
  glossary?: { abbreviation?: string; displayName?: string }[];
  displayName?: string;
};

const numberValue = (value: unknown) => {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const rounded = (value: number) =>
  (Math.round((value + Number.EPSILON) * 10) / 10).toFixed(1);

const statValue = (stat: Stat | undefined) =>
  stat?.displayValue !== undefined ? String(stat.displayValue) : "";

const seasonYear = (value: unknown) => {
  const match = String(value ?? "").match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : undefined;
};

const statByName = (stats: Stat[], names: string[]) =>
  stats.find((stat) => names.includes(String(stat.name || "")));

const statByLabel = (stats: Stat[], labels: string[]) =>
  stats.find((stat) => labels.includes(String(stat.abbreviation || "")));

function selectedValues(
  stats: Stat[],
  league: string,
  position: string,
): PlayerStats["values"] {
  const basketball = league.startsWith("basketball/");
  const hockey = league === "hockey/nhl";
  const soccer = league.startsWith("soccer/");
  const goalie =
    /goalie|goalkeeper|goaltender/i.test(position) ||
    (hockey && /^G$/i.test(position));

  const make = (label: string, description: string, stat?: Stat) => ({
    label,
    value: statValue(stat),
    description,
  });

  if (basketball) {
    const points =
      statByName(stats, ["avgPoints", "points"]) || statByLabel(stats, ["PTS"]);
    const rebounds =
      statByName(stats, ["avgRebounds", "rebounds"]) ||
      statByLabel(stats, ["REB"]);
    const assists =
      statByName(stats, ["avgAssists", "assists"]) ||
      statByLabel(stats, ["AST"]);
    const blocks =
      statByName(stats, ["avgBlocks", "blocks"]) || statByLabel(stats, ["BLK"]);
    const steals =
      statByName(stats, ["avgSteals", "steals"]) || statByLabel(stats, ["STL"]);
    const fg =
      statByName(stats, ["fieldGoalPct"]) || statByLabel(stats, ["FG%"]);
    const three =
      statByName(stats, ["threePointFieldGoalPct"]) ||
      statByLabel(stats, ["3P%"]);
    const stockValue = [blocks, steals].map(statValue).map(numberValue);
    const stockSum = stockValue.every(
      (value): value is number => value !== undefined,
    )
      ? rounded(stockValue[0] + stockValue[1])
      : "";
    return [
      make("PTS", "Points", points),
      make("REB", "Rebounds", rebounds),
      make("AST", "Assists", assists),
      { label: "STK", value: stockSum, description: "Steals + blocks" },
      make("FG%", "Field Goal Percentage", fg),
      make("3P%", "3-Point Field Goal Percentage", three),
    ].filter((stat) => stat.value.trim() !== "");
  }

  if (hockey) {
    if (goalie) {
      return [
        make(
          "W",
          "Wins",
          statByName(stats, ["wins"]) || statByLabel(stats, ["WINS", "W"]),
        ),
        make(
          "L",
          "Losses",
          statByName(stats, ["losses"]) || statByLabel(stats, ["L"]),
        ),
        make(
          "OTL",
          "Overtime Losses",
          statByName(stats, ["overtimeLosses", "otLosses"]) ||
            statByLabel(stats, ["OTL"]),
        ),
        make(
          "GAA",
          "Goals Against Average",
          statByName(stats, ["avgGoalsAgainst"]) || statByLabel(stats, ["GAA"]),
        ),
        make(
          "SV%",
          "Save Percentage",
          statByName(stats, ["savePct"]) || statByLabel(stats, ["SV%"]),
        ),
        make(
          "SO",
          "Shutouts",
          statByName(stats, ["shutouts"]) || statByLabel(stats, ["SO"]),
        ),
      ].filter((stat) => stat.value.trim() !== "");
    }
    return [
      make(
        "G",
        "Goals",
        statByName(stats, ["goals"]) || statByLabel(stats, ["G"]),
      ),
      make(
        "A",
        "Assists",
        statByName(stats, ["assists"]) || statByLabel(stats, ["A"]),
      ),
      make(
        "PTS",
        "Points",
        statByName(stats, ["points"]) || statByLabel(stats, ["PTS"]),
      ),
      make(
        "+/-",
        "Plus/Minus",
        statByName(stats, ["plusMinus"]) || statByLabel(stats, ["+/-"]),
      ),
    ].filter((stat) => stat.value.trim() !== "");
  }

  if (soccer) {
    if (goalie) {
      return [
        make(
          "SV",
          "Saves",
          statByName(stats, ["saves"]) || statByLabel(stats, ["SV"]),
        ),
        make(
          "CS",
          "Clean Sheets",
          statByName(stats, ["cleanSheet", "cleanSheets"]) ||
            statByLabel(stats, ["CS"]),
        ),
        make(
          "GA",
          "Goals Against",
          statByName(stats, [
            "goalsAgainst",
            "goalsConceded",
            "totalGoalsAgainst",
          ]) || statByLabel(stats, ["GA"]),
        ),
      ].filter((stat) => stat.value.trim() !== "");
    }
    return [
      make(
        "G",
        "Goals",
        statByName(stats, ["totalGoals", "goals"]) || statByLabel(stats, ["G"]),
      ),
      make(
        "A",
        "Assists",
        statByName(stats, ["assists", "goalAssists"]) ||
          statByLabel(stats, ["A"]),
      ),
      make(
        "SH",
        "Shots",
        statByName(stats, ["shots", "totalShots"]) ||
          statByLabel(stats, ["SH"]),
      ),
      make(
        "SOG",
        "Shots on Goal",
        statByName(stats, ["shotsOnGoal", "shotsOnTarget"]) ||
          statByLabel(stats, ["SOG"]),
      ),
      make(
        "FS",
        "Fouls Suffered",
        statByName(stats, ["foulsSuffered"]) ||
          statByLabel(stats, ["FS", "FA"]),
      ),
    ].filter((stat) => stat.value.trim() !== "");
  }

  return [];
}

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
    const eligibleRows =
      targetSeasonYear && seasonRows.length
        ? seasonRows.filter(
            (candidate) => Number(candidate.season?.year) === targetSeasonYear,
          )
        : teamRows;
    const row = [...eligibleRows].sort(
      (a, b) => Number(b.season?.year || 0) - Number(a.season?.year || 0),
    )[0];
    if (row) {
      const raw = (commonCategory.labels || []).map(
        (label: string, index: number) => ({
          name: commonCategory.names?.[index] || label,
          abbreviation: label,
          displayValue: row.stats?.[index],
          displayName: commonCategory.displayNames?.[index] || label,
        }),
      );
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

  // The core API uses stat objects inside splits.categories (not the
  // season-row arrays returned by common-v3). Do not select career totals.
  const coreCategories = Array.isArray(data.splits)
    ? data.splits
    : data.splits?.categories || [];
  const coreStats = coreCategories.flatMap((c) => c.stats || []);
  const coreSeason = seasonYear(
    data.season?.year || data.season?.displayName,
  );
  if (
    coreStats.length &&
    (!targetSeasonYear || !coreSeason || coreSeason === targetSeasonYear) &&
    !/career|projected/i.test(data.season?.displayName || "")
  ) {
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
    const selectedFallback = coreStats.some((s) => s.name === "avgPoints")
      ? preferred.flatMap((name) => coreStats.filter((s) => s.name === name))
      : coreStats
          .filter((s) => !/rank|rating|projected/i.test(s.name || ""))
          .filter((s) => {
            const removeGames =
              league === "football/nfl" ||
              (league === "baseball/mlb" &&
                !coreCategories.some(
                  (category) =>
                    category.name === "pitching" && category.stats?.includes(s),
                ));
            return !(removeGames && s.abbreviation === "GP");
          });
    const values = selectedFallback
      .filter(
        (s) =>
          s.abbreviation &&
          s.displayValue !== undefined &&
          String(s.displayValue).trim(),
      )
      .slice(0, 6)
      .map((s) => ({
        label: String(s.abbreviation),
        value: String(s.displayValue),
        description: String(s.displayName || s.description || s.abbreviation),
      }));
    if (values.length)
      return {
        title: (data.season?.displayName || "Season") + " · Regular season",
        values,
      };
  }
  // The overview API has parallel labels and split values. Soccer labels its
  // domestic split with the competition name (for example, "2026 MLS")
  // instead of "Regular Season", so prefer the player's current team and
  // league before falling back to the generic regular-season label.
  const overview: StatisticsOverview | undefined = Array.isArray(
    data.statistics,
  )
    ? undefined
    : data.statistics;
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
  if (
    overview &&
    regular &&
    Array.isArray(overview.labels) &&
    Array.isArray(regularStats)
  ) {
    const raw = overview.labels.map((label: string, i: number) => ({
      name: overview.names?.[i] || label,
      abbreviation: label,
      displayValue: regularStats[i],
      displayName: overview.displayNames?.[i] || label,
    }));
    const values = (
      league
        ? selectedValues(raw, league, position)
        : raw.map((stat: Stat) => ({
            label: String(stat.abbreviation),
            value: statValue(stat),
            description: String(stat.displayName || stat.abbreviation),
          }))
    )
      .filter((stat: PlayerStats["values"][number]) => stat.value.trim() !== "")
      .slice(0, 6);
    if (values.length)
      return {
        title: regular.displayName || "Latest published regular season",
        values,
      };
  }
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
    categories.find((c) => /averages/i.test(c.name || c.displayName || "")) ||
    categories.find((c) => /general|offense/i.test(c.name || "")) ||
    categories[0];
  const seasons = (category?.statistics || []).filter((row) =>
    Array.isArray(row.stats),
  );
  const teamSeasons = seasons.filter(
    (row) => rosterTeamId && String(row.teamId || "") === rosterTeamId,
  );
  const seasonRow = [...(teamSeasons.length ? teamSeasons : seasons)].sort(
    (a, b) => Number(b.season?.year || 0) - Number(a.season?.year || 0),
  )[0];

  let values: PlayerStats["values"] = [];
  const summaryStatistics =
    summary?.statistics ||
    data.athlete?.statistics ||
    (Array.isArray(data.statistics) ? data.statistics : undefined) ||
    overview?.statistics;
  if (summaryStatistics?.length) {
    values = summaryStatistics
      .filter(
        (s) =>
          (s.abbreviation || s.name) &&
          s.displayValue !== undefined &&
          String(s.displayValue).trim() !== "",
      )
      .slice(0, 6)
      .map((s) => ({
        label: String(s.abbreviation || s.name),
        value: String(s.displayValue),
        description: String(
          s.displayName || s.description || s.abbreviation || s.name,
        ),
      }));
  } else if (seasonRow) {
    // ESPN common-v3 stores a row per season/team; its `totals` field can
    // aggregate across seasons, so read the chosen season row's `stats`.
    const rowStats = seasonRow.stats || [];
    values = (category.labels || [])
      .map((label: string, index: number) => ({
        label: String(label),
        value: String(rowStats[index] ?? ""),
        description: String(
          category.displayNames?.[index] ||
            category.descriptions?.[index] ||
            data.glossary?.find((g) => g.abbreviation === label)?.displayName ||
            label,
        ),
      }))
      .filter((s: { value: string }) => s.value.trim() !== "")
      .slice(0, 6);
  } else if (category?.totals?.length) {
    const totals = category.totals;
    values = (category.labels || [])
      .map((label: string, index: number) => ({
        label: String(label),
        value: String(totals[index] ?? ""),
        description: String(
          data.glossary?.find((g) => g.abbreviation === label)?.displayName ||
            label,
        ),
      }))
      .filter((s: { value: string }) => s.value.trim() !== "")
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
