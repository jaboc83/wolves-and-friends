import type { Table, TeamInfo } from "./team-info";
function identity(table: Table) {
  return [table.source, table.url, table.name, table.seasonType || ""].join(
    ":",
  );
}
function failed(table: Table, unavailable: string[]) {
  const competition = /EuroLeague|LKL|MPO|FPO/i.exec(table.name)?.[0];
  return (
    unavailable.includes("standings") ||
    Boolean(
      competition &&
      unavailable.some(
        (failure) =>
          failure.toLowerCase().includes(competition.toLowerCase()) &&
          failure.includes("standings"),
      ),
    )
  );
}
export function mergeTeamInfo(next: TeamInfo, previous?: TeamInfo): TeamInfo {
  const tables = next.tables.map((table) => ({ ...table, stale: false }));
  for (const table of previous?.tables || []) {
    if (
      failed(table, next.unavailable) &&
      !tables.some((fresh) => identity(fresh) === identity(table))
    )
      tables.push({ ...table, stale: true });
  }
  return {
    ...next,
    tables,
    depth: next.depth || previous?.depth,
    season: next.season || previous?.season,
    powerRanking: next.powerRanking || previous?.powerRanking,
  };
}
