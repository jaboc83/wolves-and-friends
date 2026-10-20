import type { Story } from "./feeds";

export const SOCIAL_QUEUE_LIMIT = 50;

// One bounded queue per team; deduplicate cross-tag posts without losing teams.
export function socialQueue(
  posts: Story[],
  limit = SOCIAL_QUEUE_LIMIT,
): Story[] {
  const unique = new Map<string, Story>();
  for (const post of posts) {
    if (
      post.kind !== "social" ||
      !Number.isFinite(Date.parse(post.date)) ||
      /twins daily/i.test(post.source)
    )
      continue;
    const old = unique.get(post.url);
    unique.set(
      post.url,
      old
        ? { ...old, teams: [...new Set([...old.teams, ...post.teams])] }
        : { ...post, teams: [...post.teams] },
    );
  }
  const counts = new Map<string, number>();
  return [...unique.values()]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .flatMap((post) => {
      const teams = post.teams.filter(
        (team) => (counts.get(team) || 0) < limit,
      );
      for (const team of teams) counts.set(team, (counts.get(team) || 0) + 1);
      return teams.length ? [{ ...post, teams }] : [];
    });
}

export function unreadSocial(
  posts: Story[],
  active: string,
  readIds: string[],
) {
  const read = new Set(readIds);
  return socialQueue(posts)
    .filter(
      (post) =>
        (active === "all" || post.teams.includes(active)) && !read.has(post.id),
    )
    .slice(0, active === "all" ? 2 : 5);
}
