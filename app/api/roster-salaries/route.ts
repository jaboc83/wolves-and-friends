import { teamProviders } from "../../../lib/teams/providers";
import { isTeamId } from "../../../lib/teams/teams";
import {
  parseSalarySwishRoster,
  type RosterSalaryResponse,
} from "../../../lib/team-info/salaryswish";

const cacheDuration = 15 * 60 * 1000;
const cached = new Map<
  string,
  { loadedAt: number; value: RosterSalaryResponse }
>();
const inflight = new Map<string, Promise<RosterSalaryResponse>>();

async function fetchSalaries(
  team: string,
  sourceUrl: string,
  year: number,
): Promise<RosterSalaryResponse> {
  const response = await fetch(sourceUrl, {
    signal: AbortSignal.timeout(10000),
    headers: {
      Accept: "text/html",
      "User-Agent": "WolvesAndFriends/1.0",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`SalarySwish HTTP ${response.status}`);
  const roster = parseSalarySwishRoster(await response.text(), year);
  return {
    ...roster,
    team,
    checked: new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  const team = new URL(request.url).searchParams.get("team");
  if (!team || !isTeamId(team))
    return Response.json(
      { error: "A valid team is required." },
      { status: 400 },
    );

  const sourceUrl = teamProviders.find((provider) => provider.team === team)
    ?.urls?.salary;
  if (!sourceUrl)
    return Response.json(
      { error: "Salary data is not available for this team." },
      { status: 404 },
    );

  const year = new Date().getUTCFullYear();
  const key = `${team}:${year}`;
  const previous = cached.get(key);
  if (previous && Date.now() - previous.loadedAt < cacheDuration)
    return Response.json(previous.value, {
      headers: { "Cache-Control": "no-store" },
    });

  let pending = inflight.get(key);
  if (!pending) {
    pending = fetchSalaries(team, sourceUrl, year);
    inflight.set(key, pending);
  }
  try {
    const value = await pending;
    cached.set(key, { loadedAt: Date.now(), value });
    return Response.json(value, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    if (previous)
      return Response.json(
        { ...previous.value, stale: true },
        { headers: { "Cache-Control": "no-store" } },
      );
    return Response.json(
      { error: "Salary data is temporarily unavailable." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    if (inflight.get(key) === pending) inflight.delete(key);
  }
}
