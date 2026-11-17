// Projects a tentative playoff bracket from current regular-season standings.
import type { Postseason } from "./postseason.ts";
import type { Table } from "../team-info/types.ts";
import { espnTeamLogoUrl } from "./march-madness.ts";

type Matchup = Postseason["rounds"][number]["matchups"][number];
type Participant = Matchup["teams"][number];
type Row = Table["rows"][number];

export type ProjectionInput = {
  league: string;
  tables: Table[];
  // NHL and MLB matchups depend on division finishes, so division tables are required.
  divisions?: Table[];
  checked: string;
};

const winnerOf = (id: string): Participant => ({
  id: `winner:${id}`,
  name: "TBD",
  logo: "",
  tbd: true,
});

const rank = (table: Table) =>
  [...table.rows].sort((a, b) => Number(a.cells[0]) - Number(b.cells[0]));

// MLS reports its regular season as season type 1.
const regularSeasonTypes = (league: string) =>
  league.startsWith("soccer/") ? [1, 2] : [2];

const regularTable = (
  league: string,
  tables: Table[],
  pattern: RegExp,
  minRows: number,
) =>
  tables.find(
    (table) =>
      regularSeasonTypes(league).includes(table.seasonType ?? 0) &&
      pattern.test(table.name) &&
      table.rows.length >= minRows,
  );

// Divisions inside a conference, with teams ordered by conference rank. Division
// tables carry their own local ranks, so the conference table is the seed source.
function conferenceDivisions(table: Table, divisions: Table[]) {
  const seed = new Map(table.rows.map((row) => [row.id, Number(row.cells[0])]));
  return divisions
    .filter(
      (division) =>
        division.seasonType === 2 &&
        division.rows.length > 1 &&
        division.rows.every((row) => seed.has(row.id)),
    )
    .map((division) => ({
      name: division.name.trim(),
      rows: [...division.rows].sort(
        (a, b) => seed.get(a.id)! - seed.get(b.id)!,
      ),
      seedOf: (row: Row) => seed.get(row.id)!,
    }));
}

function builder(league: string, checked: string, defaultMetric: string) {
  const rounds: Postseason["rounds"] = [];
  const team = (row: Row, seed: number | string): Participant => ({
    id: row.id,
    name: row.name,
    logo: espnTeamLogoUrl(league, row.id),
    seed,
  });
  const add = (
    roundName: string,
    id: string,
    url: string,
    teams: Participant[],
    metric = defaultMetric,
  ) => {
    let round = rounds.find((entry) => entry.name === roundName);
    if (!round) rounds.push((round = { name: roundName, matchups: [] }));
    const matchup: Matchup = {
      id,
      url,
      date: checked,
      status: "Tentative · not locked",
      metric,
      tentative: true,
      teams,
    };
    round.matchups.push(matchup);
    return matchup;
  };
  const finish = (note: string): Postseason => ({
    season: "Projected",
    checked,
    projected: true,
    note,
    rounds,
  });
  return { team, add, finish };
}

const eastWest = [
  { key: "east", label: "East", pattern: /eastern conference/i },
  { key: "west", label: "West", pattern: /western conference/i },
] as const;

function projectNba({ league, tables, checked }: ProjectionInput) {
  const standings = eastWest.map((conference) =>
    regularTable(league, tables, conference.pattern, 10),
  );
  if (standings.some((table) => !table)) return;
  const bracket = builder(league, checked, "Best of 7");
  // First-round pairings by seed; adjacent pairings meet in the second round.
  const pairs = [
    [1, 8],
    [4, 5],
    [3, 6],
    [2, 7],
  ] as const;

  const finalists: Participant[] = [];
  eastWest.forEach((conference, index) => {
    const table = standings[index]!;
    const ranked = rank(table);
    const seeded = (seed: number) => bracket.team(ranked[seed - 1], seed);
    const first = pairs.map(([high, low]) =>
      bracket.add(
        `${conference.label} 1st Round`,
        `projected-${conference.key}-r1-${high}v${low}`,
        table.url,
        [seeded(high), seeded(low)],
      ),
    );
    const semifinals = [0, 2].map((start) =>
      bracket.add(
        `${conference.label} 2nd Round`,
        `projected-${conference.key}-r2-${start / 2 + 1}`,
        table.url,
        [winnerOf(first[start].id), winnerOf(first[start + 1].id)],
      ),
    );
    const final = bracket.add(
      `${conference.label} Finals`,
      `projected-${conference.key}-finals`,
      table.url,
      [winnerOf(semifinals[0].id), winnerOf(semifinals[1].id)],
    );
    finalists.push(winnerOf(final.id));
  });
  bracket.add(
    "NBA Finals",
    "projected-nba-finals",
    standings[0]!.url,
    finalists,
  );
  return bracket.finish(
    "Tentative: seeds follow the current standings and nothing is locked yet. Seeds 7–10 play the Play-In Tournament for the final two spots in each conference. Matchups change as standings do.",
  );
}

function projectNhl({ league, tables, divisions, checked }: ProjectionInput) {
  if (!divisions?.length) return;
  const bracket = builder(league, checked, "Best of 7");
  const finalists: Participant[] = [];

  for (const conference of eastWest) {
    const table = regularTable(league, tables, conference.pattern, 10);
    if (!table) return;
    const groups = conferenceDivisions(table, divisions).map((group) => ({
      ...group,
      letter: group.name[0].toUpperCase(),
    }));
    if (groups.length !== 2) return;

    // Top three per division qualify; the next two conference teams are wild cards.
    const divisionQualifiers = new Set(
      groups.flatMap((group) => group.rows.slice(0, 3).map((row) => row.id)),
    );
    const wildCards = rank(table)
      .filter((row) => !divisionQualifiers.has(row.id))
      .slice(0, 2);
    if (wildCards.length < 2) return;
    // The better division winner plays the second wild card.
    groups.sort((a, b) => a.seedOf(a.rows[0]) - b.seedOf(b.rows[0]));

    const semifinals = groups.map((group, index) => {
      const prefix = `projected-${conference.key}-${group.letter}`;
      const top = bracket.add(
        `${conference.label} 1st Round`,
        `${prefix}-r1-1`,
        table.url,
        [
          bracket.team(group.rows[0], `${group.letter}1`),
          bracket.team(wildCards[1 - index], `WC${2 - index}`),
        ],
      );
      const middle = bracket.add(
        `${conference.label} 1st Round`,
        `${prefix}-r1-2`,
        table.url,
        [
          bracket.team(group.rows[1], `${group.letter}2`),
          bracket.team(group.rows[2], `${group.letter}3`),
        ],
      );
      return bracket.add(
        `${conference.label} 2nd Round`,
        `${prefix}-r2`,
        table.url,
        [winnerOf(top.id), winnerOf(middle.id)],
      );
    });
    const final = bracket.add(
      `${conference.label} Finals`,
      `projected-${conference.key}-finals`,
      table.url,
      semifinals.map((semifinal) => winnerOf(semifinal.id)),
    );
    finalists.push(winnerOf(final.id));
  }
  bracket.add("Stanley Cup Finals", "projected-finals", "", finalists);
  return bracket.finish(
    "Tentative: seeds follow the current standings and nothing is locked yet. The top three teams in each division qualify, plus two wild cards per conference; the better division winner plays the lower wild card. Matchups change as standings do.",
  );
}

const nflConferences = [
  { label: "AFC", pattern: /american football conference|\bafc\b/i },
  { label: "NFC", pattern: /national football conference|\bnfc\b/i },
] as const;

function projectNfl({ league, tables, checked }: ProjectionInput) {
  const standings = nflConferences.map((conference) =>
    regularTable(league, tables, conference.pattern, 7),
  );
  if (standings.some((table) => !table)) return;
  const bracket = builder(league, checked, "Single game");

  const champions: Participant[] = [];
  nflConferences.forEach((conference, index) => {
    const table = standings[index]!;
    const ranked = rank(table);
    const seeded = (seed: number) => bracket.team(ranked[seed - 1], seed);
    const prefix = `projected-${conference.label.toLowerCase()}`;
    const wildCard = (high: number, low: number) =>
      bracket.add(
        `${conference.label} Wild Card Playoffs`,
        `${prefix}-wc-${high}v${low}`,
        table.url,
        [seeded(high), seeded(low)],
      );
    const w27 = wildCard(2, 7);
    const w36 = wildCard(3, 6);
    const w45 = wildCard(4, 5);
    // The top seed has a bye; real divisional matchups re-seed after the wild-card round.
    const divisional = [
      bracket.add(
        `${conference.label} Divisional Playoffs`,
        `${prefix}-div-2`,
        table.url,
        [winnerOf(w27.id), winnerOf(w36.id)],
      ),
      bracket.add(
        `${conference.label} Divisional Playoffs`,
        `${prefix}-div-1`,
        table.url,
        [seeded(1), winnerOf(w45.id)],
      ),
    ];
    const championship = bracket.add(
      `${conference.label} Championship`,
      `${prefix}-championship`,
      table.url,
      divisional.map((matchup) => winnerOf(matchup.id)),
    );
    champions.push(winnerOf(championship.id));
  });
  bracket.add(
    "Super Bowl",
    "projected-super-bowl",
    standings[0]!.url,
    champions,
  );
  return bracket.finish(
    "Tentative: seeds follow the current standings and nothing is locked yet. The No. 1 seed gets a first-round bye. The NFL re-seeds after the Wild Card round (No. 1 plays the lowest remaining seed), so the Divisional matchups shown are approximate.",
  );
}

const mlbLeagues = [
  { code: "AL", pattern: /american league/i },
  { code: "NL", pattern: /national league/i },
] as const;

function projectMlb({ league, tables, divisions, checked }: ProjectionInput) {
  if (!divisions?.length) return;
  const bracket = builder(league, checked, "Best of 5");
  const pennants: Participant[] = [];

  for (const mlbLeague of mlbLeagues) {
    const table = regularTable(league, tables, mlbLeague.pattern, 10);
    if (!table) return;
    const groups = conferenceDivisions(table, divisions);
    if (groups.length !== 3) return;

    // Division winners take seeds 1–3 by record, then the best three remaining teams.
    const winners = groups
      .map((group) => group.rows[0])
      .sort((a, b) => Number(a.cells[0]) - Number(b.cells[0]));
    const winnerIds = new Set(winners.map((row) => row.id));
    const wildCards = rank(table)
      .filter((row) => !winnerIds.has(row.id))
      .slice(0, 3);
    if (wildCards.length < 3) return;
    const seeds = [...winners, ...wildCards];
    const seeded = (seed: number) => bracket.team(seeds[seed - 1], seed);
    const prefix = `projected-${mlbLeague.code.toLowerCase()}`;

    const wildCard = (high: number, low: number) =>
      bracket.add(
        `${mlbLeague.code}WC`,
        `${prefix}-wc-${high}v${low}`,
        table.url,
        [seeded(high), seeded(low)],
        "Best of 3",
      );
    const w36 = wildCard(3, 6);
    const w45 = wildCard(4, 5);
    // The top two seeds have byes and face the wild-card winners.
    const divisionSeries = [
      bracket.add(`${mlbLeague.code}DS`, `${prefix}-ds-2`, table.url, [
        seeded(2),
        winnerOf(w36.id),
      ]),
      bracket.add(`${mlbLeague.code}DS`, `${prefix}-ds-1`, table.url, [
        seeded(1),
        winnerOf(w45.id),
      ]),
    ];
    const championship = bracket.add(
      `${mlbLeague.code}CS`,
      `${prefix}-cs`,
      table.url,
      divisionSeries.map((series) => winnerOf(series.id)),
      "Best of 7",
    );
    pennants.push(winnerOf(championship.id));
  }
  bracket.add(
    "World Series",
    "projected-world-series",
    "",
    pennants,
    "Best of 7",
  );
  return bracket.finish(
    "Tentative: seeds follow the current standings and nothing is locked yet. Each league sends three division winners and three wild cards; the top two seeds get a Wild Card Series bye. Matchups change as standings do.",
  );
}

function projectWnba({ league, tables, checked }: ProjectionInput) {
  const table = regularTable(league, tables, /women|wnba/i, 8);
  if (!table) return;
  const ranked = rank(table);
  const bracket = builder(league, checked, "Best of 3");
  const seeded = (seed: number) => bracket.team(ranked[seed - 1], seed);
  const first = (
    [
      [1, 8],
      [4, 5],
      [3, 6],
      [2, 7],
    ] as const
  ).map(([high, low]) =>
    bracket.add(
      "First Round",
      `projected-r1-${high}v${low}`,
      table.url,
      [seeded(high), seeded(low)],
      "Best of 3",
    ),
  );
  const semifinals = [0, 2].map((start) =>
    bracket.add(
      "WNBA Semifinals",
      `projected-semi-${start / 2 + 1}`,
      table.url,
      [winnerOf(first[start].id), winnerOf(first[start + 1].id)],
      "Best of 5",
    ),
  );
  bracket.add(
    "WNBA Finals",
    "projected-finals",
    table.url,
    semifinals.map((semifinal) => winnerOf(semifinal.id)),
    "Best of 7",
  );
  return bracket.finish(
    "Tentative: seeds follow the current standings and nothing is locked yet. The top 8 teams league-wide qualify regardless of conference, and the bracket stays fixed by seed. Matchups change as standings do.",
  );
}

function projectMls({ league, tables, checked }: ProjectionInput) {
  const standings = eastWest.map((conference) =>
    regularTable(league, tables, conference.pattern, 9),
  );
  if (standings.some((table) => !table)) return;
  const bracket = builder(league, checked, "Single match");
  const finalists: Participant[] = [];

  eastWest.forEach((conference, index) => {
    const table = standings[index]!;
    const ranked = rank(table);
    const seeded = (seed: number) => bracket.team(ranked[seed - 1], seed);
    const prefix = `projected-${conference.key}`;
    const wildCard = bracket.add(
      `${conference.label} Wild Card`,
      `${prefix}-wc`,
      table.url,
      [seeded(8), seeded(9)],
    );
    const roundOne = (id: string, teams: Participant[]) =>
      bracket.add(
        `${conference.label} Round One`,
        `${prefix}-r1-${id}`,
        table.url,
        teams,
        "Best of 3",
      );
    const r1 = [
      roundOne("1", [seeded(1), winnerOf(wildCard.id)]),
      roundOne("4v5", [seeded(4), seeded(5)]),
      roundOne("3v6", [seeded(3), seeded(6)]),
      roundOne("2v7", [seeded(2), seeded(7)]),
    ];
    const semifinals = [0, 2].map((start) =>
      bracket.add(
        `${conference.label} Conference Semifinals`,
        `${prefix}-semi-${start / 2 + 1}`,
        table.url,
        [winnerOf(r1[start].id), winnerOf(r1[start + 1].id)],
      ),
    );
    const final = bracket.add(
      `${conference.label} Conference Finals`,
      `${prefix}-final`,
      table.url,
      semifinals.map((semifinal) => winnerOf(semifinal.id)),
    );
    finalists.push(winnerOf(final.id));
  });
  bracket.add("MLS Cup", "projected-mls-cup", standings[0]!.url, finalists);
  return bracket.finish(
    "Tentative: seeds follow the current standings and nothing is locked yet. The top 9 per conference qualify: seeds 8 and 9 play the Wild Card match for a Round One spot against the No. 1 seed. Matchups change as standings do.",
  );
}

// Extends an in-progress MLS bracket with tentative placeholders for the rounds
// ESPN has not published yet. Real matchups are never altered.
export function completeMlsBracket(
  real: Postseason,
  tables: Table[],
  league: string,
): Postseason {
  const bracket = builder(league, real.checked, "Single match");
  const finalists: Participant[] = [];
  const named = (name: string) => real.rounds.find((r) => r.name === name);
  const rounds = real.rounds.map((round) => ({
    ...round,
    matchups: [...round.matchups],
  }));
  const target = (name: string) => rounds.find((r) => r.name === name);
  let added = false;

  for (const conference of eastWest) {
    const label = conference.label;
    const table = regularTable(league, tables, conference.pattern, 9);
    const wildCard = named(`${label} Wild Card`)?.matchups[0];
    const roundOne = rounds.find((r) => r.name === `${label} Round One`);
    if (!table || !wildCard || !roundOne) return real;
    if (
      named(`${label} Conference Semifinals`) ||
      named(`${label} Conference Finals`)
    )
      return real;
    const seedOf = new Map(
      table.rows.map((row) => [row.id, Number(row.cells[0])]),
    );
    const ranked = rank(table);
    const best = (matchup: Matchup) =>
      Math.min(...matchup.teams.map((t) => seedOf.get(t.id) ?? Infinity));
    const bySeed = new Map<number, Matchup>();
    for (const matchup of roundOne.matchups) {
      if (matchup.teams.every((t) => seedOf.has(t.id)))
        bySeed.set(best(matchup), matchup);
    }
    const hasTop = [...seedOf.values()].some((s) => s === 1);
    if (!hasTop) return real;
    if (!bySeed.has(1)) {
      const top = bracket.team(ranked[0], 1);
      const topMatch = bracket.add(
        `${label} Round One`,
        `projected-${conference.key}-r1-1`,
        wildCard.url,
        [top, winnerOf(wildCard.id)],
        "Best of 3",
      );
      bySeed.set(1, topMatch);
    }
    if (![2, 3, 4].every((seed) => bySeed.has(seed))) return real;
    const semis = [
      [bySeed.get(1)!, bySeed.get(4)!],
      [bySeed.get(3)!, bySeed.get(2)!],
    ].map(([a, b], index) =>
      bracket.add(
        `${label} Conference Semifinals`,
        `projected-${conference.key}-semi-${index + 1}`,
        wildCard.url,
        [winnerOf(a.id), winnerOf(b.id)],
      ),
    );
    const final = bracket.add(
      `${label} Conference Finals`,
      `projected-${conference.key}-final`,
      wildCard.url,
      semis.map((semi) => winnerOf(semi.id)),
    );
    finalists.push(winnerOf(final.id));
    added = true;
  }
  if (!added) return real;

  const generated = bracket.finish("").rounds;
  for (const round of generated) {
    const existing = target(round.name);
    if (existing) {
      for (const matchup of round.matchups)
        if (!existing.matchups.some((m) => m.id === matchup.id))
          existing.matchups.push(matchup);
    } else rounds.push(round);
  }
  if (!target("MLS Cup")) {
    rounds.push({
      name: "MLS Cup",
      matchups: [
        {
          id: "projected-mls-cup",
          url: real.rounds[0].matchups[0].url,
          date: real.checked,
          status: "Tentative · not locked",
          metric: "Single match",
          tentative: true,
          teams: finalists,
        },
      ],
    });
  }
  return {
    ...real,
    note: "Confirmed matchups are final. Dashed placeholders show where winners advance and change as results come in.",
    rounds,
  };
}

export function projectPostseason(
  input: ProjectionInput,
): Postseason | undefined {
  switch (input.league) {
    case "basketball/nba":
      return projectNba(input);
    case "basketball/wnba":
      return projectWnba(input);
    case "hockey/nhl":
      return projectNhl(input);
    case "football/nfl":
      return projectNfl(input);
    case "baseball/mlb":
      return projectMlb(input);
    case "soccer/usa.1":
      return projectMls(input);
  }
}
