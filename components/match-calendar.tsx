"use client";
import GameBadges from "./game-badges";
import { useState } from "react";
import type { Game } from "../lib/feeds";
import { teams } from "../lib/teams";
import { sportTerms } from "../lib/sport-terms";
const key = (date: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
export default function MatchCalendar({
  games,
  team = "all",
}: {
  games: Game[];
  team?: string;
}) {
  const terms = sportTerms(team);
  const today = key(new Date().toISOString());
  const [month, setMonth] = useState(() => today.slice(0, 7)),
    [selected, setSelected] = useState(today);
  const [year, num] = month.split("-").map(Number),
    start = new Date(Date.UTC(year, num - 1, 1)),
    days = new Date(Date.UTC(year, num, 0)).getUTCDate();
  function shift(delta: number) {
    const d = new Date(Date.UTC(year, num - 1 + delta, 1));
    setMonth(d.toISOString().slice(0, 7));
    setSelected(d.toISOString().slice(0, 10));
  }
  const matches = (day: string) =>
    games.filter(
      (g) =>
        key(g.date) === day ||
        (g.endDate && key(g.date) <= day && key(g.endDate) >= day),
    );
  const active = matches(selected);
  return (
    <details id="event-calendar" className="calendar-panel data-panel">
      <summary>{terms.calendar}</summary>
      <p className="panel-note">
        Past and upcoming {terms.events} · Central Time · available schedule
        feeds
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
              onClick={() => setSelected(date)}
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
              <a key={g.id} href={g.url} target="_blank" rel="noreferrer">
                <img
                  src={
                    "/logos/" + g.team + (g.team === "disc" ? ".svg" : ".png")
                  }
                  alt=""
                  width={24}
                  height={24}
                />
                <span>
                  <b>{t?.short}</b> <GameBadges game={g} /> · {g.name}
                  <small>
                    {g.dateOnly
                      ? "Time not listed"
                      : new Date(g.date).toLocaleTimeString("en-US", {
                          timeZone: "America/Chicago",
                          hour: "numeric",
                          minute: "2-digit",
                        }) + " CT"}
                  </small>
                </span>
              </a>
            );
          })
        ) : (
          <p>No {terms.event} in the available feeds for this day.</p>
        )}
      </div>
    </details>
  );
}
