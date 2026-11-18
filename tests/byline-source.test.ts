import assert from "node:assert/strict";
import test from "node:test";
import { bylineSource, isPublication } from "../lib/feeds/byline-source.ts";

test("source labels put the author first and skip desk bylines", () => {
  assert.equal(bylineSource("ESPN", "Tim MacMahon"), "Tim MacMahon (ESPN)");
  assert.equal(bylineSource("ESPN", "ESPN staff"), "ESPN");
  assert.equal(bylineSource("MinnPost", ""), "MinnPost");
  assert.ok(isPublication("Tim MacMahon (ESPN)", "ESPN"));
  assert.ok(!isPublication("Tim MacMahon (ESPN Plus)", "ESPN"));
});
