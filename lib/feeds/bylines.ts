import { applyKnownBylines } from "./byline-status";
import type { AuthorFeed } from "./feed-types";
const clean = (s: string) =>
  s
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&(?:#39|apos);/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&(?:#8217|rsquo);/g, "’")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
const normalized = (s: string) =>
  clean(s)
    .replace(
      / - (?:The Athletic - )?(?:The New York Times|Star Tribune|The Minnesota Star Tribune|Sports Illustrated|MinnPost)$/,
      "",
    )
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
export function articleAuthors(html: string): string[] {
  const names: string[] = [];
  function walk(x: unknown) {
    if (!x || typeof x !== "object") return;
    const record = x as Record<string, unknown>;
    if (/Article|NewsArticle|BlogPosting/.test(String(record["@type"]))) {
      const author = record.author;
      for (const a of (Array.isArray(author) ? author : [author]).filter(
        (value) => value != null && value !== false && value !== "",
      )) {
        if (typeof a === "string") names.push(a);
        else if (
          a &&
          typeof a === "object" &&
          typeof (a as Record<string, unknown>).name === "string"
        )
          names.push((a as Record<string, string>).name);
      }
    }
    for (const v of Object.values(record)) walk(v);
  }
  for (const m of html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      walk(JSON.parse(m[1]));
    } catch {}
  }
  for (const m of html.matchAll(
    /<meta\s[^>]*(?:name|property)=["']author["'][^>]*content=["']([^"']+)/gi,
  ))
    names.push(clean(m[1]));
  return [...new Set(names.map(clean))];
}
export function authorPageLinks(html: string, base: string) {
  const links = new Map<string, string>();
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = m[1].match(/href=["']([^"']+)/)?.[1];
    const heading = m[2].match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1];
    if (href && heading) {
      try {
        const u = new URL(href, base);
        if (u.origin === new URL(base).origin)
          links.set(normalized(heading), u.href);
      } catch {}
    }
  }
  return links;
}
const checks = new Map<
  string,
  { verified: boolean; authors: string[]; url: string; expires: number }
>();
export async function verifyAuthorFeed(
  author: AuthorFeed,
  signal?: AbortSignal,
) {
  applyKnownBylines(author);
  let links = new Map<string, string>();
  try {
    const r = await fetch(author.url, {
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(8000)])
        : AbortSignal.timeout(8000),
    });
    if (r.ok) links = authorPageLinks(await r.text(), author.url);
  } catch {}
  await Promise.all(
    author.items.map(async (item) => {
      const direct = links.get(normalized(item.title));
      if (item.bylineVerified) return;
      if (!direct) return;
      const cacheKey = author.name + ":" + direct;
      let result = checks.get(cacheKey);
      if (result && result.expires <= Date.now()) {
        checks.delete(cacheKey);
        result = undefined;
      }
      if (!result) {
        try {
          const r = await fetch(direct, {
            signal: signal
              ? AbortSignal.any([signal, AbortSignal.timeout(8000)])
              : AbortSignal.timeout(8000),
          });
          if (!r.ok) return;
          const names = articleAuthors(await r.text());
          if (!names.length) return;
          result = {
            verified: names.some(
              (n) => normalized(n) === normalized(author.name),
            ),
            authors: names,
            url: direct,
            expires: Date.now() + 3600000,
          };
          if (checks.size >= 256) checks.delete(checks.keys().next().value!);
          checks.set(cacheKey, result);
        } catch {
          return;
        }
      }
      item.bylineVerified = result.verified;
      item.actualAuthors = result.authors;
      if (result.verified) {
        item.originalId = item.originalId || item.url;
        item.url = direct;
      }
    }),
  );
  author.items = author.items.filter((item) => item.bylineVerified !== false);
}
