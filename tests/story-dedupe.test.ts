import assert from "node:assert/strict";
import test from "node:test";
import { dedupeByTitle } from "../lib/dashboard/dedupe-stories.ts";

test("republished headlines appear once, keeping the earliest posting", () => {
  // Newest first, as selectStories supplies them.
  const stories = [
    { source: "MPR", title: "McDaniels scores to lift Timberwolves, 106-105" },
    { source: "Other", title: "A different story" },
    { source: "ESPN", title: "McDaniels scores to lift Timberwolves, 106-105!" },
  ];
  assert.deepEqual(
    dedupeByTitle(stories).map((s) => s.source),
    ["Other", "ESPN"],
  );
});
