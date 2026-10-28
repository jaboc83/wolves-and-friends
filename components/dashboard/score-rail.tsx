// Right-hand rail listing today's/upcoming games and recent results, with score-hiding controls.
"use client";
import type { ReactNode } from "react";
import type { Game } from "../../lib/feeds";

type ScoreRailProps = {
  futureGames: Game[];
  results: Game[];
  availableResults: Game[];
  event: string;
  loading: boolean;
  showOlderResults: boolean;
  activeIsAll: boolean;
  activeScoreboardUrl?: string;
  teamShort?: string;
  onToggleOlderResults: () => void;
  renderGame: (game: Game, compact?: boolean) => ReactNode;
};

export default function ScoreRail({
  futureGames,
  results,
  availableResults,
  event,
  loading,
  showOlderResults,
  activeIsAll,
  activeScoreboardUrl,
  teamShort,
  onToggleOlderResults,
  renderGame,
}: ScoreRailProps) {
  return (
    <aside className="scores">
      <div className="rail-heading upcoming-heading">
        <h2>Coming up</h2>
      </div>
      {futureGames.length ? (
        futureGames.map((game) => renderGame(game, true))
      ) : (
        <div className="empty compact">
          No upcoming {event} returned by the available feeds.
        </div>
      )}
      <div className="rail-heading results">
        <h2>Recent results</h2>
      </div>
      {results.length ? (
        results.map((game) => renderGame(game, true))
      ) : (
        <div className="empty compact">
          {loading
            ? "Checking results…"
            : `No completed ${event} returned by the available feeds.`}
        </div>
      )}
      {!activeIsAll && availableResults.length > 3 && (
        <button
          type="button"
          className="results-toggle"
          aria-expanded={showOlderResults}
          onClick={onToggleOlderResults}
        >
          {showOlderResults
            ? "Hide older"
            : `Show older (${availableResults.length - 3})`}
        </button>
      )}
      {activeScoreboardUrl && (
        <div className="score-note">
          <b>More scoreboards</b>
          <p>
            {teamShort} scoring pages provide additional coverage beyond the
            imported schedules.
          </p>
          <a href={activeScoreboardUrl} target="_blank" rel="noreferrer">
            {teamShort} scoreboard ↗
          </a>
        </div>
      )}
    </aside>
  );
}
