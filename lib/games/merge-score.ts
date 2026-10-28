import type { Game } from "../feeds/feed-types";

function sameFixture(previous: Game, incoming: Game) {
  return (
    previous.team === incoming.team &&
    (previous.id === incoming.id ||
      (previous.league === incoming.league &&
        Math.abs(Date.parse(previous.date) - Date.parse(incoming.date)) <
          3 * 3600000))
  );
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
