// Check Bluesky image URL and local-image handling so social cards use local
// assets where required and avoid unintended third-party browser requests.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const require = createRequire(
  new URL("../../../package.json", import.meta.url),
);
function loader() {
  const modules = new Map();
  function load(filename) {
    if (modules.has(filename)) return modules.get(filename).exports;
    const loadedModule = { exports: {} };
    modules.set(filename, loadedModule);
    const js = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText;
    const localRequire = (name) =>
      name.startsWith(".")
        ? load(path.resolve(path.dirname(filename), name) + ".ts")
        : require(name);
    new Function("require", "module", "exports", js)(
      localRequire,
      loadedModule,
      loadedModule.exports,
    );
    return loadedModule.exports;
  }
  return (file) => load(path.join(root, file));
}
const load = loader();
const { blueskyImageUrl, blueskyImagePath, isLocalSocialImage } = load(
  "lib/social/bluesky-images.ts",
);
const { parseBlueskyFeed } = load("lib/social/bluesky.ts");
const avatar =
  "https://cdn.bsky.app/img/avatar/plain/did:plc:test/bafkreiaaaaa";
const photo =
  "https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:test/bafkreibbbbb@jpeg";
assert.match(blueskyImageUrl(avatar, "avatar"), /^\/api\/social-image\?path=/);
assert.equal(
  blueskyImagePath(avatar, "avatar"),
  "/img/avatar_thumbnail/plain/did:plc:test/bafkreiaaaaa@jpeg",
);
assert.equal(
  blueskyImagePath(photo, "photo"),
  "/img/feed_thumbnail/plain/did:plc:test/bafkreibbbbb@jpeg",
);
for (const bad of [
  avatar.replace("https:", "http:"),
  avatar.replace("cdn.bsky.app", "evil.example"),
  avatar + "?visitor=id",
  avatar + "#x",
  avatar.replace("cdn.bsky.app", "cdn.bsky.app@evil.example"),
  avatar.replace("did:plc:test", "%2e%2e"),
  "https://cdn.bsky.app/../../private",
]) {
  assert.equal(blueskyImageUrl(bad, "avatar"), undefined, bad);
}
assert.equal(blueskyImageUrl(photo, "avatar"), undefined);
assert.equal(blueskyImageUrl(avatar, "photo"), undefined);
assert.equal(isLocalSocialImage(blueskyImageUrl(avatar, "avatar")), true);
assert.equal(isLocalSocialImage("//evil.example/image"), false);
assert.equal(isLocalSocialImage(avatar), false);
assert.equal(isLocalSocialImage("/api/social-image?path=garbage"), false);

const embed = {
  $type: "app.bsky.embed.images#view",
  images: Array.from({ length: 5 }, () => ({
    thumb: photo,
    alt: "A basketball court",
    aspectRatio: { width: 1200, height: 800 },
  })),
};
const item = {
  post: {
    uri: "at://did:plc:test/app.bsky.feed.post/123",
    author: { handle: "example.bsky.social", avatar },
    record: { text: "Wolves photos", createdAt: "2026-10-16T15:00:00Z" },
    embed,
  },
};
const parsed = parseBlueskyFeed({ feed: [item] });
assert.equal(parsed.length, 1);
assert.equal(parsed[0].images.length, 4);
assert.equal(parsed[0].images[0].alt, "A basketball court");
assert.equal(parsed[0].images[0].width, 1200);
assert.equal(isLocalSocialImage(parsed[0].avatar), true);
assert.equal(
  parsed[0].images.every((i) => isLocalSocialImage(i.src)),
  true,
);
const quote = structuredClone(item);
quote.post.embed = {
  $type: "app.bsky.embed.recordWithMedia#view",
  media: embed,
};
assert.equal(parseBlueskyFeed({ feed: [quote] })[0].images.length, 4);
const hidden = structuredClone(item);
hidden.post.labels = [{ val: "!hide" }];
assert.deepEqual(parseBlueskyFeed({ feed: [hidden] }), []);
const malicious = structuredClone(item);
malicious.post.embed.images = [
  { thumb: "https://evil.example/tracker", alt: "No" },
];
assert.equal(parseBlueskyFeed({ feed: [malicious] })[0].images, undefined);
const SocialImage = load("components/social-image.tsx").default;
assert.match(
  renderToStaticMarkup(createElement(SocialImage, { alt: "", fallback: "C" })),
  />C</,
);
assert.doesNotMatch(
  renderToStaticMarkup(
    createElement(SocialImage, { src: avatar, alt: "", fallback: "C" }),
  ),
  /<img/,
);

const realFetch = globalThis.fetch;
const jpeg = new Uint8Array([255, 216, 255, 224, 0, 0]);
try {
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.equal(
      url,
      "https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:test/bafkreiaaaaa@jpeg",
    );
    assert.equal(options.credentials, "omit");
    assert.equal(options.referrerPolicy, "no-referrer");
    assert.equal(options.redirect, "manual");
    assert.deepEqual(Object.keys(options.headers), ["Accept"]);
    return new Response(jpeg, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Set-Cookie": "upstream=ignored",
      },
    });
  };
  const { GET } = loader()("app/api/social-image/route.ts");
  const request = new Request(
    "https://site.example" + blueskyImageUrl(avatar, "avatar"),
    {
      headers: {
        Cookie: "never-forward",
        Referer: "https://private.example",
        "User-Agent": "never-forward",
      },
    },
  );
  const response = await GET(request);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/jpeg");
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), jpeg);
  assert.equal((await GET(request)).status, 200);
  assert.equal(calls, 1, "Repeated public image uses the bounded cache");
  assert.equal(
    (
      await GET(
        new Request(
          "https://site.example/api/social-image?path=https://evil.example",
        ),
      )
    ).status,
    400,
  );
  assert.equal(calls, 1, "Invalid path never reaches the network");

  for (const upstream of [
    () =>
      new Response("<svg onload='bad'>", {
        headers: { "Content-Type": "image/jpeg" },
      }),
    () => new Response(jpeg, { headers: { "Content-Length": "1500001" } }),
    () => new Response(new Uint8Array(1_500_001)),
    () =>
      new Response(null, {
        status: 302,
        headers: { Location: "https://evil.example/tracker" },
      }),
    () => new Response(null, { status: 404 }),
    () => {
      throw Error("upstream unavailable");
    },
  ]) {
    globalThis.fetch = async () => upstream();
    const failed = await loader()("app/api/social-image/route.ts").GET(request);
    assert.equal(failed.status, 502);
    assert.equal(failed.headers.get("cache-control"), "no-store");
  }
  let redirects = 0;
  globalThis.fetch = async () =>
    ++redirects === 1
      ? new Response(null, {
          status: 302,
          headers: { Location: avatar + "@jpeg" },
        })
      : new Response(jpeg);
  assert.equal(
    (await loader()("app/api/social-image/route.ts").GET(request)).status,
    200,
  );
  assert.equal(redirects, 2);
} finally {
  globalThis.fetch = realFetch;
}
console.log(
  "Bluesky parsing, local-only rendering, proxy privacy, cache, redirects, and failure checks passed.",
);
