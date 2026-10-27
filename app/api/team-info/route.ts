import { fetchTeamInfo, type TeamInfo } from "../../../lib/team-info";
import { mergeTeamInfo } from "../../../lib/team-info/team-info-cache";
let cached: TeamInfo[] = [],
  checked = 0;
let inflight: Promise<TeamInfo[]> | null = null;
export async function GET() {
  if (Date.now() - checked < 900000)
    return Response.json(cached, { headers: { "Cache-Control": "no-store" } });
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
    headers: { "Cache-Control": "no-store" },
  });
}
