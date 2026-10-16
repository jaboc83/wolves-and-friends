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
const key = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
export function teamWikipediaUrl(teamId: string, name?: string, ownTeam = false) {
  const team = teams.find(t => t.id === teamId);
  const page = ownTeam ? pages[teamId] : aliases[key(name || "")] ||
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
