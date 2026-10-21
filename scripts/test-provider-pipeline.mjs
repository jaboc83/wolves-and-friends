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
    const module = { exports: {} };
    cache.set(file, module);
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
      module,
      module.exports,
    );
    return module.exports;
  }
  return (file) => load(path.resolve(file));
}
const { runProviderTasks } = loader()("lib/provider-tasks.ts");
const { mergeFallbackGames } = loader()("lib/official-schedules.ts");
const games = [
  { id: "fresh-wolves", team: "wolves", date: "2026-10-21T23:30:00Z" },
  { id: "fresh-loons", team: "loons", date: "2026-10-25T00:30:00Z" },
];
mergeFallbackGames(games, [
  { id: "fresh-wolves", team: "wolves", date: "2026-10-21T23:30:00Z" },
  { id: "stale-loons-id", team: "loons", date: "2026-10-25T01:00:00Z" },
  { id: "future-wolves", team: "wolves", date: "2026-10-23T23:00:00Z" },
]);
assert.deepEqual(
  games.map((game) => game.id),
  ["fresh-wolves", "fresh-loons", "future-wolves"],
);
let active = 0,
  peak = 0;
const outcomes = await runProviderTasks(
  Array.from({ length: 12 }, (_, i) => ({
    name: String(i),
    run: async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, i % 3));
      active--;
      return i;
    },
  })),
  { concurrency: 3, timeoutMs: 1000 },
);
assert.equal(peak, 3);
assert.deepEqual(
  outcomes.map((result) => result.value),
  Array.from({ length: 12 }, (_, i) => i),
);
let aborted = false;
const result = await runProviderTasks(
  [
    {
      name: "slow",
      run: (signal) => {
        signal.addEventListener("abort", () => {
          aborted = true;
        });
        return new Promise(() => {});
      },
    },
    { name: "fast", run: async () => ["usable"] },
  ],
  { timeoutMs: 10 },
);
assert.equal(aborted, true);
assert.equal(result[0].error.name, "TimeoutError");
assert.deepEqual(result[1].value, ["usable"]);
assert.deepEqual(await runProviderTasks([], { timeoutMs: 1 }), []);

const originalFetch = globalThis.fetch,
  originalNow = Date.now;
try {
  let now = Date.now();
  Date.now = () => now;
  let title = "Story 0";
  let articleFetches = 0;
  globalThis.fetch = async (url) => ({
    ok: true,
    text: async () => {
      if (String(url).includes("/author/"))
        return `<a href="/article/${title.replaceAll(" ", "-")}"><h2>${title}</h2></a>`;
      articleFetches++;
      return '<meta name="author" content="Test Author">';
    },
  });
  const { verifyAuthorFeed } = loader({
    "./byline-status": { applyKnownBylines: () => {} },
  })("lib/bylines.ts");
  const author = () => ({
    name: "Test Author",
    url: "https://publisher/author/test",
    items: [{ title, url: "https://index", date: new Date().toISOString() }],
  });
  await verifyAuthorFeed(author());
  await verifyAuthorFeed(author());
  assert.equal(articleFetches, 1);
  now += 3600001;
  await verifyAuthorFeed(author());
  assert.equal(articleFetches, 2, "expired check refetched");
  for (let i = 1; i <= 256; i++) {
    title = "Story " + i;
    await verifyAuthorFeed(author());
  }
  title = "Story 0";
  const before = articleFetches;
  await verifyAuthorFeed(author());
  assert.equal(
    articleFetches,
    before + 1,
    "cache evicts oldest entry at capacity",
  );
} finally {
  globalThis.fetch = originalFetch;
  Date.now = originalNow;
}
console.log(
  "Provider pipeline passed: schedule fallback dedupe, bounded concurrency, deterministic ordering, deadline, partial success, bounded byline cache.",
);
