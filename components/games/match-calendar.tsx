// Day-by-day calendar of a team's games in the visitor's local time zone.
"use client";
import GameBadges from "./game-badges";
import { matchup, outcome } from "./game-card";
import AddToCalendar from "./add-to-calendar";
import { useState } from "react";
import { CalendarDays } from "lucide-react";
import type { Game } from "../../lib/feeds";
import { teams } from "../../lib/teams/teams";
import { sportTerms } from "../../lib/teams/sport-terms";
import { teamLogoPath } from "../../lib/teams/team-logo";
import type { DashboardPageId } from "../../lib/dashboard/page-id";
import Image from "next/image";
import { useLocalTimeZone } from "../../hooks/use-local-time-zone";
import { gameDay } from "../../lib/games/event-time";
import {
  dayInTimeZone,
  formatInTimeZone,
  timeZoneLabel,
} from "../../lib/browser/local-time";
// Calendar-specific fills; teams not listed fall back to their brand color.
const calendarColors: Record<string, string> = {
  wolves: "#236192",
  palace: "#c8202f",
  wild: "#2a7a4b",
  lynx: "#6cc6ee",
  vikings: "#4f2683",
  frost: "#c3b1e6",
  twins: "#0c2340",
  loons: "#a7afb8",
};
// Completed games show their result, which stays hidden with the scores toggle.
function completedResult(g: Game, reveal: boolean) {
  if (!reveal) return "Result hidden";
  if (g.eventOnly && g.eventResults?.length)
    return g.eventResults.map((r) => `${r.division}: ${r.name}`).join(" · ");
  const { club } = matchup(g);
  const other = g.competitors.find((p) => p !== club);
  const result = outcome(g);
  if (!club || !other || !result) return "Score unavailable";
  return (
    <>
      <span className={"agenda-result cap-" + result}>{result}</span>{" "}
      {club.score}–{other.score}
    </>
  );
}
export default function MatchCalendar({
  games,
  team = "all",
  revealResults = false,
}: {
  games: Game[];
  team?: DashboardPageId;
  revealResults?: boolean;
}) {
  const timeZone = useLocalTimeZone();
  const terms = sportTerms(team);
  const today = dayInTimeZone(new Date(), timeZone);
  const zoneLabel = timeZoneLabel(timeZone);
  const [calendarSelection, setCalendarSelection] = useState<{
    timeZone: string;
    month: string;
    selected: string;
  } | null>(null);
  const calendar =
    calendarSelection?.timeZone === timeZone
      ? calendarSelection
      : { timeZone, month: today.slice(0, 7), selected: today };
  const { month, selected } = calendar;
  const [year, num] = month.split("-").map(Number),
    start = new Date(Date.UTC(year, num - 1, 1)),
    days = new Date(Date.UTC(year, num, 0)).getUTCDate();
  function shift(delta: number) {
    const d = new Date(Date.UTC(year, num - 1 + delta, 1));
    setCalendarSelection({
      timeZone,
      month: d.toISOString().slice(0, 7),
      selected: d.toISOString().slice(0, 10),
    });
  }
  const matches = (day: string) =>
    games.filter(
      (g) =>
        gameDay(g, g.date, timeZone) === day ||
        (g.endDate &&
          gameDay(g, g.date, timeZone) <= day &&
          gameDay(g, g.endDate, timeZone) >= day),
    );
  const active = matches(selected);
  return (
    <details
      id="event-calendar"
      className="calendar-panel data-panel"
      open={team === "all"}
    >
      <summary>
        <CalendarDays className="summary-icon" aria-hidden="true" />
        {terms.calendar}
      </summary>
      <p className="panel-note">
        Past and upcoming {terms.events} · Times shown in {zoneLabel} ·
        available schedule feeds
      </p>
      <div className="calendar-controls">
        <button aria-label="Previous month" onClick={() => shift(-1)}>
          ‹
        </button>
        <strong>
          {start.toLocaleDateString("en-US", {
            timeZone: "UTC",
            month: "long",
            year: "numeric",
          })}
        </strong>
        <button aria-label="Next month" onClick={() => shift(1)}>
          ›
        </button>
      </div>
      <div className="calendar-grid">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
          <span className="calendar-weekday" key={w}>
            {w}
          </span>
        ))}
        {Array.from({ length: start.getUTCDay() }, (_, i) => (
          <span key={"blank" + i} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const date = month + "-" + String(i + 1).padStart(2, "0"),
            events = matches(date),
            outcomes = events.map(outcome),
            results = outcomes.every(Boolean) ? outcomes : [],
            colors = [...new Set(events.map((e) => e.team))]
              .map(
                (id) =>
                  calendarColors[id] ?? teams.find((t) => t.id === id)?.color,
              )
              .filter((c): c is NonNullable<typeof c> => !!c),
            step = 100 / (colors.length || 1),
            // Hard color stops split the day evenly between the teams playing.
            background = colors.length
              ? colors.length === 1
                ? colors[0]
                : `linear-gradient(90deg, ${colors
                    .map((c, n) => `${c} ${n * step}% ${(n + 1) * step}%`)
                    .join(", ")})`
              : undefined;
          return (
            <button
              key={date}
              className={
                "calendar-day " +
                (colors.length ? "has-event " : "") +
                (date === selected ? "selected " : "") +
                (date === today ? "is-today " : "") +
                (date < today ? "is-past" : "")
              }
              aria-label={
                date +
                (date < today ? " (past)" : "") +
                ", " +
                events.length +
                " " +
                (events.length === 1 ? terms.event : terms.events)
              }
              style={background ? { background } : undefined}
              aria-pressed={selected === date}
              onClick={() =>
                setCalendarSelection({ ...calendar, selected: date })
              }
            >
              <b>{i + 1}</b>
              {events.length > 0 &&
                (team !== "all" && revealResults && results.length ? (
                  <small className="day-results">
                    {results.map((r, n) => (
                      <span className={"agenda-result cap-" + r} key={n}>
                        {r}
                      </span>
                    ))}
                  </small>
                ) : (
                  <small>{events.length}</small>
                ))}
            </button>
          );
        })}
      </div>
      <div className="calendar-agenda">
        <h4>
          {new Date(selected + "T00:00:00Z").toLocaleDateString("en-US", {
            timeZone: "UTC",
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </h4>
        {active.length ? (
          active.map((g) => {
            const t = teams.find((t) => t.id === g.team);
            return (
              <div className="calendar-agenda-game" key={g.id}>
                <a
                  className="calendar-agenda-link"
                  href={g.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Image
                    unoptimized
                    src={teamLogoPath(g.team)}
                    alt=""
                    width={24}
                    height={24}
                  />
                  <span>
                    <b>{t?.short}</b> <GameBadges game={g} /> · {g.name}
                    <small className={g.dateOnly ? undefined : "event-time"}>
                      {g.state === "post"
                        ? completedResult(g, revealResults)
                        : g.dateOnly
                          ? "Time not listed"
                          : formatInTimeZone(g.date, timeZone, {
                              hour: "numeric",
                              minute: "2-digit",
                            }) +
                            " " +
                            timeZoneLabel(timeZone, g.date)}
                    </small>
                  </span>
                </a>
                {g.state === "pre" && (
                  <AddToCalendar game={g}>
                    {formatInTimeZone(g.date, timeZone, {
                      month: "short",
                      day: "numeric",
                    })}
                  </AddToCalendar>
                )}
              </div>
            );
          })
        ) : (
          <p>No {terms.event} in the available feeds for this day.</p>
        )}
      </div>
    </details>
  );
}
