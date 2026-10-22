"use client";
import AddToCalendar from "./add-to-calendar";
import { injuryReportUrl, tournamentScoresUrl } from "../lib/games/game-links";
import { eventDateLabel } from "../lib/games/event-time";
import GameBadges from "./game-badges";
import { gameBadges } from "../lib/games/game-badges";
import { useRef, useState } from "react";
import type { Game } from "../lib/feeds";
import Image from "next/image";
import { teams } from "../lib/teams/teams";
import { teamLocation } from "../lib/teams/team-location";
import { teamWikipediaUrl } from "../lib/teams/team-wikipedia";
import { sportTerms } from "../lib/teams/sport-terms";
import { teamLogoPath } from "../lib/teams/team-logo";
import type { TeamId } from "../lib/teams/teams";
import { useLocalTimeZone } from "../hooks/use-local-time-zone";
import { formatInTimeZone, timeZoneLabel } from "../lib/browser/local-time";
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
  team: TeamId;
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
  const timeZone = useLocalTimeZone();
  const localDateTime = (s: string, o: Intl.DateTimeFormatOptions = {}) =>
    formatInTimeZone(s, timeZone, o);
  const [expanded, setExpanded] = useState(false);
  const [renderedAt] = useState(() => Date.now());
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const expandReveals = compact && g.state === "post";
  const scoreVisible = expandReveals ? expanded || revealPast : revealed;
  const t = teams.find((t) => t.id === g.team);
  if (!t) return null;
  const hidden = g.state !== "pre" && !scoreVisible;
  const logo = teamLogoPath(t.id);
  const { club, opponent } = matchup(g);
  const result = outcome(g);
  const terms = sportTerms(g.team);
  const hasBadges = gameBadges(g).length > 0;
  const zoneLabel = timeZoneLabel(timeZone, g.date);
  const full = (
    <article className="game">
      {compact && (
        <button
          type="button"
          className="game-collapse"
          onClick={() => {
            detailsRef.current?.removeAttribute("open");
            setExpanded(false);
          }}
        >
          Hide details ↑
        </button>
      )}
      <div className="game-top">
        <div className="game-identity">
          <Image unoptimized src={logo} alt="" width={36} height={36} />
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
                : localDateTime(g.date, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
          </span>
          <GameBadges game={g} />
        </div>
      </div>
      {g.eventOnly ? (
        <div className="event-details">
          <h3 className="event-name">{g.name}</h3>
          <p>{eventDateLabel(g, timeZone)}</p>
          {g.state === "post" &&
            (scoreVisible ? (
              g.eventResults?.length ? (
                g.eventResults.map((r) => (
                  <p key={r.division}>
                    <b>{r.division}:</b> {r.name} · {r.score}
                    {r.margin && <small> · Won by {r.margin} strokes</small>}
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
            className={"competitor " + (p.winner && !hidden ? "winner" : "")}
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
              ? localDateTime(g.date, { hour: "numeric", minute: "2-digit" }) +
                " " +
                zoneLabel
              : hidden
                ? g.state === "post"
                  ? "Final · result hidden"
                  : "Live · score hidden"
                : g.status}
        <span className="game-footer-actions">
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
          {!compact && g.state === "pre" && <AddToCalendar game={g} />}
        </span>
      </div>
      {today && injuryReportUrl(g.team) && (
        <section className="injury-report" aria-label="Injury report">
          {g.injuries?.length ? (
            <>
              <strong>Injury report</strong>
              {Array.from(
                new Set(
                  g.injuries.map(
                    (injury) => injury.team || "Team injury report",
                  ),
                ),
              ).map((team) => (
                <div className="injury-team" key={team}>
                  <h4>{team}</h4>
                  <ul>
                    {g
                      .injuries!.filter(
                        (injury) =>
                          (injury.team || "Team injury report") === team,
                      )
                      .map((injury) => (
                        <li key={`${team}-${injury.player}`}>
                          <span>{injury.player}</span>
                          <span>{injury.status}</span>
                          {injury.detail && <small>{injury.detail}</small>}
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </>
          ) : (
            <a href={injuryReportUrl(g.team)} target="_blank" rel="noreferrer">
              Injury report ↗
            </a>
          )}
          <a href={injuryReportUrl(g.team)} target="_blank" rel="noreferrer">
            Full report ↗
          </a>
        </section>
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
                localDateTime(g.date, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }) +
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
                  {localDateTime(g.odds.checked, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}{" "}
                  {timeZoneLabel(timeZone, g.odds.checked)} · odds can change
                </small>
                {renderedAt - Date.parse(g.odds.checked) > 15 * 60000 && (
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
  if (!compact) return full;
  return (
    <div className="calendar-game">
      <details
        ref={detailsRef}
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
          <Image unoptimized src={logo} alt="" width={30} height={30} />
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
          <span className="compact-upcoming-actions">
            <span className="compact-date">
              {eventDateLabel(g, timeZone)}
              {!g.dateOnly &&
                (g.state === "post" ? (
                  <>
                    {" "}
                    ·{" "}
                    {localDateTime(g.date, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                    {zoneLabel}
                  </>
                ) : (
                  <small>
                    {localDateTime(g.date, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                    {zoneLabel}
                  </small>
                ))}
              {g.state === "post" &&
                g.eventOnly &&
                scoreVisible &&
                Boolean(g.eventResults?.length) && (
                  <small className="event-winners">
                    {g.eventResults?.map((result) => (
                      <span key={result.division}>
                        {result.division}: {result.name}
                        {result.margin && ` · Won by ${result.margin}`}
                      </span>
                    ))}
                  </small>
                )}
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
                    {scoreVisible ? "Score unavailable" : "Result hidden"}
                  </small>
                )}
            </span>
            {g.state === "pre" && <AddToCalendar game={g} compact />}
          </span>
          <span className="expand-chevron" aria-hidden="true">
            ⌄
          </span>
        </summary>
        {full}
      </details>
    </div>
  );
}
