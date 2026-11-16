import assert from "node:assert/strict";
import test from "node:test";
import { parseCapWagesRoster } from "../lib/team-info/capwages.ts";
import { parseFanGraphsRoster } from "../lib/team-info/fangraphs.ts";
import {
  isRosterSalaryResponse,
  parseSalarySwishRoster,
  salaryForPlayer,
  salarySeasonLabel,
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

test("FanGraphs selects reported calendar-year salary, not AAV, projections or options", () => {
  const contract = (
    name: string,
    Salary: number,
    Type = "GUARANTEED",
    isEstimate = 0,
  ) => ({
    contractSummary: { playerName: name, AAV: 18_375_000 },
    contractYears: [
      { Season: 2025, Salary: 8_000_000, Type, isEstimate },
      { Season: 2026, Salary, BaseSalary: 21_500_000, Type, isEstimate },
    ],
  });
  const html = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(
    {
      props: {
        pageProps: {
          dehydratedState: {
            queries: [
              {
                queryKey: [
                  "roster-resource/payroll2020/data",
                  { season: 2026, teamid: 8 },
                ],
                state: {
                  data: {
                    dataContract: [
                      contract("Pablo López", 21_750_000),
                      contract("Mick Abel", 782_500, "PRE-ARB"),
                      contract("Projected Player", 900_000, "GUARANTEED", 1),
                      contract("Option Player", 10_000_000, "CLUB OPTION"),
                    ],
                  },
                },
              },
            ],
          },
        },
      },
    },
  )}</script>`;
  const roster = parseFanGraphsRoster(html, 2026);

  assert.equal(roster.season, "2026");
  assert.equal(salaryForPlayer(roster.salaries, "Pablo Lopez"), 21_750_000);
  assert.equal(salaryForPlayer(roster.salaries, "Mick Abel"), 782_500);
  assert.equal(salaryForPlayer(roster.salaries, "Projected Player"), undefined);
  assert.equal(salaryForPlayer(roster.salaries, "Option Player"), undefined);
  assert.throws(() => parseFanGraphsRoster(html, 2027), /no 2027/);
});

test("MLB salary responses and local cache use calendar-year seasons", () => {
  const season = salarySeasonLabel(2026, "baseball/mlb");
  const salaries = { "lopez pablo": 21_750_000 };
  const payload = {
    team: "twins",
    season,
    salaries,
    checked: "2026-11-16T18:00:00Z",
  };
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };

  assert.equal(isRosterSalaryResponse(payload), true);
  writeRosterSalaryCache(storage, "twins", season, salaries, 1000);
  assert.deepEqual(
    readRosterSalaryCache(storage, "twins", "2026", 2000),
    salaries,
  );
  assert.deepEqual(
    readRosterSalaryCache(storage, "twins", "2026-27", 2000),
    {},
  );
});

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
