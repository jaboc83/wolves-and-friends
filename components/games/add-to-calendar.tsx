// Link that adds a game to Google Calendar without toggling the surrounding card.
import type { MouseEvent } from "react";
import type { Game } from "../../lib/feeds";
import { googleCalendarUrl } from "../../lib/games/calendar-event";

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
      aria-label={`Add ${game.name} to Google Calendar`}
      title="Add to Google Calendar"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4M17 3v4M3 10h18M12 13v5M9.5 15.5h5" />
      </svg>
    </a>
  );
}
