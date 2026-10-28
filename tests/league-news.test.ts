import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLeagueHeadlines } from "../lib/feeds/league-news-data.ts";

test("league news returns the five newest ESPN headlines without team filtering", () => {
  const stories = normalizeLeagueHeadlines(
    Array.from({ length: 7 }, (_, index) => {
      const number = index + 1;
      return {
        headline: `Headline ${number}`,
        published: `2026-10-${String(number).padStart(2, "0")}T12:00:00Z`,
        links: { web: { href: `https://espn.com/story/${number}` } },
      };
    }),
  );

  assert.deepEqual(
    stories.map((story) => story.title),
    ["Headline 7", "Headline 6", "Headline 5", "Headline 4", "Headline 3"],
  );
  assert.deepEqual(stories.map((story) => story.teams), [[], [], [], [], []]);
});

test("league news omits incomplete articles and non-HTTP links", () => {
  assert.deepEqual(
    normalizeLeagueHeadlines([
      {
        headline: "Missing date",
        links: { web: { href: "https://espn.com/story" } },
      },
      {
        headline: "Unsafe link",
        published: "2026-10-28T12:00:00Z",
        links: { web: { href: "javascript:alert(1)" } },
      },
    ]),
    [],
  );
});