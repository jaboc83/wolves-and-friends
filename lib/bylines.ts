import { applyKnownBylines } from "./byline-status";
import type { AuthorFeed } from "./feeds";
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
  function walk(x: any) {
    if (!x || typeof x !== "object") return;
    if (/Article|NewsArticle|BlogPosting/.test(String(x["@type"]))) {
      for (const a of [x.author].flat().filter(Boolean)) {
        if (typeof a === "string") names.push(a);
        else if (a.name) names.push(a.name);
      }
    }
    for (const v of Object.values(x)) walk(v);
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
  { verified: boolean; authors: string[]; url: string }
>();
export async function verifyAuthorFeed(author: AuthorFeed) {
  applyKnownBylines(author);
  let links = new Map<string, string>();
  try {
    const r = await fetch(author.url, { signal: AbortSignal.timeout(8000) });
    if (r.ok) links = authorPageLinks(await r.text(), author.url);
  } catch {}
  await Promise.all(
    author.items.map(async (item) => {
      const direct = links.get(normalized(item.title));
      if (item.bylineVerified) return;
      if (!direct) return;
      let result = checks.get(direct);
      if (!result) {
        try {
          const r = await fetch(direct, { signal: AbortSignal.timeout(8000) });
          if (!r.ok) return;
          const names = articleAuthors(await r.text());
          if (!names.length) return;
          result = {
            verified: names.some(
              (n) => normalized(n) === normalized(author.name),
            ),
            authors: names,
            url: direct,
          };
          checks.set(direct, result);
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
