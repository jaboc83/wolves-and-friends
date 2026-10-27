import { socialTags } from "../../../lib/social/social-tags";
import { taggedBluesky, wolvesBluesky } from "../../../lib/social/bluesky";
import { socialQueue } from "../../../lib/social/social-queue";
import type { Story } from "../../../lib/feeds/feed-types";
import { officialYoutubePosts } from "../../../lib/feeds/youtube";
type SocialData = {
  posts: Story[];
  unavailable: string[];
  youtubeUnavailable: string[];
  checked: string;
};
let cached: SocialData | null = null;
let inflight: Promise<SocialData> | null = null;

async function collect(): Promise<SocialData> {
  const posts: Story[] = [],
    unavailable: string[] = [];
  let youtubeUnavailable: string[] = [];
  await Promise.all([
    officialYoutubePosts().then((data) => {
      posts.push(...data.posts);
      youtubeUnavailable = data.unavailable;
    }),
    wolvesBluesky()
      .then((s) => {
        posts.push(...s);
      })
      .catch(() => {
        unavailable.push("wolves");
      }),
    ...socialTags.map(async ({ team, tags }) => {
      const results = await Promise.allSettled(
        tags.map((tag) => taggedBluesky(team, tag)),
      );
      if (results.some((result) => result.status === "rejected"))
        unavailable.push(team);
      posts.push(
        ...socialQueue(
          results.flatMap((result) =>
            result.status === "fulfilled" ? result.value : [],
          ),
        ),
      );
    }),
  ]);
  return {
    posts: socialQueue([...posts, ...(cached?.posts || [])]),
    unavailable,
    youtubeUnavailable,
    checked: new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  const force = new URL(request.url).searchParams.get("refresh") === "1";
  if (force || !cached || Date.now() - Date.parse(cached.checked) >= 60000) {
    // The larger shared queue is fetched once, never personalized by read state.
    if (!inflight)
      inflight = collect()
        .then((data) => (cached = data))
        .finally(() => {
          inflight = null;
        });
    await inflight;
  }
  return Response.json(cached, { headers: { "Cache-Control": "no-store" } });
}
