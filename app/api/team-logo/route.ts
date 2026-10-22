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
  if (!allowedLeagues.has(league) || !/^\d{1,8}$/.test(id))
    return new Response(null, { status: 400 });
  const key = league + ":" + id;
  const cached = cache.get(key);
  if (cached) return respond(cached.bytes, cached.mime);

  try {
    // This is a public image proxy. Upstream calls use a fixed team ID and
    // never receive visitor headers, cookies, preferences, or identifiers.
    const teamResponse = await fetch(
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
    if (!teamResponse.ok) throw Error("Team logo unavailable");
    const data: unknown = await teamResponse.json();
    if (!isRecord(data)) throw Error("Invalid team response");
    const team = isRecord(data.team) ? data.team : undefined;
    const logos = team?.logos ?? data.logos;
    if (!Array.isArray(logos)) throw Error("Team logos unavailable");
    const href = (logos as unknown[])
      .filter(isRecord)
      .map((logo): TeamLogo => ({
        rel: Array.isArray(logo.rel)
          ? logo.rel.filter(
              (relation): relation is string => typeof relation === "string",
            )
          : undefined,
        href: typeof logo.href === "string" ? logo.href : undefined,
      }))
      .find((logo) => logo.rel?.includes("default"))?.href;
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
