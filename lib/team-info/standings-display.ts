import type { Table } from "./types";

export type PlayoffStandingsLeague = "football/nfl" | "hockey/nhl";

export function clincherFlags(
  value: string,
  league: string,
): { playoffsClinched: boolean; homeAdvantageClinched: boolean } {
  const code = value.trim().toLowerCase();
  const isNfl = league === "football/nfl";
  const isNhl = league === "hockey/nhl";
  const clinchedCodes = isNfl
    ? ["*", "y", "z"]
    : isNhl
      ? ["*", "x", "y", "z"]
      : [];
  return {
    playoffsClinched: (isNfl || isNhl) && clinchedCodes.includes(code),
    homeAdvantageClinched: (isNfl || isNhl) && code === "*",
  };
}

export function markPlayoffPositions(
  conferenceTables: Table[],
  divisionTables: Table[],
  league: PlayoffStandingsLeague,
): { conferenceTables: Table[]; divisionTables: Table[] } {
  const conferenceIndex = conferenceTables.findIndex(
    (table) =>
      /conference/i.test(table.name) &&
      table.rows.some((row) => row.highlight),
  );
  if (conferenceIndex < 0) return { conferenceTables, divisionTables };

  const conference = conferenceTables[conferenceIndex];
  const divisionPlaces = league === "football/nfl" ? 1 : 3;
  const wildcardPlaces = league === "football/nfl" ? 3 : 2;
  const positions = new Map<string, "division" | "wildcard">();
  for (const division of divisionTables.filter(
    (table) => !/conference|wild.?card/i.test(table.name),
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

export function withDivisionRanks(
  table: Table,
  divisionName?: string,
): Table {
  if (!divisionName || table.name !== divisionName) return table;
  return {
    ...table,
    rows: table.rows.map((row, index) => ({
      ...row,
      cells: [String(index + 1), ...row.cells.slice(1)],
    })),
  };
}

export function visibleTeamStandings(tables: Table[]): Table[] {
  return tables.filter(
    (table) =>
      !/conference/i.test(table.name) ||
      table.rows.some((row) => row.highlight),
  );
}
