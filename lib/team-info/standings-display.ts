import type { Table } from "./types";

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
