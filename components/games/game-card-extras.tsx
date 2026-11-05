// Expandable extras for a game card: injury report, odds, and local-time details.
import { injuryReportUrl } from "../../lib/games/game-links";
import type { Game } from "../../lib/feeds";
import { timeZoneLabel } from "../../lib/browser/local-time";

type GameCardExtrasProps = {
  game: Game;
  today: boolean;
  teamName: string;
  event: string;
  timeZone: string;
  renderedAt: number;
  localDateTime: (
    value: string,
    options?: Intl.DateTimeFormatOptions,
  ) => string;
};

export default function GameCardExtras({
  game,
  today,
  teamName,
  event,
  timeZone,
  renderedAt,
  localDateTime,
}: GameCardExtrasProps) {
  return (
    <>
      {today && injuryReportUrl(game.team) && (
        <details className="injury-report" aria-label="Injury report">
          <summary>
            <strong>Injury report</strong>
            <svg
              className="injury-report-chevron"
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m4 6 4 4 4-4" />
            </svg>
          </summary>
          {game.injuries?.length ? (
            Array.from(
              new Set(
                game.injuries.map(
                  (injury) => injury.team || "Team injury report",
                ),
              ),
            ).map((team) => (
              <div className="injury-team" key={team}>
                <h4>{team}</h4>
                <ul>
                  {game
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
            ))
          ) : (
            <a
              href={injuryReportUrl(game.team)}
              target="_blank"
              rel="noreferrer"
            >
              Injury report ↗
            </a>
          )}
        </details>
      )}
      {game.state === "post" && !game.eventOnly && (
        <a
          className="game-highlights"
          href={
            "https://www.youtube.com/results?search_query=" +
            encodeURIComponent(
              game.name +
                " " +
                teamName +
                " " +
                localDateTime(game.date, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }) +
                ` full ${event} highlights`,
            )
          }
          target="_blank"
          rel="noreferrer"
        >
          ▷ Find full {event} highlights on YouTube ↗
        </a>
      )}
      {game.state !== "post" && !game.eventOnly && (
        <div className="game-odds">
          {game.odds ? (
            <>
              <b>{game.odds.favorite}</b>
              <details className="odds-details">
                <summary>Odds details</summary>
                <p>{game.odds.lines.join(" · ")}</p>
                <a href={game.odds.url} target="_blank" rel="noreferrer">
                  {game.odds.source} ↗
                </a>
                <small>
                  Checked{" "}
                  {localDateTime(game.odds.checked, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}{" "}
                  {timeZoneLabel(timeZone, game.odds.checked)} · odds can change
                </small>
                {renderedAt - Date.parse(game.odds.checked) > 15 * 60000 && (
                  <small>Cached odds; check source for current prices.</small>
                )}
              </details>
            </>
          ) : (
            <span>Current odds unavailable</span>
          )}
        </div>
      )}
      {game.state !== "post" && (
        <p className="venue">
          {game.venue}
          {game.broadcast && (
            <>
              <br />
              {game.broadcast}
            </>
          )}
        </p>
      )}
      {game.sourceName && <p className="source-game">{game.sourceName}</p>}
    </>
  );
}
