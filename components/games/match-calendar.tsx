// Day-by-day calendar of a team's games in the visitor's local time zone.
"use client";
import GameBadges from "./game-badges";
import AddToCalendar from "./add-to-calendar";
import { useState } from "react";
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
export default function MatchCalendar({
  games,
  team = "all",
}: {
  games: Game[];
  team?: DashboardPageId;
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
    <details id="event-calendar" className="calendar-panel data-panel">
      <summary>{terms.calendar}</summary>
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
            events = matches(date);
          return (
            <button
              key={date}
              className={
                "calendar-day " +
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
              aria-pressed={selected === date}
              onClick={() =>
                setCalendarSelection({ ...calendar, selected: date })
              }
            >
              <b>{i + 1}</b>
              <span className="calendar-dots">
                {[...new Set(events.map((e) => e.team))]
                  .slice(0, 4)
                  .map((id) => (
                    <i
                      key={id}
                      style={{
                        background: teams.find((t) => t.id === id)?.color,
                      }}
                    />
                  ))}
              </span>
              {events.length > 0 && <small>{events.length}</small>}
            </button>
          );
        })}
      </div>
      <div className="calendar-agenda">
        <h4>{selected}</h4>
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
                      {g.dateOnly
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
