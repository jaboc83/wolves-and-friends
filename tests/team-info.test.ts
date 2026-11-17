import assert from "node:assert/strict";
import test from "node:test";
import { mergeTeamInfo } from "../lib/team-info/team-info-cache.ts";
import type { Table } from "../lib/team-info/types.ts";

const checked = "2026-11-17T00:00:00.000Z";

test("cached Vikings division standings remain visible when the refresh fails", () => {
  const division: Table = {
    name: "NFC North",
    columns: ["#", "W", "L", "T", "PCT"],
    rows: [
      {
        id: "16",
        name: "Minnesota Vikings",
        url: "https://www.espn.com/nfl/",
        cells: ["1", "8", "2", "0", ".800"],
        highlight: true,
      },
    ],
    source: "ESPN",
    url: "https://www.espn.com/nfl/standings",
    checked,
  };
  const merged = mergeTeamInfo(
    { id: "vikings", tables: [], unavailable: ["NFC North standings"] },
    { id: "vikings", tables: [division], unavailable: [] },
  );

  assert.equal(merged.tables.length, 1);
  assert.equal(merged.tables[0].name, "NFC North");
  assert.equal(merged.tables[0].stale, true);
});
