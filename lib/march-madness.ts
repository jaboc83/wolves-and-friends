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
  payloads: any[],
  year: number,
  checked: string,
): MarchData {
  const games = new Map<string, MarchGame>();
  for (const e of payloads.flatMap((x) => x.events || [])) {
    if (Number(e.season?.year) !== year || Number(e.season?.type) !== 3)
      continue;
    const c = e.competitions?.[0];
    const note = c?.notes
      ?.map((n: any) => n.headline || "")
      .find((s: string) => /NCAA Men.s Basketball Championship/i.test(s));
    if (!note) continue;
    const teams = (c.competitors || []).map((p: any) => ({
      id: String(p.team?.id || ""),
      name:
        p.team?.shortDisplayName || p.team?.displayName || "To be announced",
      logo: espnTeamLogoUrl(
        "basketball/mens-college-basketball",
        String(p.team?.id || ""),
      ),
      seed: Number(p.curatedRank?.current) || undefined,
      score:
        (c.status?.type || e.status?.type)?.state !== "pre" &&
        p.score !== undefined
          ? String(p.score)
          : undefined,
      winner: !!p.winner,
      url: espnLink(
        p.team?.links?.find((l: any) => l.rel?.includes("clubhouse"))?.href,
      ),
    }));
    if (teams.length !== 2 || !Number.isFinite(Date.parse(e.date))) continue;
    const rawRound = note.split(" - ").at(-1);
    const round = marchRound(rawRound);
    const region =
      note.match(/\b(East|West|South|Midwest) Region\b/i)?.[1] || "Final Four";
    const status = c.status?.type || e.status?.type || {};
    const url = espnLink(
      e.links?.find((l: any) => l.rel?.includes("boxscore"))?.href ||
        e.links?.find((l: any) => l.rel?.includes("summary"))?.href,
    );
    games.set(String(e.id), {
      id: String(e.id),
      date: e.date,
      region,
      round: round.name,
      order: round.order,
      status: status.shortDetail || status.description || "Scheduled",
      completed: !!status.completed,
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
