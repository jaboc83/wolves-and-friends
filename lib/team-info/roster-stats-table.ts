// Joins player summaries to roster rows and derives the displayed stat columns.
import type { PlayerStats } from "./player-stats";

const basketballStatColumns = ["PTS", "REB", "AST", "STK", "FG%", "3P%"];

const vikingsOffensiveLinePositions = [
  "offensive line",
  "offensive lineman",
  "ol",
  "offensive tackle",
  "left tackle",
  "right tackle",
  "tackle",
  "ot",
  "lt",
  "rt",
  "left guard",
  "right guard",
  "offensive guard",
  "guard",
  "lg",
  "rg",
  "og",
  "center",
  "centre",
  "c",
  "long snapper",
  "ls",
];

const vikingsNflPositionColumns: {
  positions: string[];
  columns: string[];
}[] = [
  {
    positions: ["wide receiver", "wr", "tight end", "te"],
    columns: ["REC", "TGTS", "YDS", "AVG", "TD", "LNG"],
  },
  {
    positions: [
      "outside linebacker",
      "olb",
      "inside linebacker",
      "ilb",
      "cornerback",
      "cb",
      "safety",
      "free safety",
      "strong safety",
      "fs",
      "ss",
    ],
    columns: ["TOT", "SOLO", "AST", "SACK", "FF", "FR"],
  },
  { positions: vikingsOffensiveLinePositions, columns: [] },
];

const positionParts = (position: string) =>
  position
    .split("/")
    .map((part) =>
      part
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/s$/, (suffix) => (part.trim().length > 3 ? "" : suffix)),
    );

function hasPosition(position: string, names: string[]) {
  return positionParts(position).some((part) => names.includes(part));
}

function rosterStatColumnPreference(
  teamId: string,
  league: string,
  position: string,
): string[] | undefined {
  if (teamId !== "vikings" || league !== "football/nfl") return;
  return vikingsNflPositionColumns.find(({ positions }) =>
    hasPosition(position, positions),
  )?.columns;
}

export function visibleRosterStatColumns(
  teamId: string,
  league: string,
  position: string,
  availableColumns: string[],
) {
  const preference = rosterStatColumnPreference(teamId, league, position);
  return {
    columns: preference
      ? preference.filter((column) => availableColumns.includes(column))
      : availableColumns,
    positionOnly: preference?.length === 0,
  };
}

export function combineVikingsRunningBackGroups<T>(
  groups: { position: string; players: T[] }[],
  teamId: string,
  league: string,
) {
  if (teamId !== "vikings" || league !== "football/nfl") return groups;
  const runningBackIndex = groups.findIndex((group) =>
    hasPosition(group.position, ["running back", "rb"]),
  );
  const fullbackIndex = groups.findIndex((group) =>
    hasPosition(group.position, ["fullback", "fb"]),
  );
  if (
    runningBackIndex < 0 ||
    fullbackIndex < 0 ||
    runningBackIndex === fullbackIndex
  ) {
    return groups;
  }
  const runningBack = groups[runningBackIndex];
  const fullback = groups[fullbackIndex];
  return groups.flatMap((group, index) =>
    index === runningBackIndex
      ? [
          {
            position: `${runningBack.position} / ${fullback.position}`,
            players: [...runningBack.players, ...fullback.players],
          },
        ]
      : index === fullbackIndex
        ? []
        : [group],
  );
}

export function combineVikingsOffensiveLineGroups<T>(
  groups: { position: string; players: T[] }[],
  teamId: string,
  league: string,
) {
  if (teamId !== "vikings" || league !== "football/nfl") return groups;
  const offensiveLineIndexes = groups.flatMap((group, index) =>
    hasPosition(group.position, vikingsOffensiveLinePositions) ? [index] : [],
  );
  if (!offensiveLineIndexes.length) return groups;
  const firstIndex = offensiveLineIndexes[0];
  const players = offensiveLineIndexes.flatMap(
    (index) => groups[index].players,
  );
  const indexSet = new Set(offensiveLineIndexes);
  return groups.flatMap((group, index) =>
    index === firstIndex
      ? [{ position: "Offensive Line", players }]
      : indexSet.has(index)
        ? []
        : [group],
  );
}

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
