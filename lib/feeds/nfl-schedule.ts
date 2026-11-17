// Server-side fallback for NFL schedules when ESPN's team schedule endpoint is empty.
import type { Game } from "./feed-types";
import type { TeamId } from "../teams/teams";

export const nflFixtureUrl = (year: number) =>
  "https://fixturedownload.com/feed/json/nfl-" + year;

const espnIds: Record<string, string> = {
  "Arizona Cardinals": "22",
  "Atlanta Falcons": "1",
  "Baltimore Ravens": "33",
  "Buffalo Bills": "2",
  "Carolina Panthers": "29",
  "Chicago Bears": "3",
  "Cincinnati Bengals": "4",
  "Cleveland Browns": "5",
  "Dallas Cowboys": "6",
  "Denver Broncos": "7",
  "Detroit Lions": "8",
  "Green Bay Packers": "9",
  "Houston Texans": "34",
  "Indianapolis Colts": "11",
  "Jacksonville Jaguars": "30",
  "Kansas City Chiefs": "12",
  "Las Vegas Raiders": "13",
  "Los Angeles Chargers": "24",
  "Los Angeles Rams": "14",
  "Miami Dolphins": "15",
  "Minnesota Vikings": "16",
  "New England Patriots": "17",
  "New Orleans Saints": "18",
  "New York Giants": "19",
  "New York Jets": "20",
  "Philadelphia Eagles": "21",
  "Pittsburgh Steelers": "23",
  "San Francisco 49ers": "25",
  "Seattle Seahawks": "26",
  "Tampa Bay Buccaneers": "27",
  "Tennessee Titans": "10",
  "Washington Commanders": "28",
};

type Fixture = {
  MatchNumber?: number;
  DateUtc?: string;
  Location?: string;
  HomeTeam?: string;
  AwayTeam?: string;
  HomeTeamScore?: number | null;
  AwayTeamScore?: number | null;
};

const nickname = (name: string) => name.split(" ").at(-1) || name;

export function parseNflFixtures(
  data: unknown,
  team: TeamId,
  teamName: string,
  checked: string,
): Game[] {
  if (!Array.isArray(data)) return [];
  return (data as Fixture[]).flatMap((f) => {
    if (f.HomeTeam !== teamName && f.AwayTeam !== teamName) return [];
    const date = f.DateUtc ? new Date(f.DateUtc.replace(" ", "T")) : undefined;
    if (!date || Number.isNaN(date.getTime()) || !f.HomeTeam || !f.AwayTeam)
      return [];
    const played = f.HomeTeamScore != null && f.AwayTeamScore != null;
    const side = (name: string, homeAway: string, score?: number | null) => ({
      name: nickname(name),
      teamId: espnIds[name],
      homeAway,
      score: played && score != null ? String(score) : "",
      winner:
        played &&
        score != null &&
        score >
          ((homeAway === "home" ? f.AwayTeamScore : f.HomeTeamScore) ?? 0),
    });
    return [
      {
        id: `${team}-nfl-${f.MatchNumber ?? date.getTime()}`,
        team,
        name: `${nickname(f.AwayTeam)} at ${nickname(f.HomeTeam)}`,
        date: date.toISOString(),
        status: played ? "Final" : "Scheduled",
        state: played ? "post" : "pre",
        league: "Regular Season",
        venue: f.Location || "",
        broadcast: "",
        url: "",
        sourceName: "Fixture Download",
        sourceChecked: checked,
        competitors: [
          side(f.AwayTeam, "away", f.AwayTeamScore),
          side(f.HomeTeam, "home", f.HomeTeamScore),
        ],
      },
    ];
  });
}
