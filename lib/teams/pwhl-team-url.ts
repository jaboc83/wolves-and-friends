type PwhlTeam = { slug: string; location: string; shortName: string };

const pwhlTeam = (
  slug: string,
  location: string,
  shortName: string,
): PwhlTeam => ({ slug, location, shortName });

const detroit = pwhlTeam("detroit-clutch", "Detroit", "Clutch");
const hamilton = pwhlTeam("hamilton-havoc", "Hamilton", "Havoc");
const sanJose = pwhlTeam("san-jose-sea-lions", "San Jose", "Sea Lions");
const vegas = pwhlTeam("vegas-vanguards", "Las Vegas", "Vanguards");

const officialPwhlTeams: Record<string, PwhlTeam> = {
  "boston fleet": pwhlTeam("boston-fleet", "Boston", "Fleet"),
  "detroit clutch": detroit,
  detroit,
  "pwhl detroit": detroit,
  "hamilton havoc": hamilton,
  hamilton,
  "pwhl hamilton": hamilton,
  "minnesota frost": pwhlTeam("minnesota-frost", "Minnesota", "Frost"),
  "montreal victoire": pwhlTeam("montreal-victoire", "Montréal", "Victoire"),
  "new york sirens": pwhlTeam("new-york-sirens", "New York", "Sirens"),
  "ottawa charge": pwhlTeam("ottawa-charge", "Ottawa", "Charge"),
  "san jose sea lions": sanJose,
  "san jose": sanJose,
  "pwhl san jose": sanJose,
  "seattle torrent": pwhlTeam("seattle-torrent", "Seattle", "Torrent"),
  "toronto sceptres": pwhlTeam("toronto-sceptres", "Toronto", "Sceptres"),
  "vancouver goldeneyes": pwhlTeam(
    "vancouver-goldeneyes",
    "Vancouver",
    "Goldeneyes",
  ),
  "vegas vanguards": vegas,
  "las vegas": vegas,
  "pwhl las vegas": vegas,
};

const normalize = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function pwhlTeamUrl(name?: string, ownTeam = false) {
  const key = normalize(name || "");
  const team =
    officialPwhlTeams[key] ||
    (ownTeam && key === "frost"
      ? officialPwhlTeams["minnesota frost"]
      : undefined);
  return team ? `https://www.thepwhl.com/en/teams/${team.slug}` : undefined;
}

export function pwhlTeamLocation(name: string) {
  return officialPwhlTeams[normalize(name)]?.location;
}

export function pwhlTeamShortName(name?: string) {
  return officialPwhlTeams[normalize(name || "")]?.shortName;
}
