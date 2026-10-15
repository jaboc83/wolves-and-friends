import { socialTags } from "../../../lib/social-tags";
import {
  parseBlueskyFeed,
  wolvesBluesky,
  inlineAvatars,
} from "../../../lib/bluesky";
import type { Story } from "../../../lib/feeds";
let cached: { posts: Story[]; unavailable: string[]; checked: string } | null =
  null;
export async function GET() {
  if (cached && Date.now() - Date.parse(cached.checked) < 60000)
    return Response.json(cached, { headers: { "Cache-Control": "no-store" } });
  const posts: Story[] = [],
    unavailable: string[] = [];
  await Promise.all([
    wolvesBluesky(3, false)
      .then((s) => posts.push(...s))
      .catch(() => unavailable.push("wolves")),
    ...Object.entries(socialTags).map(async ([team, tags]) => {
      const results = await Promise.allSettled(
        tags.map(async (tag) => {
          const r = await fetch(
            "https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=" +
              encodeURIComponent(tag) +
              "&sort=latest&limit=20",
            { signal: AbortSignal.timeout(10000) },
          );
          if (!r.ok) throw Error();
          const d = (await r.json()) as any;
          const parsed = parseBlueskyFeed(
            { feed: (d.posts || []).map((post: any) => ({ post })) },
            team,
            new RegExp(
              tag.replace(/^#/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
              "i",
            ),
          );
          return parsed;
        }),
      );
      if (results.some((result) => result.status === "rejected"))
        unavailable.push(team);
      // Keep successful tags when another fails, and apply the team limit
      // after merging so posts carrying both tags appear only once.
      const teamPosts = results.flatMap((result) =>
        result.status === "fulfilled" ? result.value : [],
      );
      posts.push(
        ...[...new Map(teamPosts.map((post) => [post.url, post])).values()]
          .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
          .slice(0, 3),
      );
    }),
  ]);
  const merged = new Map<string, Story>();
  for (const p of posts) {
    const old = merged.get(p.url);
    if (old) old.teams = [...new Set([...old.teams, ...p.teams])];
    else merged.set(p.url, p);
  }
  const unique = [...merged.values()];
  await inlineAvatars(unique);
  cached = { posts: unique, unavailable, checked: new Date().toISOString() };
  return Response.json(cached, { headers: { "Cache-Control": "no-store" } });
}
