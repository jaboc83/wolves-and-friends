export type PlayerStats = {
  title: string;
  values: { label: string; value: string; description: string }[];
};
export function parsePlayerStats(data: any): PlayerStats | undefined {
  const summary = data.athlete?.statsSummary || data.statsSummary;
  const categories =
    data.categories ||
    data.statistics?.categories ||
    data.statistics?.splits?.categories ||
    data.splits?.categories ||
    [];
  const category =
    categories.find((c: any) => /general|offense/i.test(c.name || "")) ||
    categories[0];
  const stats = summary?.statistics || category?.statistics || [];
  const values = stats.length
    ? stats
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
        }))
    : (category?.labels || [])
        .map((label: string, index: number) => ({
          label: String(label),
          value: String(category.totals?.[index] ?? ""),
          description: String(
            data.glossary?.find((g: any) => g.abbreviation === label)
              ?.displayName || label,
          ),
        }))
        .filter((s: { value: string }) => s.value.trim() !== "")
        .slice(0, 6);
  const seasonLabel =
    summary?.displayName ||
    data.season?.displayName ||
    data.statistics?.displayName ||
    data.displayName ||
    (data.season?.year
      ? String(data.season.year) + " season stats"
      : "Season stats");
  if (/career|projected/i.test(seasonLabel)) return;
  return values.length ? { title: String(seasonLabel), values } : undefined;
}
