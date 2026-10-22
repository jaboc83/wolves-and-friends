import records from "./byline-records.json";
import type { AuthorFeed, Story } from "./feed-types";
export const titleKey = (s: string) =>
  s
    .replace(
      / - (?:The Athletic - )?(?:The New York Times|Star Tribune|The Minnesota Star Tribune|Sports Illustrated|MinnPost)$/,
      "",
    )
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
export function knownByline(title: string) {
  return records.find((r) => titleKey(r.title) === titleKey(title));
}
export function applyKnownBylines(author: AuthorFeed) {
  for (const item of author.items) {
    const r = knownByline(item.title);
    if (!r) continue;
    item.bylineVerified = r.authors.some(
      (n) => titleKey(n) === titleKey(author.name),
    );
    item.actualAuthors = r.authors;
    if (item.bylineVerified) {
      item.originalId = item.originalId || item.url;
      item.url = r.url;
    }
  }
  author.items = author.items.filter((i) => i.bylineVerified !== false);
}
export function validAuthorStory(s: Story) {
  const r = knownByline(s.title);
  if (!r) return true;
  const author = [
    "Britt Robson",
    "Jon Krawczynski",
    "Ben Goessling",
    "Alec Lewis",
    "Will Ragatz",
    "Jess Myers",
  ].find((n) => s.source.startsWith(n));
  return !author || r.authors.some((n) => titleKey(n) === titleKey(author));
}
