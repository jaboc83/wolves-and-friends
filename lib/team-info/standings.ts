import type { Table } from "./index";
import { teamProfile } from "../teams/teams.ts";
import { isConferenceOrLeagueTable } from "./standings-display.ts";

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
  const team = teamProfile(id);
  const seasonType = tableSeasonType(table, id);
  let rows = [...table.rows].sort(
    (a, b) => Number(a.cells[0]) - Number(b.cells[0]),
  );
  if (team?.league === "basketball/nba") {
    const regularConference =
      seasonType === 2 && isConferenceOrLeagueTable(table);
    rows = rows.map((row) => {
      const rank = Number(row.cells[0]);
      const ranked = Number.isInteger(rank) && rank > 0;
      let playoffPosition: typeof row.playoffPosition;
      if (regularConference) {
        if (row.playoffsClinched || row.homeAdvantageClinched)
          playoffPosition = "playoff";
        else if (row.playInClinched) playoffPosition = "playin";
        else if (ranked && rank <= 6) playoffPosition = "playoff";
        else if (ranked && rank <= 10) playoffPosition = "playin";
      }
      return { ...row, playoffPosition };
    });
  }
  // Legacy cached tables carry a note instead of structured season metadata.
  // Never apply qualification boundaries to preseason or postseason standings.
  if (seasonType !== 2) return { ...table, rows, cuts: [], qualification: "" };
  const rules = team?.standingsRules;
  const cuts = (rules?.cuts || [])
    .filter(
      (cut) =>
        !cut.tableNameIncludes || table.name.includes(cut.tableNameIncludes),
    )
    .map(({ after, label }) => ({ after, label }));
  return {
    ...table,
    rows,
    cuts,
    qualification:
      rules?.qualification &&
      (!rules.qualificationTableNameIncludes ||
        table.name.includes(rules.qualificationTableNameIncludes))
        ? rules.qualification
        : "",
  };
}
