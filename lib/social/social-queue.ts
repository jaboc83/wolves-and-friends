// Deduplicates and bounds social stories, then selects unread items for the active team.
import type { Story } from "../feeds/feed-types";
import type { DashboardPageId } from "../dashboard/page-id";

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

export const VIDEO_QUEUE_LIMIT = 60;

// Videos get their own queue per channel so frequent posts can't push them out.
export function socialFeedQueue(posts: Story[]): Story[] {
  const isVideo = (post: Story) => post.socialPlatform === "youtube";
  return [
    ...socialQueue(posts.filter((post) => !isVideo(post))),
    ...[...new Set(posts.filter(isVideo).map((post) => post.source))].flatMap(
      (source) =>
        socialQueue(
          posts.filter((post) => isVideo(post) && post.source === source),
          VIDEO_QUEUE_LIMIT,
        ),
    ),
  ];
}

export function unreadSocial(
  posts: Story[],
  active: DashboardPageId,
  readIds: string[],
  limit = active === "all" ? 2 : 5,
) {
  const read = new Set(readIds);
  return socialQueue(posts)
    .filter(
      (post) =>
        (active === "all" ||
          (active !== "march-madness" && post.teams.includes(active))) &&
        !read.has(post.id),
    )
    .slice(0, limit);
}
