export type RosterDetails = {
  age?: number;
  joined?: { date: string; url: string; event: string };
  salary?: { amount: number; currency: "USD"; season: string };
};
// Verified acquisition/signing dates, keyed by current team and ESPN athlete ID.
// Do not substitute a league debut, draft year or contract renewal for joining.
const joins: Record<string, NonNullable<RosterDetails["joined"]>> = {
  "wolves:4594268": {
    date: "2020-11-29",
    url: "https://www.nba.com/player/1630162/anthony-edwards/bio",
    event: "First Timberwolves contract signed",
  },
  "wolves:4431671": {
    date: "2020-11-20",
    url: "https://www.nba.com/player/1630183/jaden-mcdaniels/bio",
    event: "Acquired by Minnesota in a trade",
  },
  "wolves:3032976": {
    date: "2022-07-06",
    url: "https://www.nba.com/player/203497/rudy-gobert/bio",
    event: "Acquired by Minnesota in a trade",
  },
  "wolves:3934673": {
    date: "2024-10-02",
    url: "https://www.nba.com/player/1628978/donte-divincenzo/bio",
    event: "Acquired by Minnesota in a trade",
  },
};
export function rosterDetails(
  athlete: any,
  league: string,
  season: any,
  checked: string,
  team: string,
): RosterDetails {
  const details: RosterDetails = {};
  const birth = String(athlete.dateOfBirth || "").slice(0, 10);
  const now = new Date(checked);
  if (
    /^\d{4}-\d{2}-\d{2}$/.test(birth) &&
    Number.isFinite(Date.parse(birth)) &&
    Number.isFinite(now.getTime())
  ) {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Chicago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    const age =
      Number(today.slice(0, 4)) -
      Number(birth.slice(0, 4)) -
      (today.slice(5) < birth.slice(5) ? 1 : 0);
    if (age >= 15 && age < 100) details.age = age;
  } else if (
    Number.isInteger(athlete.age) &&
    athlete.age >= 15 &&
    athlete.age < 100
  )
    details.age = athlete.age;
  const joined = joins[team + ":" + athlete.id];
  if (joined) details.joined = joined;
  const dollarLeagues = [
    "basketball/nba",
    "basketball/wnba",
    "football/nfl",
    "baseball/mlb",
    "hockey/nhl",
    "soccer/usa.1",
  ];
  const year = Number(season?.year);
  if (dollarLeagues.includes(league) && Number.isInteger(year) && year > 2000) {
    const contract = [athlete.contract, ...(athlete.contracts || [])].find(
      (c) =>
        c &&
        Number(c.season?.year) === year &&
        Number.isFinite(c.salary) &&
        c.salary > 0,
    );
    if (contract)
      details.salary = {
        amount: contract.salary,
        currency: "USD",
        season: season.displayName || String(year),
      };
  }
  return details;
}
