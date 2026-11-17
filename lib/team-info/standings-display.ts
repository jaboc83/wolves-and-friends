import type { Table } from "./types";

export type PlayoffStandingsLeague =
  "football/nfl" | "hockey/nhl" | "baseball/mlb";

export function isConferenceOrLeagueTable(table: Table): boolean {
  return /conference|^(?:American|National) League$/i.test(table.name);
}

export function clincherFlags(
  value: string,
  league: string,
): { playoffsClinched: boolean; homeAdvantageClinched: boolean } {
  const code = value.trim().toLowerCase();
  if (league === "basketball/nba")
    return {
      playoffsClinched: ["x", "xp", "y", "z"].includes(code),
      homeAdvantageClinched: code === "z",
    };
  if (league === "basketball/wnba")
    return {
      playoffsClinched: ["*", "x", "cx"].includes(code),
      homeAdvantageClinched: code === "*",
    };
  const isNfl = league === "football/nfl";
  const isNhl = league === "hockey/nhl";
  const isMlb = league === "baseball/mlb";
  const clinchedCodes = isNfl
    ? ["*", "y", "z"]
    : isNhl
      ? ["*", "x", "y", "z"]
      : isMlb
        ? ["*", "x", "y"]
        : [];
  return {
    playoffsClinched: clinchedCodes.includes(code),
    homeAdvantageClinched: (isNfl || isNhl || isMlb) && code === "*",
  };
}

export function markPlayoffPositions(
  conferenceTables: Table[],
  divisionTables: Table[],
  league: PlayoffStandingsLeague,
): { conferenceTables: Table[]; divisionTables: Table[] } {
  const conferenceIndex = conferenceTables.findIndex(
    (table) =>
      isConferenceOrLeagueTable(table) &&
      table.rows.some((row) => row.highlight),
  );
  if (conferenceIndex < 0) return { conferenceTables, divisionTables };

  const conference = conferenceTables[conferenceIndex];
  if (conference.seasonType !== 2) return { conferenceTables, divisionTables };
  const divisionPlaces = league === "hockey/nhl" ? 3 : 1;
  const wildcardPlaces = league === "hockey/nhl" ? 2 : 3;
  const positions = new Map<string, "division" | "wildcard">();
  for (const division of divisionTables.filter(
    (table) =>
      !isConferenceOrLeagueTable(table) && !/wild.?card/i.test(table.name),
  )) {
    for (const row of division.rows.slice(0, divisionPlaces)) {
      positions.set(row.id, "division");
    }
  }
  for (const row of conference.rows
    .filter((row) => !positions.has(row.id))
    .slice(0, wildcardPlaces)) {
    positions.set(row.id, "wildcard");
  }

  const addPositions = (table: Table): Table => ({
    ...table,
    rows: table.rows.map((row) => {
      const playoffPosition = positions.get(row.id);
      return playoffPosition ? { ...row, playoffPosition } : row;
    }),
  });

  return {
    conferenceTables: conferenceTables.map((table, index) =>
      index === conferenceIndex ? addPositions(table) : table,
    ),
    divisionTables: divisionTables.map(addPositions),
  };
}

export function withDivisionRanks(table: Table, divisionName?: string): Table {
  if (!divisionName || table.name !== divisionName) return table;
  return {
    ...table,
    rows: [...table.rows]
      .sort((a, b) => Number(a.cells[0]) - Number(b.cells[0]))
      .map((row, index) => ({
        ...row,
        cells: [String(index + 1), ...row.cells.slice(1)],
      })),
  };
}

export function visibleTeamStandings(tables: Table[]): Table[] {
  return tables.filter(
    (table) =>
      !isConferenceOrLeagueTable(table) ||
      table.rows.some((row) => row.highlight),
  );
}
