import type { Postseason } from "./postseason.ts";

type Matchup = Postseason["rounds"][number]["matchups"][number];
type LayoutRound = {
  name: string;
  matchups: (Matchup & { group?: string })[];
};

function roundStage(name: string, league: string) {
  if (league === "baseball/mlb") {
    const match = /^(AL|NL)(WC|DS|CS)$/i.exec(name);
    if (match) {
      const order = ["WC", "DS", "CS"].indexOf(match[2].toUpperCase());
      return {
        order,
        name: ["Wild Card Series", "Division Series", "League Championship"][
          order
        ],
        group:
          match[1].toUpperCase() === "AL"
            ? "American League"
            : "National League",
      };
    }
    if (/^World Series$/i.test(name)) return { order: 3, name: "World Series" };
  }
  if (league === "basketball/nba" || league === "hockey/nhl") {
    const match =
      /^(East|West) (1st Round|2nd Round|Semifinals|Finals?)$/i.exec(name);
    if (match) {
      const order = /^1st/i.test(match[2])
        ? 0
        : /^(2nd|Semi)/i.test(match[2])
          ? 1
          : 2;
      return {
        order,
        name: ["First Round", "Conference Semifinals", "Conference Finals"][
          order
        ],
        group: /^East/i.test(match[1])
          ? "Eastern Conference"
          : "Western Conference",
      };
    }
    if (/^(NBA Finals|Stanley Cup Finals?)$/i.test(name))
      return { order: 3, name };
  }
  if (league === "football/nfl") {
    const match =
      /^(AFC|NFC) (Wild Card Playoffs|Divisional Playoffs|Championship)$/i.exec(
        name,
      );
    if (match) {
      const order = /^Wild/i.test(match[2])
        ? 0
        : /^Divisional/i.test(match[2])
          ? 1
          : 2;
      return {
        order,
        name: ["Wild Card", "Divisional Round", "Conference Championship"][
          order
        ],
        group: match[1].toUpperCase(),
      };
    }
    if (/^Super Bowl\b/i.test(name)) return { order: 3, name };
  }
}

function sharesTeam(a: Matchup, b: Matchup) {
  return a.teams.some((team) => b.teams.some((other) => other.id === team.id));
}

export function layoutPostseasonRounds(
  rounds: Postseason["rounds"],
  league: string,
) {
  const grouped = new Map<string, LayoutRound & { order: number }>();
  rounds.forEach((round, index) => {
    const stage = roundStage(round.name, league);
    const key = stage ? `stage:${stage.order}` : round.name;
    let group = grouped.get(key);
    if (!group) {
      group = {
        name: stage?.name ?? round.name,
        order: stage?.order ?? index,
        matchups: [],
      };
      grouped.set(key, group);
    }
    group.matchups.push(
      ...round.matchups.map((match) => ({ ...match, group: stage?.group })),
    );
  });
  const layout = [...grouped.values()].sort((a, b) => a.order - b.order);
  for (const round of layout)
    round.matchups.sort((a, b) => (a.group ?? "").localeCompare(b.group ?? ""));

  // Keep the feeders for each later matchup together, not in provider date order.
  for (let index = layout.length - 2; index >= 0; index--) {
    const next = layout[index + 1].matchups;
    const destination = (match: Matchup) => {
      const target = next.findIndex((other) => sharesTeam(match, other));
      return target < 0 ? next.length : target;
    };
    layout[index].matchups.sort((a, b) => destination(a) - destination(b));
  }
  const connections: { from: string; to: string }[] = [];
  layout.forEach((round, index) => {
    const next = layout[index + 1];
    if (!next) return;
    for (const match of round.matchups) {
      const targets = next.matchups.filter((other) => sharesTeam(match, other));
      if (targets.length === 1)
        connections.push({ from: match.id, to: targets[0].id });
    }
  });
  return { rounds: layout, connections };
}
