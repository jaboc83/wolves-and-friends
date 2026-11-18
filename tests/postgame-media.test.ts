import assert from "node:assert/strict";
import test from "node:test";
import { postgameMedia, isPostgameMedia } from "../lib/social/postgame-media.ts";

const video = (title: string, date: string) =>
  ({
    id: title,
    url: "https://www.youtube.com/watch?v=" + title.length,
    title,
    date,
    teams: ["wolves"],
    source: "YouTube · Minnesota Timberwolves",
    kind: "social",
    socialPlatform: "youtube",
  }) as never;
const game = (id: string, date: string) =>
  ({ id, team: "wolves", state: "post", date, competitors: [] }) as never;

const videos = [
  video("“It Was Very Important.” | Ayo Dosunmu Postgame Sound 11.17.26", "2026-11-18T01:00:00Z"),
  video("LaMelo Ball Postgame Interview With Sean Dorcellus | 11.17.26", "2026-11-18T00:00:00Z"),
  video("“Everybody Just Wanted To Win.” | LaMelo Ball Postgame Sound 11.17.26", "2026-11-18T02:00:00Z"),
  video("WHAT A FINISH TO THIS GAME", "2026-11-18T00:00:00Z"),
];

test("postgame videos are recognized and listed by person", () => {
  assert.equal(isPostgameMedia(videos[3]), false);
  const links = postgameMedia(game("a", "2026-11-17T23:00:00Z"), videos);
  assert.deepEqual(
    links.map((l) => l.label),
    ["LaMelo Ball (interview)", "Ayo Dosunmu", "LaMelo Ball"],
  );
});

test("videos are matched to the game by the date in the title", () => {
  const first = game("a", "2026-11-17T23:00:00Z");
  const lateGame = game("b", "2026-11-18T03:00:00Z");
  assert.equal(postgameMedia(lateGame, videos).length, 3);
  const other = video("Naz Reid Postgame Sound 11.19.26", "2026-11-18T02:00:00Z");
  assert.equal(postgameMedia(first, [other]).length, 0);
});

test("shootaround clips and dated highlights join the game; practice stays out", () => {
  const extra = [
    video("“We Have Such A Great Team.” | Joan Beringer | Shootaround Sound | 11.17.26", "2026-11-17T20:00:00Z"),
    video("Minnesota Timberwolves Dominate The Dallas Mavericks 133-94 | 11.17.26", "2026-11-18T05:00:00Z"),
    video("“If He Calls My Name.” | Jaylen Clark Practice Sound | 11.17.26", "2026-11-17T20:00:00Z"),
  ];
  assert.equal(isPostgameMedia(extra[2]), false);
  assert.deepEqual(
    postgameMedia(game("a", "2026-11-17T23:00:00Z"), extra).map((l) => l.label),
    ["Minnesota Timberwolves Dominate The Dallas Mavericks 133-94", "Joan Beringer"],
  );
});

test("upcoming and live games show only shootaround clips", () => {
  const extra = [
    video("“Great Team.” | Joan Beringer | Shootaround Sound | 11.17.26", "2026-11-17T20:00:00Z"),
    video("Minnesota Timberwolves Dominate The Dallas Mavericks 133-94 | 11.17.26", "2026-11-18T05:00:00Z"),
  ];
  for (const state of ["pre", "in"])
    assert.deepEqual(
      postgameMedia({ ...(game("a", "2026-11-17T23:00:00Z") as object), state } as never, extra).map((l) => l.label),
      ["Joan Beringer"],
    );
});

test("Wild pregame and postgame availability videos match by title date", () => {
  const wildGame = {
    id: "w",
    team: "wild",
    state: "post",
    date: "2026-11-11T01:00:00Z",
    competitors: [],
  } as never;
  const wild = (title: string) =>
    ({ ...(video(title, "2026-11-11T05:00:00Z") as object), teams: ["wild"] }) as never;
  const clips = [
    wild("OT Win vs. Montreal | Kaprizov, Wallstedt & More | Minnesota Wild Postgame | Nov. 10"),
    wild("Spurgeon, McCarron & Head Coach John Hynes | Minnesota Wild Pregame vs. Montreal | Nov. 10"),
    wild("Matt Boldy Hat Trick | Minnesota Wild Postgame at Toronto | Nov. 12, 2026"),
  ];
  assert.deepEqual(
    postgameMedia(wildGame, clips).map((l) => [l.group, l.label]),
    [
      ["pregame", "Spurgeon, McCarron & Head Coach John Hynes"],
      ["postgame", "OT Win vs. Montreal · Kaprizov, Wallstedt & More"],
    ],
  );
});

test("undated titles fall back to publish time before the next game", () => {
  const first = game("a", "2026-11-17T23:00:00Z");
  const next = game("b", "2026-11-18T00:30:00Z");
  const undated = [
    video("Naz Reid Postgame Sound", "2026-11-18T00:00:00Z"),
    video("Rudy Gobert Postgame Sound", "2026-11-18T01:00:00Z"),
  ];
  assert.deepEqual(
    postgameMedia(first, undated, [first, next]).map((l) => l.label),
    ["Naz Reid"],
  );
});

test("per-game playlist videos attach to the matching opponent's game", () => {
  const vk = (id: string, date: string) =>
    ({
      id,
      url: "https://www.youtube.com/watch?v=" + id,
      title: "Clip " + id,
      date,
      teams: ["vikings"],
      source: "YouTube · Minnesota Vikings · Week 10",
      kind: "social",
      socialPlatform: "youtube",
      gamePlaylist: { id: "PL1", title: "Week 10 | Minnesota Vikings at Green Bay Packers | 2026 NFL Season" },
    }) as never;
  const g = (id: string, date: string, opp: string) =>
    ({
      id,
      team: "vikings",
      state: "post",
      date,
      competitors: [{ name: "Minnesota Vikings" }, { name: opp }],
    }) as never;
  const wk1 = g("w1", "2026-09-13T17:00:00Z", "Green Bay Packers");
  const wk10 = g("w10", "2026-11-15T18:00:00Z", "Green Bay Packers");
  const clips = [vk("aaaaaaaaaaa", "2026-11-14T18:00:00Z")];
  assert.equal(isPostgameMedia(clips[0]), true);
  assert.deepEqual(postgameMedia(wk10, clips, [wk1]).map((l) => l.group), ["week"]);
  assert.equal(postgameMedia(wk1, clips, [wk10]).length, 0);
});

test("Twins highlight and conference titles match by slash date", () => {
  const t = (title: string) =>
    ({
      id: title,
      url: "https://www.youtube.com/watch?v=" + title.length,
      title,
      date: "2026-09-19T00:00:00Z",
      teams: ["twins"],
      source: "YouTube · Minnesota Twins",
      kind: "social",
      socialPlatform: "youtube",
    }) as never;
  const g = { id: "t", team: "twins", state: "post", date: "2026-09-18T00:10:00Z", competitors: [] } as never;
  const links = postgameMedia(g, [
    t("Twins vs. Angels Game Highlights (9/17/26) | MLB Highlights"),
    t("Derek Shelton - Postgame Conference 9/17/2026"),
    t("Twins vs. Angels Game Highlights (9/20/26) | MLB Highlights"),
  ]);
  assert.deepEqual(links.map((l) => l.label), [
    "Twins vs. Angels Game Highlights",
    "Derek Shelton",
  ]);
});

test("Loons highlights and matchday replays attach by publish time", () => {
  const l = (title: string, date: string) =>
    ({
      id: title,
      url: "https://www.youtube.com/watch?v=" + title.length,
      title,
      date,
      teams: ["loons"],
      source: "YouTube · Minnesota United",
      kind: "social",
      socialPlatform: "youtube",
    }) as never;
  const g = { id: "l", team: "loons", state: "post", date: "2026-11-08T02:30:00Z", competitors: [] } as never;
  const links = postgameMedia(g, [
    l("HIGHLIGHTS: MNUFC vs. San Jose", "2026-11-08T05:00:00Z"),
    l("Matchday Replay: Minnesota United at LAFC", "2026-11-08T20:00:00Z"),
    l("Sound of the Loons: Episode 348", "2026-11-08T05:00:00Z"),
  ]);
  assert.deepEqual(links.map((x) => x.label), [
    "HIGHLIGHTS: MNUFC vs. San Jose",
    "Matchday Replay: Minnesota United at LAFC",
  ]);
});

test("Loons postgame titles are labeled by who spoke", () => {
  const l = (title: string) =>
    ({
      id: title,
      url: "https://www.youtube.com/watch?v=" + title.length,
      title,
      date: "2026-11-08T05:00:00Z",
      teams: ["loons"],
      source: "YouTube · Minnesota United",
      kind: "social",
      socialPlatform: "youtube",
    }) as never;
  const g = { id: "l", team: "loons", state: "post", date: "2026-11-08T02:30:00Z", competitors: [] } as never;
  const labels = postgameMedia(g, [
    l("MNUFC Postgame Player Interview: Nectarios Triantis and Tomás Chancalay"),
    l("MNUFC Postgame Presser: Coach Knowles on Win over San Jose"),
  ]).map((x) => x.label);
  assert.deepEqual(labels, [
    "Nectarios Triantis and Tomás Chancalay (interview)",
    "Coach Knowles (presser)",
  ]);
});

test("Loons goal clips join highlights and previews attach to the next match", () => {
  const l = (title: string, date: string) =>
    ({
      id: title,
      url: "https://www.youtube.com/watch?v=" + title.length,
      title,
      date,
      teams: ["loons"],
      source: "YouTube · Minnesota United",
      kind: "social",
      socialPlatform: "youtube",
    }) as never;
  const g = (id: string, state: string, date: string) =>
    ({ id, team: "loons", state, date, competitors: [] }) as never;
  const prev = g("p", "post", "2026-11-01T01:00:00Z");
  const game = g("l", "post", "2026-11-08T02:30:00Z");
  const videos = [
    l("Loons Matchday Preview: Decision Day Breakdown", "2026-11-05T17:00:00Z"),
    l("MNUFC GOAL! Triantis Adds Another One", "2026-11-08T05:00:00Z"),
  ];
  const links = postgameMedia(game, videos, [prev]);
  assert.deepEqual(links.map((x) => x.group), ["highlights", "pregame"]);
  assert.equal(postgameMedia(prev, videos, [game]).length, 0);
});

test("undated pre-match press conferences attach to the next game", () => {
  const v = {
    id: "x",
    url: "https://www.youtube.com/watch?v=1",
    title: "Pre-match Press Conference: Tottenham Hotspur (A)",
    date: "2026-11-05T12:00:00Z",
    teams: ["palace"],
    source: "YouTube · Crystal Palace",
    kind: "social",
    socialPlatform: "youtube",
  } as never;
  const g = { id: "g", team: "palace", state: "pre", date: "2026-11-06T20:00:00Z", competitors: [] } as never;
  assert.deepEqual(postgameMedia(g, [v]).map((l) => [l.group, l.label]), [
    ["pregame", "Pre-match Press Conference: Tottenham Hotspur (A)"],
  ]);
});

test("opponent-only press conference titles count as pregame media", () => {
  const v = {
    id: "y",
    url: "https://www.youtube.com/watch?v=2",
    title: "“We’ll get it right” 💪 | TSG Hoffenheim Press Conference",
    date: "2026-11-05T12:00:00Z",
    teams: ["palace"],
    source: "YouTube · Crystal Palace",
    kind: "social",
    socialPlatform: "youtube",
  } as never;
  const g = { id: "g", team: "palace", state: "pre", date: "2026-11-06T20:00:00Z", competitors: [] } as never;
  assert.equal(postgameMedia(g, [v])[0]?.group, "pregame");
});

test("disc golf round videos attach to the matching event card", () => {
  const video = (id: string, title: string, date: string) =>
    ({
      id,
      url: "https://www.youtube.com/watch?v=" + id,
      title,
      date,
      teams: ["disc"],
      source: "YouTube · JomezPro",
      socialPlatform: "youtube",
    }) as never;
  const event = {
    id: "e",
    team: "disc",
    name: "2026 JomezPro Series Finale at Cactus Rock",
    date: "2026-11-06T12:00:00-05:00",
    endDate: "2026-11-08T12:00:00-05:00",
    eventOnly: true,
    state: "post",
    competitors: [],
  } as never;
  const links = postgameMedia(event, [
    video("b", "2026 JomezPro Finale at Cactus Rock | MPO R2B9 | Orum, Barlow | Jomez Disc Golf", "2026-11-08T20:00:00Z"),
    video("a", "2026 JomezPro Finale at Cactus Rock | MPO R1F9 | Ulibarri, Orum |JomezDiscGolf", "2026-11-07T20:00:00Z"),
    video("t", "Top 10 MPO Shots from the 2026 JomezPro Finale at Cactus Rock | Jomez Disc Golf", "2026-11-12T20:00:00Z"),
    video("p", "What a course! | 2026 Cactus Rock | Jomez Practice Round B9", "2026-11-06T20:00:00Z"),
    video("o", "2026 Powerball Cup | MPO R3B9 | Buhr | Jomez Disc Golf", "2026-11-08T20:00:00Z"),
  ]);
  assert.deepEqual(
    links.map((l) => [l.id, l.group, l.label]),
    [
      ["a", "mpo", "Round 1 · Front 9"],
      ["b", "mpo", "Round 2 · Back 9"],
      ["t", "mpo", "Top 10 shots"],
    ],
  );
});

test("Lynx titles: playoff sound, four-digit dates and exit interviews", () => {
  const video = (id: string, title: string) =>
    ({
      id,
      url: "https://www.youtube.com/watch?v=" + id,
      title,
      date: "2026-09-30T02:00:00Z",
      teams: ["lynx"],
      source: "YouTube · Minnesota Lynx",
      socialPlatform: "youtube",
    }) as never;
  const game = {
    id: "g",
    team: "lynx",
    state: "post",
    date: "2026-09-29T00:00:00Z",
    competitors: [],
  } as never;
  const videos = [
    video("a", "Minnesota Lynx (87-71) Fall In Loss Vs New York Liberty | 09.28.2026"),
    video("b", "\"We Have To Address The Fouls.\" | Cheryl Reeve Playoff Sound | 9.28.26"),
    video("c", "\"This Group Was Amazing.\" | Natasha Howard 2026 Exit Interview | 9.28.26"),
  ];
  const links = postgameMedia(game, videos);
  assert.deepEqual(links.map((l) => l.id), ["a", "b"]);
  assert.equal(links[1].label, "Cheryl Reeve");
  assert.equal(isPostgameMedia(videos[2]), false);
});

test("Frost titles with ordinal dates attach with tidy labels", () => {
  const video = (id: string, title: string) =>
    ({
      id,
      url: "https://www.youtube.com/watch?v=" + id,
      title,
      date: "2026-05-22T12:00:00Z",
      teams: ["frost"],
      source: "YouTube · Minnesota Frost",
      socialPlatform: "youtube",
    }) as never;
  const game = {
    id: "g",
    team: "frost",
    state: "post",
    date: "2026-05-08T00:30:00Z",
    competitors: [],
  } as never;
  const links = postgameMedia(game, [
    video("p", "May 7th, 2026 - MIN vs MTL - Minnesota Frost Post Game Press Conference"),
    video("h", "May 7th, 2026 - MIN vs MTL - Game Highlights"),
    video("x", "May 5th, 2026 - MIN at MTL - Game Highlights"),
  ]);
  assert.deepEqual(
    links.map((l) => [l.id, l.group, l.label]),
    [
      ["h", "highlights", "MIN vs MTL - Game Highlights"],
      ["p", "postgame", "Postgame Press Conference"],
    ],
  );
});
