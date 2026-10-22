export type PlayerStats = {
  title: string;
  values: { label: string; value: string; description: string }[];
};

type Stat = {
  name?: string;
  abbreviation?: string;
  displayValue?: string | number;
  displayName?: string;
  description?: string;
  value?: number;
};

const numberValue = (value: unknown) => {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const rounded = (value: number) =>
  (Math.round((value + Number.EPSILON) * 10) / 10).toFixed(1);

const statValue = (stat: Stat | undefined) =>
  stat?.displayValue !== undefined ? String(stat.displayValue) : "";

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
  const goalie = /goalie|goalkeeper|goaltender/i.test(position) ||
    (hockey && /^G$/i.test(position));

  const make = (label: string, description: string, stat?: Stat) => ({
    label,
    value: statValue(stat),
    description,
  });

  if (basketball) {
    const points = statByName(stats, ["avgPoints", "points"]) || statByLabel(stats, ["PTS"]);
    const rebounds = statByName(stats, ["avgRebounds", "rebounds"]) || statByLabel(stats, ["REB"]);
    const assists = statByName(stats, ["avgAssists", "assists"]) || statByLabel(stats, ["AST"]);
    const blocks = statByName(stats, ["avgBlocks", "blocks"]) || statByLabel(stats, ["BLK"]);
    const steals = statByName(stats, ["avgSteals", "steals"]) || statByLabel(stats, ["STL"]);
    const fg = statByName(stats, ["fieldGoalPct"]) || statByLabel(stats, ["FG%"]);
    const three = statByName(stats, ["threePointFieldGoalPct"]) || statByLabel(stats, ["3P%"]);
    const stockValue = [blocks, steals].map(statValue).map(numberValue);
    const stockSum = stockValue.every((value): value is number => value !== undefined)
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
        make("W", "Wins", statByName(stats, ["wins"]) || statByLabel(stats, ["WINS", "W"])),
        make("L", "Losses", statByName(stats, ["losses"]) || statByLabel(stats, ["L"])),
        make("OTL", "Overtime Losses", statByName(stats, ["overtimeLosses", "otLosses"]) || statByLabel(stats, ["OTL"])),
        make("GAA", "Goals Against Average", statByName(stats, ["avgGoalsAgainst"]) || statByLabel(stats, ["GAA"])),
        make("SV%", "Save Percentage", statByName(stats, ["savePct"]) || statByLabel(stats, ["SV%"])),
        make("SO", "Shutouts", statByName(stats, ["shutouts"]) || statByLabel(stats, ["SO"])),
      ].filter((stat) => stat.value.trim() !== "");
    }
    return [
      make("G", "Goals", statByName(stats, ["goals"]) || statByLabel(stats, ["G"])),
      make("A", "Assists", statByName(stats, ["assists"]) || statByLabel(stats, ["A"])),
      make("PTS", "Points", statByName(stats, ["points"]) || statByLabel(stats, ["PTS"])),
      make("+/-", "Plus/Minus", statByName(stats, ["plusMinus"]) || statByLabel(stats, ["+/-"])),
    ].filter((stat) => stat.value.trim() !== "");
  }

  if (soccer) {
    if (goalie) {
      return [
        make("SV", "Saves", statByName(stats, ["saves"]) || statByLabel(stats, ["SV"])),
        make("CS", "Clean Sheets", statByName(stats, ["cleanSheet", "cleanSheets"]) || statByLabel(stats, ["CS"])),
        make("GA", "Goals Against", statByName(stats, ["goalsAgainst", "totalGoalsAgainst"]) || statByLabel(stats, ["GA"])),
      ].filter((stat) => stat.value.trim() !== "");
    }
    return [
      make("G", "Goals", statByName(stats, ["totalGoals", "goals"]) || statByLabel(stats, ["G"])),
      make("A", "Assists", statByName(stats, ["assists"]) || statByLabel(stats, ["A"])),
      make("SH", "Shots", statByName(stats, ["shots", "totalShots"]) || statByLabel(stats, ["SH"])),
      make("SOG", "Shots on Goal", statByName(stats, ["shotsOnGoal", "shotsOnTarget"]) || statByLabel(stats, ["SOG"])),
      make("FS", "Fouls Suffered", statByName(stats, ["foulsSuffered"]) || statByLabel(stats, ["FS", "FA"])),
    ].filter((stat) => stat.value.trim() !== "");
  }

  return [];
}

export function parsePlayerStats(
  data: any,
  rosterTeamId = "",
  league = "",
  position = "",
): PlayerStats | undefined {
  const commonCategories = Array.isArray(data.categories) ? data.categories : [];
  const commonCategory = commonCategories.find((category: any) =>
    (Array.isArray(category.statistics) && category.statistics.length) ||
    (Array.isArray(category.stats) && category.stats.length),
  );
  if (commonCategory) {
    const rows = (commonCategory.statistics || commonCategory.stats) as any[];
    const row = [...rows]
      .filter((candidate) => !rosterTeamId || String(candidate.teamId || "") === rosterTeamId)
      .sort((a, b) => Number(b.season?.year || 0) - Number(a.season?.year || 0))[0];
    if (row) {
      const raw = (commonCategory.labels || []).map((label: string, index: number) => ({
        name: commonCategory.names?.[index] || label,
        abbreviation: label,
        displayValue: row.stats?.[index],
        displayName: commonCategory.displayNames?.[index] || label,
      }));
      let values = league
        ? selectedValues(raw, league, position)
        : raw.slice(0, 6).map((stat: Stat) => ({
            label: String(stat.abbreviation),
            value: statValue(stat),
            description: String(stat.displayName || stat.abbreviation),
          }));
      if (!values.length && (league === "football/nfl" || league === "baseball/mlb")) {
        const removeGames = league === "football/nfl" || commonCategory.name !== "pitching";
        values = raw
          .filter((stat: Stat) => !removeGames || !["GP", "GAMES", "gamesPlayed"].includes(String(stat.abbreviation || stat.name)))
          .slice(0, 6)
          .map((stat: Stat) => ({
            label: String(stat.abbreviation || stat.name),
            value: statValue(stat),
            description: String(stat.displayName || stat.abbreviation || stat.name),
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
  const coreCategories = data.splits?.categories || [];
  const coreStats = coreCategories.flatMap(
    (c: any) => c.stats || [],
  );
  if (coreStats.length && !/career|projected/i.test(data.season?.displayName || "")) {
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
      "avgPoints", "avgRebounds", "avgAssists", "fieldGoalPct",
      "threePointFieldGoalPct", "gamesPlayed",
    ];
    const selectedFallback = coreStats.some((s: any) => s.name === "avgPoints")
      ? preferred.flatMap((name) => coreStats.filter((s: any) => s.name === name))
      : coreStats
        .filter((s: any) => !/rank|rating|projected/i.test(s.name || ""))
        .filter((s: any) => {
          const removeGames = league === "football/nfl" ||
            (league === "baseball/mlb" && !coreCategories.some((category: any) =>
              category.name === "pitching" && category.stats?.includes(s),
            ));
          return !(removeGames && s.abbreviation === "GP");
        });
    const values = selectedFallback
      .filter((s: any) => s.abbreviation && s.displayValue !== undefined && String(s.displayValue).trim())
      .slice(0, 6)
      .map((s: any) => ({
        label: String(s.abbreviation),
        value: String(s.displayValue),
        description: String(s.displayName || s.description || s.abbreviation),
      }));
    if (values.length) return {
      title: (data.season?.displayName || "Season") + " · Regular season",
      values,
    };
  }
  // The overview API has parallel labels and split values, including a
  // Career row. Read only the explicitly named regular-season row.
  const overview = data.statistics;
  const regular = Array.isArray(overview?.splits)
    ? overview.splits.find((s: any) => /^regular season$/i.test(s.displayName || ""))
    : undefined;
  if (regular && Array.isArray(overview.labels) && Array.isArray(regular.stats)) {
    const values = overview.labels.map((label: string, i: number) => ({
      label: String(label),
      value: String(regular.stats[i] ?? ""),
      description: String(overview.displayNames?.[i] || label),
    })).filter((s: { value: string }) => s.value.trim() !== "").slice(0, 6);
    if (values.length) return {
      title: "Latest published regular season",
      values,
    };
  }
  const summary =
    data.athlete?.statsSummary ||
    data.statsSummary ||
    data.athlete?.statisticsSummary ||
    data.statisticsSummary;
  const categories =
    data.categories ||
    data.statistics?.categories ||
    data.statistics?.splits?.categories ||
    data.splits?.categories ||
    [];
  const category =
    categories.find((c: any) =>
      /averages/i.test(c.name || c.displayName || ""),
    ) ||
    categories.find((c: any) => /general|offense/i.test(c.name || "")) ||
    categories[0];
  const seasons = (category?.statistics || []).filter((row: any) =>
    Array.isArray(row.stats),
  );
  const teamSeasons = seasons.filter(
    (row: any) => rosterTeamId && String(row.teamId || "") === rosterTeamId,
  );
  const seasonRow = [...(teamSeasons.length ? teamSeasons : seasons)].sort(
    (a: any, b: any) =>
      Number(b.season?.year || 0) - Number(a.season?.year || 0),
  )[0];

  let values: PlayerStats["values"] = [];
  const summaryStatistics =
    summary?.statistics ||
    data.athlete?.statistics ||
    (Array.isArray(data.statistics) ? data.statistics : undefined) ||
    data.statistics?.statistics;
  if (summaryStatistics?.length) {
    values = summaryStatistics
      .filter(
        (s: any) =>
          (s.abbreviation || s.name) &&
          s.displayValue !== undefined &&
          String(s.displayValue).trim() !== "",
      )
      .slice(0, 6)
      .map((s: any) => ({
        label: String(s.abbreviation || s.name),
        value: String(s.displayValue),
        description: String(
          s.displayName || s.description || s.abbreviation || s.name,
        ),
      }));
  } else if (seasonRow) {
    // ESPN common-v3 stores a row per season/team; its `totals` field can
    // aggregate across seasons, so read the chosen season row's `stats`.
    values = (category.labels || [])
      .map((label: string, index: number) => ({
        label: String(label),
        value: String(seasonRow.stats[index] ?? ""),
        description: String(
          category.displayNames?.[index] ||
            category.descriptions?.[index] ||
            data.glossary?.find((g: any) => g.abbreviation === label)
              ?.displayName ||
            label,
        ),
      }))
      .filter((s: { value: string }) => s.value.trim() !== "")
      .slice(0, 6);
  } else if (category?.totals?.length) {
    values = (category.labels || [])
      .map((label: string, index: number) => ({
        label: String(label),
        value: String(category.totals[index] ?? ""),
        description: String(
          data.glossary?.find((g: any) => g.abbreviation === label)
            ?.displayName || label,
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
    data.statistics?.displayName ||
    data.displayName ||
    (data.season?.year
      ? String(data.season.year) + " season stats"
      : "Season stats");
  if (/career|projected/i.test(seasonLabel)) return;
  return values.length ? { title: String(seasonLabel), values } : undefined;
}
