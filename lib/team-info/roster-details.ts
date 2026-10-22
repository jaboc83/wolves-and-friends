// Derives safe roster details such as age from public athlete data.
export type RosterDetails = {
  age?: number;
  campTeam?: string;
  signedForSeason?: boolean;
  draftPick?: boolean;
};
export function rosterDetails(
  athlete: { dateOfBirth?: string; age?: number },
  _league: string,
  _season: string | number,
  checked: string,
  _team: string,
): RosterDetails {
  void _team;
  const birth = String(athlete.dateOfBirth || "").slice(0, 10),
    now = new Date(checked);
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
    return age >= 15 && age < 100 ? { age } : {};
  }
  const age = athlete.age;
  return typeof age === "number" &&
    Number.isInteger(age) &&
    age >= 15 &&
    age < 100
    ? { age }
    : {};
}
