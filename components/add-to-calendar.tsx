import type { MouseEvent } from "react";
import type { Game } from "../lib/feeds";
import { googleCalendarUrl } from "../lib/calendar-event";

export default function AddToCalendar({
  game,
  compact = false,
}: {
  game: Game;
  compact?: boolean;
}) {
  function keepGameClosed(event: MouseEvent<HTMLAnchorElement>) {
    event.stopPropagation();
  }

  return (
    <a
      className={"add-calendar" + (compact ? " add-calendar-compact" : "")}
      href={googleCalendarUrl(game)}
      target="_blank"
      rel="noreferrer"
      onClick={keepGameClosed}
    >
      <span aria-hidden="true">＋</span> Add to calendar
    </a>
  );
}
