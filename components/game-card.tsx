"use client";
import GameBadges from "./game-badges";
import { useState } from "react";
import type { Game } from "../lib/feeds";
import { teams } from "../lib/teams";
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
  return a === b ? "D" : a > b ? "W" : "L";
}
export default function GameCard({
  game: g,
  compact = false,
  revealed,
  revealPast = false,
  onReveal,
}: {
  game: Game;
  compact?: boolean;
  revealed: boolean;
  revealPast?: boolean;
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
  const full = (
    <article className="game">
      <div className="game-top">
        <div className="game-identity">
          <img src={logo} alt="" width={36} height={36} />
          <div>
            <strong>{t.name}</strong>
            <GameBadges game={g} />
            <span className="muted">{g.league}</span>
          </div>
        </div>
        <span className={g.state === "in" ? "live" : ""}>
          {g.state === "post"
            ? "FINAL"
            : g.state === "in"
              ? "LIVE"
              : ct(g.date, { month: "short", day: "numeric" })}
        </span>
      </div>
      {g.eventOnly ? (
        <h3 className="event-name">{g.name}</h3>
      ) : (
        g.competitors.map((p) => (
          <div
            className={"competitor " + (p.winner && !hidden ? "winner" : "")}
            key={p.name}
          >
            <span>
              {p.name}
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
        {g.dateOnly
          ? "Time not listed"
          : g.state === "pre"
            ? ct(g.date, { hour: "numeric", minute: "2-digit" }) + " CT"
            : hidden
              ? g.state === "post"
                ? "Final · result hidden"
                : "Live · score hidden"
              : g.status}
        {g.url && (
          <a
            href={g.state === "pre" ? g.url : g.boxUrl || g.url}
            target="_blank"
            rel="noreferrer"
          >
            {g.state === "pre" ? "Details ↗" : "Box score / match stats ↗"}
          </a>
        )}
      </div>
      {g.state === "post" && (
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
                " full game highlights",
            )
          }
          target="_blank"
          rel="noreferrer"
        >
          ▷ Find full game highlights on YouTube ↗
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
  if (!compact) return full;
  return (
    <details
      className="compact-game"
      onToggle={(e) => {
        if (e.target === e.currentTarget) setExpanded(e.currentTarget.open);
      }}
    >
      <summary>
        <img src={logo} alt="" width={30} height={30} />
        <span className="compact-match">
          <span className="compact-name">
            <strong>{t.short}</strong>
            <GameBadges game={g} />
          </span>
          {g.eventOnly ? <span>{g.name}</span> : <span>vs. {opponent}</span>}
        </span>
        <span className="compact-date">
          {ct(g.date, { month: "short", day: "numeric" })}
          {!g.dateOnly && (
            <small>
              {ct(g.date, { hour: "numeric", minute: "2-digit" })} CT
            </small>
          )}
          {g.state === "post" && (
            <small className={scoreVisible ? "result-" + result : ""}>
              {scoreVisible ? (
                result ? (
                  <>
                    {result}
                    <span className="compact-score">
                      {" "}
                      · {club?.score}–
                      {g.competitors.find((p) => p !== club)?.score}
                    </span>
                  </>
                ) : (
                  "Score unavailable"
                )
              ) : (
                "Result hidden"
              )}
            </small>
          )}
        </span>
        <span className="expand-chevron" aria-hidden="true">
          ⌄
        </span>
      </summary>
      {full}
    </details>
  );
}
