"use client";
import AddToCalendar from "./add-to-calendar";
import { injuryReportUrl, tournamentScoresUrl } from "../lib/game-links";
import { eventDateLabel } from "../lib/event-time";
import GameBadges from "./game-badges";
import { gameBadges } from "../lib/game-badges";
import { useState } from "react";
import type { Game } from "../lib/feeds";
import { teams } from "../lib/teams";
import { teamLocation } from "../lib/team-location";
import { teamWikipediaUrl } from "../lib/team-wikipedia";
import { sportTerms } from "../lib/sport-terms";
const ct = (s: string, o: Intl.DateTimeFormatOptions = {}) =>
  new Date(s).toLocaleString("en-US", { timeZone: "America/Chicago", ...o });
const patterns: Record<string, RegExp> = {
  wolves: /timberwolves|wolves/i,
  wild: /wild/i,
  vikings: /vikings/i,
  twins: /twins/i,
  loons: /minnesota|mnufc/i,
  palace: /palace/i,
  lynx: /lynx/i,
  zalgiris: /žalgiris|zalgiris/i,
  frost: /frost/i,
  usmnt: /united states|\busa\b|u\.s\./i,
};
export function matchup(g: Game) {
  const club = g.competitors.find((p) => patterns[g.team]?.test(p.name));
  return {
    club,
    opponent: g.competitors.find((p) => p !== club)?.name || g.name,
  };
}
export function outcome(g: Game) {
  if (g.state !== "post") return "";
  const { club } = matchup(g);
  const opponent = g.competitors.find((p) => p !== club);
  if (!club || !opponent || !club.score || !opponent.score) return "";
  const a = Number(club.score),
    b = Number(opponent.score);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return "";
  return a === b ? sportTerms(g.team).tieCode : a > b ? "W" : "L";
}
function Location({
  team,
  name,
  league,
  own = false,
}: {
  team: string;
  name: string;
  league: string;
  own?: boolean;
}) {
  const location = teamLocation(team, name, league, own);
  return location ? (
    <span style={{ fontSize: "0.8em", fontWeight: 400, opacity: 0.75 }}>
      {" "}
      · {location}
    </span>
  ) : null;
}
export default function GameCard({
  game: g,
  compact = false,
  revealed,
  revealPast = false,
  today = false,
  onReveal,
}: {
  game: Game;
  compact?: boolean;
  revealed: boolean;
  revealPast?: boolean;
  today?: boolean;
  onReveal: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const expandReveals = compact && g.state === "post";
  const scoreVisible = expandReveals ? expanded || revealPast : revealed;
  const t = teams.find((t) => t.id === g.team);
  if (!t) return null;
  const hidden = g.state !== "pre" && !scoreVisible;
  const logo = "/logos/" + t.id + (t.id === "disc" ? ".svg" : ".png");
  const { club, opponent } = matchup(g);
  const result = outcome(g);
  const terms = sportTerms(g.team);
  const hasBadges = gameBadges(g).length > 0;
  const summaryHasResult = today && compact && g.state === "post";
  const full = (
    <article className="game">
      {!summaryHasResult && (
        <>
          <div className="game-top">
            <div className="game-identity">
              <img src={logo} alt="" width={36} height={36} />
              <div className="game-identity-text">
                <div className="game-title">
                  <strong>
                    {t.id === "disc" ? (
                      t.name
                    ) : (
                      <a
                        href={teamWikipediaUrl(t.id, undefined, true)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t.name}
                      </a>
                    )}
                  </strong>
                  <Location team={g.team} name={t.name} league={g.league} own />
                </div>
                {!hasBadges && <span className="muted">{g.league}</span>}
              </div>
            </div>
            <div className="game-meta">
              <span className={g.state === "in" ? "live" : ""}>
                {g.state === "post"
                  ? "FINAL"
                  : g.state === "in"
                    ? g.eventOnly
                      ? "IN PROGRESS"
                      : "LIVE"
                    : ct(g.date, { month: "short", day: "numeric" })}
              </span>
              <GameBadges game={g} />
            </div>
          </div>
          {g.eventOnly ? (
            <div className="event-details">
              <h3 className="event-name">{g.name}</h3>
              <p>{eventDateLabel(g)}</p>
              {g.state === "post" &&
                (scoreVisible ? (
                  g.eventResults?.length ? (
                    g.eventResults.map((r) => (
                      <p key={r.division}>
                        <b>{r.division}:</b> {r.name} · {r.score}
                      </p>
                    ))
                  ) : null
                ) : (
                  <p>Results hidden</p>
                ))}
            </div>
          ) : (
            g.competitors.map((p) => (
              <div
                className={
                  "competitor " + (p.winner && !hidden ? "winner" : "")
                }
                key={p.name}
              >
                <span>
                  <a
                    href={teamWikipediaUrl(t.id, p.name, p === club)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {p.name}
                  </a>
                  <Location
                    team={g.team}
                    name={p.name}
                    league={g.league}
                    own={p === club}
                  />
                  {p.record && (!hidden || g.state === "pre") && (
                    <span className="team-record"> ({p.record})</span>
                  )}
                  <small>{p.homeAway === "home" ? "HOME" : "AWAY"}</small>
                </span>
                {g.state !== "pre" && (
                  <b>{hidden ? "••" : p.score || "Unavailable"}</b>
                )}
              </div>
            ))
          )}
        </>
      )}
      {g.state !== "pre" && !expandReveals && (
        <button className="score-reveal" onClick={onReveal}>
          {hidden ? "Reveal score & result" : "Hide score & result"}
        </button>
      )}
      <div className="game-footer">
        {g.eventOnly && g.state === "post"
          ? null
          : g.dateOnly
            ? g.state === "pre"
              ? "All-day event · tee times not listed"
              : g.status
            : g.state === "pre"
              ? ct(g.date, { hour: "numeric", minute: "2-digit" }) + " CT"
              : hidden
                ? g.state === "post"
                  ? "Final · result hidden"
                  : "Live · score hidden"
                : g.status}
        {g.url && (
          <a
            href={
              g.eventOnly
                ? tournamentScoresUrl(g)
                : g.state === "pre"
                  ? g.url
                  : g.boxUrl || g.url
            }
            target="_blank"
            rel="noreferrer"
          >
            {g.eventOnly && g.state !== "pre"
              ? "Tournament scores & results ↗"
              : g.state === "pre"
                ? "Details ↗"
                : `${terms.stats} ↗`}
          </a>
        )}
      </div>
      {today && injuryReportUrl(g.team) && (
        <p className="injury-report">
          <a href={injuryReportUrl(g.team)} target="_blank" rel="noreferrer">
            Injury report ↗
          </a>
        </p>
      )}
      {g.state === "post" && !g.eventOnly && (
        <a
          className="game-highlights"
          href={
            "https://www.youtube.com/results?search_query=" +
            encodeURIComponent(
              g.name +
                " " +
                t.name +
                " " +
                ct(g.date, { year: "numeric", month: "long", day: "numeric" }) +
                ` full ${terms.event} highlights`,
            )
          }
          target="_blank"
          rel="noreferrer"
        >
          ▷ Find full {terms.event} highlights on YouTube ↗
        </a>
      )}
      {g.state !== "post" && !g.eventOnly && (
        <div className="game-odds">
          {g.odds ? (
            <>
              <b>{g.odds.favorite}</b>
              <details className="odds-details">
                <summary>Odds details</summary>
                <p>{g.odds.lines.join(" · ")}</p>
                <a href={g.odds.url} target="_blank" rel="noreferrer">
                  {g.odds.source} ↗
                </a>
                <small>
                  Checked{" "}
                  {ct(g.odds.checked, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}{" "}
                  CT · odds can change
                </small>
                {Date.now() - Date.parse(g.odds.checked) > 15 * 60000 && (
                  <small>Cached odds; check source for current prices.</small>
                )}
              </details>
            </>
          ) : (
            <span>Current odds unavailable</span>
          )}
        </div>
      )}
      {g.state !== "post" && (
        <p className="venue">
          {g.venue}
          {g.broadcast && (
            <>
              <br />
              {g.broadcast}
            </>
          )}
        </p>
      )}
      {g.sourceName && <p className="source-game">{g.sourceName}</p>}
    </article>
  );
  if (!compact)
    return (
      <>
        {full}
        {g.state === "pre" && <AddToCalendar game={g} />}
      </>
    );
  return (
    <div className="calendar-game">
      <details
        className={
          "compact-game" +
          (g.state === "post" ? " past-game" : "") +
          (g.state === "post" && scoreVisible && result ? " result-shown" : "")
        }
        onToggle={(e) => {
          if (e.target === e.currentTarget) setExpanded(e.currentTarget.open);
        }}
      >
        <summary>
          {g.state === "post" && scoreVisible && result && (
            <span
              className={"result-cap cap-" + result}
              aria-label={
                result === "W"
                  ? "Win"
                  : result === "L"
                    ? "Loss"
                    : terms.tieLabel
              }
            >
              <span>{result}</span>
            </span>
          )}
          <img src={logo} alt="" width={30} height={30} />
          <span className="compact-match">
            <span className="compact-name">
              <strong>
                {t.id === "disc" ? (
                  t.short
                ) : (
                  <a
                    href={teamWikipediaUrl(t.id, undefined, true)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t.short}
                  </a>
                )}
              </strong>
              <Location team={g.team} name={t.name} league={g.league} own />
              <GameBadges game={g} />
            </span>
            {g.eventOnly ? (
              <span>{g.name}</span>
            ) : (
              <span>
                vs.{" "}
                <a
                  href={teamWikipediaUrl(t.id, opponent)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {opponent}
                </a>
                <Location team={g.team} name={opponent} league={g.league} />
              </span>
            )}
          </span>
          {g.state === "post" && scoreVisible && result && (
            <span
              className="result-score"
              aria-label={`${t.name} ${club?.score}, ${opponent} ${g.competitors.find((p) => p !== club)?.score}`}
            >
              <strong>{club?.score}</strong>
              <span className="score-separator">–</span>
              <span>{g.competitors.find((p) => p !== club)?.score}</span>
            </span>
          )}
          <span className="compact-date">
            {eventDateLabel(g)}
            {!g.dateOnly &&
              (g.state === "post" ? (
                <> · {ct(g.date, { hour: "numeric", minute: "2-digit" })} CT</>
              ) : (
                <small>
                  {ct(g.date, { hour: "numeric", minute: "2-digit" })} CT
                </small>
              ))}
            {g.state === "post" && g.eventOnly && scoreVisible && (
              <small>
                <a
                  href={tournamentScoresUrl(g)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  Scores & results ↗
                </a>
              </small>
            )}
            {g.state === "post" &&
              !g.eventOnly &&
              (!scoreVisible || !result) && (
                <small>
                  {scoreVisible
                    ? g.eventOnly
                      ? "Completed · official results"
                      : "Score unavailable"
                    : "Result hidden"}
                </small>
              )}
          </span>
          <span className="expand-chevron" aria-hidden="true">
            ⌄
          </span>
        </summary>
        {full}
      </details>
      {g.state === "pre" && <AddToCalendar game={g} />}
    </div>
  );
}
