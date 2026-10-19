import { hubData } from "../../../lib/feeds";
import { teams } from "../../../lib/teams";
export async function GET(request: Request) {
  const team = new URL(request.url).searchParams.get("team") || undefined;
  if (team && !teams.some((t) => t.id === team))
    return Response.json({ error: "Unknown team" }, { status: 400 });
  try {
    return Response.json(await hubData("news", team), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json({ error: "Refresh unavailable" }, { status: 503 });
  }
}
