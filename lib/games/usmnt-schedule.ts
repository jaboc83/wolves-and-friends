import type { Game } from "../feeds/feed-types";

const sourceUrl = "https://www.ussoccer.com/schedule-tickets/usmnt";

export const usmntVerifiedGames = (checked: string): Game[] => [
  {
    id: "usmnt-official-2026-11-14-haiti",
    team: "usmnt",
    name: "Haiti vs United States",
    date: "2026-11-14T16:30:00-05:00",
    status: "Scheduled",
    state: "pre",
    league: "Concacaf Nations League",
    competitionNote: "Quarterfinal · First leg",
    venue: "Nu Stadium · Miami, FL",
    broadcast: "TBS · truTV · Universo · HBO Max · Peacock",
    url: sourceUrl,
    boxUrl:
      "https://www.concacaf.com/competitions/nations-league/matches/50691fb4fc6140dfb26ed7e240467e27/haiti-vs-united-states",
    sourceName: "Official U.S. Soccer schedule",
    sourceChecked: checked,
    competitors: [
      {
        name: "United States",
        homeAway: "away",
        score: "",
        winner: false,
      },
      { name: "Haiti", homeAway: "home", score: "", winner: false },
    ],
  },
  {
    id: "usmnt-official-2026-11-17-haiti",
    team: "usmnt",
    name: "Haiti at United States",
    date: "2026-11-17T19:00:00-05:00",
    status: "Scheduled",
    state: "pre",
    league: "Concacaf Nations League",
    competitionNote: "Quarterfinal · Second leg",
    venue: "TQL Stadium · Cincinnati, OH",
    broadcast: "TBS · truTV · Universo · HBO Max · Peacock",
    url: sourceUrl,
    sourceName: "Official U.S. Soccer schedule",
    sourceChecked: checked,
    competitors: [
      { name: "Haiti", homeAway: "away", score: "", winner: false },
      {
        name: "United States",
        homeAway: "home",
        score: "",
        winner: false,
      },
    ],
  },
  {
    id: "usmnt-official-2026-12-13-jamaica",
    team: "usmnt",
    name: "Jamaica at United States",
    date: "2026-12-13T15:30:00-05:00",
    status: "Scheduled",
    state: "pre",
    league: "International Friendly",
    venue: "Inter Miami CF Stadium · Fort Lauderdale, FL",
    broadcast: "TNT · HBO Max · Telemundo · Universo · Peacock",
    url: sourceUrl,
    sourceName: "Official U.S. Soccer schedule",
    sourceChecked: checked,
    competitors: [
      { name: "Jamaica", homeAway: "away", score: "", winner: false },
      {
        name: "United States",
        homeAway: "home",
        score: "",
        winner: false,
      },
    ],
  },
];
