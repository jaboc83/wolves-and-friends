import { teamProviders } from "../../../lib/teams/providers";
import { isTeamId } from "../../../lib/teams/teams";
import { parseCapWagesRoster } from "../../../lib/team-info/capwages";
import { parseFanGraphsRoster } from "../../../lib/team-info/fangraphs";
import { parseHerHoopStatsRoster } from "../../../lib/team-info/herhoopstats";
import { parsePwhlpaRoster } from "../../../lib/team-info/pwhlpa";
import { parseSalarySportRoster } from "../../../lib/team-info/salarysport";
import { parseSpotracRoster } from "../../../lib/team-info/spotrac";
import {
  parseSalarySwishRoster,
  salarySourceForYear,
  type RosterSalaryResponse,
} from "../../../lib/team-info/salaryswish";

const cacheDuration = 24 * 60 * 60 * 1000;
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
  const requestUrl = salarySourceForYear(sourceUrl, year);
  const hostname = new URL(sourceUrl).hostname;
  const signal = AbortSignal.timeout(
    hostname === "www.pwhlpa.com" || hostname === "herhoopstats.com"
      ? 20000
      : 10000,
  );
  const request = (url: string) =>
    fetch(url, {
      signal,
      headers: {
        Accept: "text/html",
        "User-Agent": "WolvesAndFriends/1.0",
      },
      cache: "no-store",
    });
  const response = await request(requestUrl);
  if (!response.ok) throw new Error(`Salary source HTTP ${response.status}`);
  const html = await response.text();
  const pages = [html];
  if (hostname === "www.pwhlpa.com") {
    const origin = new URL(sourceUrl).origin;
    const sourcePath = new URL(sourceUrl).pathname;
    const visited = new Set([new URL(requestUrl).href]);
    let page = html;
    for (let pageNumber = 1; pageNumber < 20; pageNumber += 1) {
      const next = page.match(
        /<a\b(?=[^>]*\baria-label=["']Next Page["'])[^>]*\bhref=["']([^"']+)["']/i,
      )?.[1];
      if (!next) break;
      const nextUrl = new URL(next, requestUrl);
      if (
        nextUrl.origin !== origin ||
        nextUrl.pathname !== sourcePath ||
        visited.has(nextUrl.href)
      )
        throw new Error("Invalid PWHLPA salary-guide pagination");
      visited.add(nextUrl.href);
      const nextResponse = await request(nextUrl.href);
      if (!nextResponse.ok)
        throw new Error(`PWHLPA salary source HTTP ${nextResponse.status}`);
      page = await nextResponse.text();
      pages.push(page);
      if (
        pageNumber === 19 &&
        /<a\b(?=[^>]*\baria-label=["']Next Page["'])[^>]*\bhref=["']([^"']+)["']/i.test(
          page,
        )
      )
        throw new Error("PWHLPA salary guide has too many pages");
    }
  }
  const roster =
    hostname === "capwages.com"
      ? parseCapWagesRoster(html, year)
      : hostname === "www.fangraphs.com"
        ? parseFanGraphsRoster(html, year)
        : hostname === "salarysport.com"
          ? parseSalarySportRoster(html, year)
          : hostname === "www.spotrac.com"
            ? parseSpotracRoster(html, year)
            : hostname === "www.pwhlpa.com"
              ? parsePwhlpaRoster(pages, year)
              : hostname === "herhoopstats.com"
                ? parseHerHoopStatsRoster(html, year)
                : parseSalarySwishRoster(html, year);
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

  const teamProvider = teamProviders.find((provider) => provider.team === team);
  const sourceUrl = teamProvider?.urls?.salary;
  if (!sourceUrl)
    return Response.json(
      { error: "Salary data is not available for this team." },
      { status: 404 },
    );

  const year = teamProvider?.salarySeason
    ? Number(teamProvider.salarySeason.slice(0, 4))
    : new Date().getUTCFullYear();
  const key = `${team}:${year}`;
  const previous = cached.get(key);
  if (previous && Date.now() - previous.loadedAt < cacheDuration)
    return Response.json(previous.value, {
      headers: { "Cache-Control": "public, max-age=0, s-maxage=86400" },
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
      headers: { "Cache-Control": "public, max-age=0, s-maxage=86400" },
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
