import assert from "node:assert/strict";
import test from "node:test";
import { parseCapWagesRoster } from "../lib/team-info/capwages.ts";
import {
  parseSalarySwishRoster,
  salaryForPlayer,
} from "../lib/team-info/salaryswish.ts";
import {
  readRosterSalaryCache,
  writeRosterSalaryCache,
} from "../lib/team-info/roster-salary-cache.ts";

const salaryTable = `
<table>
  <thead>
    <tr>
      <th>Player</th><th>Position</th><th>2025-26</th><th>2026-27</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/players/jonathan-kuminga">Kuminga, Jonathan</a></td>
      <td>SF, PF</td>
      <td>
        <span class="cap_hit team_salary_data rel">$22,500,000</span>
        <span class="base_salary team_salary_data hide">$22,500,000</span>
      </td>
      <td>
        <span class="cap_hit team_salary_data rel">$6,064,000</span>
        <span class="base_salary team_salary_data hide">$6,064,000</span>
      </td>
    </tr>
    <tr>
      <td><a href="/players/nahshon-bones-hyland">Hyland, Nah'Shon Bones</a></td>
      <td>PG, SG</td>
      <td></td>
      <td>
        <span class="base_salary team_salary_data hide">$2,845,883</span>
      </td>
    </tr>
  </tbody>
</table>`;

test("CapWages uses current-season annual cash, including signing bonuses, not cap hit", () => {
  const player = (name: string, season = "2026-27") => ({
    name,
    contracts: [
      {
        details: [
          { season: "2025-26", totalSalary: "$7,500,000" },
          {
            season,
            baseSalary: "$1,000,000",
            signingBonuses: "$18,100,000",
            totalSalary: "$19,100,000",
            capHit: "$17,000,000",
          },
        ],
      },
    ],
  });
  const html = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(
    {
      props: {
        pageProps: {
          data: {
            roster: { forwards: [player("Kaprizov, Kirill")] },
            inactive: { injured: [player("Injured, Player")] },
            "non-roster": { forwards: [player("Stramel, Charlie")] },
            "dead cap": { buyouts: [player("Retired, Player")] },
          },
        },
      },
    },
  )}</script>`;
  const roster = parseCapWagesRoster(html, 2026);

  assert.equal(roster.season, "2026-27");
  assert.equal(salaryForPlayer(roster.salaries, "Kirill Kaprizov"), 19_100_000);
  assert.equal(salaryForPlayer(roster.salaries, "Charlie Stramel"), 19_100_000);
  assert.equal(salaryForPlayer(roster.salaries, "Player Injured"), 19_100_000);
  assert.equal(salaryForPlayer(roster.salaries, "Player Retired"), undefined);
  assert.throws(() => parseCapWagesRoster(html, 2028), /no 2028-29/);
});

test("CapWages rejects missing or malformed embedded salary data", () => {
  assert.throws(
    () => parseCapWagesRoster("<html></html>", 2026),
    /unavailable/,
  );
  assert.throws(
    () =>
      parseCapWagesRoster(
        '<script id="__NEXT_DATA__">{"props":{}}</script>',
        2026,
      ),
    /Invalid CapWages/,
  );
});

test("SalarySwish parser selects the requested season base salary", () => {
  const roster = parseSalarySwishRoster(salaryTable, 2026);

  assert.equal(roster.season, "2026-27");
  assert.equal(salaryForPlayer(roster.salaries, "Jonathan Kuminga"), 6_064_000);
  assert.equal(salaryForPlayer(roster.salaries, "Bones Hyland"), 2_845_883);
});

test("SalarySwish parser rejects a page without the requested season", () => {
  assert.throws(
    () => parseSalarySwishRoster(salaryTable, 2027),
    /no 2027-28 base salaries/,
  );
});

test("salary name matching leaves ambiguous partial names unmatched", () => {
  const salaries = {
    "bones hyland nahshon": 2_845_883,
    "bones hyland terrence": 3_000_000,
  };

  assert.equal(salaryForPlayer(salaries, "Bones Hyland"), undefined);
});

test("roster salary cache keeps a recent public value while refreshing", () => {
  const entries = new Map<string, string>();
  const storage = {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
  };
  const salaries = { "jonathan kuminga": 6_064_000 };

  writeRosterSalaryCache(storage, "wolves", "2026-27", salaries, 1000);

  assert.deepEqual(
    readRosterSalaryCache(storage, "wolves", "2026-27", 2000),
    salaries,
  );
  assert.deepEqual(
    readRosterSalaryCache(storage, "wolves", "2027-28", 2000),
    {},
  );
  assert.deepEqual(
    readRosterSalaryCache(storage, "wolves", "2026-27", 13 * 60 * 60 * 1000),
    {},
  );
});
