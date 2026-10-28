// Tests per-team news selection and news page URL building.
import assert from "node:assert/strict";
import test from "node:test";
import { newsForTeam, newsPageUrl } from "../lib/browser/news-page-data.ts";
import type { HubData } from "../lib/feeds/feed-types";

const data: HubData = {
  checked: "2026-10-27T00:00:00.000Z",
  stories: [
    {
      id: "wolves-story",
      title: "Wolves story",
      url: "https://example.test/wolves",
      source: "Wolves source",
      date: "2026-10-27T00:00:00.000Z",
      teams: ["wolves"],
      kind: "story",
    },
    {
      id: "wild-story",
      title: "Wild story",
      url: "https://example.test/wild",
      source: "Wild source",
      date: "2026-10-27T00:00:00.000Z",
      teams: ["wild"],
      kind: "story",
    },
  ],
  games: [],
  health: [
    {
      name: "Wolves news",
      status: "ok",
      checked: "2026-10-27T00:00:00.000Z",
      count: 1,
      teams: ["wolves"],
    },
    {
      name: "Wild news",
      status: "ok",
      checked: "2026-10-27T00:00:00.000Z",
      count: 1,
      teams: ["wild"],
    },
  ],
  authors: [
    {
      name: "Wolves writer",
      label: "Wolves",
      url: "https://example.test/wolves-writer",
      team: "wolves",
      items: [],
      checked: "2026-10-27T00:00:00.000Z",
      status: "ok",
    },
    {
      name: "Wild writer",
      label: "Wild",
      url: "https://example.test/wild-writer",
      team: "wild",
      items: [],
      checked: "2026-10-27T00:00:00.000Z",
      status: "ok",
    },
  ],
};

test("team news requests identify only the selected public team", () => {
  assert.equal(newsPageUrl("wolves"), "/api/news?team=wolves");
});

test("generic news data is partitioned locally by team", () => {
  const wolves = newsForTeam(data, "wolves");
  const wild = newsForTeam(data, "wild");

  assert.deepEqual(
    wolves.stories.map((story) => story.id),
    ["wolves-story"],
  );
  assert.deepEqual(
    wolves.health.map((source) => source.name),
    ["Wolves news"],
  );
  assert.deepEqual(
    wolves.authors?.map((author) => author.name),
    ["Wolves writer"],
  );
  assert.deepEqual(
    wild.stories.map((story) => story.id),
    ["wild-story"],
  );
  assert.deepEqual(
    wild.health.map((source) => source.name),
    ["Wild news"],
  );
  assert.deepEqual(
    wild.authors?.map((author) => author.name),
    ["Wild writer"],
  );
});
