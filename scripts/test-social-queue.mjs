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
    const module = { exports: {} };
    cache.set(file, module);
    const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText;
    new Function("require", "module", "exports", source)(
      (name) => {
        if (name in overrides) return overrides[name];
        if (!name.startsWith(".")) return require(name);
        return load(path.resolve(path.dirname(file), name) + ".ts");
      },
      module,
      module.exports,
    );
    return module.exports;
  }
  return load;
}
const load = loader();
const { socialQueue, unreadSocial } = load(path.resolve("lib/social-queue.ts"));
const now = Date.parse("2026-10-16T18:00:00Z");
const posts = Array.from({ length: 60 }, (_, i) => ({
  id: "p" + i,
  url: "https://bsky.app/profile/test/post/" + i,
  title: "Post " + i,
  kind: "social",
  teams: ["wolves"],
  source: "Test",
  date: new Date(now - i * 1000).toISOString(),
}));
assert.equal(socialQueue(posts).length, 50);
assert.equal(unreadSocial(posts, "wolves", [posts[0].id])[0].id, posts[1].id);
assert.equal(
  unreadSocial(
    posts,
    "wolves",
    posts.slice(0, 45).map((p) => p.id),
  ).length,
  5,
);
assert.equal(unreadSocial(posts, "all", []).length, 2);
assert.deepEqual(
  socialQueue([posts[0], { ...posts[0], teams: ["wild"] }])[0].teams,
  ["wolves", "wild"],
);
assert.equal(
  socialQueue([
    ...posts,
    ...posts.map((p) => ({
      ...p,
      id: "w" + p.id,
      url: p.url + "w",
      teams: ["wild"],
    })),
  ]).length,
  100,
);
assert.equal(
  socialQueue([posts[0], ...posts.slice(1)]).length,
  50,
  "refresh keeps older queue items",
);
const { recentStories } = load(path.resolve("lib/news-window.ts"));
const days = [0, 3, 6, 7, 8].map((n) => ({
  ...posts[n],
  date: new Date(now - n * 86400000).toISOString(),
}));
assert.equal(recentStories(days, "wolves", now).length, 4);
assert.equal(recentStories(days, "all", now).length, 1);
// Chicago's calendar day, rather than a rolling 24-hour window or UTC day.
const midnightStories = [
  { ...posts[0], id: "yesterday", date: "2026-10-17T04:59:59Z" },
  { ...posts[0], id: "today", date: "2026-10-17T05:00:00Z" },
  { ...posts[0], id: "invalid", date: "invalid" },
];
assert.deepEqual(
  recentStories(midnightStories, "all", Date.parse("2026-10-17T05:30:00Z")).map(
    (s) => s.id,
  ),
  ["today"],
);
const { gameBadges } = load(path.resolve("lib/game-badges.ts"));
assert.deepEqual(
  gameBadges({ team: "palace", league: "English Premier League" }),
  [{ label: "Premier", tone: "premier" }],
);
assert.deepEqual(gameBadges({ team: "palace", league: "Club Friendlies" }), [
  { label: "Friendly", tone: "friendly" },
]);
assert.deepEqual(gameBadges({ team: "palace", league: "FA Cup" }), [
  { label: "FA Cup", tone: "cup" },
]);
assert.equal(
  gameBadges({ team: "palace", league: "Soccer" }).length,
  0,
  "unknown competition is not guessed",
);
const page = fs.readFileSync("app/page.tsx", "utf8");
assert.match(page, /\[hideScores, setHideResults\] = useState\(true\)/);
assert.match(
  page,
  /setHideResults\(preference.hidden\)/,
);
assert.match(page, /saveScorePreference\(browserStorage, hidden, ask\)/);
assert.match(page, /hideScores \? "Show scores" : "Hide scores"/);
assert.doesNotMatch(page, /checked=\{hideScores\}/);
const originalFetch = globalThis.fetch;
let calls = 0;
globalThis.fetch = async (url) => {
  const query = new URL(url).searchParams;
  assert.equal(query.get("limit"), "100");
  assert.ok(!query.has("read") && !query.has("user"));
  const offset = calls++ * 30;
  return {
    ok: true,
    json: async () => ({
      cursor: calls < 3 ? "page" + calls : "",
      posts: Array.from({ length: 30 }, (_, i) => ({
        uri: "at://test/post/" + (offset + i),
        author: { handle: "test.bsky.social" },
        record: {
          text: "#CPFC post",
          createdAt: new Date(now - (offset + i) * 1000).toISOString(),
        },
      })),
    }),
  };
};
try {
  const { taggedBluesky } = load(path.resolve("lib/bluesky.ts"));
  assert.equal((await taggedBluesky("palace", "#CPFC")).length, 50);
  assert.equal(calls, 2, "pagination fills the queue then stops");
  const routeLoad = loader({
    "../../../lib/youtube": {
      officialYoutubePosts: async () => ({ posts: [], unavailable: [] }),
    },
    "../../../lib/bluesky": {
      wolvesBluesky: async () => posts,
      taggedBluesky: async () => [],
    },
  });
  const { GET } = routeLoad(path.resolve("app/api/social/route.ts"));
  const [a, b] = await Promise.all([
    GET(new Request("https://local.invalid/api/social")),
    GET(new Request("https://local.invalid/api/social")),
  ]);
  assert.equal((await a.json()).posts.length, 50);
  assert.equal((await b.json()).posts.length, 50);
} finally {
  globalThis.fetch = originalFetch;
}
console.log(
  "Social queue, next-unread refill, 7-day headlines, Palace labels, result preference wiring, pagination, and route checks passed.",
);

