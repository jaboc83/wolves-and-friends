import type { Story } from "./feeds";
import initial from "./initial.json";
function walk(x: any, visit: (x: any) => void) {
  if (!x || typeof x !== "object") return;
  visit(x);
  for (const v of Object.values(x)) walk(v, visit);
}
function flight(html: string) {
  return [...html.matchAll(/self\.__next_f\.push\((\[[\s\S]*?\])\)/g)]
    .map((m) => {
      try {
        return JSON.parse(m[1])[1];
      } catch {
        return "";
      }
    })
    .join("");
}
export function parseZalgirisNews(html: string, checked: string): Story[] {
  const posts = new Map<string, any>();
  for (const line of flight(html).split("\n")) {
    try {
      walk(JSON.parse(line.slice(line.indexOf(":") + 1)), (x) => {
        if (
          x.__typename === "PostResource" &&
          x.slug &&
          x.subCategoryV2?.slug === "naujienos"
        )
          posts.set(x.id, x);
      });
    } catch {}
  }
  return [...posts.values()].flatMap((x) => {
    const age = x.publishedAgo?.match(/(\d+)\s*(val|min|d\.|sav)/);
    if (!age) return [];
    const unit = age[2],
      offset =
        Number(age[1]) *
        (unit === "min"
          ? 60000
          : unit === "val"
            ? 3600000
            : unit === "sav"
              ? 7 * 86400000
              : 86400000);
    const url = "https://zalgiris.lt/naujienos/" + x.slug;
    return [
      {
        id: url,
        url,
        title: x.title,
        originalTitle: x.title,
        date: new Date(Date.parse(checked) - offset).toISOString(),
        dateApproximate: true,
        source: "Official Žalgiris · Lithuanian",
        teams: ["zalgiris"],
        kind: x.isVideo ? "video" : "story",
        premium: !!x.isPremium,
      },
    ];
  });
}
export function parseFrostNews(html: string): Story[] {
  const raw = html.match(
    /<script id="vike_pageContext"[^>]*>([\s\S]*?)<\/script>/,
  )?.[1];
  if (!raw) throw Error("News data unavailable");
  const found = new Map<string, Story>();
  walk(JSON.parse(raw), (x) => {
    const path = typeof x.url === "string" ? x.url.replace(/\\\//g, "/") : "";
    if (
      x.type === "article" &&
      path.startsWith("/en/teams/minnesota-frost/news/") &&
      x.title &&
      Number.isFinite(Date.parse(x.date))
    ) {
      const url = "https://www.thepwhl.com" + path;
      found.set(url, {
        id: url,
        url,
        title: x.title,
        date: x.date,
        source: "Official Minnesota Frost",
        teams: ["frost"],
        kind: "story",
      });
    }
  });
  return [...found.values()];
}
const translations = new Map<string, string>(
  (initial.stories as Story[])
    .filter((s) => s.originalTitle && s.title !== s.originalTitle)
    .map((s) => [s.originalTitle!, s.title]),
);
export async function translateHeadlines(stories: Story[]) {
  await Promise.all(
    stories.map(async (s) => {
      if (!s.originalTitle) return;
      let title = translations.get(s.originalTitle);
      if (!title) {
        try {
          const r = await fetch(
            "https://api.mymemory.translated.net/get?langpair=lt%7Cen&q=" +
              encodeURIComponent(s.originalTitle),
            { signal: AbortSignal.timeout(8000) },
          );
          if (!r.ok) throw Error();
          const d = (await r.json()) as any;
          if (
            d.responseStatus !== 200 ||
            d.quotaFinished ||
            !d.responseData?.translatedText
          )
            throw Error();
          title = d.responseData.translatedText
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&amp;/g, "&");
          translations.set(s.originalTitle, title!);
        } catch {}
      }
      if (title) {
        s.title = title;
        s.source = "Official Žalgiris · English translation";
      } else s.source = "Official Žalgiris · translation unavailable";
    }),
  );
}
