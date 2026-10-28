// Team detail panels: standings, power rankings, postseason, and roster.
"use client";
import { Fragment, useState } from "react";
import { decorateTable } from "../../lib/team-info/standings";
import { teamProfile, teams } from "../../lib/teams/teams";
import { sportTerms } from "../../lib/teams/sport-terms";
import type { TeamInfo } from "../../lib/team-info";
import type { PlayerStats } from "../../lib/team-info/player-stats";
import { espnTeamLogoUrl } from "../../lib/games/march-madness";
import BracketConnectors from "../games/bracket-connectors";
import RosterPanel from "./roster-panel";
import Image from "next/image";
import { isTeamId, TEAM_IDS, type TeamId } from "../../lib/teams/teams";
import type { DashboardPageId } from "../../lib/dashboard/page-id";
import { useLocalTimeZone } from "../../hooks/use-local-time-zone";
import { formatInTimeZone, timeZoneLabel } from "../../lib/browser/local-time";
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
  const [standingsGroupOverrides, setStandingsGroupOverrides] = useState<
    Record<string, boolean>
  >({});
  const [powerRankingsState, setPowerRankingsState] = useState<{
    id: string;
    open: boolean;
  } | null>(null);
  const powerRankingsOpen =
    powerRankingsState?.id === id && powerRankingsState.open;
  const terms = sportTerms(id);
  const headings = sportTerms(active);
  const t = teamProfile(id);
  const info = data.find((i) => i.id === id);
  const myPowerRanking = info?.powerRanking?.rows.find(
    (row) =>
      row.name === t?.name ||
      row.id === t?.espn ||
      Boolean(t?.espn && row.url.includes(`/${t.espn}`)),
  );
  const league = t?.league?.split("/")[1];
  const tableUrl = league
    ? "https://www.espn.com/" + league + "/standings"
    : t?.standingsPage || "";
  const rosterUrl = league
    ? "https://www.espn.com/" + league + "/team/roster/_/name/" + t?.espn
    : t?.rosterPage || "";
  const competitionPanels = t?.competitionPanels;
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
        {competitionPanels &&
          !(competitionPanels.hideDuringPostseason && info?.postseason) && (
            <section
              className="postseason-panel"
              aria-label={competitionPanels.label}
            >
              {competitionPanels.sections.map((section) => (
                <Fragment key={section.title}>
                  <h3>{section.title}</h3>
                  {section.note && <p className="panel-note">{section.note}</p>}
                  <p className="panel-note">
                    {section.links.map(([label, url], index) => (
                      <Fragment key={url}>
                        {index > 0 && <br />}
                        <a href={url} target="_blank" rel="noreferrer">
                          {label} ↗
                        </a>
                      </Fragment>
                    ))}
                  </p>
                </Fragment>
              ))}
            </section>
          )}
        {info?.tables.length ? (
          info.tables.map((raw) => {
            const table = decorateTable(raw, id);
            const groupKey = `${id}:${table.name}`;
            const groupOpen =
              standingsGroupOverrides[groupKey] ??
              table.rows.some((row) => row.highlight);
            return (
              <details
                key={table.name}
                className="standings-group"
                open={groupOpen}
                onToggle={(event) => {
                  const open = event.currentTarget.open;
                  setStandingsGroupOverrides((current) => ({
                    ...current,
                    [groupKey]: open,
                  }));
                }}
              >
                <summary>
                  <h3>{table.name}</h3>
                </summary>
                {table.note && <p className="panel-note">{table.note}</p>}
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>{table.columns[0]}</th>
                        <th>{t?.individual ? "Player" : "Team"}</th>
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
              </details>
            );
          })
        ) : (
          <p className="panel-note">
            {t?.noStandingsNote ||
              `No ${terms.standings.toLowerCase()} returned by the available feed.`}{" "}
            <a href={tableUrl} target="_blank" rel="noreferrer">
              Open official {terms.standings.toLowerCase()} ↗
            </a>
          </p>
        )}
      </details>
      {info?.powerRanking && (
        <details
          id="team-power-rankings"
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
      {!t?.individual && (
        <RosterPanel
          teamId={id}
          league={t?.league}
          depth={info?.depth}
          heading={headings.roster}
          noun={terms.roster}
          fallbackUrl={rosterUrl}
          playerStats={playerStats}
          playerStatsStatus={playerStatsStatus}
          onRosterOpen={onRosterOpen}
        />
      )}
    </section>
  );
}
