// API route for fetching team information. Returns the latest team info or an error if unavailable.
import { fetchTeamInfo, type TeamInfo } from "../../../lib/team-info";
import { mergeTeamInfo } from "../../../lib/team-info/team-info-cache";
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_HEADERS = { "Cache-Control": "public, max-age=0, s-maxage=3600" };
let cached: TeamInfo[] = [],
  checked = 0;
let inflight: Promise<TeamInfo[]> | null = null;
export async function GET() {
  if (Date.now() - checked < CACHE_TTL_MS)
    return Response.json(cached, { headers: CACHE_HEADERS });
  if (!inflight)
    inflight = fetchTeamInfo()
      .then((data) => {
        cached = data.map((t) => {
          const old = cached.find((x) => x.id === t.id);
          return mergeTeamInfo(t, old);
        });
        checked = Date.now();
        return cached;
      })
      .finally(() => (inflight = null));
  return Response.json(await inflight, {
    headers: CACHE_HEADERS,
  });
}
