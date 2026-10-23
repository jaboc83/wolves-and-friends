import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function loadModule(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });
  return import(
    "data:text/javascript;base64," + Buffer.from(outputText).toString("base64")
  );
}

const { runProviderTasks } = await loadModule("../lib/feeds/provider-tasks.ts");
let started = 0;
const tasks = Array.from({ length: 9 }, (_, i) => ({
  name: String(i),
  run: async (signal) => {
    started++;
    if (i === 8) return "last feed completed";
    await new Promise((resolve) =>
      signal.addEventListener("abort", resolve, { once: true }),
    );
    return "late result";
  },
}));
const results = await runProviderTasks(tasks, {
  concurrency: tasks.length,
  timeoutMs: 50,
});
assert.equal(started, 9);
assert.equal(results[8].value, "last feed completed");
assert.ok(results.slice(0, 8).every((result) => result.error && !result.value));

const { authorSources } = await loadModule("../lib/feeds/news-sources.ts");
const { newsSources } = await loadModule("../lib/feeds/news-sources.ts");
assert.equal(
  newsSources.some(([name]) => name === "Howls and Growls"),
  false,
);
const britt = authorSources.find((source) => source.name === "Britt Robson");
assert.equal(britt.feed, "https://www.minnpost.com/author/britt-robson/feed/");
assert.equal(britt.publisherAuthorFeed, true);
const alec = authorSources.find((source) => source.name === "Alec Lewis");
assert.match(alec.feed, /site%3Anytimes\.com%2Fathletic/);
const jon = authorSources.find((source) => source.name === "Jon Krawczynski");
assert.match(jon.feed, /site%3Anytimes\.com%2Fathletic/);
const { verifyAuthorFeed } = await loadModule("../lib/feeds/bylines.ts");
const originalFetch = globalThis.fetch;
globalThis.fetch = () => {
  throw Error("Unexpected verification request");
};
try {
  const author = { items: [{ title: "Wolves", bylineVerified: true }] };
  await verifyAuthorFeed(author);
  assert.equal(author.items.length, 1);
  await verifyAuthorFeed({ items: [] });
} finally {
  globalThis.fetch = originalFetch;
}
console.log("News feed regression checks passed");
