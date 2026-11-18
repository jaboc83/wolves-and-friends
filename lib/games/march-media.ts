// Matches NCAA March Madness channel highlight videos to bracket games by team names.
import type { Story } from "../feeds/feed-types.ts";
import type { MarchGame } from "./march-madness.ts";

// "UConn vs. Duke: 2026 March Madness Elite Eight highlights"
const MATCHUP = /^(.+?)\s+vs\.?\s+(.+?)\s*[:|]/i;
const TOURNAMENT_ROUND =
  /\b(?:ncaa tournament|march madness|first four|first round|second round|sweet 16|elite eight|final four|championship)\b/i;
const HIGHLIGHTS = /\bhighlights\b/i;

const normalize = (name: string) =>
  name
    .toLowerCase()
    .replace(/\bst\.?(?=\s|$)/g, "state")
    .replace(/[^a-z0-9]+/g, "");

export function marchHighlights(
  game: MarchGame,
  videos: Story[],
  year: number,
): Story | undefined {
  const names = new Set(game.teams.map((team) => normalize(team.name)));
  if (names.size !== 2) return undefined;
  return videos.find((video) => {
    if (
      !HIGHLIGHTS.test(video.title) ||
      !TOURNAMENT_ROUND.test(video.title) ||
      !video.title.includes(String(year))
    )
      return false;
    const match = MATCHUP.exec(video.title);
    if (!match) return false;
    return (
      names.has(normalize(match[1])) &&
      names.has(normalize(match[2])) &&
      normalize(match[1]) !== normalize(match[2])
    );
  });
}
