// Tests player stat parsing and selection.
import assert from "node:assert/strict";
import test from "node:test";
import { parsePlayerStats } from "../lib/team-info/player-stats.ts";

test("overview stats prefer the current team and league split", () => {
  const stats = parsePlayerStats(
    {
      season: { displayName: "2025/26" },
      statistics: {
        displayName: "2025/26",
        labels: ["G", "A", "SH"],
        names: ["totalGoals", "assists", "shots"],
        displayNames: ["Goals", "Assists", "Shots"],
        splits: [
          {
            teamId: "previous",
            leagueSlug: "eng.1",
            displayName: "Previous team",
            stats: [99, 99, 99],
          },
          {
            teamId: "current",
            leagueSlug: "usa.1",
            displayName: "MLS",
            stats: [88, 88, 88],
          },
          {
            teamId: "current",
            leagueSlug: "eng.1",
            displayName: "Premier League",
            stats: [12, 3, 44],
          },
          {
            teamId: "current",
            displayName: "Regular Season",
            stats: [1, 1, 1],
          },
        ],
      },
    },
    "current",
    "soccer/eng.1",
    "Forward",
    2025,
  );

  assert.deepEqual(stats, {
    title: "Premier League",
    values: [
      { label: "G", value: "12", description: "Goals" },
      { label: "A", value: "3", description: "Assists" },
      { label: "SH", value: "44", description: "Shots" },
    ],
  });
});

test("overview stats do not use a season outside the requested year", () => {
  const stats = parsePlayerStats(
    {
      season: { displayName: "2024/25" },
      statistics: {
        displayName: "2024/25",
        labels: ["G", "A"],
        names: ["totalGoals", "assists"],
        splits: [
          {
            teamId: "current",
            leagueSlug: "eng.1",
            displayName: "Premier League",
            stats: [12, 3],
          },
        ],
      },
    },
    "current",
    "soccer/eng.1",
    "Forward",
    2025,
  );

  assert.equal(stats, undefined);
});

test("common-v3 rows prefer the requested team and season", () => {
  const stats = parsePlayerStats(
    {
      categories: [
        {
          name: "averages",
          displayName: "Season averages",
          labels: ["GP", "PTS", "REB", "AST", "BLK", "STL"],
          names: [
            "gamesPlayed",
            "avgPoints",
            "avgRebounds",
            "avgAssists",
            "avgBlocks",
            "avgSteals",
          ],
          displayNames: ["Games", "Points", "Rebounds", "Assists"],
          statistics: [
            {
              teamId: "previous",
              season: { year: 2025 },
              stats: [80, 31, 8, 7, 2, 1],
            },
            {
              teamId: "current",
              season: { year: 2024 },
              stats: [70, 20, 6, 5, 1, 1],
            },
            {
              teamId: "current",
              season: { year: 2025, displayName: "2024-25" },
              stats: [60, 25, 7, 6, 2, 1],
            },
          ],
        },
      ],
    },
    "current",
    "basketball/nba",
    "Guard",
    2025,
  );

  assert.deepEqual(stats, {
    title: "2024-25 · Season averages",
    values: [
      { label: "PTS", value: "25", description: "Points" },
      { label: "REB", value: "7", description: "Rebounds" },
      { label: "AST", value: "6", description: "Assists" },
      { label: "STK", value: "3.0", description: "Steals + blocks" },
    ],
  });
});

test("common-v3 missing requested-season rows block summary fallback", () => {
  const stats = parsePlayerStats(
    {
      categories: [
        {
          labels: ["GP", "PTS"],
          names: ["gamesPlayed", "avgPoints"],
          statistics: [
            {
              teamId: "current",
              season: { year: 2024 },
              stats: [70, 20],
            },
          ],
        },
      ],
      season: { year: 2025, displayName: "2025" },
      statsSummary: {
        displayName: "2025 season stats",
        statistics: [
          { name: "avgPoints", abbreviation: "PTS", displayValue: 25 },
        ],
      },
    },
    "current",
    "basketball/nba",
    "Guard",
    2025,
  );

  assert.equal(stats, undefined);
});

test("core split stats retain their season label and selected values", () => {
  const stats = parsePlayerStats(
    {
      season: { displayName: "2025 Regular Season", year: 2025 },
      splits: {
        categories: [
          {
            name: "offense",
            stats: [
              {
                name: "gamesPlayed",
                abbreviation: "GP",
                value: 50,
                displayValue: "50",
              },
              {
                name: "avgPoints",
                abbreviation: "PTS",
                displayValue: "24.1",
              },
              {
                name: "avgRebounds",
                abbreviation: "REB",
                displayValue: "6.2",
              },
              {
                name: "avgAssists",
                abbreviation: "AST",
                displayValue: "5.3",
              },
              {
                name: "avgBlocks",
                abbreviation: "BLK",
                displayValue: "1.1",
              },
              {
                name: "avgSteals",
                abbreviation: "STL",
                displayValue: "1.2",
              },
            ],
          },
        ],
      },
    },
    "current",
    "basketball/nba",
    "Guard",
    2025,
  );

  assert.deepEqual(stats, {
    title: "2025 Regular Season · Regular season",
    values: [
      { label: "PTS", value: "24.1", description: "Points" },
      { label: "REB", value: "6.2", description: "Rebounds" },
      { label: "AST", value: "5.3", description: "Assists" },
      { label: "STK", value: "2.3", description: "Steals + blocks" },
    ],
  });
});

test("legacy summaries require the requested season", () => {
  const stats = parsePlayerStats(
    {
      season: { displayName: "2025", year: 2025 },
      statsSummary: {
        displayName: "2025 season stats",
        statistics: [
          {
            name: "avgPoints",
            abbreviation: "PTS",
            displayValue: "18.2",
            displayName: "Points per game",
          },
        ],
      },
    },
    "current",
    "basketball/nba",
    "Guard",
    2025,
  );

  assert.deepEqual(stats, {
    title: "2025 season stats",
    values: [{ label: "PTS", value: "18.2", description: "Points per game" }],
  });
});
