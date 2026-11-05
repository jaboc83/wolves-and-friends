// Tests ESPN power ranking parsing.
import assert from "node:assert/strict";
import test from "node:test";
import { parsePowerRanking } from "../lib/team-info/power-rankings.ts";

test("ESPN rankings sort teams and use catalog and fallback names", async () => {
  const urls: string[] = [];
  const ranking = await parsePowerRanking(
    "basketball/nba",
    "2026-10-27T00:00:00.000Z",
    async (url) => {
      urls.push(url);
      if (url.includes("powerindex")) {
        return {
          pageCount: 1,
          items: [
            {
              team: { $ref: "https://sports.core.api.espn.com/v2/teams/16" },
              predictives: [
                { name: "bpirank", value: 2, displayValue: "2nd" },
                { name: "bpi", value: 6.2, displayValue: "6.2" },
              ],
            },
            {
              team: { $ref: "https://sports.core.api.espn.com/v2/teams/2" },
              predictives: [
                { name: "bpirank", value: 1, displayValue: "1st" },
                { name: "bpi", value: 8.1, displayValue: "8.1" },
              ],
              lastUpdated: "2026-10-26T00:00:00.000Z",
            },
          ],
        };
      }
      return {
        sports: [
          {
            leagues: [
              {
                teams: [
                  {
                    team: {
                      id: "2",
                      displayName: "Boston Celtics",
                      links: [
                        {
                          rel: ["clubhouse"],
                          href: "https://example.test/boston",
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          },
        ],
      };
    },
  );

  assert.deepEqual(
    ranking?.rows.map(({ id, name, cells }) => [id, name, cells[0]]),
    [
      ["2", "Boston Celtics", "1st"],
      ["16", "Minnesota Timberwolves", "2nd"],
    ],
  );
  assert.equal(ranking?.publishedAt, "2026-10-26T00:00:00.000Z");
  assert.ok(urls.some((url) => url.includes("powerindex")));
  assert.ok(urls.some((url) => url.endsWith("/teams?limit=100")));
});

test("unsupported leagues skip provider requests", async () => {
  let requested = false;
  const ranking = await parsePowerRanking("hockey/nhl", "checked", async () => {
    requested = true;
    return {};
  });

  assert.equal(ranking, undefined);
  assert.equal(requested, false);
});
