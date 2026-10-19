"use client";
import { Fragment, useState } from "react";
import { decorateTable } from "../lib/team-info";
import { teams } from "../lib/teams";
import { sportTerms } from "../lib/sport-terms";
import type { TeamInfo } from "../lib/team-info";
import type { PlayerStats } from "../lib/player-stats";
import { espnTeamLogoUrl } from "../lib/march-madness";
export default function TeamInsights({
  active,
  data,
  revealResults = true,
  playerStats = {},
  playerStatsStatus = "loading",
}: {
  active: string;
  data: TeamInfo[];
  revealResults?: boolean;
  playerStats?: Record<string, PlayerStats>;
  playerStatsStatus?: "loading" | "ready" | "empty" | "unavailable";
}) {
  const [selected, setSelected] = useState("wolves");
  const id = active === "all" ? selected : active;
  const terms = sportTerms(id);
  const headings = sportTerms(active);
  const t = teams.find((t) => t.id === id);
  const info = data.find((i) => i.id === id);
  const league = t?.league?.split("/")[1];
  const tableUrl = league
    ? "https://www.espn.com/" + league + "/standings"
    : id === "zalgiris"
      ? "https://www.euroleaguebasketball.net/euroleague/standings/"
      : id === "frost"
        ? "https://www.thepwhl.com/en/standings"
        : "https://www.dgpt.com/full-standings/";
  const rosterUrl = league
    ? "https://www.espn.com/" + league + "/team/roster/_/name/" + t?.espn
    : id === "zalgiris"
      ? "https://zalgiris.lt/komandos"
      : id === "frost"
        ? "https://www.thepwhl.com/en/teams/minnesota-frost/roster"
        : "https://www.dgpt.com/";
  return (
    <section className="team-insights">
      {active === "all" && (
        <label className="insights-team">
          Team data{" "}
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.short}
              </option>
            ))}
          </select>
        </label>
      )}
      <details id="team-standings" className="data-panel">
        <summary>
          {headings.standings}
          <small>{t?.short}</small>
        </summary>
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
                          <img
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
            </div>
            <p className="panel-note">
              ESPN · checked{" "}
              {new Date(info.postseason.checked).toLocaleString("en-US", {
                timeZone: "America/Chicago",
              })}{" "}
              CT
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
                  {new Date(table.checked).toLocaleString("en-US", {
                    timeZone: "America/Chicago",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}{" "}
                  CT
                  {info.unavailable.length > 0 && " · cached data may be shown"}
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
      {id !== "disc" && (
        <details id="team-roster" className="data-panel">
          <summary>
            {headings.roster}
            <small>{t?.short}</small>
          </summary>
          {info?.depth ? (
            <>
              {playerStatsStatus === "loading" && (
                <p className="panel-note" aria-live="polite">
                  Loading ESPN season stats…
                </p>
              )}
              {playerStatsStatus === "empty" && (
                <p className="panel-note" aria-live="polite">
                  Season stats could not be loaded for these players right now.
                </p>
              )}
              {playerStatsStatus === "unavailable" && (
                <p className="panel-note" aria-live="polite">
                  ESPN season stats are temporarily unavailable.
                </p>
              )}
              <p className="panel-note">
                Players grouped by position. Links open player bios and
                profiles.
              </p>
              {info.depth.groups.map((group, i) => (
                <div className="depth-row" key={group.position + i}>
                  <strong>{group.position}</strong>
                  <ol>
                    {group.players.map((p) => (
                      <li key={p.url + p.name}>
                        <a href={p.url} target="_blank" rel="noreferrer">
                          {p.name} ↗
                        </a>
                        {p.age !== undefined && (
                          <div className="roster-player-info">
                            {p.age !== undefined && <span>Age {p.age}</span>}
                          </div>
                        )}
                        {(() => {
                          const summary =
                            playerStats[
                              (t?.league || "") +
                                ":" +
                                (p.url.match(/\/_\/id\/(\d+)/)?.[1] || "")
                            ];
                          return summary ? (
                            <div className="roster-season-stats">
                              <small>{summary.title}</small>
                              <dl>
                                {summary.values.map((s) => (
                                  <div key={s.label} title={s.description}>
                                    <dt>{s.label}</dt>
                                    <dd>{s.value}</dd>
                                  </div>
                                ))}
                              </dl>
                            </div>
                          ) : null;
                        })()}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
              <p className="panel-note">
                <a href={info.depth.url} target="_blank" rel="noreferrer">
                  {info.depth.source} ↗
                </a>{" "}
                · Age and season stats from ESPN. Each summary keeps ESPN’s
                season and competition label; unavailable stats are omitted.
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
