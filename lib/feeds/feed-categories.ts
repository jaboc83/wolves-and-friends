// Maps a feed item's publisher categories (domain attribute or label text) to team ids.
import type { TeamId } from "../teams/teams";

export function categoryTeamIds(
  block: string,
  categoryTeams: Readonly<Record<string, TeamId>>,
): TeamId[] {
  const keys: string[] = [];
  for (const m of block.matchAll(
    /<category\b([^>]*)>(?:\s*<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))?/gi,
  )) {
    const domain = m[1].match(/domain=["']([^"']+)["']/i)?.[1];
    if (domain) keys.push(domain);
    const label = (m[2] ?? m[3] ?? "").trim();
    if (label) keys.push(label);
  }
  return [
    ...new Set(
      keys.map((k) => categoryTeams[k]).filter((id): id is TeamId => !!id),
    ),
  ];
}
