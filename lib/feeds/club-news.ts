import type { Story } from "./feed-types";
import initial from "../initial.json";
type JsonObject = Record<string, unknown>;
function object(value: unknown): JsonObject {
  return value && typeof value === "object" ? (value as JsonObject) : {};
}
function walk(x: unknown, visit: (x: JsonObject) => void) {
  if (!x || typeof x !== "object") return;
  const record = object(x);
  visit(record);
  for (const v of Object.values(record)) walk(v, visit);
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
  const posts = new Map<string, JsonObject>();
  for (const line of flight(html).split("\n")) {
    try {
      walk(JSON.parse(line.slice(line.indexOf(":") + 1)), (x) => {
        const category = object(x.subCategoryV2);
        if (
          x.__typename === "PostResource" &&
          x.slug &&
          category.slug === "naujienos" &&
          x.id
        ) {
          posts.set(String(x.id), x);
        }
      });
    } catch {}
  }
  return [...posts.values()].flatMap((x) => {
    const publishedAgo =
      typeof x.publishedAgo === "string" ? x.publishedAgo : "";
    const slug = String(x.slug || "");
    const title = String(x.title || "");
    const age = publishedAgo.match(/(\d+)\s*(val|min|d\.|sav)/);
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
    const url = "https://zalgiris.lt/naujienos/" + slug;
    return [
      {
        id: url,
        url,
        title,
        originalTitle: title,
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
    const title = typeof x.title === "string" ? x.title : "";
    const date = typeof x.date === "string" ? x.date : "";
    if (
      x.type === "article" &&
      path.startsWith("/en/teams/minnesota-frost/news/") &&
      title &&
      Number.isFinite(Date.parse(date))
    ) {
      const url = "https://www.thepwhl.com" + path;
      found.set(url, {
        id: url,
        url,
        title,
        date,
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
          const d = (await r.json()) as {
            responseStatus?: number;
            quotaFinished?: boolean;
            responseData?: { translatedText?: string };
          };
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
