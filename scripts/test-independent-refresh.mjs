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
  "./event-seed": { discEvents: [] },
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
  "./odds": {
    enrichOdds: async (games) => {
      oddsCalls++;
      await oddsGate;
      games[0].odds = { details: "test" };
    },
  },
  "./initial.json": { stories: [], games: [], authors: [] },
};
const originalFetch = globalThis.fetch;
let calls = 0;
globalThis.fetch = async (url) => {
  calls++;
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
  const before = calls;
  await hubData("news");
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
