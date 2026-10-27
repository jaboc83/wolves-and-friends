import type { PlayerStats, Stat } from "./player-stats-types";

const numberValue = (value: unknown) => {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const rounded = (value: number) =>
  (Math.round((value + Number.EPSILON) * 10) / 10).toFixed(1);

export const statValue = (stat: Stat | undefined) =>
  stat?.displayValue !== undefined ? String(stat.displayValue) : "";

export const statByName = (stats: Stat[], names: string[]) =>
  stats.find((stat) => names.includes(String(stat.name || "")));

export const statByLabel = (stats: Stat[], labels: string[]) =>
  stats.find((stat) => labels.includes(String(stat.abbreviation || "")));

export function selectedValues(
  stats: Stat[],
  league: string,
  position: string,
): PlayerStats["values"] {
  const games =
    statByName(stats, ["gamesPlayed"]) || statByLabel(stats, ["GP"]);
  if (games && Number(games.value ?? games.displayValue) === 0) return [];
  const basketball = league.startsWith("basketball/");
  const hockey = league === "hockey/nhl";
  const soccer = league.startsWith("soccer/");
  const goalie =
    /goalie|goalkeeper|goaltender/i.test(position) ||
    (hockey && /^G$/i.test(position));

  const make = (label: string, description: string, stat?: Stat) => ({
    label,
    value: statValue(stat),
    description,
  });

  if (basketball) {
    const points =
      statByName(stats, ["avgPoints", "points"]) || statByLabel(stats, ["PTS"]);
    const rebounds =
      statByName(stats, ["avgRebounds", "rebounds"]) ||
      statByLabel(stats, ["REB"]);
    const assists =
      statByName(stats, ["avgAssists", "assists"]) ||
      statByLabel(stats, ["AST"]);
    const blocks =
      statByName(stats, ["avgBlocks", "blocks"]) || statByLabel(stats, ["BLK"]);
    const steals =
      statByName(stats, ["avgSteals", "steals"]) || statByLabel(stats, ["STL"]);
    const fg =
      statByName(stats, ["fieldGoalPct"]) || statByLabel(stats, ["FG%"]);
    const three =
      statByName(stats, ["threePointFieldGoalPct"]) ||
      statByLabel(stats, ["3P%"]);
    const stockValue = [blocks, steals].map(statValue).map(numberValue);
    const stockSum = stockValue.every(
      (value): value is number => value !== undefined,
    )
      ? rounded(stockValue[0] + stockValue[1])
      : "";
    return [
      make("PTS", "Points", points),
      make("REB", "Rebounds", rebounds),
      make("AST", "Assists", assists),
      { label: "STK", value: stockSum, description: "Steals + blocks" },
      make("FG%", "Field Goal Percentage", fg),
      make("3P%", "3-Point Field Goal Percentage", three),
    ].filter((stat) => stat.value.trim() !== "");
  }

  if (hockey) {
    if (goalie) {
      return [
        make(
          "W",
          "Wins",
          statByName(stats, ["wins"]) || statByLabel(stats, ["WINS", "W"]),
        ),
        make(
          "L",
          "Losses",
          statByName(stats, ["losses"]) || statByLabel(stats, ["L"]),
        ),
        make(
          "OTL",
          "Overtime Losses",
          statByName(stats, ["overtimeLosses", "otLosses"]) ||
            statByLabel(stats, ["OTL"]),
        ),
        make(
          "GAA",
          "Goals Against Average",
          statByName(stats, ["avgGoalsAgainst"]) || statByLabel(stats, ["GAA"]),
        ),
        make(
          "SV%",
          "Save Percentage",
          statByName(stats, ["savePct"]) || statByLabel(stats, ["SV%"]),
        ),
        make(
          "SO",
          "Shutouts",
          statByName(stats, ["shutouts"]) || statByLabel(stats, ["SO"]),
        ),
      ].filter((stat) => stat.value.trim() !== "");
    }
    return [
      make(
        "PTS",
        "Points",
        statByName(stats, ["points"]) || statByLabel(stats, ["PTS"]),
      ),
      make(
        "G",
        "Goals",
        statByName(stats, ["goals"]) || statByLabel(stats, ["G"]),
      ),
      make(
        "A",
        "Assists",
        statByName(stats, ["assists"]) || statByLabel(stats, ["A"]),
      ),
      make(
        "+/-",
        "Plus/Minus",
        statByName(stats, ["plusMinus"]) || statByLabel(stats, ["+/-"]),
      ),
    ].filter((stat) => stat.value.trim() !== "");
  }

  if (soccer) {
    if (goalie) {
      return [
        make(
          "SV",
          "Saves",
          statByName(stats, ["saves"]) || statByLabel(stats, ["SV"]),
        ),
        make(
          "CS",
          "Clean Sheets",
          statByName(stats, ["cleanSheet", "cleanSheets"]) ||
            statByLabel(stats, ["CS"]),
        ),
        make(
          "GA",
          "Goals Against",
          statByName(stats, [
            "goalsAgainst",
            "goalsConceded",
            "totalGoalsAgainst",
          ]) || statByLabel(stats, ["GA"]),
        ),
      ].filter((stat) => stat.value.trim() !== "");
    }
    return [
      make(
        "G",
        "Goals",
        statByName(stats, ["totalGoals", "goals"]) || statByLabel(stats, ["G"]),
      ),
      make(
        "A",
        "Assists",
        statByName(stats, ["assists", "goalAssists"]) ||
          statByLabel(stats, ["A"]),
      ),
      make(
        "SH",
        "Shots",
        statByName(stats, ["shots", "totalShots"]) ||
          statByLabel(stats, ["SH"]),
      ),
      make(
        "SOG",
        "Shots on Goal",
        statByName(stats, ["shotsOnGoal", "shotsOnTarget"]) ||
          statByLabel(stats, ["SOG"]),
      ),
      make(
        "FS",
        "Fouls Suffered",
        statByName(stats, ["foulsSuffered"]) ||
          statByLabel(stats, ["FS", "FA"]),
      ),
    ].filter((stat) => stat.value.trim() !== "");
  }

  return [];
}
