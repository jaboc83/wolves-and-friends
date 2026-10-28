// Expandable card for a single game or event: teams, score, time, badges, and extras.
"use client";
import AddToCalendar from "./add-to-calendar";
import GameCardExtras from "./game-card-extras";
import { tournamentScoresUrl } from "../../lib/games/game-links";
import { eventDateLabel } from "../../lib/games/event-time";
import GameBadges from "./game-badges";
import { gameBadges } from "../../lib/games/game-badges";
import { useRef, useState } from "react";
import type { Game } from "../../lib/feeds";
import Image from "next/image";
import { ChevronDown, House, Plane } from "lucide-react";
import { teamProfile } from "../../lib/teams/teams";
import {
  compactTeamLocation,
  teamLocation,
} from "../../lib/teams/team-location";
import { gameTeamUrl } from "../../lib/teams/game-team-url";
import { sportTerms } from "../../lib/teams/sport-terms";
import { teamLogoPath } from "../../lib/teams/team-logo";
import type { TeamId } from "../../lib/teams/teams";
import { useLocalTimeZone } from "../../hooks/use-local-time-zone";
import { formatInTimeZone, timeZoneLabel } from "../../lib/browser/local-time";
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
  compact = false,
}: {
  team: TeamId;
  name: string;
  league: string;
  own?: boolean;
  compact?: boolean;
}) {
  const location = teamLocation(team, name, league, own);
  const displayedLocation = compact ? compactTeamLocation(location) : location;
  return displayedLocation ? (
    <span
      className={compact ? "compact-team-location" : undefined}
      style={{
        fontSize: "0.8em",
        fontWeight: 400,
        opacity: 0.75,
        alignSelf: own ? "baseline" : undefined,
      }}
    >
      {" "}
      · {displayedLocation}
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
  const scoreVisible = expandReveals
    ? expanded || revealPast
    : revealPast !== revealed;
  const t = teamProfile(g.team);
  if (!t) return null;
  const hidden = g.state !== "pre" && !scoreVisible;
  const logo = teamLogoPath(t.id);
  const { club, opponent } = matchup(g);
  const homeAway = !g.eventOnly ? club?.homeAway : undefined;
  const opponentCompetitor = g.competitors.find((p) => p !== club);
  const result = outcome(g);
  const completedStatus = g.status.replace(/^Final\/?/i, "") || null;
  const terms = sportTerms(g.team);
  const showLiveIndicator = today && g.state === "in";
  const resultCap =
    g.state === "post" && scoreVisible && result ? (
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
    ) : null;
  const hasBadges = gameBadges(g).length > 0;
  const zoneLabel = timeZoneLabel(timeZone, g.date);
  const full = (
    <article className="game">
      <div className="game-top">
        <div className="game-identity">
          <Image unoptimized src={logo} alt="" width={36} height={36} />
          <div className="game-identity-text">
            <div className="game-title">
              <strong>
                {t.individual ? (
                  t.name
                ) : (
                  <a
                    href={gameTeamUrl(g.team, t.name, true, club?.teamId)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t.name}
                  </a>
                )}
              </strong>
            </div>
          </div>
        </div>
        <div className="game-meta">
          <span className={g.state === "in" ? "live" : ""}>
            {g.state === "post"
              ? (
                  <time dateTime={g.date}>{eventDateLabel(g, timeZone)}</time>
                )
              : g.state === "in"
                ? g.eventOnly
                  ? "IN PROGRESS"
                  : "LIVE"
                : <AddToCalendar game={g}>
                    {localDateTime(g.date, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    })}
                  </AddToCalendar>}
            {g.state === "pre" && !g.dateOnly && (
              <span className="event-time">
                {localDateTime(g.date, {
                  hour: "numeric",
                  minute: "2-digit",
                })}{" "}
                {zoneLabel}
              </span>
            )}
          </span>
        </div>
        {compact && (
          <button
            type="button"
            className="game-collapse expand-chevron"
            aria-label="Hide details"
            title="Hide details"
            onClick={() => {
              detailsRef.current?.removeAttribute("open");
              setExpanded(false);
            }}
          >
            <ChevronDown size={16} strokeWidth={2.5} aria-hidden="true" />
          </button>
        )}
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
                href={gameTeamUrl(g.team, p.name, p === club, p.teamId)}
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
        {g.state === "pre" && !g.dateOnly ? null :
        g.eventOnly && g.state === "post" ? null : g.dateOnly ? (
          g.state === "pre" ? (
            "All-day event · tee times not listed"
          ) : (
            completedStatus
          )
        ) : g.state === "pre" ? (
          <time className="event-time" dateTime={g.date}>
            {localDateTime(g.date, {
              hour: "numeric",
              minute: "2-digit",
            })}{" "}
            {zoneLabel}
          </time>
        ) : hidden ? (
          g.state === "post" ? (
            "Result hidden"
          ) : (
            "Live · score hidden"
          )
        ) : g.state === "post" ? (
          completedStatus
        ) : (
          g.status
        )}
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
        </span>
      </div>
      <GameCardExtras
        game={g}
        today={today}
        teamName={t.name}
        event={terms.event}
        timeZone={timeZone}
        renderedAt={renderedAt}
        localDateTime={localDateTime}
      />
      {hasBadges && (
        <div className="game-card-ribbon">
          <GameBadges game={g} />
        </div>
      )}
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
          {resultCap}
          <span className="compact-team-logo">
            <Image unoptimized src={logo} alt="" width={30} height={30} />
            {homeAway && (
              <span
                className={"venue-marker venue-marker-" + homeAway}
                role="img"
                aria-label={homeAway === "home" ? "Home game" : "Away game"}
                title={homeAway === "home" ? "Home game" : "Away game"}
              >
                {homeAway === "home" ? (
                  <span className="venue-house-icon" aria-hidden="true">
                    <House size={12} fill="currentColor" strokeWidth={0} />
                    <House size={12} className="venue-house-outline" />
                    <svg
                      className="venue-house-door"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                    >
                      <path d="M9 21v-8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v8z" />
                    </svg>
                  </span>
                ) : (
                  <Plane size={12} fill="currentColor" aria-hidden="true" />
                )}
              </span>
            )}
          </span>
          <span className="compact-match">
            <span className="compact-name">
              <strong>
                {t.individual ? (
                  t.short
                ) : (
                  <a
                    href={gameTeamUrl(g.team, t.name, true, club?.teamId)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t.short}
                  </a>
                )}
              </strong>
              {!g.eventOnly && club && (
                <Location
                  team={g.team}
                  name={club.name}
                  league={g.league}
                  own
                  compact
                />
              )}
            </span>
            {g.eventOnly ? (
              <span>{g.name}</span>
            ) : (
              <span>
                <a
                  href={gameTeamUrl(
                    g.team,
                    opponent,
                    false,
                    opponentCompetitor?.teamId,
                  )}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {opponent}
                </a>
                <Location
                  team={g.team}
                  name={opponent}
                  league={g.league}
                  compact
                />
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
            {showLiveIndicator && (
              <span className="compact-live-indicator" role="status">
                LIVE
              </span>
            )}
            <span className="compact-date">
              {g.state === "pre" ? (
                <AddToCalendar game={g}>
                  {eventDateLabel(g, timeZone)}
                </AddToCalendar>
              ) : eventDateLabel(g, timeZone)}
              {!g.dateOnly && g.state !== "post" && (
                <small className="event-time">
                  {localDateTime(g.date, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}{" "}
                  {zoneLabel}
                </small>
              )}
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
          </span>
          <span className="expand-chevron" aria-hidden="true">
            <ChevronDown size={16} strokeWidth={2.5} />
          </span>
          {hasBadges && (
            <span className="game-card-ribbon compact-card-ribbon">
              <GameBadges game={g} />
            </span>
          )}
        </summary>
        {expanded && resultCap}
        {full}
      </details>
    </div>
  );
}
