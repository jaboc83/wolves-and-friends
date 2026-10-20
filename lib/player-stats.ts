export type PlayerStats = {
  title: string;
  values: { label: string; value: string; description: string }[];
};

export function parsePlayerStats(
  data: any,
  rosterTeamId = "",
): PlayerStats | undefined {
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
