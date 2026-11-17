// Parses official Frost news pages into the shared story shape.
import type { Story } from "./feed-types";
import { frostProviders } from "../teams/frost/providers";
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
    const newsPath = new URL(frostProviders.urls.officialNews).pathname + "/";
    if (
      x.type === "article" &&
      path.startsWith(newsPath) &&
      title &&
      Number.isFinite(Date.parse(date))
    ) {
      const url = new URL(path, frostProviders.urls.officialNews).href;
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
