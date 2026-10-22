import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
function compile(file, mocks = {}) {
  const module = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  new Function("require", "module", "exports", js)(
    (name) => {
      assert.ok(name in mocks, name);
      return mocks[name];
    },
    module,
    module.exports,
  );
  return module.exports;
}
const youtube = compile("lib/youtube.ts");
const queue = compile("lib/social-queue.ts");
const wolves = youtube.officialYoutube.find((s) => s.team === "wolves");
const xml = (channel, title = "Practice &amp; interviews") =>
  `<feed><yt:channelId>${channel}</yt:channelId><entry><yt:videoId>abcdefghijk</yt:videoId><title>${title}</title><published>2026-10-19T19:00:00Z</published></entry><entry><yt:videoId>invalid</yt:videoId><title>Bad</title><published>invalid</published></entry></feed>`;
const posts = youtube.parseYoutube(xml(wolves.channel), wolves, wolves.channel);
assert.equal(posts.length, 1);
assert.equal(posts[0].title, "Practice & interviews");
assert.equal(posts[0].socialPlatform, "youtube");
assert.equal(posts[0].kind, "social");
assert.ok(
  !posts[0].images && !posts[0].avatar,
  "no third-party media requests in browser",
);
assert.equal(queue.unreadSocial(posts, "wolves", []).length, 1);
assert.equal(queue.unreadSocial(posts, "wolves", [posts[0].id]).length, 0);
assert.throws(() =>
  youtube.parseYoutube(xml("wrong-channel"), wolves, wolves.channel),
);
const us = youtube.officialYoutube.find((s) => s.team === "usmnt");
assert.equal(
  youtube.parseYoutube(
    xml(wolves.channel, "Women’s national team highlights"),
    us,
    wolves.channel,
  ).length,
  0,
);
assert.equal(
  youtube.parseYoutube(
    xml(wolves.channel, "USMNT training"),
    us,
    wolves.channel,
  ).length,
  1,
);
assert.equal(
  youtube.youtubeChannelId(
    `<link rel="canonical" href="https://www.youtube.com/channel/${wolves.channel}">`,
  ),
  wolves.channel,
);
let calls = 0,
  release,
  gate;
const route = compile("app/api/social/route.ts", {
  "../../../lib/social-tags": { socialTags: {} },
  "../../../lib/bluesky": {
    wolvesBluesky: async () => {
      calls++;
      if (gate) await gate;
      return posts;
    },
  },
  "../../../lib/social-queue": queue,
  "../../../lib/youtube": {
    officialYoutubePosts: async () => ({ posts: [], unavailable: ["wild"] }),
  },
});
const get = (force = false) =>
  route.GET(
    new Request(
      "https://local.invalid/api/social" + (force ? "?refresh=1" : ""),
    ),
  );
await get();
await get();
assert.equal(calls, 1, "automatic requests reuse one-minute cache");
const forced = await (await get(true)).json();
assert.equal(calls, 2, "manual refresh bypasses fresh server cache");
assert.equal(forced.posts.length, 1, "YouTube failure does not hide Bluesky");
gate = new Promise((resolve) => {
  release = resolve;
});
const a = get(true),
  b = get(true);
assert.equal(calls, 3, "overlapping force requests share collection");
release();
await Promise.all([a, b]);
console.log(
  "Social update checks passed: force refresh, in-flight sharing, source failures, YouTube parsing, read status, and privacy.",
);
