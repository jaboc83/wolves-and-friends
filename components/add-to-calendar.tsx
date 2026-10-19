"use client";
import type { Game } from "../lib/feeds";
import { calendarFile, googleCalendarUrl } from "../lib/calendar-event";
export default function AddToCalendar({ game }: { game: Game }) {
  function download() {
    const url = URL.createObjectURL(
      new Blob([calendarFile(game)], { type: "text/calendar;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = game.name.replace(/[^a-z0-9]+/gi, "-").slice(0, 80) + ".ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  return (
    <details className="add-calendar">
      <summary>Add to calendar</summary>
      <div>
        <a href={googleCalendarUrl(game)} target="_blank" rel="noreferrer">
          Google Calendar ↗
        </a>
        <button type="button" onClick={download}>
          Apple / Outlook / phone calendar (.ics)
        </button>
      </div>
    </details>
  );
}
