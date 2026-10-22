import { knownByline, titleKey } from "./byline-status";
import type { AuthorFeed, Story } from "./feed-types";
export function authorStories(authors: AuthorFeed[]): Story[] {
  return authors.flatMap((author) =>
    author.items
      .filter((item) => {
        const r = knownByline(item.title);
        return (
          !r || r.authors.some((n) => titleKey(n) === titleKey(author.name))
        );
      })
      .map((item) => ({
        id: item.originalId || item.url,
        url: item.url,
        title: item.title,
        date: item.date,
        source: item.bylineVerified
          ? author.name + " · byline verified"
          : author.name + " search · author not confirmed",
        teams:
          author.name === "Jess Myers"
            ? ["wild"]
            : ["Ben Goessling", "Alec Lewis", "Will Ragatz"].includes(
                  author.name,
                )
              ? ["vikings"]
              : /\blynx\b/i.test(item.title)
                ? ["lynx"]
                : ["wolves"],
        kind: "story",
      })),
  );
}
