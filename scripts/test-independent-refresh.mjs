import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
const game = {
  id: "test",
  team: "zalgiris",
  date: new Date().toISOString(),
  state: "pre",
  competitors: [],
};
let releaseNews;
const newsGate = new Promise((resolve) => {
  releaseNews = resolve;
});
let releaseOdds;
const oddsGate = new Promise((resolve) => {
  releaseOdds = resolve;
});
let oddsCalls = 0;
const mocks = {
  "./scoreboard": { fetchScoreboard: async () => ({ events: [] }) },
  "./event-seed": { discEvents: [] },
  "./dgpt": { parseDgptSchedule: () => [] },
  "./event-time": { eventLifecycle: (g) => g },
  "./bylines": { verifyAuthorFeed: async () => {} },
  "./club-news": {
    parseZalgirisNews: () => [],
    parseFrostNews: () => [],
    translateHeadlines: async () => {},
  },
  "./author-stories": { authorStories: () => [] },
  "./official-schedules": {
    parsePalace: () => [],
    parseLoonsCalendar: () => [],
    mergeOfficial: () => {},
    mergeFallbackGames: (games, fallback) => games.push(...fallback),
  },
  "./teams": {
    teams: [
      {
        id: "wolves",
        short: "Wolves",
        league: "basketball/nba",
        espn: "16",
        sport: "basketball",
      },
    ],
  },
  "./competitions": {
    palaceCompetitions: {},
    scoreboardLeagues: [],
    teamPlaysCompetition: () => false,
  },
  "./zalgiris": { parseZalgiris: () => [structuredClone(game)] },
  "./special-team-data": { parsePwhlSchedule: () => [] },
  "./odds": {
    enrichOdds: async (games) => {
      oddsCalls++;
      await oddsGate;
      games[0].odds = { details: "test" };
    },
  },
  "./initial.json": { stories: [], games: [], authors: [] },
};
function dependency(file) {
  const module = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync("lib/" + file + ".ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function("require", "module", "exports", js)((name) => mocks[name], module, module.exports);
  return module.exports;
}
mocks["./feed-parsers"] = dependency("feed-parsers");
mocks["./news-sources"] = dependency("news-sources");
mocks["./provider-tasks"] = dependency("provider-tasks");
const originalFetch = globalThis.fetch;
let calls = 0;
const urls = [];
globalThis.fetch = async (url) => {
  calls++;
  urls.push(String(url));
  if (/rss|feed|\/news|naujienos/.test(String(url))) await newsGate;
  return {
    ok: true,
    json: async () => ({ events: [], articles: [] }),
    text: async () => "",
  };
};
try {
  const js = ts.transpileModule(
    fs.readFileSync(new URL("../lib/feeds.ts", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", js)(
    (name) => {
      assert.ok(name in mocks, name);
      return mocks[name];
    },
    module,
    module.exports,
  );
  const { hubData, oddsData } = module.exports;
  const news = hubData("news");
  assert.equal(hubData("news"), news, "overlapping news requests share work");
  const schedules = hubData("schedules");
  assert.equal(
    hubData("schedules"),
    schedules,
    "overlapping schedules share work",
  );
  const scheduleData = await schedules;
  assert.equal(
    scheduleData.games.length,
    1,
    "schedule finishes while news is blocked",
  );
  assert.equal(oddsCalls, 0, "schedules do not wait for odds");
  const odds = oddsData();
  assert.equal(oddsData(), odds, "overlapping odds requests share work");
  releaseOdds();
  assert.equal((await odds).games[0].odds.details, "test");
  assert.equal(
    scheduleData.games[0].odds,
    undefined,
    "odds never mutate schedule cache",
  );
  releaseNews();
  const newsData = await news;
  assert.deepEqual(
    newsData.games,
    [],
    "news response cannot replace schedules",
  );
  const scopeStart = urls.length;
  const wolvesNews = hubData("news", "wolves");
  assert.equal(
    hubData("news", "wolves"),
    wolvesNews,
    "same page shares in-flight work",
  );
  await wolvesNews;
  const scopedUrls = urls.slice(scopeStart);
  assert.ok(scopedUrls.some((url) => url.includes("canishoopus")));
  assert.ok(
    !scopedUrls.some((url) =>
      /pdga|ultiworld|norseman|pwhl|Ragatz|Goessling|Lewis|Myers/.test(url),
    ),
    "Wolves page never waits for unrelated team feeds",
  );
  const failureModule = { exports: {} };
  new Function("require", "module", "exports", js)(
    (name) =>
      name === "./initial.json"
        ? {
            stories: [
              {
                source: "Canis Hoopus",
                url: "stale",
                title: "Stale story",
                teams: ["wolves"],
                date: new Date().toISOString(),
              },
            ],
            games: [],
            authors: [],
          }
        : mocks[name],
    failureModule,
    failureModule.exports,
  );
  globalThis.fetch = async () => {
    throw Error("offline");
  };
  const failed = await failureModule.exports.hubData("news", "wolves");
  assert.ok(failed.health.every((source) => source.status === "unavailable"),
    "author request failures do not appear as successful provider health");
  assert.equal(
    failed.stories.length,
    0,
    "failed feeds never inject stale seed headlines",
  );
  globalThis.fetch = async (url) => {
    calls++;
    return {
      ok: true,
      json: async () => ({ events: [], articles: [] }),
      text: async () => "",
    };
  };
  const before = calls;
  await hubData("news");
  await hubData("news", "wolves");
  await hubData("schedules");
  await oddsData();
  assert.equal(calls, before, "warm caches avoid upstream refetches");
  assert.equal(oddsCalls, 1);
  console.log(
    "Independent refresh checks passed: isolated completion, request deduplication, caches, and odds mutation safety.",
  );
} finally {
  globalThis.fetch = originalFetch;
}

