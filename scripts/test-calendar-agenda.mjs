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
  const loadedModule = { exports: {} };
  cache.set(file, loadedModule);
  const js = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  new Function("require", "module", "exports", js)(
    (name) =>
      name.startsWith(".")
        ? load(
            [".ts", ".tsx"]
              .map((ext) => path.resolve(path.dirname(file), name + ext))
              .find((f) => fs.existsSync(f)),
          )
        : require(name),
    loadedModule,
    loadedModule.exports,
  );
  return loadedModule.exports;
}
const MatchCalendar = load(
  path.resolve("components/match-calendar.tsx"),
).default;
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Chicago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const html = renderToStaticMarkup(
  createElement(MatchCalendar, {
    team: "wolves",
    games: [
      {
        id: "future-game",
        team: "wolves",
        name: "Minnesota Timberwolves vs. Opponent",
        date: today + "T18:00:00-05:00",
        status: "Scheduled",
        state: "pre",
        league: "basketball/nba",
        venue: "Arena",
        broadcast: "",
        url: "https://www.espn.com/nba/game/123",
        competitors: [],
      },
    ],
  }),
);
assert.ok(html.includes('class="calendar-agenda-game"'));
assert.ok(html.includes('class="calendar-agenda-link"'));
assert.ok(html.includes("https://calendar.google.com/calendar/render?"));
assert.ok(html.includes("to Google Calendar"));
assert.ok(
  html.match(
    /<a[^>]*class="calendar-agenda-link"[^>]*>[\s\S]*?<\/a><a[^>]*add-calendar/,
  ),
  "the Google Calendar link is a sibling, not nested inside the event link",
);
console.log(
  "Calendar agenda renders event details with a separate Google Calendar action.",
);
