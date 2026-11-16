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

const vikingsReceiverPositions = ["wide receiver", "wr", "tight end", "te"];
const vikingsReceiverStatColumns = ["REC", "TGTS", "YDS", "AVG", "TD", "LNG"];
const vikingsDefensiveLinePositions = [
  "defensive line",
  "defensive lineman",
  "dl",
  "defensive end",
  "de",
  "defensive tackle",
  "dt",
];
const vikingsLinebackerAndDefensiveBackPositions = [
  "outside linebacker",
  "olb",
  "inside linebacker",
  "ilb",
  "linebacker",
  "lb",
  "cornerback",
  "cb",
  "safety",
  "free safety",
  "strong safety",
  "fs",
  "ss",
  "defensive back",
  "db",
];

const vikingsNflPositionColumns: {
  positions: string[];
  columns: string[];
}[] = [
  {
    positions: [...vikingsReceiverPositions, "receiver"],
    columns: vikingsReceiverStatColumns,
  },
  {
    positions: vikingsLinebackerAndDefensiveBackPositions,
    columns: ["TOT", "SOLO", "AST", "SACK", "FF", "FR"],
  },
  { positions: vikingsOffensiveLinePositions, columns: [] },
];

const positionParts = (position: string) =>
  position
    .split(/\s*\/\s*|\s+and\s+/i)
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

export function combineVikingsReceiverGroups<T>(
  groups: { position: string; players: T[] }[],
  teamId: string,
  league: string,
) {
  if (teamId !== "vikings" || league !== "football/nfl") return groups;
  const receiverIndexes = groups.flatMap((group, index) =>
    hasPosition(group.position, vikingsReceiverPositions) ? [index] : [],
  );
  if (!receiverIndexes.length) return groups;
  const firstIndex = receiverIndexes[0];
  const players = receiverIndexes.flatMap((index) => groups[index].players);
  const indexSet = new Set(receiverIndexes);
  return groups.flatMap((group, index) =>
    index === firstIndex
      ? [{ position: "Receivers", players }]
      : indexSet.has(index)
        ? []
        : [group],
  );
}

export function combineVikingsDefensiveLineGroups<T>(
  groups: { position: string; players: T[] }[],
  teamId: string,
  league: string,
) {
  if (teamId !== "vikings" || league !== "football/nfl") return groups;
  const defensiveLineIndexes = groups.flatMap((group, index) =>
    hasPosition(group.position, vikingsDefensiveLinePositions) ? [index] : [],
  );
  if (!defensiveLineIndexes.length) return groups;
  const firstIndex = defensiveLineIndexes[0];
  const players = defensiveLineIndexes.flatMap((index) => groups[index].players);
  const indexSet = new Set(defensiveLineIndexes);
  return groups.flatMap((group, index) =>
    index === firstIndex
      ? [{ position: "Defensive Line", players }]
      : indexSet.has(index)
        ? []
        : [group],
  );
}

export function combineVikingsLinebackerAndDefensiveBackGroups<T>(
  groups: { position: string; players: T[] }[],
  teamId: string,
  league: string,
) {
  if (teamId !== "vikings" || league !== "football/nfl") return groups;
  const indexes = groups.flatMap((group, index) =>
    hasPosition(group.position, vikingsLinebackerAndDefensiveBackPositions)
      ? [index]
      : [],
  );
  if (!indexes.length) return groups;
  const firstIndex = indexes[0];
  const players = indexes.flatMap((index) => groups[index].players);
  const indexSet = new Set(indexes);
  return groups.flatMap((group, index) =>
    index === firstIndex
      ? [{ position: "Linebackers and Defensive backs", players }]
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
