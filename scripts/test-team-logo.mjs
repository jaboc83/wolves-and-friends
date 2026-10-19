import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const source = fs.readFileSync("app/api/team-logo/route.ts", "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const module = { exports: {} };
new Function("module", "exports", js)(module, module.exports);
const { GET } = module.exports;
const originalFetch = globalThis.fetch;
const calls = [];
globalThis.fetch = async (url, options) => {
  calls.push({ url: String(url), options });
  if (String(url).includes("site.api.espn.com"))
    return Response.json({
      team: {
        logos: [
          {
            rel: ["default"],
            href: "https://a.espncdn.com/i/teamlogos/nba/500/16.png",
          },
        ],
      },
    });
  return new Response(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0]), {
    status: 200,
  });
};
try {
  assert.equal(
    (await GET(new Request("https://local/api/team-logo?league=bad&id=16")))
      .status,
    400,
  );
  const image = await GET(
    new Request("https://local/api/team-logo?league=basketball%2Fnba&id=16", {
      headers: { cookie: "private", "user-agent": "private" },
    }),
  );
  assert.equal(image.status, 200);
  assert.equal(image.headers.get("content-type"), "image/png");
  assert.equal(image.headers.get("referrer-policy"), "no-referrer");
  assert.equal(calls.length, 2);
  assert.ok(
    calls.every(
      ({ options }) =>
        options.credentials === "omit" &&
        options.referrerPolicy === "no-referrer" &&
        !options.headers?.cookie &&
        !options.headers?.["user-agent"],
    ),
  );
  await GET(
    new Request("https://local/api/team-logo?league=basketball%2Fnba&id=16"),
  );
  assert.equal(calls.length, 2, "public team logos are cached per isolate");
} finally {
  globalThis.fetch = originalFetch;
}

const helper = fs.readFileSync("lib/march-madness.ts", "utf8");
assert.match(helper, /\/api\/team-logo\?league=/);
const calendar = fs.readFileSync("components/match-calendar.tsx", "utf8");
assert.match(calendar, /<AddToCalendar game=\{g\} compact \/>/);
assert.match(calendar, /className="calendar-agenda-game"/);
const backToTop = fs.readFileSync("components/back-to-top.tsx", "utf8");
assert.match(backToTop, /window\.scrollY > 240/);
assert.match(fs.readFileSync("app/globals.css", "utf8"), /bottom: calc\(88px/);
console.log(
  "Same-origin bracket logos, calendar action, and mobile back-to-top passed.",
);
