import type { Game } from "../lib/feeds";
import { gameBadges } from "../lib/game-badges";
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
