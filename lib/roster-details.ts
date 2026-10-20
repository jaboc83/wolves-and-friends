export type RosterDetails = { age?: number };
export function rosterDetails(
  athlete: any,
  _league: string,
  _season: any,
  checked: string,
  _team: string,
): RosterDetails {
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
  return Number.isInteger(athlete.age) && athlete.age >= 15 && athlete.age < 100
    ? { age: athlete.age }
    : {};
}
