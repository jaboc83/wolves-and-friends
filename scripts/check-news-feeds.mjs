import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// Transpiles a TS module and its relative imports into data: URLs Node can import.
async function transpileToDataUrl(url) {
  const source = await readFile(url, "utf8");
  let { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const specifiers = new Set(
    [...outputText.matchAll(/from\s+"(\.{1,2}\/[^"]+)"/g)].map((m) => m[1]),
  );
  for (const specifier of specifiers) {
    const target = new URL(
      specifier.endsWith(".ts") ? specifier : specifier + ".ts",
      url,
    );
    outputText = outputText.replaceAll(
      `"${specifier}"`,
      `"${await transpileToDataUrl(target)}"`,
    );
  }
  return (
    "data:text/javascript;base64," + Buffer.from(outputText).toString("base64")
  );
}

async function loadModule(path) {
  return import(await transpileToDataUrl(new URL(path, import.meta.url)));
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

const defaultTasks = Array.from({ length: 9 }, (_, i) => ({
  name: String(i),
  run: async () => "completed",
}));
const defaultResults = await runProviderTasks(defaultTasks, {
  concurrency: defaultTasks.length,
  timeoutMs: 100,
});
assert.ok(defaultResults.every((result) => result.value === "completed"));

const { authorSources } = await loadModule("../lib/feeds/news-sources.ts");
const { newsSources } = await loadModule("../lib/feeds/news-sources.ts");
assert.equal(
  newsSources.some(({ name }) => name === "Howls and Growls"),
  false,
);
const canis = newsSources.find(({ name }) => name === "Canis Hoopus");
assert.deepEqual(canis.teams, ["wolves", "lynx"]);
assert.equal(canis.tagByContent, true);
const britt = authorSources.find((source) => source.name === "Britt Robson");
assert.equal(britt.feed, "https://www.minnpost.com/author/britt-robson/feed/");
assert.equal(britt.publisherAuthorFeed, true);
const alec = authorSources.find((source) => source.name === "Alec Lewis");
assert.match(alec.feed, /site%3Anytimes\.com%2Fathletic/);
const jon = authorSources.find((source) => source.name === "Jon Krawczynski");
assert.match(jon.feed, /site%3Anytimes\.com%2Fathletic/);
assert.equal(
  authorSources.find((source) => source.name === "Michael Russo").team,
  "wild",
);
const { authorStories } = await loadModule("../lib/feeds/author-stories.ts");
const storyTeams = (team, title) =>
  authorStories([
    {
      name: "x",
      label: "",
      url: "",
      team,
      checked: "",
      status: "ok",
      items: [{ title, url: "https://example.com/" + title, date: "" }],
    },
  ])[0].teams;
assert.deepEqual(storyTeams("wild", "Wild beat Lynx"), ["wild"]);
assert.deepEqual(storyTeams("wolves", "Lynx win"), ["lynx"]);
assert.deepEqual(storyTeams(undefined, "Wolves win"), ["wolves"]);
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
