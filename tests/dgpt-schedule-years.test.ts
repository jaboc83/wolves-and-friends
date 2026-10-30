import assert from "node:assert/strict";
import test from "node:test";
import { dgptScheduleUrl } from "../lib/feeds/dgpt-schedule-url.ts";

test("DGPT schedule requests are explicitly scoped to a published year", () => {
  const url = new URL(dgptScheduleUrl("https://www.dgpt.com/schedule/", 2027));
  assert.equal(url.origin, "https://www.dgpt.com");
  assert.equal(url.pathname, "/schedule/");
  assert.equal(url.searchParams.get("eventCriteria"), "full_schedule");
  assert.equal(url.searchParams.get("eventType"), "all");
  assert.equal(url.searchParams.get("eventYear"), "2027");
});
