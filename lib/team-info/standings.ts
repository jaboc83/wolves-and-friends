import type { Table } from "./index";
import { teamProfile } from "../teams/teams";

// Sorts standings and adds competition-specific postseason qualification markers.
// Qualification lines use the table's rank scope, never a guessed division cutoff.
// Per-team rules live in `standingsRules` in lib/teams/<id>/profile.ts.
export function tableSeasonType(table: Table, id = "") {
  return /preseason|pre-season|spring training/i.test(table.note || "")
    ? 1
    : /postseason|post-season|playoffs/i.test(table.note || "")
      ? 3
      : teamProfile(id)?.standingsRules?.preseasonTableIsRegularSeason &&
          table.seasonType === 1
        ? 2
        : (table.seasonType ??
          (/regular.?season/i.test(table.note || "") ? 2 : undefined));
}
export function decorateTable(table: Table, id: string): Table {
  const rows = [...table.rows].sort(
    (a, b) => Number(a.cells[0]) - Number(b.cells[0]),
  );
  // Legacy cached tables carry a note instead of structured season metadata.
  // Never apply qualification boundaries to preseason or postseason standings.
  if (tableSeasonType(table, id) !== 2)
    return { ...table, rows, cuts: [], qualification: "" };
  const rules = teamProfile(id)?.standingsRules;
  const cuts = (rules?.cuts || [])
    .filter(
      (cut) =>
        !cut.tableNameIncludes || table.name.includes(cut.tableNameIncludes),
    )
    .map(({ after, label }) => ({ after, label }));
  return { ...table, rows, cuts, qualification: rules?.qualification || "" };
}
