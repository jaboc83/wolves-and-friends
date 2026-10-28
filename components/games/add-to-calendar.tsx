// Link that adds a game to Google Calendar without toggling the surrounding card.
import type { MouseEvent, ReactNode } from "react";
import type { Game } from "../../lib/feeds";
import { googleCalendarUrl } from "../../lib/games/calendar-event";

export default function AddToCalendar({
  game,
  children,
}: {
  game: Game;
  children: ReactNode;
}) {
  function keepGameClosed(event: MouseEvent<HTMLAnchorElement>) {
    event.stopPropagation();
  }

  return (
    <a
      className="add-calendar"
      href={googleCalendarUrl(game)}
      target="_blank"
      rel="noreferrer"
      onClick={keepGameClosed}
      aria-label={`Add ${game.name} to Google Calendar`}
      title="Add to Google Calendar"
    >
      {children}
    </a>
  );
}
