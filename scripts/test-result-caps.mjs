import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const require = createRequire(import.meta.url);
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  if (file.endsWith(".json")) return JSON.parse(fs.readFileSync(file, "utf8"));
  const module = { exports: {} };
  cache.set(file, module);
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  new Function("require", "module", "exports", source)(
    (name) => {
      if (!name.startsWith(".")) return require(name);
      const base = path.resolve(path.dirname(file), name);
      return load(
        [base, base + ".ts", base + ".tsx"].find((candidate) =>
          fs.existsSync(candidate),
        ),
      );
    },
    module,
    module.exports,
  );
  return module.exports;
}
const Card = load(path.resolve("components/game-card.tsx")).default;
function game(a, b, state = "post") {
  return {
    id: "example",
    team: "wolves",
    name: "Wolves vs Bulls",
    date: "2026-10-14T00:00:00Z",
    state,
    league: "NBA",
    status: "Final",
    venue: "",
    broadcast: "",
    url: "",
    competitors: [
      { name: "Minnesota Timberwolves", score: a, homeAway: "away" },
      { name: "Chicago Bulls", score: b, homeAway: "home" },
    ],
  };
}
const render = (g, revealPast) =>
  renderToStaticMarkup(
    createElement(Card, {
      game: g,
      compact: true,
      revealed: false,
      revealPast,
      onReveal() {},
    }),
  );
for (const [a, b, result, label] of [
  ["122", "104", "W", "Win"],
  ["106", "128", "L", "Loss"],
  ["0", "0", "T", "Tie"],
]) {
  const shown = render(game(a, b), true);
  assert.match(shown, new RegExp("result-cap cap-" + result));
  assert.match(shown, new RegExp('aria-label="' + label + '"'));
  assert.match(
    shown,
    new RegExp(
      "<strong>" +
        a +
        '</strong><span class="score-separator">–</span><span>' +
        b +
        "</span>",
    ),
  );
  const hidden = render(game(a, b), false);
  assert.doesNotMatch(hidden, /result-cap|result-score|result-shown/);
  assert.match(hidden, /Result hidden/);
}
assert.doesNotMatch(
  render(game("", "", "pre"), true),
  /past-game|result-cap|result-score/,
);
assert.doesNotMatch(
  render(game("", "", "post"), true),
  /result-cap|result-score/,
);
const today = (g, revealPast = true) =>
  renderToStaticMarkup(
    createElement(Card, {
      game: g,
      compact: g.state === "post",
      today: true,
      revealed: false,
      revealPast,
      onReveal() {},
    }),
  );
const completedToday = today({
  ...game("122", "104"),
  url: "https://example.com/stats",
});
assert.doesNotMatch(completedToday, /class="game-top"|class="competitor /);
assert.match(completedToday, /class="result-score"/);
assert.match(completedToday, /Box score/);
assert.match(completedToday, /Find full game highlights/);
assert.doesNotMatch(
  today(game("122", "104"), false),
  /result-cap|result-score/,
);
assert.match(today(game("", "", "pre")), /class="game-top"/);
assert.match(render(game("122", "104"), true), /class="game-top"/);
const soccerDraw = {
  ...game("1", "1"),
  team: "palace",
  name: "Palace vs Arsenal",
  competitors: [
    { name: "Crystal Palace", score: "1" },
    { name: "Arsenal", score: "1" },
  ],
};
assert.match(render(soccerDraw, true), /cap-D/);
assert.match(render(soccerDraw, true), /aria-label="Draw"/);
assert.match(
  render({ ...soccerDraw, url: "https://example.com/stats" }, true),
  /Match stats/,
);
assert.match(
  render({ ...soccerDraw, url: "https://example.com/stats" }, true),
  /full match highlights/,
);
const terms = load(path.resolve("lib/sport-terms.ts")).sportTerms;
assert.equal(terms("all").standings, "Standings/Table");
assert.equal(terms("wolves").calendar, "Game calendar");
assert.equal(terms("palace").calendar, "Fixture calendar");
assert.equal(terms("palace").roster, "Squad");
assert.equal(terms("loons").roster, "Roster");
assert.equal(terms("disc").events, "tournaments");
console.log(
  "Result cap checks passed, including completed-today deduplication, preserved links, hidden scores, and unchanged upcoming/recent cards.",
);
