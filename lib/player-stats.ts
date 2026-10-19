export type PlayerStats = {
  title: string;
  values: { label: string; value: string; description: string }[];
};
export function parsePlayerStats(data: any): PlayerStats | undefined {
  const summary = data.athlete?.statsSummary;
  if (
    !summary?.displayName ||
    /career|projected/i.test(summary.displayName) ||
    !/20\d\d/.test(summary.displayName)
  )
    return;
  const values = (summary.statistics || [])
    .filter(
      (s: any) =>
        s.abbreviation &&
        s.displayValue !== undefined &&
        String(s.displayValue).trim() !== "",
    )
    .slice(0, 6)
    .map((s: any) => ({
      label: String(s.abbreviation),
      value: String(s.displayValue),
      description: String(s.displayName || s.description || s.abbreviation),
    }));
  return values.length
    ? { title: String(summary.displayName), values }
    : undefined;
}
