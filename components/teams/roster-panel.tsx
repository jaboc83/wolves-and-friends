// Sortable roster table with per-player stats, loaded when the panel is opened.
"use client";
import {
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";
import type { TeamInfo } from "../../lib/team-info";
import { teamProfile } from "../../lib/teams/teams";
import type { PlayerStats } from "../../lib/team-info/player-stats";
import type { StatsStatus } from "../../lib/team-info/roster-stats-loader";
import {
  createRosterStatsTable,
  rosterStatValue,
  type RosterStatRow,
} from "../../lib/team-info/roster-stats-table";

type Depth = NonNullable<TeamInfo["depth"]>;
type RosterPlayer = Depth["groups"][number]["players"][number] & {
  position: string;
};
type RosterSort = { column: string; direction: "asc" | "desc" };
type Row = RosterStatRow<RosterPlayer>;

const defaultSortDirection = (column: string): "asc" | "desc" =>
  column === "Player" || column === "Position" ? "asc" : "desc";

const abbreviation = (position: string) => {
  const value = position.toLowerCase();
  if (/goalkeeper|goaltender|\bgk\b/.test(value)) return "GK";
  if (/defen[cs]e|back|\bdef\b|\bdb\b/.test(value)) return "D";
  if (/forward|wing|\bf\b/.test(value)) return "F";
  if (/center|centre|\bc\b/.test(value)) return "C";
  if (/guard|\bg\b/.test(value)) return "G";
  return position.slice(0, 4).toUpperCase();
};

function sortValue(row: Row, column: string) {
  if (column === "Player") return row.player.name;
  if (column === "Position") return row.player.position;
  return rosterStatValue(row.summary, column);
}

function compareRows(a: Row, b: Row, sort: RosterSort) {
  const av = sortValue(a, sort.column);
  const bv = sortValue(b, sort.column);
  const an = Number(av.replace(/[%,$,]/g, ""));
  const bn = Number(bv.replace(/[%,$,]/g, ""));
  const result =
    Number.isFinite(an) && Number.isFinite(bn) ? an - bn : av.localeCompare(bv);
  return sort.direction === "asc" ? result : -result;
}

function PlayerMeta({ player }: { player: RosterPlayer }) {
  const { campTeam, signedForSeason, draftPick } = player;
  if (!campTeam && !signedForSeason && !draftPick) return null;
  return (
    <span className="roster-table-player-meta">
      {[
        campTeam,
        signedForSeason && "Signed for 2026–27",
        draftPick && "2026 draft pick",
      ]
        .filter(Boolean)
        .join(" · ")}
    </span>
  );
}

const statusNotes: Partial<Record<StatsStatus, string>> = {
  idle: "Season stats will load shortly.",
  loading: "Loading ESPN season stats…",
  partial: "Some season stats could not refresh and will be retried.",
  empty: "Season stats could not be loaded for these players right now.",
  unavailable: "ESPN season stats are temporarily unavailable.",
};

export default function RosterPanel({
  teamId,
  league,
  depth,
  heading,
  noun,
  fallbackUrl,
  playerStats,
  playerStatsStatus,
  onRosterOpen,
}: {
  teamId: string;
  league?: string;
  depth?: Depth;
  heading: string;
  noun: string;
  fallbackUrl: string;
  playerStats: Record<string, PlayerStats>;
  playerStatsStatus: StatsStatus;
  onRosterOpen: (priorityKeys?: string[]) => void;
}) {
  const rosterNote = teamProfile(teamId)?.rosterNote;
  const priorityKeys = useMemo(
    () =>
      depth?.groups.flatMap((group) =>
        group.players
          .map((player: { url: string }) => {
            const playerId = player.url.match(/\/_\/id\/(\d+)/)?.[1];
            return playerId && league ? `${league}:${playerId}` : "";
          })
          .filter(Boolean),
      ) || [],
    [depth, league],
  );
  const keyList = priorityKeys.join("|");
  const preload = useEffectEvent(() => onRosterOpen(priorityKeys));
  // Preload as soon as the team's roster is known, not when the panel opens.
  useEffect(() => {
    if (keyList) preload();
  }, [keyList]);

  const [sortOverride, setSortOverride] = useState<RosterSort | null>(null);
  const [sortTeam, setSortTeam] = useState(teamId);
  if (sortTeam !== teamId) {
    setSortTeam(teamId);
    setSortOverride(null);
  }

  const groups = useMemo(() => {
    if (!depth) return [];
    const buckets = new Map<
      string,
      { position: string; players: RosterPlayer[] }
    >();
    for (const group of depth.groups) {
      const key = createRosterStatsTable(
        group.players,
        league || "",
        playerStats,
      ).columns.join("\u0001");
      const existing = buckets.get(key) || { position: "", players: [] };
      existing.position = existing.position
        ? existing.position + " / " + group.position
        : group.position;
      existing.players.push(
        ...group.players.map((player) => ({
          ...player,
          position: abbreviation(group.position),
        })),
      );
      buckets.set(key, existing);
    }
    return [...buckets.values()];
  }, [depth, playerStats, league]);

  const note = league ? statusNotes[playerStatsStatus] : undefined;

  return (
    <details
      id="team-roster"
      className="data-panel"
      onToggle={(event) => {
        if (event.currentTarget.open) onRosterOpen(priorityKeys);
      }}
    >
      <summary>{heading}</summary>
      {depth ? (
        <>
          {note && (
            <p
              className="panel-note"
              aria-live={playerStatsStatus === "idle" ? undefined : "polite"}
            >
              {note}
            </p>
          )}
          {groups.map((group, i) => {
            const statsTable = createRosterStatsTable(
              group.players,
              league || "",
              playerStats,
            );
            const seasonTitles = Array.from(
              new Set(
                statsTable.rows
                  .map(({ summary }) => summary?.title)
                  .filter((title): title is string => Boolean(title)),
              ),
            );
            const defaultColumn = statsTable.columns[0] ?? "Player";
            const sort: RosterSort = sortOverride ?? {
              column: defaultColumn,
              direction: defaultSortDirection(defaultColumn),
            };
            const toggleSort = (column: string) =>
              setSortOverride({
                column,
                direction:
                  sort.column === column
                    ? sort.direction === "asc"
                      ? "desc"
                      : "asc"
                    : defaultSortDirection(column),
              });
            const header = (
              column: string,
              label: string,
              className?: string,
            ) => (
              <th
                scope="col"
                key={column}
                title={
                  column === "Position"
                    ? "Position"
                    : statsTable.rows
                        .flatMap(({ summary }) => summary?.values ?? [])
                        .find((stat) => stat.label === column)?.description
                }
                className={
                  [className, sort.column === column && "sorted-column"]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
                onClick={() => toggleSort(column)}
                onKeyDown={(event: KeyboardEvent<HTMLTableCellElement>) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggleSort(column);
                  }
                }}
                aria-sort={
                  sort.column === column
                    ? sort.direction === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
                tabIndex={0}
              >
                {label}{" "}
                {sort.column === column
                  ? sort.direction === "asc"
                    ? "↑"
                    : "↓"
                  : ""}
              </th>
            );
            const sortedClass = (column: string) =>
              sort.column === column ? "sorted-column" : undefined;
            return (
              <section className="depth-row" key={group.position + i}>
                <h3 className="visually-hidden">{group.position}</h3>
                {statsTable.columns.length > 0 ? (
                  <div
                    className="roster-stats-table-scroll"
                    role="region"
                    aria-label={`${group.position} player season stats`}
                    tabIndex={0}
                  >
                    <table className="roster-stats-table">
                      <caption>
                        {group.position} season stats
                        {seasonTitles.length > 0 &&
                          ` · ${seasonTitles.join(" / ")}`}
                      </caption>
                      <thead>
                        <tr>
                          {header("Player", "Player", "roster-player-header")}
                          {header("Position", "Pos.")}
                          {statsTable.columns.map((column) =>
                            header(column, column),
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {[...statsTable.rows]
                          .sort((a, b) => compareRows(a, b, sort))
                          .map(({ player: p, summary }) => (
                            <tr key={p.url + p.name}>
                              <th scope="row" className={sortedClass("Player")}>
                                <a
                                  href={p.url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {p.name} ↗
                                </a>
                                <span className="roster-player-age">
                                  {p.age !== undefined ? `Age ${p.age}` : ""}
                                </span>
                                <PlayerMeta player={p} />
                              </th>
                              <td className={sortedClass("Position")}>
                                {p.position || "—"}
                              </td>
                              {statsTable.columns.map((column) => (
                                <td
                                  key={column}
                                  title={
                                    summary?.values.find(
                                      (value) => value.label === column,
                                    )?.description
                                  }
                                  className={sortedClass(column)}
                                >
                                  {rosterStatValue(summary, column)}
                                </td>
                              ))}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <ol className="roster-player-list">
                    {[...group.players]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((p) => (
                        <li key={p.url + p.name}>
                          <a href={p.url} target="_blank" rel="noreferrer">
                            {p.name} ↗
                          </a>
                          {p.age !== undefined && (
                            <span className="roster-player-age">
                              {" "}
                              · Age {p.age}
                            </span>
                          )}
                          <PlayerMeta player={p} />
                        </li>
                      ))}
                  </ol>
                )}
              </section>
            );
          })}
          <p className="panel-note">
            <a href={depth.url} target="_blank" rel="noreferrer">
              {depth.source} ↗
            </a>{" "}
            {rosterNote ? "· " + rosterNote : ""}
          </p>
        </>
      ) : (
        <p className="panel-note">
          A {noun.toLowerCase()} is not available from the current feed.{" "}
          <a href={fallbackUrl} target="_blank" rel="noreferrer">
            Open team {noun.toLowerCase()} ↗
          </a>
        </p>
      )}
    </details>
  );
}
