// Renders the competition and season badges for a game card.
import type { Game } from "../../lib/feeds";
import { gameBadges } from "../../lib/games/game-badges";
export default function GameBadges({ game }: { game: Game }) {
  const badges = gameBadges(game);
  return badges.length ? (
    <span className="game-badges">
      {badges.map((b) => (
        <span key={b.label} className={"game-badge badge-" + b.tone}>
          {b.label}
        </span>
      ))}
    </span>
  ) : null;
}
