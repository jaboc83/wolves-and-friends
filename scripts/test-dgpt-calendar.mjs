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
  const loadedModule = { exports: {} };
  cache.set(file, loadedModule);
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
    loadedModule,
    loadedModule.exports,
  );
  return loadedModule.exports;
}

const { parseDgptSchedule } = load(path.resolve("lib/dgpt.ts"));
const { eventLifecycle, eventIsToday } = load(
  path.resolve("lib/games/event-time.ts"),
);
const { calendarFile, googleCalendarUrl } = load(
  path.resolve("lib/games/calendar-event.ts"),
);
const { discEvents } = load(path.resolve("lib/games/event-seed.ts"));
const now = new Date("2026-10-19T19:00:00Z");
const html = `<h3><a href="https://www.dgpt.com/event/2026-powerball-cup/">2026 Powerball Cup</a></h3><p>October 15th - 18th<br>Lynchburg, VA</p><p>2025 Champions: FPO: Prior Winner | -19</p><h3>2024 Champions</h3><h3><a href="/event/2026-test-open/">2026 Test Open</a></h3><p>July 30th - August 2nd<br>Peoria, IL</p><p>2026 Champions: FPO: Test Player | -21 MPO: Other Player | -28</p><a>Watch Full Coverage</a><h3><a href="https://evil.example/event/2026-bad/">2026 Bad</a></h3><p>October 15th - 18th</p>`;
const parsed = parseDgptSchedule(html, now);
assert.equal(parsed.length, 2);
assert.equal(parsed[0].state, "post");
assert.equal(
  parsed[0].eventResults.length,
  0,
  "prior-year champions are never displayed as current results",
);
assert.equal(parsed[1].eventResults.length, 2);
assert.ok(
  parsed[1].endDate.startsWith("2026-08-02"),
  "cross-month event end parsed",
);
const power = discEvents.find((g) => g.name.includes("Powerball"));
for (const day of [15, 16, 17, 18]) {
  const date = new Date(`2026-10-${day}T19:00:00Z`);
  assert.equal(eventIsToday(power, date), true);
  assert.equal(eventLifecycle(power, date).state, "in");
}
assert.equal(
  eventLifecycle(power, new Date("2026-10-15T04:59:59Z")).state,
  "pre",
);
assert.equal(
  eventLifecycle(power, new Date("2026-10-19T04:59:59Z")).state,
  "in",
);
assert.equal(
  eventLifecycle(power, new Date("2026-10-19T05:00:00Z")).state,
  "post",
);
assert.ok(discEvents.some((g) => eventLifecycle(g, now).state === "pre"));
const ics = calendarFile(power, now);
assert.ok(ics.includes("DTSTART;VALUE=DATE:20261015\r\n"));
assert.ok(
  ics.includes("DTEND;VALUE=DATE:20261019\r\n"),
  "all-day end is exclusive after final day",
);
assert.equal(
  new URL(googleCalendarUrl(power)).searchParams.get("dates"),
  "20261015/20261019",
);
const timed = {
  ...power,
  dateOnly: false,
  date: "2026-11-02T01:00:00Z",
  endDate: undefined,
  name: "Žalgiris, Wolves; test\nInjected",
  venue: "Kaunas",
  id: "timed",
};
const file = calendarFile(timed, now);
assert.ok(file.includes("DTSTART:20261102T010000Z"));
assert.ok(
  file.includes("DTEND:20261102T033000Z"),
  "timed events default to 2.5 hours",
);
assert.ok(file.includes("SUMMARY:Žalgiris\\, Wolves\\; test\\nInjected"));
const long = calendarFile({ ...timed, name: "Ž".repeat(120) }, now);
for (const line of long.split("\r\n"))
  assert.ok(Buffer.byteLength(line, "utf8") <= 75);
const Card = load(path.resolve("components/game-card.tsx")).default;
const render = (g, revealPast = true) =>
  renderToStaticMarkup(
    createElement(Card, {
      game: g,
      compact: true,
      revealed: revealPast,
      revealPast,
      onReveal() {},
    }),
  );
assert.ok(
  render(eventLifecycle(power, now)).includes("Scores &amp; results ↗"),
);
assert.ok(
  !render(eventLifecycle(power, now)).includes(
    "Completed · see official results",
  ),
);
assert.ok(
  render(eventLifecycle(power, now)).includes(
    "https://www.dgpt.com/event-scores/?id=96421",
  ),
);
assert.ok(render(eventLifecycle(power, now), false).includes("Results hidden"));
const upcomingCard = render(
  eventLifecycle(power, new Date("2026-10-10T12:00:00Z")),
);
assert.ok(upcomingCard.includes("Add "));
assert.ok(upcomingCard.includes("to Google Calendar"));
assert.ok(upcomingCard.includes("calendar.google.com/calendar/render"));
assert.ok(!upcomingCard.includes("Apple / Outlook"));
assert.ok(!upcomingCard.includes('<details class="add-calendar"'));
assert.ok(!render(eventLifecycle(power, now)).includes("Add to calendar"));
const todayCard = renderToStaticMarkup(
  createElement(Card, {
    game: { ...power, team: "wolves", eventOnly: false, state: "pre" },
    today: true,
    compact: false,
    revealed: true,
    onReveal() {},
  }),
);
assert.ok(todayCard.includes("https://www.espn.com/nba/injuries"));
assert.ok(todayCard.includes("Injury report"));
assert.ok(!render(eventLifecycle(power, now)).includes("Injury report"));
console.log(
  "DGPT/calendar checks passed: range boundaries, retained completed events, current-year results, calendar dates/escaping/folding, and inline Google Calendar action.",
);
