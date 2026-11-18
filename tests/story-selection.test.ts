import assert from "node:assert/strict";
import test from "node:test";
import { selectStories } from "../lib/dashboard/selectors.ts";
import type { HubData, Story } from "../lib/feeds/feed-types";

function story(id: string, overrides: Partial<Story> = {}): Story {
  return {
    id,
    title: `Playoff coverage ${id}`,
    url: `https://example.test/${id}`,
    source: "Team news",
    date: new Date(Date.now() - 60_000).toISOString(),
    teams: ["wolves"],
    kind: "story",
    ...overrides,
  };
}

function select(
  stories: Story[],
  options: Partial<Parameters<typeof selectStories>[0]> = {},
) {
  const newsData: HubData = { checked: "", stories, games: [], health: [] };
  return selectStories({
    newsData,
    active: "wolves",
    search: "",
    readIds: ["read"],
    showRead: false,
    showOlder: false,
    olderLimit: 1,
    ...options,
  });
}

test("search includes read stories and all matches beyond the recent and older limits", () => {
  const stories = [
    story("read"),
    ...Array.from({ length: 8 }, (_, i) => story(`recent-${i}`)),
    story("old-read", { date: "2020-01-01T00:00:00Z" }),
    story("old", { date: "2020-01-02T00:00:00Z" }),
  ];
  for (const active of ["all", "wolves"] as const) {
    for (const showOlder of [false, true]) {
      const result = select(stories, {
        active,
        showOlder,
        search: "  PLAYOFF  ",
        readIds: ["read", "old-read"],
      });
      assert.equal(result.compactNews, false);
      assert.deepEqual(
        result.displayed.map((s) => s.id).sort(),
        stories.map((s) => s.id).sort(),
      );
    }
  }
});

test("clearing search restores unread-only compact results and View more batching", () => {
  const stories = [
    story("read"),
    ...Array.from({ length: 7 }, (_, i) => story(`recent-${i}`)),
    story("old", { date: "2020-01-01T00:00:00Z" }),
  ];
  for (const search of ["", "   "]) {
    const compact = select(stories, { search });
    assert.equal(compact.compactNews, true);
    assert.equal(compact.displayed.length, 5);
    assert.ok(
      compact.displayed.every((s) => s.id !== "read" && s.id !== "old"),
    );
    assert.equal(
      select(stories, { search, showOlder: true }).displayed.length,
      6,
    );
  }
  assert.ok(
    select(stories, { showRead: true }).displayed.some((s) => s.id === "read"),
  );
});

test("search preserves team visibility, headline matching, and social exclusions", () => {
  const stories = [
    story("read"),
    story("wild", { teams: ["wild"] }),
    story("social", { kind: "social" }),
    story("unrelated", { title: "Roster moves" }),
  ];
  assert.deepEqual(
    select(stories, { search: "playoff" }).displayed.map((s) => s.id),
    ["read"],
  );
  assert.deepEqual(
    select(stories, {
      active: "all",
      search: "playoff",
      hiddenTeams: ["wild"],
    }).displayed.map((s) => s.id),
    ["read"],
  );
});

test("search matches authors and publications on read and older stories", () => {
  const stories = [
    story("read", { source: "Jon Krawczynski (The Athletic)" }),
    story("old", {
      source: "Jon Krawczynski (The Athletic)",
      date: "2020-01-01T00:00:00Z",
    }),
    story("other", { source: "ESPN" }),
  ];
  for (const search of ["  JON KRAWCZYNSKI  ", "the athletic"]) {
    assert.deepEqual(
      select(stories, { search }).displayed.map((s) => s.id),
      ["read", "old"],
    );
  }
});
