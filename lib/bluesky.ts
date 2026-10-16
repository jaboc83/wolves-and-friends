import type { Story } from "./feeds";
import { blueskyImageUrl } from "./bluesky-images";
import { socialQueue, SOCIAL_QUEUE_LIMIT } from "./social-queue";
export const wolvesList =
  "at://did:plc:7giugsiydb7mj2j3a5u6nuyn/app.bsky.graph.list/3lal4p6r7w62f";
const wolvesPattern =
  /timberwolves|\bwolves\b|timbies|anthony edwards|\bant\b|naz reid|jaden mcdaniels|rudy gobert|lamelo ball|jonathan kuminga|chris finch|ayo dosunmu|canis hoopus/i;
export function parseBlueskyFeed(
  json: any,
  team = "wolves",
  pattern: RegExp = wolvesPattern,
): Story[] {
  return (json.feed || []).flatMap((item: any) => {
    const p = item.post,
      r = p?.record,
      a = p?.author;
    if (
      !r ||
      r.reply ||
      item.reason ||
      !a?.handle ||
      p.labels?.some((l: any) =>
        ["!hide", "!warn", "porn", "sexual", "graphic-media"].includes(l.val),
      )
    )
      return [];
    const title = String(r.text || "").trim();
    const context =
      title +
      " " +
      (p.embed?.external?.title || "") +
      " " +
      (p.embed?.record?.value?.text || "");
    if (
      !pattern.test(context) ||
      !title ||
      !Number.isFinite(Date.parse(r.createdAt))
    )
      return [];
    const key = p.uri?.split("/").pop();
    if (!key) return [];
    const url =
      "https://bsky.app/profile/" +
      encodeURIComponent(a.handle) +
      "/post/" +
      encodeURIComponent(key);
    const embed =
      p.embed?.$type === "app.bsky.embed.recordWithMedia#view"
        ? p.embed.media
        : p.embed;
    const images: NonNullable<Story["images"]> =
      embed?.$type === "app.bsky.embed.images#view"
        ? (embed.images || []).slice(0, 4).flatMap((image: any) => {
            const src = blueskyImageUrl(image.thumb || image.fullsize, "photo");
            if (!src) return [];
            const width = Number(image.aspectRatio?.width),
              height = Number(image.aspectRatio?.height);
            return [
              {
                src,
                alt: String(image.alt || "Photo attached to Bluesky post"),
                ...(width > 0 &&
                height > 0 &&
                Number.isFinite(width) &&
                Number.isFinite(height)
                  ? { width, height }
                  : {}),
              },
            ];
          })
        : [];
    return [
      {
        id: url,
        url,
        title,
        date: r.createdAt,
        source: "Bluesky · " + (a.displayName?.trim() || a.handle),
        teams: [team],
        kind: "social",
        avatar: blueskyImageUrl(a.avatar, "avatar"),
        ...(images.length ? { images } : {}),
      },
    ];
  });
}
export async function wolvesBluesky(limit = SOCIAL_QUEUE_LIMIT) {
  const stories: Story[] = [];
  let cursor = "";
  for (let page = 0; page < 5; page++) {
    const r = await fetch(
      "https://public.api.bsky.app/xrpc/app.bsky.feed.getListFeed?list=" +
        encodeURIComponent(wolvesList) +
        "&limit=100" +
        (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
      { signal: AbortSignal.timeout(10000) },
    );
    if (!r.ok) throw Error("Bluesky feed unavailable");
    const json = (await r.json()) as any;
    stories.push(...parseBlueskyFeed(json));
    cursor = json.cursor || "";
    if (!cursor || socialQueue(stories, limit).length >= limit) break;
  }
  const latest = [...new Map(stories.map((s) => [s.url, s])).values()]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, limit);
  return latest;
}

export async function taggedBluesky(team: string, tag: string) {
  const stories: Story[] = [];
  let cursor = "";
  const pattern = new RegExp(
    tag.replace(/^#/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    "i",
  );
  for (let page = 0; page < 3; page++) {
    const r = await fetch(
      "https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=" +
        encodeURIComponent(tag) +
        "&sort=latest&limit=100" +
        (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
      { signal: AbortSignal.timeout(10000) },
    );
    if (!r.ok) {
      if (stories.length) break;
      throw Error("Bluesky search unavailable");
    }
    const json = (await r.json()) as any;
    stories.push(
      ...parseBlueskyFeed(
        { feed: (json.posts || []).map((post: any) => ({ post })) },
        team,
        pattern,
      ),
    );
    const next = json.cursor || "";
    if (
      !next ||
      next === cursor ||
      socialQueue(stories).length >= SOCIAL_QUEUE_LIMIT
    )
      break;
    cursor = next;
  }
  return socialQueue(stories);
}
