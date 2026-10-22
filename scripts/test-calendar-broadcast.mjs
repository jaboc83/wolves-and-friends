import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

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

const { googleCalendarUrl, calendarFile } = load(
  path.resolve("lib/calendar-event.ts"),
);
const game = {
  id: "broadcast-test",
  team: "wolves",
  name: "Minnesota Timberwolves at Test Team",
  date: "2026-10-20T19:00:00-05:00",
  status: "Scheduled",
  state: "pre",
  league: "basketball/nba",
  venue: "Test Arena",
  broadcast: "ESPN; Wolves Radio Network",
  url: "https://example.com/game",
  competitors: [],
};
const google = new URL(googleCalendarUrl(game));
assert.match(
  google.searchParams.get("details"),
  /Radio \/ TV: ESPN; Wolves Radio Network/,
);
assert.match(
  google.searchParams.get("details"),
  /Event details: https:\/\/example.com\/game/,
);
const ics = calendarFile(game, new Date("2026-10-19T12:00:00Z"));
assert.match(
  ics.replace(/\r\n /g, ""),
  /DESCRIPTION:Radio \/ TV: ESPN\\; Wolves Radio Network\\nEvent details: https:\/\/example.com\/game/,
);
console.log(
  "Google Calendar and iCalendar descriptions include published Radio/TV information.",
);
