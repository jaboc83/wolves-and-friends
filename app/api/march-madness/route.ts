import {
  fetchMarchMadness,
  type MarchData,
} from "../../../lib/games/march-madness";
import { marchMadnessYear } from "../../../lib/games/march-madness-config";
import initial from "../../../data/snapshots/march-madness-initial.json";
let cached = initial as MarchData,
  checked = 0;
let inflight: Promise<MarchData> | null = null;
export async function GET() {
  if (Date.now() - checked >= 60000) {
    if (!inflight)
      inflight = fetchMarchMadness(marchMadnessYear)
        .then((data) => {
          if (!data.games.length) throw Error("No published tournament games");
          cached = data;
          checked = Date.now();
          return cached;
        })
        .catch(() => ({ ...cached, unavailable: true }))
        .finally(() => {
          inflight = null;
        });
    return Response.json(await inflight, {
      headers: { "Cache-Control": "no-store" },
    });
  }
  return Response.json(cached, { headers: { "Cache-Control": "no-store" } });
}
