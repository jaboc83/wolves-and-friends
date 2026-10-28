// Validates ESPN roster responses and flattens them into per-player entries.
type RosterPerson = {
  id?: string | number;
  items?: RosterPerson[];
  // NHL group rows carry position as a plain string (e.g. "Centers").
  position?:
    | string
    | {
        displayName?: string;
        abbreviation?: string;
      };
};
export type RosterResponse = {
  athletes?: RosterPerson[];
  team?: { id?: string | number };
  season?: { year?: number | string };
};
export type RosterEntry = {
  key: string;
  league: string;
  id: string;
  teamId: string;
  year: number;
  position: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function isRosterPerson(value: unknown): value is RosterPerson {
  if (!isRecord(value)) return false;
  const person = value;
  const position = person.position;
  return (
    (person.id === undefined ||
      typeof person.id === "string" ||
      typeof person.id === "number") &&
    (person.items === undefined ||
      (Array.isArray(person.items) && person.items.every(isRosterPerson))) &&
    (position === undefined ||
      typeof position === "string" ||
      (isRecord(position) &&
        ["displayName", "abbreviation"].every((key) => {
          const field = position[key];
          return field === undefined || typeof field === "string";
        })))
  );
}
export function isRosterResponse(value: unknown): value is RosterResponse {
  if (!isRecord(value)) return false;
  const response = value;
  return (
    (response.athletes === undefined ||
      (Array.isArray(response.athletes) &&
        response.athletes.every(isRosterPerson))) &&
    (response.team === undefined ||
      (isRecord(response.team) &&
        (response.team.id === undefined ||
          typeof response.team.id === "string" ||
          typeof response.team.id === "number"))) &&
    (response.season === undefined ||
      (isRecord(response.season) &&
        (response.season.year === undefined ||
          typeof response.season.year === "number" ||
          typeof response.season.year === "string")))
  );
}

export function rosterEntries(
  data: RosterResponse,
  league: string,
  espnId: string,
  fallbackYear = new Date().getUTCFullYear(),
): RosterEntry[] {
  const players = (data.athletes || []).flatMap(
    (person) => person.items || [person],
  );
  return players
    .filter((person) => /^\d+$/.test(String(person.id)))
    .map((person) => ({
      key: league + ":" + person.id,
      league,
      id: String(person.id),
      teamId: String(data.team?.id || espnId),
      year: Number(data.season?.year) || fallbackYear,
      position:
        typeof person.position === "object"
          ? String(
              person.position.displayName || person.position.abbreviation || "",
            )
          : "",
    }));
}
