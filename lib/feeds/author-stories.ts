// Turns byline-checked author feeds into ordinary, team-tagged headline stories.
import type { AuthorFeed, Story } from "./feed-types";
export function authorStories(authors: AuthorFeed[]): Story[] {
  return authors.flatMap((author) =>
    author.items
      .filter((item) => item.bylineVerified !== false)
      .map((item) => ({
        id: item.originalId || item.url,
        url: item.url,
        title: item.title,
        date: item.date,
        source: item.bylineVerified
          ? author.name + " · byline verified"
          : author.name + " search · author not confirmed",
        teams:
          (author.team || "wolves") === "wolves" && /\blynx\b/i.test(item.title)
            ? ["lynx"]
            : [author.team || "wolves"],
        kind: "story",
      })),
  );
}
