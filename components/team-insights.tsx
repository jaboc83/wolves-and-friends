"use client";
import { Fragment, useMemo, useState, type KeyboardEvent } from "react";
import { decorateTable } from "../lib/team-info/standings";
import { teams } from "../lib/teams/teams";
import { sportTerms } from "../lib/teams/sport-terms";
import type { TeamInfo } from "../lib/team-info";
import type { PlayerStats } from "../lib/team-info/player-stats";
import {
  createRosterStatsTable,
  rosterStatValue,
} from "../lib/team-info/roster-stats-table";
import { espnTeamLogoUrl } from "../lib/games/march-madness";
import BracketConnectors from "./bracket-connectors";
import Image from "next/image";
import { isTeamId, TEAM_IDS, type TeamId } from "../lib/teams/teams";
import type { DashboardPageId } from "../lib/dashboard/page-id";
import { useLocalTimeZone } from "../hooks/use-local-time-zone";
import { formatInTimeZone, timeZoneLabel } from "../lib/browser/local-time";
type RosterPlayer = NonNullable<
  TeamInfo["depth"]
>["groups"][number]["players"][number] & {
  position: string;
};
type RosterSort = { column: string; direction: "asc" | "desc" };
const defaultRosterSortDirection = (column: string): "asc" | "desc" =>
  column === "Player" || column === "Position" ? "asc" : "desc";
export default function TeamInsights({
  active,
  data,
  revealResults = true,
  autoOpenStandings = false,
  playerStats = {},
  playerStatsStatus = "loading",
  onRosterOpen = () => {},
}: {
  active: DashboardPageId;
  data: TeamInfo[];
  revealResults?: boolean;
  autoOpenStandings?: boolean;
  playerStats?: Record<string, PlayerStats>;
  playerStatsStatus?:
    "idle" | "loading" | "ready" | "partial" | "empty" | "unavailable";
  onRosterOpen?: (priorityKeys?: string[]) => void;
}) {
  const timeZone = useLocalTimeZone();
  const [selected, setSelected] = useState<TeamId>(TEAM_IDS.WOLVES);
  const id: TeamId = isTeamId(active) ? active : selected;
  const [standingsOverride, setStandingsOverride] = useState<{
    id: string;
    open: boolean;
  } | null>(null);
  const standingsOpen =
    standingsOverride?.id === id ? standingsOverride.open : autoOpenStandings;
  const [powerRankingsState, setPowerRankingsState] = useState<{
    id: string;
    open: boolean;
  } | null>(null);
  const powerRankingsOpen =
    powerRankingsState?.id === id && powerRankingsState.open;
  const terms = sportTerms(id);
  const headings = sportTerms(active);
  const t = teams.find((t) => t.id === id);
  const info = data.find((i) => i.id === id);
  const myPowerRanking = info?.powerRanking?.rows.find(
    (row) =>
      row.name === t?.name ||
      row.id === t?.espn ||
      Boolean(t?.espn && row.url.includes(`/${t.espn}`)),
  );
  const [rosterSortState, setRosterSortState] = useState<{
    id: string;
    value: RosterSort;
  } | null>(null);
  const rosterSort =
    rosterSortState?.id === id
      ? rosterSortState.value
      : { column: "Player", direction: "asc" as const };
  const rosterGroups = useMemo(() => {
    if (!info?.depth) return [];
    const buckets = new Map<
      string,
      { position: string; players: RosterPlayer[] }
    >();
    const abbreviation = (position: string) => {
      const value = position.toLowerCase();
      if (/goalkeeper|goaltender|\\bgk\\b/.test(value)) return "GK";
      if (/defen[cs]e|back|\\bdef\\b|\\bdb\\b/.test(value)) return "D";
      if (/forward|wing|\\bf\\b/.test(value)) return "F";
      if (/center|centre|\\bc\\b/.test(value)) return "C";
      if (/guard|\\bg\\b/.test(value)) return "G";
      return position.slice(0, 4).toUpperCase();
    };
    for (const group of info.depth.groups) {
      const columns = createRosterStatsTable(
        group.players,
        t?.league || "",
        playerStats,
      ).columns;
      const key = columns.join("\\u0001");
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
  }, [info, playerStats, t?.league]);

  const league = t?.league?.split("/")[1];
  const tableUrl = league
    ? "https://www.espn.com/" + league + "/standings"
    : id === "zalgiris"
      ? "https://www.euroleaguebasketball.net/euroleague/standings/"
      : id === "frost"
        ? "https://www.thepwhl.com/en/stats/standings"
        : "https://www.dgpt.com/full-standings/";
  const rosterUrl = league
    ? "https://www.espn.com/" + league + "/team/roster/_/name/" + t?.espn
    : id === "zalgiris"
      ? "https://zalgiris.lt/komandos"
      : id === "frost"
        ? "https://www.thepwhl.com/en/teams/minnesota-frost/news/2026/october/07/minnesota-frost-announce-2026-27-training-camp-roster"
        : "https://www.dgpt.com/";
  return (
    <section className="team-insights">
      {active === "all" && (
        <label className="insights-team">
          Team data{" "}
          <select
            value={selected}
            onChange={(e) => {
              if (isTeamId(e.target.value)) setSelected(e.target.value);
            }}
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.short}
              </option>
            ))}
          </select>
        </label>
      )}
      <details
        id="team-standings"
        className="data-panel"
        open={standingsOpen}
        onToggle={(event) =>
          setStandingsOverride({ id, open: event.currentTarget.open })
        }
      >
        <summary>{headings.standings}</summary>
        {info?.postseason && (
          <section className="postseason-panel" aria-label="Postseason bracket">
            <h3>Postseason bracket · {info.postseason.season}</h3>
            <p className="panel-note">
              Confirmed matchups only. Later rounds appear as announced.
              {info.postseason.partial &&
                " Some rounds could not be refreshed."}
            </p>
            <div
              className="bracket-rounds"
              tabIndex={0}
              role="region"
              aria-label="Postseason rounds"
            >
              {info.postseason.rounds.map((round) => (
                <section className="bracket-round" key={round.name}>
                  <h4>{round.name}</h4>
                  {round.matchups.map((match) => (
                    <a
                      className="bracket-match"
                      key={match.id}
                      href={match.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {match.teams.map((p) => (
                        <span key={p.id}>
                          <Image
                            unoptimized
                            className="bracket-team-logo"
                            src={
                              p.logo || espnTeamLogoUrl(t?.league || "", p.id)
                            }
                            alt=""
                            width={22}
                            height={22}
                            loading="lazy"
                          />
                          {p.name}
                          <b>{revealResults ? p.value : ""}</b>
                        </span>
                      ))}
                      <small>
                        {revealResults
                          ? match.summary || match.status
                          : "Results hidden"}{" "}
                        ↗
                      </small>
                      {revealResults &&
                        match.teams.some((p) => p.value !== undefined) && (
                          <small>{match.metric}</small>
                        )}
                    </a>
                  ))}
                </section>
              ))}
              <BracketConnectors
                key={info.postseason.checked}
                roundClass="bracket-round"
                matchClass="bracket-match"
              />
            </div>
            <p className="panel-note">
              ESPN · checked{" "}
              {formatInTimeZone(info.postseason.checked, timeZone)}{" "}
              {timeZoneLabel(timeZone, info.postseason.checked)}
            </p>
          </section>
        )}
        {id === "wolves" && (
          <section
            className="postseason-panel"
            aria-label="Emirates NBA Cup standings and bracket"
          >
            <h3>Emirates NBA Cup · 2026</h3>
            <p className="panel-note">
              Cup games are marked with an NBA Cup label throughout the
              schedule and calendar.
            </p>
            <p className="panel-note">
              <a
                href="https://www.nba.com/nba-cup/2026/standings"
                target="_blank"
                rel="noreferrer"
              >
                Open official NBA Cup standings and knockout picture ↗
              </a>
            </p>
          </section>
        )}
        {id === "palace" && !info?.postseason && (
          <section
            className="postseason-panel"
            aria-label="Crystal Palace cup and European links"
          >
            <h3>Europa League · 2026/27</h3>
            <p className="panel-note">
              Follow Palace&apos;s league-phase table now and the official
              bracket once knockout rounds and matchups are published.
            </p>
            <p className="panel-note">
              <a
                href="https://www.uefa.com/uefaeuropaleague/standings/"
                target="_blank"
                rel="noreferrer"
              >
                Open Europa League league phase table ↗
              </a>
              <br />
              <a
                href="https://www.uefa.com/uefaeuropaleague/fixtures-results/bracket/"
                target="_blank"
                rel="noreferrer"
              >
                Open Europa League bracket view ↗
              </a>
            </p>
            <h3>EFL Cup bracket · 2026/27</h3>
            <p className="panel-note">
              <a
                href="https://www.livesport.com/soccer/england/efl-cup/bracket/dGljLaBU/draw/"
                target="_blank"
                rel="noreferrer"
              >
                Open EFL Cup bracket ↗
              </a>
              <br />
              <a
                href="https://www.efl.com/competitions/carabao-cup/"
                target="_blank"
                rel="noreferrer"
              >
                Official Carabao Cup site ↗
              </a>
            </p>
          </section>
        )}
        {info?.tables.length ? (
          info.tables.map((raw) => {
            const table = decorateTable(raw, id);
            return (
              <section key={table.name}>
                <h3>{table.name}</h3>
                {table.note && <p className="panel-note">{table.note}</p>}
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>{table.columns[0]}</th>
                        <th>{id === "disc" ? "Player" : "Team"}</th>
                        {table.columns.slice(1).map((c) => (
                          <th key={c}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((row) => (
                        <Fragment key={row.id}>
                          <tr
                            key={row.id}
                            className={row.highlight ? "my-team" : ""}
                          >
                            <td>{row.cells[0]}</td>
                            <th scope="row">
                              <a
                                href={row.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {row.name} ↗
                              </a>
                            </th>
                            {row.cells.slice(1).map((c, i) => (
                              <td key={i}>{c}</td>
                            ))}
                          </tr>
                          {table.cuts
                            ?.filter((c) => c.after === Number(row.cells[0]))
                            .map((c) => (
                              <tr className="qualification-line" key={c.after}>
                                <td colSpan={table.columns.length + 1}>
                                  {c.label}
                                </td>
                              </tr>
                            ))}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
                {table.qualification && (
                  <p className="panel-note qualification-note">
                    {table.qualification}
                  </p>
                )}
                <p className="panel-note">
                  <a href={table.url} target="_blank" rel="noreferrer">
                    {table.source} ↗
                  </a>{" "}
                  · checked{" "}
                  {formatInTimeZone(table.checked, timeZone, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}{" "}
                  {timeZoneLabel(timeZone, table.checked)}
                  {table.stale && " · cached data; source unavailable"}
                </p>
              </section>
            );
          })
        ) : (
          <p className="panel-note">
            {id === "usmnt"
              ? "Friendly matches do not have a league table."
              : `No ${terms.standings.toLowerCase()} returned by the available feed.`}{" "}
            <a href={tableUrl} target="_blank" rel="noreferrer">
              Open official {terms.standings.toLowerCase()} ↗
            </a>
          </p>
        )}
      </details>
      {info?.powerRanking && (
        <details
          className="data-panel power-rankings"
          open={powerRankingsOpen}
          onToggle={(event) =>
            setPowerRankingsState({ id, open: event.currentTarget.open })
          }
        >
          <summary>
            Power Rankings
            <small>
              {myPowerRanking ? myPowerRanking.cells[0] : "Ranking unavailable"}
            </small>
          </summary>
          <p className="panel-note">
            {info.powerRanking.note} · produced{" "}
            {formatInTimeZone(info.powerRanking.publishedAt, timeZone, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Team</th>
                  {info.powerRanking.metric !== "Rank" && (
                    <th>{info.powerRanking.metric}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {info.powerRanking.rows.map((row) => (
                  <tr
                    key={row.id}
                    className={row === myPowerRanking ? "my-team" : ""}
                  >
                    <td>{row.cells[0]}</td>
                    <th scope="row">
                      <a href={row.url} target="_blank" rel="noreferrer">
                        {(espnTeamLogoUrl(t?.league || "", row.id) ||
                          row.logo) && (
                          <Image
                            unoptimized
                            className="power-ranking-logo"
                            src={
                              espnTeamLogoUrl(t?.league || "", row.id) ||
                              row.logo ||
                              ""
                            }
                            alt=""
                            width={22}
                            height={22}
                            loading="lazy"
                          />
                        )}
                        {row.name} ↗
                      </a>
                    </th>
                    {info.powerRanking?.metric !== "Rank" && (
                      <td>{row.cells[1]}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="panel-note">
            <a href={info.powerRanking.url} target="_blank" rel="noreferrer">
              {info.powerRanking.source} ↗
            </a>{" "}
            · checked{" "}
            {formatInTimeZone(info.powerRanking.checked, timeZone, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}{" "}
            {timeZoneLabel(timeZone, info.powerRanking.checked)}
          </p>
        </details>
      )}
      {id !== "disc" && (
        <details
          id="team-roster"
          className="data-panel"
          onToggle={(event) => {
            if (event.currentTarget.open) {
              const priorityKeys =
                info?.depth?.groups.flatMap((group) =>
                  group.players
                    .map((player: { url: string }) => {
                      const id = player.url.match(/\/_\/id\/(\d+)/)?.[1];
                      return id && t?.league ? `${t.league}:${id}` : "";
                    })
                    .filter(Boolean),
                ) || [];
              onRosterOpen(priorityKeys);
            }
          }}
        >
          <summary>{headings.roster}</summary>
          {info?.depth ? (
            <>
              {Boolean(t?.league) && playerStatsStatus === "idle" && (
                <p className="panel-note">
                  Open the roster to load current season stats.
                </p>
              )}
              {Boolean(t?.league) && playerStatsStatus === "loading" && (
                <p className="panel-note" aria-live="polite">
                  Loading ESPN season stats…
                </p>
              )}
              {Boolean(t?.league) && playerStatsStatus === "partial" && (
                <p className="panel-note" aria-live="polite">
                  Some season stats could not refresh. Reopen the roster in a
                  few minutes to retry.
                </p>
              )}
              {Boolean(t?.league) && playerStatsStatus === "empty" && (
                <p className="panel-note" aria-live="polite">
                  Season stats could not be loaded for these players right now.
                </p>
              )}
              {Boolean(t?.league) && playerStatsStatus === "unavailable" && (
                <p className="panel-note" aria-live="polite">
                  ESPN season stats are temporarily unavailable.
                </p>
              )}
              {rosterGroups.map((group, i) => {
                const statsTable = createRosterStatsTable(
                  group.players,
                  t?.league || "",
                  playerStats,
                );
                const seasonTitles = Array.from(
                  new Set(
                    statsTable.rows
                      .map(({ summary }) => summary?.title)
                      .filter((title): title is string => Boolean(title)),
                  ),
                );
                const toggleRosterSort = (column: string) =>
                  setRosterSortState((current) => {
                    const currentSort =
                      current?.id === id
                        ? current.value
                        : { column: "Player", direction: "asc" as const };
                    const direction =
                      currentSort.column === column
                        ? currentSort.direction === "asc"
                          ? "desc"
                          : "asc"
                        : defaultRosterSortDirection(column);
                    return { id, value: { column, direction } };
                  });
                const rosterSortIndicator = (column: string) =>
                  rosterSort.column === column
                    ? rosterSort.direction === "asc"
                      ? "↑"
                      : "↓"
                    : "";
                const rosterSortAria = (column: string) =>
                  rosterSort.column === column
                    ? rosterSort.direction === "asc"
                      ? "ascending"
                      : "descending"
                    : "none";
                const handleRosterSortKeyDown = (
                  event: KeyboardEvent<HTMLTableCellElement>,
                  column: string,
                ) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggleRosterSort(column);
                  }
                };
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
                              <th
                                scope="col"
                                className={[
                                  "roster-player-header",
                                  rosterSort.column === "Player"
                                    ? "sorted-column"
                                    : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                                onClick={() => toggleRosterSort("Player")}
                                onKeyDown={(event) =>
                                  handleRosterSortKeyDown(event, "Player")
                                }
                                aria-sort={rosterSortAria("Player")}
                                tabIndex={0}
                              >
                                Player {rosterSortIndicator("Player")}
                              </th>
                              <th
                                scope="col"
                                className={
                                  rosterSort.column === "Position"
                                    ? "sorted-column"
                                    : undefined
                                }
                                onClick={() => toggleRosterSort("Position")}
                                onKeyDown={(event) =>
                                  handleRosterSortKeyDown(event, "Position")
                                }
                                aria-sort={rosterSortAria("Position")}
                                tabIndex={0}
                              >
                                Pos. {rosterSortIndicator("Position")}
                              </th>
                              {statsTable.columns.map((column) => (
                                <th
                                  scope="col"
                                  key={column}
                                  className={
                                    rosterSort.column === column
                                      ? "sorted-column"
                                      : undefined
                                  }
                                  onClick={() => toggleRosterSort(column)}
                                  onKeyDown={(event) =>
                                    handleRosterSortKeyDown(event, column)
                                  }
                                  aria-sort={rosterSortAria(column)}
                                  tabIndex={0}
                                >
                                  {column} {rosterSortIndicator(column)}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {[...statsTable.rows]
                              .sort((a, b) => {
                                const av =
                                  rosterSort.column === "Player"
                                    ? a.player.name
                                    : rosterSort.column === "Position"
                                      ? a.player.position
                                      : rosterStatValue(
                                          a.summary,
                                          rosterSort.column,
                                        );
                                const bv =
                                  rosterSort.column === "Player"
                                    ? b.player.name
                                    : rosterSort.column === "Position"
                                      ? b.player.position
                                      : rosterStatValue(
                                          b.summary,
                                          rosterSort.column,
                                        );
                                const an = Number(av.replace(/[%,$,]/g, ""));
                                const bn = Number(bv.replace(/[%,$,]/g, ""));
                                const result =
                                  Number.isFinite(an) && Number.isFinite(bn)
                                    ? an - bn
                                    : av.localeCompare(bv);
                                return rosterSort.direction === "asc"
                                  ? result
                                  : -result;
                              })
                              .map(({ player: p, summary }) => (
                                <tr key={p.url + p.name}>
                                  <th
                                    scope="row"
                                    className={
                                      rosterSort.column === "Player"
                                        ? "sorted-column"
                                        : undefined
                                    }
                                  >
                                    <a
                                      href={p.url}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      {p.name} ↗
                                    </a>
                                    <span className="roster-player-age">
                                      {p.age !== undefined
                                        ? `Age ${p.age}`
                                        : ""}
                                    </span>
                                    {(p.campTeam ||
                                      p.signedForSeason ||
                                      p.draftPick) && (
                                      <span className="roster-table-player-meta">
                                        {[
                                          p.campTeam,
                                          p.signedForSeason &&
                                            "Signed for 2026–27",
                                          p.draftPick && "2026 draft pick",
                                        ]
                                          .filter(Boolean)
                                          .join(" · ")}
                                      </span>
                                    )}
                                  </th>
                                  <td
                                    className={
                                      rosterSort.column === "Position"
                                        ? "sorted-column"
                                        : undefined
                                    }
                                  >
                                    {p.position || "—"}
                                  </td>
                                  {statsTable.columns.map((column) => {
                                    const stat = summary?.values.find(
                                      (value) => value.label === column,
                                    );
                                    return (
                                      <td
                                        key={column}
                                        title={stat?.description}
                                        className={
                                          rosterSort.column === column
                                            ? "sorted-column"
                                            : undefined
                                        }
                                      >
                                        {rosterStatValue(summary, column)}
                                      </td>
                                    );
                                  })}
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
                              {(p.campTeam ||
                                p.signedForSeason ||
                                p.draftPick) && (
                                <span className="roster-table-player-meta">
                                  {[
                                    p.campTeam,
                                    p.signedForSeason && "Signed for 2026–27",
                                    p.draftPick && "2026 draft pick",
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                              )}
                            </li>
                          ))}
                      </ol>
                    )}
                  </section>
                );
              })}
              <p className="panel-note">
                <a href={info.depth.url} target="_blank" rel="noreferrer">
                  {info.depth.source} ↗
                </a>{" "}
                {id === "frost"
                  ? "· Preliminary names and positions from the official training-camp announcement; final roster may change."
                  : ""}
              </p>
            </>
          ) : (
            <p className="panel-note">
              A {terms.roster.toLowerCase()} is not available from the current
              feed.{" "}
              <a href={rosterUrl} target="_blank" rel="noreferrer">
                Open team {terms.roster.toLowerCase()} ↗
              </a>
            </p>
          )}
        </details>
      )}
    </section>
  );
}
