export type MarchGame = {
  id: string;
  date: string;
  region: string;
  round: string;
  order: number;
  status: string;
  completed: boolean;
  url: string;
  teams: {
    id: string;
    name: string;
    logo?: string;
    seed?: number;
    score?: string;
    winner: boolean;
    url: string;
  }[];
};
export type MarchData = {
  year: number;
  checked: string;
  games: MarchGame[];
  unavailable?: boolean;
};
type ProviderObject = Record<string, unknown>;
const providerObject = (value: unknown): ProviderObject =>
  value && typeof value === "object" ? (value as ProviderObject) : {};
const providerArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];
const linkHasRelation = (value: unknown, relation: string) =>
  typeof value === "string"
    ? value.includes(relation)
    : providerArray(value).some(
        (item) => typeof item === "string" && item.includes(relation),
      );
export const espnTeamLogoUrl = (league: string, id: string) =>
  /^\d+$/.test(id)
    ? "/api/team-logo?league=" + encodeURIComponent(league) + "&id=" + id
    : "";
const espnLink = (s: string) =>
  /^https:\/\/www\.espn\.com\//.test(s || "") ? s : "";
export function marchRound(raw: string): { name: string; order: number } {
  if (/first four|opening round/i.test(raw)) return { name: raw, order: 0 };
  if (/1st round|first round|round of 64/i.test(raw))
    return { name: "First round", order: 1 };
  if (/2nd round|second round|round of 32/i.test(raw))
    return { name: "Second round", order: 2 };
  if (/sweet\s*16|regional semifinal/i.test(raw))
    return { name: "Sweet 16", order: 3 };
  if (/elite\s*(8|eight)|regional final/i.test(raw))
    return { name: "Elite Eight", order: 4 };
  if (/final four|national semifinal/i.test(raw))
    return { name: "Final Four", order: 5 };
  if (/national championship|championship game/i.test(raw))
    return { name: "National championship", order: 6 };
  return { name: raw || "Published matchups", order: 0 };
}
export function parseMarchMadness(
  payloads: unknown[],
  year: number,
  checked: string,
): MarchData {
  const games = new Map<string, MarchGame>();
  const events = payloads.flatMap((payload) =>
    providerArray(providerObject(payload).events),
  );
  for (const event of events) {
    const e = providerObject(event);
    const season = providerObject(e.season);
    if (Number(season.year) !== year || Number(season.type) !== 3) continue;
    const c = providerObject(providerArray(e.competitions)[0]);
    const note = providerArray(c.notes)
      .map((value) => providerObject(value).headline)
      .find(
        (headline): headline is string =>
          typeof headline === "string" &&
          /NCAA Men.s Basketball Championship/i.test(headline),
      );
    if (!note) continue;
    const competitionStatus = providerObject(c.status);
    const eventStatus = providerObject(e.status);
    const statusType = providerObject(
      competitionStatus.type || eventStatus.type,
    );
    const teams = providerArray(c.competitors).map((competitor) => {
      const p = providerObject(competitor);
      const team = providerObject(p.team);
      const curatedRank = providerObject(p.curatedRank);
      const teamId = String(team.id || "");
      const clubhouse = providerArray(team.links)
        .map(providerObject)
        .find((link) => linkHasRelation(link.rel, "clubhouse"));
      return {
        id: teamId,
        name:
          (typeof team.shortDisplayName === "string" &&
            team.shortDisplayName) ||
          (typeof team.displayName === "string" && team.displayName) ||
          "To be announced",
        logo: espnTeamLogoUrl("basketball/mens-college-basketball", teamId),
        seed: Number(curatedRank.current) || undefined,
        score:
          statusType.state !== "pre" && p.score !== undefined
            ? String(p.score)
            : undefined,
        winner: !!p.winner,
        url: espnLink(
          typeof clubhouse?.href === "string" ? clubhouse.href : "",
        ),
      };
    });
    if (
      teams.length !== 2 ||
      typeof e.date !== "string" ||
      !Number.isFinite(Date.parse(e.date))
    )
      continue;
    const rawRound = note.split(" - ").at(-1);
    const round = marchRound(rawRound || "");
    const region =
      note.match(/\b(East|West|South|Midwest) Region\b/i)?.[1] || "Final Four";
    const links = providerArray(e.links).map(providerObject);
    const boxLink = links.find((link) => linkHasRelation(link.rel, "boxscore"));
    const summaryLink = links.find((link) =>
      linkHasRelation(link.rel, "summary"),
    );
    const url = espnLink(
      (typeof boxLink?.href === "string" && boxLink.href) ||
        (typeof summaryLink?.href === "string" && summaryLink.href) ||
        "",
    );
    const statusDetails = providerObject(
      competitionStatus.type || eventStatus.type,
    );
    const id = String(e.id);
    games.set(id, {
      id,
      date: e.date,
      region,
      round: round.name,
      order: round.order,
      status:
        (typeof statusDetails.shortDetail === "string" &&
          statusDetails.shortDetail) ||
        (typeof statusDetails.description === "string" &&
          statusDetails.description) ||
        "Scheduled",
      completed: !!statusDetails.completed,
      url,
      teams,
    });
  }
  return {
    year,
    checked,
    games: [...games.values()].sort(
      (a, b) => a.order - b.order || Date.parse(a.date) - Date.parse(b.date),
    ),
  };
}
export async function fetchMarchMadness(year: number): Promise<MarchData> {
  const payloads = await Promise.all(
    ["03", "04"].map(async (month) => {
      const r = await fetch(
        "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates=" +
          year +
          month +
          "&groups=100&limit=1000",
        {
          credentials: "omit",
          referrerPolicy: "no-referrer",
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!r.ok) throw Error("Tournament feed unavailable");
      return r.json();
    }),
  );
  return parseMarchMadness(payloads, year, new Date().toISOString());
}
