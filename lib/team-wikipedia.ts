import { teams } from "./teams";

const pages: Record<string, string> = {
  wolves: "Minnesota Timberwolves", wild: "Minnesota Wild", vikings: "Minnesota Vikings",
  twins: "Minnesota Twins", loons: "Minnesota United FC", palace: "Crystal Palace F.C.",
  lynx: "Minnesota Lynx", zalgiris: "BC Žalgiris", frost: "Minnesota Frost",
  usmnt: "United States men's national soccer team",
};
const aliases: Record<string, string> = {
  "anadolu efes": "Anadolu Efes S.K.", "anadolu efes istanbul": "Anadolu Efes S.K.",
  "zalgiris": "BC Žalgiris", "zalgiris kaunas": "BC Žalgiris",
};
const key = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

 // Resolve provider nicknames within their league, never across sports.
const franchises: Record<string, string[]> = {
  wolves: [
    "Atlanta Hawks", "Boston Celtics", "Brooklyn Nets", "Charlotte Hornets", "Chicago Bulls",
    "Cleveland Cavaliers", "Dallas Mavericks", "Denver Nuggets", "Detroit Pistons",
    "Golden State Warriors", "Houston Rockets", "Indiana Pacers", "Los Angeles Clippers",
    "Los Angeles Lakers", "Memphis Grizzlies", "Miami Heat", "Milwaukee Bucks",
    "Minnesota Timberwolves", "New Orleans Pelicans", "New York Knicks", "Oklahoma City Thunder",
    "Orlando Magic", "Philadelphia 76ers", "Phoenix Suns", "Portland Trail Blazers",
    "Sacramento Kings", "San Antonio Spurs", "Toronto Raptors", "Utah Jazz", "Washington Wizards",
  ],
  wild: [
    "Anaheim Ducks", "Boston Bruins", "Buffalo Sabres", "Calgary Flames", "Carolina Hurricanes",
    "Chicago Blackhawks", "Colorado Avalanche", "Columbus Blue Jackets", "Dallas Stars",
    "Detroit Red Wings", "Edmonton Oilers", "Florida Panthers", "Los Angeles Kings",
    "Minnesota Wild", "Montreal Canadiens", "Nashville Predators", "New Jersey Devils",
    "New York Islanders", "New York Rangers", "Ottawa Senators", "Philadelphia Flyers",
    "Pittsburgh Penguins", "San Jose Sharks", "Seattle Kraken", "St. Louis Blues",
    "Tampa Bay Lightning", "Toronto Maple Leafs", "Utah Mammoth", "Vancouver Canucks",
    "Vegas Golden Knights", "Washington Capitals", "Winnipeg Jets",
  ],
};
const nicknames: Record<string, string> = {
  "Los Angeles Clippers": "Clippers", "Los Angeles Lakers": "Lakers",
  "New Orleans Pelicans": "Pelicans", "New York Knicks": "Knicks",
  "Oklahoma City Thunder": "Thunder", "Portland Trail Blazers": "Trail Blazers",
  "San Antonio Spurs": "Spurs", "Golden State Warriors": "Warriors",
  "Los Angeles Kings": "Kings", "New Jersey Devils": "Devils",
  "New York Islanders": "Islanders", "New York Rangers": "Rangers",
  "St. Louis Blues": "Blues", "Tampa Bay Lightning": "Lightning",
  "Toronto Maple Leafs": "Maple Leafs", "Vegas Golden Knights": "Golden Knights",
  "Columbus Blue Jackets": "Blue Jackets", "Detroit Red Wings": "Red Wings",
};
function franchisePage(teamId: string, name: string): string | undefined {
  return franchises[teamId]?.find(page => {
    const nickname = nicknames[page] || page.split(" ").slice(1).join(" ");
    return [page, nickname, page.replace("Los Angeles", "LA")].some(alias => key(alias) === key(name));
  });
}

export function teamWikipediaUrl(teamId: string, name?: string, ownTeam = false) {
  const team = teams.find(t => t.id === teamId);
  const page = ownTeam ? pages[teamId] : franchisePage(teamId, name || "") || aliases[key(name || "")] ||
    (name === team?.name || name === team?.short ? pages[teamId] : undefined);
  if (page) return "https://en.wikipedia.org/wiki/" + encodeURIComponent(page.replaceAll(" ", "_"));
  if (!name) return undefined;
  // Short provider names can be ambiguous (e.g. Colorado). Search in sport
  // context rather than sending readers to an unrelated city or animal page.
  const sport = team?.sport === "NHL" || team?.id === "frost" ? "ice hockey" :
    ["NBA", "WNBA"].includes(team?.sport || "") || teamId === "zalgiris" ? "basketball" :
    team?.sport === "NFL" ? "American football" : team?.sport === "MLB" ? "baseball" : "soccer";
  return "https://en.wikipedia.org/w/index.php?search=" + encodeURIComponent(name + " " + sport + " team");
}
