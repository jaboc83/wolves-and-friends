// Maps known team names to static home locations; never reads visitor location.
import { teams, type TeamId } from "./teams";
const groups: [string, string, string][] = [
  ["basketball", "Hawks", "Atlanta"],
  ["basketball", "Celtics", "Boston"],
  ["basketball", "Nets", "Brooklyn"],
  ["basketball", "Hornets", "Charlotte"],
  ["basketball", "Bulls", "Chicago"],
  ["basketball", "Cavaliers", "Cleveland"],
  ["basketball", "Mavericks", "Dallas"],
  ["basketball", "Nuggets", "Denver"],
  ["basketball", "Pistons", "Detroit"],
  ["basketball", "Warriors", "Golden State"],
  ["basketball", "Rockets", "Houston"],
  ["basketball", "Pacers", "Indiana"],
  ["basketball", "Clippers|Lakers", "Los Angeles"],
  ["basketball", "Grizzlies", "Memphis"],
  ["basketball", "Heat", "Miami"],
  ["basketball", "Bucks", "Milwaukee"],
  ["basketball", "Timberwolves|Lynx", "Minnesota"],
  ["basketball", "Pelicans", "New Orleans"],
  ["basketball", "Knicks|Liberty", "New York"],
  ["basketball", "Thunder", "Oklahoma City"],
  ["basketball", "Magic", "Orlando"],
  ["basketball", "76ers", "Philadelphia"],
  ["basketball", "Suns|Mercury", "Phoenix"],
  ["basketball", "Trail Blazers", "Portland"],
  ["basketball", "Kings", "Sacramento"],
  ["basketball", "Spurs", "San Antonio"],
  ["basketball", "Raptors", "Toronto"],
  ["basketball", "Jazz", "Utah"],
  ["basketball", "Wizards|Mystics", "Washington"],
  ["hockey", "Bruins", "Boston"],
  ["hockey", "Sabres", "Buffalo"],
  ["hockey", "Red Wings", "Detroit"],
  ["hockey", "Panthers", "Florida"],
  ["hockey", "Canadiens", "Montréal"],
  ["hockey", "Senators", "Ottawa"],
  ["hockey", "Lightning", "Tampa Bay"],
  ["hockey", "Maple Leafs", "Toronto"],
  ["hockey", "Hurricanes", "Carolina"],
  ["hockey", "Blue Jackets", "Columbus"],
  ["hockey", "Devils", "New Jersey"],
  ["hockey", "Islanders|Rangers", "New York"],
  ["hockey", "Flyers", "Philadelphia"],
  ["hockey", "Penguins", "Pittsburgh"],
  ["hockey", "Capitals", "Washington"],
  ["hockey", "Blackhawks", "Chicago"],
  ["hockey", "Avalanche", "Colorado"],
  ["hockey", "Stars", "Dallas"],
  ["hockey", "Wild|Frost", "Minnesota"],
  ["hockey", "Predators", "Nashville"],
  ["hockey", "Blues", "St. Louis"],
  ["hockey", "Mammoth", "Utah"],
  ["hockey", "Jets", "Winnipeg"],
  ["hockey", "Ducks", "Anaheim"],
  ["hockey", "Flames", "Calgary"],
  ["hockey", "Oilers", "Edmonton"],
  ["hockey", "Kings", "Los Angeles"],
  ["hockey", "Sharks", "San Jose"],
  ["hockey", "Kraken", "Seattle"],
  ["hockey", "Canucks", "Vancouver"],
  ["hockey", "Golden Knights", "Vegas"],
];
const clubs: [string, string, string][] = [
  ["zalgiris|zalgiris kaunas", "Kaunas", "Lithuania"],
  ["anadolu efes|anadolu efes istanbul", "Istanbul", "Turkey"],
  ["fenerbahce|fenerbahce beko", "Istanbul", "Turkey"],
  ["olympiacos", "Piraeus", "Greece"],
  ["panathinaikos", "Athens", "Greece"],
  ["real madrid", "Madrid", "Spain"],
  ["barcelona|fc barcelona", "Barcelona", "Spain"],
  ["baskonia|saski baskonia", "Vitoria-Gasteiz", "Spain"],
  ["partizan|partizan belgrade", "Belgrade", "Serbia"],
  ["crvena zvezda|crvena zvezda belgrade", "Belgrade", "Serbia"],
  ["bayern munich|bayern munchen|fc bayern munchen", "Munich", "Germany"],
  ["virtus bologna", "Bologna", "Italy"],
  ["asvel|lyon-villeurbanne", "Villeurbanne", "France"],
  ["paris|paris basketball", "Paris", "France"],
  ["monaco|as monaco", "Monaco", "Monaco"],
  ["rytas|vilniaus rytas|rytas vilnius", "Vilnius", "Lithuania"],
  ["neptunas|klaipedos neptunas", "Klaipėda", "Lithuania"],
  ["lietkabelis|panevezio lietkabelis", "Panevėžys", "Lithuania"],
  ["crystal palace", "London", "England"],
  [
    "arsenal|chelsea|tottenham|tottenham hotspur|fulham|brentford|west ham|west ham united",
    "London",
    "England",
  ],
  ["manchester city|manchester united", "Manchester", "England"],
  ["liverpool|everton", "Liverpool", "England"],
  ["aston villa", "Birmingham", "England"],
  ["wolves|wolverhampton|wolverhampton wanderers", "Wolverhampton", "England"],
  ["brighton|brighton & hove albion", "Brighton and Hove", "England"],
  ["newcastle|newcastle united", "Newcastle upon Tyne", "England"],
  ["nottingham forest", "Nottingham", "England"],
  ["leeds|leeds united", "Leeds", "England"],
  ["bournemouth|afc bournemouth", "Bournemouth", "England"],
  ["lyon|olympique lyonnais", "Lyon", "France"],
  ["beşiktaş|besiktas|beşiktaş jk|besiktas jk", "Istanbul", "Turkey"],
];
const key = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
export function teamLocation(
  teamId: TeamId,
  name: string,
  league: string,
  isOwn = false,
): string {
  if (teamId === "disc") return "";
  if (isOwn && teamId !== "zalgiris")
    return teams.find((t) => t.id === teamId)?.homeLocation || "";
  const normalized = key(isOwn && teamId === "zalgiris" ? "zalgiris" : name);
  const category = ["wolves", "lynx"].includes(teamId)
    ? "basketball"
    : ["wild", "frost"].includes(teamId)
      ? "hockey"
      : "";
  const franchise = groups.find(
    ([sport, aliases]) =>
      sport === category &&
      aliases
        .split("|")
        .some(
          (alias) =>
            normalized === key(alias) || normalized.endsWith(" " + key(alias)),
        ),
  );
  if (franchise) return franchise[2];
  if (!["zalgiris", "palace"].includes(teamId)) return "";
  const club = clubs.find(([aliases]) =>
    aliases.split("|").some((alias) => {
      const normalizedAlias = key(alias);
      return (
        normalized === normalizedAlias ||
        normalized.startsWith(normalizedAlias + " ")
      );
    }),
  );
  if (!club) return "";
  const domestic =
    /\bLKL\b|Lithuanian|Premier League|FA Cup|League Cup|Carabao|Community Shield/i.test(
      league,
    );
  return domestic
    ? club[1]
    : club[1] === club[2]
      ? club[1]
      : club[1] + ", " + club[2];
}
