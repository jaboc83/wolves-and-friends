export type PlayerStats = {
  title: string;
  values: { label: string; value: string; description: string }[];
};

export function parsePlayerStats(
  data: any,
  rosterTeamId = "",
): PlayerStats | undefined {
  // The core API uses stat objects inside splits.categories (not the
  // season-row arrays returned by common-v3). Do not select career totals.
  const coreStats = (data.splits?.categories || []).flatMap(
    (c: any) => c.stats || [],
  );
  if (coreStats.length && !/career|projected/i.test(data.season?.displayName || "")) {
    const preferred = [
      "avgPoints", "avgRebounds", "avgAssists", "fieldGoalPct",
      "threePointFieldGoalPct", "gamesPlayed",
    ];
    const selected = coreStats.some((s: any) => s.name === "avgPoints")
      ? preferred.flatMap((name) => coreStats.filter((s: any) => s.name === name))
      : coreStats.filter((s: any) => !/rank|rating|projected/i.test(s.name || ""));
    const values = selected
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
