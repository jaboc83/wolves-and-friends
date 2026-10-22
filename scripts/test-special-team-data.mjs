import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = fs.readFileSync("lib/feeds/special-team-data.ts", "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const loadedModule = { exports: {} };
new Function("module", "exports", js)(loadedModule, loadedModule.exports);
const {
  parseEuroLeagueStandings,
  parseLklStandings,
  parseZalgirisRoster,
  parsePwhlRoster,
  parsePwhlStandings,
  parsePwhlTrainingCampRoster,
  parsePwhlSchedule,
} = loadedModule.exports;

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
assert.equal(
  standings?.rows[0].url,
  "https://euroleague-standings.com/club/zal",
);
const eurohoopsRows = Array.from(
  { length: 10 },
  (_, i) =>
    `<tr><td><span class="bapro-standings__pos">${i + 1}</span><span class="bapro-standings__name">${i === 5 ? "Zalgiris Kaunas" : `Club ${i}`}</span></td><td>6</td><td>2</td><td>4</td><td>33.3%</td><td>490</td><td>517</td><td>-27</td></tr>`,
).join("");
const eurohoops = parseEuroLeagueStandings(
  `<table>${eurohoopsRows}</table>`,
  checked,
);
assert.equal(eurohoops?.rows.length, 10);
assert.deepEqual(eurohoops?.rows[5].cells, ["6", "2", "4", "-27"]);
assert.equal(eurohoops?.rows[5].highlight, true);
assert.equal(eurohoops?.source, "Eurohoops standings");

const lklRows = Array.from(
  { length: 10 },
  (_, i) =>
    `<tr><td>${i + 1}</td><td><a href="/komandos/${i === 0 ? "zalgiris" : `club-${i}`}">${i === 0 ? "Žalgiris" : `Club ${i}`}</a></td><td>6</td><td>${i === 0 ? "6" : "3"}</td><td>${i === 0 ? "0" : "3"}</td><td>${i === 0 ? "100" : "50"}</td><td>${i === 0 ? "94.2 74.7" : "82.8 / 82.8"}</td></tr>`,
).join("");
const lkl = parseLklStandings(
  `<h1>Standings 2026/27</h1><table>${lklRows}</table>`,
  checked,
);
assert.equal(lkl?.rows.length, 10);
assert.equal(lkl?.name, "LKL · 2026/27");
assert.deepEqual(lkl?.rows[0].cells, [
  "1",
  "6",
  "6",
  "0",
  "100",
  "94.2",
  "74.7",
]);
assert.equal(lkl?.rows[0].name, "Žalgiris");
assert.equal(lkl?.rows[0].highlight, true);
assert.equal(lkl?.url, "https://en.lkl.lt/turnyrine-lentele");
assert.equal(
  parseLklStandings(`<table>${lklRows.slice(0, 500)}</table>`, checked),
  undefined,
);

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

const pwhlStandingsRows = [
  {
    name: "Boston Fleet",
    rank: 1,
    games_played: "0",
    games_remaining: "2",
    points: 0,
    regulation_wins: "",
    non_reg_wins: "",
    non_reg_losses: "0",
    losses: "0",
    percentage: "0.000",
    goals_for: "0",
    goals_against: "0",
  },
  {
    name: "Minnesota Frost",
    rank: 2,
    games_played: "0",
    games_remaining: "2",
    points: 0,
    regulation_wins: "",
    non_reg_wins: "",
    non_reg_losses: "0",
    losses: "0",
    percentage: "0.000",
    goals_for: "0",
    goals_against: "0",
  },
  ...Array.from({ length: 8 }, (_, i) => ({
    name: `PWHL Club ${i}`,
    rank: i + 3,
    games_played: "0",
    games_remaining: "2",
    points: 0,
  })),
];
const pwhlStandings = parsePwhlStandings(
  `wolvesFriendsCallback(${JSON.stringify([{ sections: [{ data: pwhlStandingsRows.map((row) => ({ row })) }] }])})`,
  checked,
  "2026-27 Pre-Season",
);
assert.equal(pwhlStandings?.rows.length, 10);
assert.equal(pwhlStandings?.rows[1].name, "Minnesota Frost");
assert.equal(pwhlStandings?.rows[1].highlight, true);
assert.deepEqual(pwhlStandings?.rows[1].cells.slice(0, 5), [
  "2",
  "0",
  "2",
  "0",
  "—",
]);
assert.equal(pwhlStandings?.seasonType, 1);

const forwardLines = [
  "Peyton Anderson (Minnesota Frost) *",
  "Lara Beecher (Clarkson University) ^",
  ...Array.from({ length: 15 }, (_, i) => `Forward ${i + 3} (Minnesota Frost)`),
];
const defenderLines = [
  "Brooke Becker (Minnesota Frost) *",
  ...Array.from({ length: 8 }, (_, i) => `Defender ${i + 2} (Minnesota Frost)`),
];
const goalieLines = [
  "Marlène Boissonnault (Minnesota Frost) *",
  ...Array.from({ length: 3 }, (_, i) => `Goalie ${i + 2} (Minnesota Frost)`),
];
const campRoster = parsePwhlTrainingCampRoster(
  `<h1>MINNESOTA FROST ANNOUNCE 2026-27 TRAINING CAMP ROSTER</h1>
  <p><strong>2026-27 Frost Training Camp Roster</strong><br><strong>Forwards&nbsp;(17):</strong><br>${forwardLines.join("<br>")}</p>
  <p><strong>Defenders (9):</strong><br>${defenderLines.join("<br>")}</p>
  <p><strong>Goaltenders (4):</strong><br>${goalieLines.join("<br>")}</p>`,
  checked,
);
assert.equal(campRoster?.label, "Training camp roster");
assert.deepEqual(
  campRoster?.groups.map((group) => group.position),
  ["Forwards", "Defenders", "Goaltenders"],
);
assert.equal(campRoster?.groups[0].players[0].name, "Peyton Anderson");
assert.equal(campRoster?.groups[0].players[0].signedForSeason, true);
assert.equal(campRoster?.groups[0].players[1].draftPick, true);
assert.equal(campRoster?.groups[0].players[1].campTeam, "Clarkson University");
assert.equal(
  campRoster?.groups.reduce((sum, group) => sum + group.players.length, 0),
  30,
);

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

const styledVenueGames = parsePwhlSchedule(
  `<table><tbody><tr><td><a href="/en/stats/game/2026-11-22">MINNESOTA FROST PWHL LAS VEGAS Sun, Nov 22 4:00 p.m. ET
    <style data-emotion="css 1wpqury">.css-1wpqury{color:#6A6A6A}.css-1wpqury svg{fill:none}</style>
    America First Center | Henderson, NV
    <style>.venue-label{font-weight:600}</style></a></td></tr></tbody></table>`,
  checked,
);
assert.equal(styledVenueGames.length, 1);
assert.equal(styledVenueGames[0].venue, "America First Center | Henderson, NV");
assert.ok(!/css-|color:|svg|fill:|venue-label/.test(styledVenueGames[0].venue));
console.log(
  "EuroLeague standings, Žalgiris and Frost rosters, and PWHL schedule parsing passed.",
);
