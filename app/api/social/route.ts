import { socialTags } from "../../../lib/social-tags";
import { taggedBluesky, wolvesBluesky } from "../../../lib/bluesky";
import { socialQueue } from "../../../lib/social-queue";
import type { Story } from "../../../lib/feeds";
type SocialData = { posts: Story[]; unavailable: string[]; checked: string };
let cached: SocialData | null = null;
let inflight: Promise<SocialData> | null = null;

async function collect(): Promise<SocialData> {
  const posts: Story[] = [],
    unavailable: string[] = [];
  await Promise.all([
    wolvesBluesky()
      .then((s) => {
        posts.push(...s);
      })
      .catch(() => {
        unavailable.push("wolves");
      }),
    ...Object.entries(socialTags).map(async ([team, tags]) => {
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
    checked: new Date().toISOString(),
  };
}

export async function GET() {
  if (!cached || Date.now() - Date.parse(cached.checked) >= 60000) {
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
