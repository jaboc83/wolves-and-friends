// Joins player summaries to roster rows and derives the displayed stat columns.
import type { PlayerStats } from "./player-stats";

const basketballStatColumns = ["PTS", "REB", "AST", "STK", "FG%", "3P%"];

export type RosterStatRow<T> = {
  player: T;
  summary?: PlayerStats;
};

export function createRosterStatsTable<T extends { url: string }>(
  players: T[],
  league: string,
  playerStats: Record<string, PlayerStats>,
): { columns: string[]; rows: RosterStatRow<T>[] } {
  const rows = players.map((player) => {
    const id = player.url.match(/\/_\/id\/(\d+)/)?.[1] || "";
    return {
      player,
      summary: id ? playerStats[`${league}:${id}`] : undefined,
    };
  });
  const availableColumns = Array.from(
    new Set(
      rows.flatMap(
        ({ summary }) => summary?.values.map(({ label }) => label) || [],
      ),
    ),
  );
  const columns = league.startsWith("basketball/")
    ? basketballStatColumns.some((column) => availableColumns.includes(column))
      ? basketballStatColumns
      : []
    : availableColumns;
  return { columns, rows };
}

export function rosterStatValue(
  summary: PlayerStats | undefined,
  label: string,
) {
  return summary?.values.find((stat) => stat.label === label)?.value || "—";
}
