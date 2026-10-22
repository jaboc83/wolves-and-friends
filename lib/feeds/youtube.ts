// Reads configured official team channels and converts their public videos into stories.
import type { Story } from "./feed-types";
// Official channels, verified from YouTube and club-site social links (Oct 2026).
export const officialYoutube = [
  {
    team: "wolves",
    name: "Minnesota Timberwolves",
    channel: "UCXWDN5NKVFgnPt25CMh98Cg",
  },
  { team: "wild", name: "Minnesota Wild", channel: "UCQRr7SxnnndFYuuRUtOIEnA" },
  {
    team: "vikings",
    name: "Minnesota Vikings",
    channel: "UCpn2WAITh-6SP4PHBzj3seg",
  },
  {
    team: "loons",
    name: "Minnesota United FC",
    channel: "UCNTg0WSrMGrgAD1bY3Fuiug",
  },
  {
    team: "palace",
    name: "Crystal Palace FC",
    channel: "UCWB9N0012fG6bGyj486Qxmg",
  },
  {
    team: "lynx",
    name: "Minnesota Lynx",
    page: "https://www.youtube.com/minnesotalynx",
  },
  {
    team: "zalgiris",
    name: "Žalgiris Kaunas",
    page: "https://www.youtube.com/@BCZalgirisKaunas",
  },
  {
    team: "usmnt",
    name: "U.S. Soccer",
    page: "https://www.youtube.com/@ussoccer",
    pattern: /\bUSMNT\b|\bmen.?s national team|\bMNT\b/i,
  },
  {
    team: "disc",
    name: "Disc Golf Pro Tour",
    page: "https://www.youtube.com/@DiscGolfProTour",
  },
  // Discover only social links published by these clubs, never search/fan channels.
  {
    team: "twins",
    name: "Minnesota Twins",
    officialSite: "https://www.mlb.com/twins",
  },
  {
    team: "frost",
    name: "Minnesota Frost / PWHL",
    officialSite: "https://www.thepwhl.com/en/teams/minnesota-frost",
    pattern: /Minnesota|\bFrost\b/i,
  },
];
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
  if (xml.match(/<yt:channelId>([^<]+)<\/yt:channelId>/)?.[1] !== channel)
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

export async function officialYoutubePosts() {
  const results = await Promise.allSettled(
    officialYoutube.map(async (source) => {
      let channel = source.channel || channels.get(source.team);
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
        channels.set(source.team, channel);
      }
      try {
        return parseYoutube(
          await getText(
            "https://www.youtube.com/feeds/videos.xml?channel_id=" + channel,
          ),
          source,
          channel,
        );
      } catch {
        return parseYoutubePage(
          await getText("https://www.youtube.com/channel/" + channel),
          source,
        );
      }
    }),
  );
  return {
    posts: results.flatMap((r) => (r.status === "fulfilled" ? r.value : [])),
    unavailable: results.flatMap((r, i) =>
      r.status === "rejected" ? [officialYoutube[i].team] : [],
    ),
  };
}
