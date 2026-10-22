import type { PlayerStats } from "./player-stats";

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
  const columns = Array.from(
    new Set(
      rows.flatMap(
        ({ summary }) => summary?.values.map(({ label }) => label) || [],
      ),
    ),
  );
  return { columns, rows };
}

export function rosterStatValue(
  summary: PlayerStats | undefined,
  label: string,
) {
  return summary?.values.find((stat) => stat.label === label)?.value || "—";
}
