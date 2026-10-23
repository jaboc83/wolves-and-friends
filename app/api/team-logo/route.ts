const allowedLeagues = new Set([
  "basketball/nba",
  "basketball/wnba",
  "basketball/mens-college-basketball",
  "hockey/nhl",
  "football/nfl",
  "baseball/mlb",
  "soccer/usa.1",
  "soccer/eng.1",
]);
const maxBytes = 1_000_000;
const cache = new Map<string, { bytes: Uint8Array; mime: string }>();

type TeamLogo = { rel?: string[]; href?: string };
const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function imageMime(bytes: Uint8Array): string | undefined {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b))
    return "image/png";
  if (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
}

function respond(bytes: Uint8Array, mime: string) {
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const league = params.get("league") || "";
  const id = params.get("id") || "";
  if (!allowedLeagues.has(league) || !/^[a-z0-9-]{1,64}$/.test(id))
    return new Response(null, { status: 400 });
  const key = league + ":" + id;
  const cached = cache.get(key);
  if (cached) return respond(cached.bytes, cached.mime);

  try {
    // This is a public image proxy. Upstream calls use a fixed team ID and
    // never receive visitor headers, cookies, preferences, or identifiers.
    let teamResponse = await fetch(
      "https://site.api.espn.com/apis/site/v2/sports/" +
        league +
        "/teams/" +
        id,
      {
        credentials: "omit",
        referrerPolicy: "no-referrer",
        signal: AbortSignal.timeout(10000),
      },
    );
    let data: unknown;
    if (teamResponse.ok) {
      data = await teamResponse.json();
    } else if (!/^\d+$/.test(id)) {
      const catalogResponse = await fetch(
        "https://site.api.espn.com/apis/site/v2/sports/" +
          league +
          "/teams?limit=100",
        {
          credentials: "omit",
          referrerPolicy: "no-referrer",
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!catalogResponse.ok) throw Error("Team logo unavailable");
      const catalog: unknown = await catalogResponse.json();
      const leagueTeams: unknown[] = [];
      const visit = (value: unknown, depth = 0) => {
        if (depth > 8 || !value || typeof value !== "object") return;
        if (Array.isArray(value)) {
          value.forEach((item) => visit(item, depth + 1));
          return;
        }
        const record = value as Record<string, unknown>;
        if (
          typeof record.displayName === "string" ||
          typeof record.name === "string" ||
          typeof record.slug === "string"
        )
          leagueTeams.push(record);
        Object.values(record).forEach((item) => visit(item, depth + 1));
      };
      visit(catalog);
      const match = leagueTeams.find((entry) => {
        const candidate =
          isRecord(entry) && isRecord(entry.team) ? entry.team : entry;
        return (
          isRecord(candidate) &&
          (candidate.slug === id ||
            candidate.abbreviation === id ||
            slug(String(candidate.displayName || candidate.name || "")) === id)
        );
      });
      const candidate =
        isRecord(match) && isRecord(match.team) ? match.team : match;
      if (!candidate) throw Error("Team logo unavailable");
      data = { team: candidate };
    } else {
      throw Error("Team logo unavailable");
    }
    if (!isRecord(data)) throw Error("Invalid team response");
    const team = isRecord(data.team) ? data.team : undefined;
    const logos = team?.logos ?? data.logos;
    if (!Array.isArray(logos)) throw Error("Team logos unavailable");
    const logoEntries = (logos as unknown[])
      .filter(isRecord)
      .map((logo): TeamLogo => ({
        rel: Array.isArray(logo.rel)
          ? logo.rel.filter(
              (relation): relation is string => typeof relation === "string",
            )
          : undefined,
        href: typeof logo.href === "string" ? logo.href : undefined,
      }));
    const href =
      logoEntries.find((logo) => logo.rel?.includes("default"))?.href ||
      logoEntries.find((logo) => logo.href)?.href ||
      (typeof team?.logo === "string" ? team.logo : undefined);
    const logoUrl = new URL(href || "");
    if (
      logoUrl.protocol !== "https:" ||
      logoUrl.hostname !== "a.espncdn.com" ||
      !logoUrl.pathname.startsWith("/i/teamlogos/")
    )
      throw Error("Untrusted logo URL");
    const upstream = await fetch(logoUrl, {
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: AbortSignal.timeout(10000),
      headers: { Accept: "image/png,image/jpeg,image/webp" },
    });
    if (!upstream.ok || !upstream.body) throw Error("Logo unavailable");
    const length = Number(upstream.headers.get("content-length"));
    if (Number.isFinite(length) && length > maxBytes)
      throw Error("Logo too large");
    const reader = upstream.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw Error("Logo too large");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const mime = imageMime(bytes);
    if (!mime) throw Error("Unsupported logo format");
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, { bytes, mime });
    return respond(bytes, mime);
  } catch {
    return new Response(null, {
      status: 404,
      headers: {
        "Cache-Control": "public, max-age=300",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
}
