type PwhlTeam = { slug: string; location: string };

const detroit: PwhlTeam = { slug: "detroit-clutch", location: "Detroit" };
const hamilton: PwhlTeam = { slug: "hamilton-havoc", location: "Hamilton" };
const sanJose: PwhlTeam = { slug: "san-jose-sea-lions", location: "San Jose" };
const vegas: PwhlTeam = { slug: "vegas-vanguards", location: "Las Vegas" };

const officialPwhlTeams: Record<string, PwhlTeam> = {
  "boston fleet": { slug: "boston-fleet", location: "Boston" },
  "detroit clutch": detroit,
  detroit,
  "pwhl detroit": detroit,
  "hamilton havoc": hamilton,
  hamilton,
  "pwhl hamilton": hamilton,
  "minnesota frost": { slug: "minnesota-frost", location: "Minnesota" },
  "montreal victoire": { slug: "montreal-victoire", location: "Montréal" },
  "new york sirens": { slug: "new-york-sirens", location: "New York" },
  "ottawa charge": { slug: "ottawa-charge", location: "Ottawa" },
  "san jose sea lions": sanJose,
  "san jose": sanJose,
  "pwhl san jose": sanJose,
  "seattle torrent": { slug: "seattle-torrent", location: "Seattle" },
  "toronto sceptres": { slug: "toronto-sceptres", location: "Toronto" },
  "vancouver goldeneyes": {
    slug: "vancouver-goldeneyes",
    location: "Vancouver",
  },
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
