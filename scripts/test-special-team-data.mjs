import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = fs.readFileSync("lib/special-team-data.ts", "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const module = { exports: {} };
new Function("module", "exports", js)(module, module.exports);
const {
  parseEuroLeagueStandings,
  parseZalgirisRoster,
  parsePwhlRoster,
  parsePwhlSchedule,
} = module.exports;

const checked = "2026-10-19T12:00:00.000Z";
const standings = parseEuroLeagueStandings(
  `<h1>Real EuroLeague Standings 2026/27</h1><table><caption>Mini standings</caption><tbody>
    <tr><td>1</td><td><a href="/club/zal">ZAL</a></td><td>4</td><td>2</td><td>+20</td><td>1-0 (+18)</td></tr>
    <tr><td>2</td><td><a href="/club/pao">PAO</a></td><td>5</td><td>1</td><td>+40</td><td>1-0 (+18)</td></tr>
  </tbody></table>`,
  checked,
);
assert.equal(standings?.rows.length, 2);
assert.deepEqual(standings?.rows[0].cells, ["1", "4", "2", "+20"]);
assert.equal(standings?.rows[0].highlight, true);
assert.equal(standings?.rows[0].url, "https://euroleague-standings.com/club/zal");
const eurohoopsRows = Array.from({ length: 10 }, (_, i) =>
  `<tr><td><span class="bapro-standings__pos">${i + 1}</span><span class="bapro-standings__name">${i === 5 ? "Zalgiris Kaunas" : `Club ${i}`}</span></td><td>6</td><td>2</td><td>4</td><td>33.3%</td><td>490</td><td>517</td><td>-27</td></tr>`,
).join("");
const eurohoops = parseEuroLeagueStandings(`<table>${eurohoopsRows}</table>`, checked);
assert.equal(eurohoops?.rows.length, 10);
assert.deepEqual(eurohoops?.rows[5].cells, ["6", "2", "4", "-27"]);
assert.equal(eurohoops?.rows[5].highlight, true);
assert.equal(eurohoops?.source, "Eurohoops standings");

const zalgiris = parseZalgirisRoster(
  `<table><tbody><tr><td><a href="/player/example">Example Player</a></td><td>PG</td><td>1999-03-14</td></tr></tbody></table>`,
  checked,
);
assert.equal(zalgiris?.groups[0].position, "Guards");
assert.equal(zalgiris?.groups[0].players[0].name, "Example Player");
assert.equal(zalgiris?.groups[0].players[0].age, 27);

const frostRoster = parsePwhlRoster(
  `<h1>Minnesota Frost Roster</h1><table><tbody><tr><td><a href="/en/stats/player/2/91">Example Skater</a></td><td>F</td><td>2001-04-18</td></tr></tbody></table>`,
  checked,
);
assert.equal(frostRoster?.groups[0].position, "Forwards / Centers");
assert.equal(frostRoster?.groups[0].players[0].name, "Example Skater");
assert.equal(frostRoster?.groups[0].players[0].age, 25);

const games = parsePwhlSchedule(
  `<table><tbody><tr><td><a href="/en/stats/game/2026-12-05">MINNESOTA FROST PWHL SAN JOSE Sat, Dec 05 7:00 p.m. ET SAP Center | San Jose, CA</a></td></tr>
  <tr><td><a href="/en/stats/game/2026-12-13">SEATTLE TORRENT MINNESOTA FROST Sun, Dec 13 2:00 p.m. ET Grand Casino Arena | St. Paul, MN</a></td></tr></tbody></table>`,
  checked,
);
assert.equal(games.length, 2);
assert.equal(games[0].team, "frost");
assert.equal(games[0].name, "Minnesota Frost at PWHL San Jose");
assert.equal(games[0].date, "2026-12-05T19:00:00-05:00");
assert.equal(games[0].venue, "SAP Center | San Jose, CA");
assert.equal(games[1].name, "Seattle Torrent at Minnesota Frost");
assert.equal(games[1].venue, "Grand Casino Arena | St. Paul, MN");
assert.ok(games.every((g) => g.url.startsWith("https://www.thepwhl.com/")));
console.log("EuroLeague standings, Žalgiris and Frost rosters, and PWHL schedule parsing passed.");
