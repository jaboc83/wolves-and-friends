// Reads configured official team channels and converts their public videos into stories.
import type { Story } from "./feed-types";
import type { TeamId } from "../teams/teams";
import type { TeamProviders } from "../teams/team-types";
import { teamProviders } from "../teams/providers";
// Official channels are configured in lib/teams/<id>/providers.ts.
export const officialYoutube: ({ team: TeamId } & NonNullable<
  TeamProviders["youtube"]
>)[] = teamProviders.flatMap((p) =>
  [p.youtube, ...(p.extraYoutube || [])].flatMap((y) =>
    y ? [{ team: p.team, ...y }] : [],
  ),
);
const channels = new Map<string, string>();
async function getText(url: string) {
  const r = await fetch(url, {
    credentials: "omit",
    referrerPolicy: "no-referrer",
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw Error("Official YouTube feed unavailable");
  return r.text();
}
export function youtubeChannelId(html: string) {
  return (
    html.match(
      /<link\b[^>]*href=["']https:\/\/(?:www\.)?youtube\.com\/channel\/(UC[\w-]{22})["']/i,
    )?.[1] ||
    html.match(/"externalId"\s*:\s*"(UC[\w-]{22})"/)?.[1] ||
    html.match(
      /<meta\b[^>]*itemprop=["']channelId["'][^>]*content=["'](UC[\w-]{22})["']/i,
    )?.[1]
  );
}
const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
export function parseYoutube(
  xml: string,
  source: (typeof officialYoutube)[number],
  channel: string,
): Story[] {
  const feedChannel = xml.match(/<yt:channelId>([^<]+)<\/yt:channelId>/)?.[1];
  // Channel feeds omit the "UC" prefix that playlist feeds and URLs include.
  if (!feedChannel || feedChannel.replace(/^UC/, "") !== channel.replace(/^UC/, ""))
    throw Error("Unexpected YouTube channel");
  return [...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/g)].flatMap(
    (m) => {
      const entry = m[1],
        id = entry.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/)?.[1];
      const title = decode(
          entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "",
        ),
        date = entry.match(/<published>([^<]+)<\/published>/)?.[1] || "";
      if (
        !id ||
        !title ||
        !Number.isFinite(Date.parse(date)) ||
        (source.pattern && !source.pattern.test(title))
      )
        return [];
      const url = "https://www.youtube.com/watch?v=" + id;
      return [
        {
          id: url,
          url,
          title,
          date,
          thumbnail: "/api/video-thumb?id=" + id,
          teams: [source.team],
          source: "YouTube · " + source.name,
          kind: "social",
          socialPlatform: "youtube" as const,
        },
      ];
    },
  );
}
export function parseYoutubePage(
  html: string,
  source: (typeof officialYoutube)[number],
): Story[] {
  const posts: Story[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(/"videoId":"([\\w-]{11})"/g)) {
    const id = match[1];
    if (seen.has(id)) continue;
    const start = Math.max(0, (match.index || 0) - 2500);
    const end = Math.min(html.length, (match.index || 0) + 2500);
    const window = html.slice(start, end);
    const rawTitle = window.match(
      /"title":\{"runs":\[\{"text":"((?:\\\\.|[^"\\])*)"/,
    )?.[1];
    if (!rawTitle) continue;
    let title = rawTitle;
    try {
      title = JSON.parse('"' + rawTitle.replace(/"/g, '\\"') + '"');
    } catch {}
    if (!title || (source.pattern && !source.pattern.test(title))) continue;
    const url = "https://www.youtube.com/watch?v=" + id;
    seen.add(id);
    posts.push({
      id: url,
      url,
      title: decode(title),
      thumbnail: "/api/video-thumb?id=" + id,
      date: new Date().toISOString(),
      dateApproximate: true,
      teams: [source.team],
      source: "YouTube · " + source.name,
      kind: "social",
      socialPlatform: "youtube" as const,
    });
    if (posts.length >= 8) break;
  }
  return posts;
}

const AGO_MS = {
  second: 1000,
  minute: 60000,
  hour: 3600000,
  day: 86400000,
  week: 604800000,
  month: 2592000000,
  year: 31536000000,
};
// Feeds only expose the newest 15 videos; the playlist page lists many more with relative ages.
export function parsePlaylistPage(
  html: string,
  source: (typeof officialYoutube)[number],
  now = Date.now(),
  limit = 60,
  minSeconds = 0,
): Story[] {
  const posts: Story[] = [];
  for (const chunk of html.split('"lockupViewModel":{').slice(1)) {
    const id = chunk.match(/"contentId":"([\w-]{11})"/)?.[1];
    // The duration badge ("0:28", "1:02:10") is the only Shorts signal in playlist markup.
    const clock = chunk.match(/"text":"(\d+(?::\d\d)+)"/)?.[1];
    if (
      minSeconds &&
      clock &&
      clock.split(":").reduce((total, part) => total * 60 + Number(part), 0) <
        minSeconds
    )
      continue;
    const rawTitle = chunk.match(
      /"lockupMetadataViewModel":\{"title":\{"content":"((?:\\.|[^"\\])*)"/,
    )?.[1];
    const ago = chunk.match(
      /"accessibilityLabel":"(?:Streamed )?(\d+) (second|minute|hour|day|week|month|year)s? ago"/,
    );
    if (!id || !rawTitle || !ago) continue;
    let title = rawTitle;
    try {
      title = JSON.parse('"' + rawTitle + '"');
    } catch {}
    if (source.pattern && !source.pattern.test(title)) continue;
    const url = "https://www.youtube.com/watch?v=" + id;
    posts.push({
      id: url,
      url,
      title: decode(title),
      thumbnail: "/api/video-thumb?id=" + id,
      date: new Date(
        now - Number(ago[1]) * AGO_MS[ago[2] as keyof typeof AGO_MS],
      ).toISOString(),
      dateApproximate: true,
      teams: [source.team],
      source: "YouTube · " + source.name,
      kind: "social",
      socialPlatform: "youtube" as const,
    });
    if (posts.length >= limit) break;
  }
  return posts;
}

// Lists the channel's per-game playlists ("Week N | Vikings vs. …"), newest first.
export function parseGamePlaylists(html: string) {
  const lists: { id: string; title: string }[] = [];
  for (const chunk of html.split('"lockupViewModel":{').slice(1)) {
    const id = chunk.match(/"contentId":"(PL[\w-]+)"/)?.[1];
    const raw = chunk.match(
      /"lockupMetadataViewModel":\{"title":\{"content":"((?:\\.|[^"\\])*)"/,
    )?.[1];
    if (!id || !raw) continue;
    let title = raw;
    try {
      title = JSON.parse('"' + raw + '"');
    } catch {}
    title = decode(title);
    if (/\|[^|]*\b(?:vs\.?|at)\s/i.test(title) && !lists.some((l) => l.id === id))
      lists.push({ id, title });
  }
  return lists;
}

const GAME_PLAYLIST_COUNT = 3;
const GAME_PLAYLIST_VIDEOS = 40;
// Game playlists mix in Shorts; clips of a minute or less are dropped.
const SHORTS_MAX_SECONDS = 61;
// Emoji in a title marks a Short on these channels.
const EMOJI = /\p{Extended_Pictographic}/u;
// Tags videos from recent per-game playlists so they can attach to that game's card.
async function withGameWeeks(
  posts: Story[],
  source: (typeof officialYoutube)[number],
) {
  try {
    const lists = parseGamePlaylists(
      await getText(
        "https://www.youtube.com/channel/" + source.channel + "/playlists",
      ),
    ).slice(0, GAME_PLAYLIST_COUNT);
    const byUrl = new Map(posts.map((post) => [post.url, post]));
    const tagged = new Set<string>();
    const pages = await Promise.all(
      lists.map((list) =>
        getText("https://www.youtube.com/playlist?list=" + list.id)
          .then((html) =>
            parsePlaylistPage(
              html,
              source,
              Date.now(),
              GAME_PLAYLIST_VIDEOS,
              SHORTS_MAX_SECONDS,
            ).filter((post) => !EMOJI.test(post.title)),
          )
          .catch(() => [] as Story[]),
      ),
    );
    lists.forEach((list, i) => {
      const week = list.title.split("|")[0].trim();
      for (const video of pages[i]) {
        if (tagged.has(video.url)) continue;
        tagged.add(video.url);
        const base = byUrl.get(video.url) || video;
        byUrl.set(video.url, {
          ...base,
          source: base.source + " · " + week,
          gamePlaylist: list,
        });
      }
    });
    return [...byUrl.values()];
  } catch {
    return posts;
  }
}

async function loadSource(source: (typeof officialYoutube)[number]) {
      let channel = source.channel || channels.get(source.team + source.name);
      if (!channel) {
        let page = source.page;
        if (!page && source.officialSite) {
          const site = await getText(source.officialSite);
          page = site.match(
            /href=["'](https:\/\/(?:www\.)?youtube\.com\/(?:channel\/[\w-]+|@[\w.-]+|user\/[\w.-]+|[\w.-]+))\/?["']/i,
          )?.[1];
          if (page && /\/(?:watch|embed|shorts|playlist)\b/.test(page))
            page = undefined;
        }
        if (!page) throw Error("No official channel link available");
        channel = youtubeChannelId(await getText(page));
        if (!channel) throw Error("Official channel ID unavailable");
        channels.set(source.team + source.name, channel);
      }
      // The long-form uploads playlist (UULF…) excludes Shorts; fall back to the channel feed.
      const playlist = source.playlist || "UULF" + channel.slice(2);
      const feed = (query: string) =>
        getText("https://www.youtube.com/feeds/videos.xml?" + query);
      const older = getText("https://www.youtube.com/playlist?list=" + playlist)
        .then((html) => parsePlaylistPage(html, source))
        .catch(() => [] as Story[]);
      try {
        let recent: Story[];
        try {
          recent = parseYoutube(
            await feed("playlist_id=" + playlist),
            source,
            channel,
          );
        } catch {
          recent = parseYoutube(
            await feed("channel_id=" + channel),
            source,
            channel,
          );
        }
        // Feed entries carry exact dates, so they win over the page's approximate ones.
        const known = new Set(recent.map((post) => post.url));
        return [...recent, ...(await older).filter((p) => !known.has(p.url))];
      } catch {
        const fallback = await older;
        if (fallback.length) return fallback;
        return parseYoutubePage(
          await getText("https://www.youtube.com/channel/" + channel),
          source,
        );
      }
}

// Spanish-language duplicates of the English highlight videos are left out entirely.
const SPANISH_HIGHLIGHTS = /\bmejores\s+jugadas\b/i;

// The NCAA March Madness channel supplies bracket game highlights. It isn't a team, so
// its videos carry no team and are returned separately from the team feeds.
const marchMadnessSource = {
  team: "march-madness" as TeamId,
  name: "March Madness",
  page: "https://www.youtube.com/@marchmadness",
};
export async function marchMadnessVideos(): Promise<Story[]> {
  try {
    return (await loadSource(marchMadnessSource)).map((post) => ({
      ...post,
      teams: [],
    }));
  } catch {
    return [];
  }
}

export async function officialYoutubePosts() {
  const results = await Promise.allSettled(
    officialYoutube.map(async (source) => {
      const posts = (await loadSource(source)).filter(
        (post) => !SPANISH_HIGHLIGHTS.test(post.title),
      );
      return source.gamePlaylists && source.channel
        ? withGameWeeks(posts, source)
        : posts;
    }),
  );
  return {
    posts: results.flatMap((r) => (r.status === "fulfilled" ? r.value : [])),
    unavailable: results.flatMap((r, i) =>
      r.status === "rejected" ? [officialYoutube[i].team] : [],
    ),
  };
}
