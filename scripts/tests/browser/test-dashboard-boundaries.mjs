// Check browser storage and public-request boundaries, including disabled storage
// and privacy-safe fetch options, to catch regressions in client-side behavior.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
function loader(overrides = {}) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    if (file.endsWith(".json"))
      return JSON.parse(fs.readFileSync(file, "utf8"));
    const loadedModule = { exports: {} };
    cache.set(file, loadedModule);
    const js = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText;
    new Function("require", "module", "exports", js)(
      (name) => {
        if (name in overrides) return overrides[name];
        if (!name.startsWith(".")) return require(name);
        const resolved = path.resolve(path.dirname(file), name);
        return load(resolved.endsWith(".json") ? resolved : resolved + ".ts");
      },
      loadedModule,
      loadedModule.exports,
    );
    return loadedModule.exports;
  }
  return (file) => load(path.resolve(file));
}
const { readStored, writeStored, stringList, browserStorage } = loader()(
  "lib/browser/storage.ts",
);
const memory = new Map();
const storage = {
  getItem: (key) => memory.get(key) || null,
  setItem: (key, value) => memory.set(key, value),
};
for (const corrupt of ["{bad json", "{}", "[1]", "null"]) {
  memory.set("wf-read", corrupt);
  assert.deepEqual(readStored("wf-read", stringList, [], storage), []);
}
writeStored("wf-read", ["read-story"], storage);
assert.deepEqual(readStored("wf-read", stringList, [], storage), [
  "read-story",
]);
assert.doesNotThrow(() =>
  writeStored("wf-read", ["a"], {
    setItem() {
      throw Error("full");
    },
  }),
);
assert.deepEqual(
  readStored("wf-read", stringList, [], {
    getItem() {
      throw Error("disabled");
    },
  }),
  [],
);
assert.equal(
  browserStorage.getItem("absent"),
  null,
  "SSR/disabled storage is optional",
);
const { storedDashboardPage, isHubData } = loader()("lib/dashboard/storage.ts");
memory.set("wf-team", "unknown");
assert.equal(storedDashboardPage(storage), "wolves");
memory.set("wf-team", "wild");
assert.equal(storedDashboardPage(storage), "wild");
memory.set("wf-team", "all");
assert.equal(storedDashboardPage(storage), "all");
memory.set("wf-team", "march-madness");
assert.equal(storedDashboardPage(storage), "march-madness");
const checked = new Date().toISOString();
const validStory = {
  id: "story",
  title: "Story",
  url: "https://example.com/story",
  source: "Example",
  date: checked,
  kind: "story",
  teams: ["wolves"],
};
const game = {
  id: "wolves-game",
  team: "wolves",
  name: "Wolves game",
  date: checked,
  status: "Scheduled",
  state: "pre",
  league: "NBA",
  venue: "",
  broadcast: "",
  url: "",
  competitors: [],
};
assert.equal(
  isHubData({ checked: "", games: [{}], stories: [], health: [] }),
  false,
);
assert.equal(
  isHubData({
    checked: "",
    games: [],
    stories: [validStory],
    health: [],
  }),
  true,
);
assert.equal(
  isHubData({
    checked: "",
    games: [],
    stories: [{ ...validStory, teams: ["unknown"] }],
    health: [],
  }),
  false,
);
assert.equal(
  isHubData({
    checked: "",
    games: [{ ...game, team: "unknown" }],
    stories: [],
    health: [],
  }),
  false,
);
assert.equal(
  isHubData({
    checked: "",
    games: [],
    stories: [],
    health: [
      { name: "Example", status: "ok", checked, count: 1, teams: ["unknown"] },
    ],
  }),
  false,
);

const { createPublicRequests, pollPublicFeeds } = loader()(
  "lib/browser/public-requests.ts",
);
const originalFetch = globalThis.fetch,
  originalSet = globalThis.setInterval,
  originalClear = globalThis.clearInterval;
try {
  const options = [];
  let release;
  globalThis.fetch = async (url, init) => {
    options.push(init);
    return { ok: true };
  };
  const requests = createPublicRequests();
  let starts = 0;
  const work = () => {
    starts++;
    return new Promise((resolve) => {
      release = resolve;
    });
  };
  const first = requests.once("news:wolves", work);
  assert.equal(requests.once("news:wolves", work), first);
  assert.equal(starts, 1);
  release();
  await first;
  await requests.fetch("/api/news?team=wolves", {
    credentials: "include",
    referrerPolicy: "unsafe-url",
  });
  assert.equal(options[0].credentials, "omit");
  assert.equal(options[0].referrerPolicy, "no-referrer");
  assert.ok(!options[0].headers);
  requests.stop();
  assert.equal(options[0].signal.aborted, true);
  await requests.once("after-stop", async () => {
    starts++;
  });
  assert.equal(starts, 1);
  requests.start();
  await requests.once("after-restart", async () => {
    starts++;
  });
  assert.equal(starts, 2);
  let intervalCalls = [],
    clears = [],
    refreshed = 0;
  globalThis.setInterval = (callback, ms) => {
    intervalCalls.push({ callback, ms });
    return intervalCalls.length;
  };
  globalThis.clearInterval = (id) => clears.push(id);
  const stop = pollPublicFeeds(
    () => refreshed++,
    () => refreshed++,
  );
  assert.equal(refreshed, 1);
  assert.deepEqual(
    intervalCalls.map((i) => i.ms),
    [300000, 60000],
  );
  intervalCalls[1].callback();
  assert.equal(refreshed, 2);
  stop();
  assert.deepEqual(clears, [1, 2]);
} finally {
  globalThis.fetch = originalFetch;
  globalThis.setInterval = originalSet;
  globalThis.clearInterval = originalClear;
}

const { selectStories, selectGames } = loader()("lib/dashboard/selectors.ts");
const story = {
  id: "a",
  url: "https://story",
  title: "Wolves news",
  date: new Date().toISOString(),
  source: "Test",
  teams: ["wolves"],
  kind: "story",
};
const newsData = {
  checked: "",
  stories: [story],
  authors: [],
  games: [],
  health: [],
};
const props = {
  newsData,
  active: "wolves",
  search: "",
  readIds: [],
  showRead: false,
  showOlder: false,
};
assert.equal(selectStories(props).displayed.length, 1);
assert.equal(selectStories({ ...props, readIds: ["a"] }).displayed.length, 0);
assert.equal(
  selectStories({ ...props, readIds: ["a"], showRead: true }).displayed.length,
  1,
);
assert.equal(selectStories({ ...props, active: "wild" }).displayed.length, 0);
assert.equal(
  selectStories({ ...props, search: "missing" }).displayed.length,
  0,
);
const before = JSON.stringify(newsData);
selectStories(props);
assert.equal(JSON.stringify(newsData), before);
assert.equal(
  selectGames({
    data: null,
    oddsGames: [],
    liveGames: [],
    active: "wolves",
    showOlderResults: false,
  }).visibleGames.length,
  0,
);
const future = (id, team, date) => ({
  id,
  team,
  date,
  state: "pre",
  name: id,
  league: "Test",
  status: "Scheduled",
  venue: "",
  broadcast: "",
  url: "",
  competitors: [],
});
const sortedGames = selectGames({
  data: {
    checked: "",
    stories: [],
    health: [],
    games: [
      future("wolves-later", "wolves", "2099-10-25T00:00:00Z"),
      future("wild-first", "wild", "2099-10-23T00:00:00Z"),
      future("vikings-middle", "vikings", "2099-10-24T00:00:00Z"),
    ],
  },
  oddsGames: [],
  liveGames: [],
  active: "all",
  showOlderResults: false,
});
assert.deepEqual(
  sortedGames.futureGames
    .map((game) => game.id)
    .filter((id) =>
      ["wild-first", "vikings-middle", "wolves-later"].includes(id),
    ),
  ["wild-first", "vikings-middle", "wolves-later"],
);
console.log(
  "Dashboard boundaries passed: safe storage, team/read selectors, generic requests, deduplication, cancellation and polling cleanup.",
);
