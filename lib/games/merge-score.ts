import type { Game } from "../feeds/feed-types";

function teamName(name: string) {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function sameFixture(previous: Game, incoming: Game) {
  if (previous.team !== incoming.team) return false;
  if (previous.id === incoming.id) return true;
  const gap = Math.abs(Date.parse(previous.date) - Date.parse(incoming.date));
  if (previous.league !== incoming.league || !Number.isFinite(gap) || gap > 15 * 60000)
    return false;
  return previous.competitors.length === 2 && incoming.competitors.length === 2 &&
    previous.competitors.every((player) => incoming.competitors.some((other) => {
      if (player.homeAway !== other.homeAway) return false;
      const a = teamName(player.name), b = teamName(other.name);
      return Boolean(a && b) && (a === b || a.includes(b) || b.includes(a) ||
        (previous.team === "zalgiris" && a.includes("zalgiris") && b.includes("zalgiris")));
    }));
}

function hasScores(game: Game) {
  return (
    game.competitors.length === 2 &&
    game.competitors.every(
      ({ score }) => score.trim() !== "" && Number.isFinite(Number(score)),
    )
  );
}

// A fixture listing is not evidence that an already-started game lost its score.
// Keep fresh fixture metadata, but retain the last known result and its timestamp.
export function mergeScoreUpdate(previous: Game, incoming: Game): Game {
  if (
    !sameFixture(previous, incoming) ||
    !["in", "post"].includes(previous.state) ||
    !hasScores(previous) ||
    incoming.state !== "pre" ||
    /cancel|postpon|resched/i.test(incoming.status)
  )
    return incoming;

  const competitors = incoming.competitors.map((competitor) => {
    const known = previous.competitors.find(
      (player) => player.homeAway === competitor.homeAway,
    );
    return known
      ? { ...competitor, score: known.score, winner: known.winner }
      : competitor;
  });
  if (!hasScores({ ...incoming, competitors })) return incoming;
  return {
    ...incoming,
    state: previous.state,
    status: previous.status,
    sourceChecked: previous.sourceChecked,
    competitors,
  };
}

export function mergeScoreUpdates(previous: Game[], incoming: Game[]): Game[] {
  return incoming.map((game) => {
    const known = previous.find((candidate) => sameFixture(candidate, game));
    return known ? mergeScoreUpdate(known, game) : game;
  });
}
