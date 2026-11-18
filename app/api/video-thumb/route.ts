// Same-origin proxy for YouTube video thumbnails so browsers never contact YouTube's image host.
const maxBytes = 300_000;

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[\w-]{11}$/.test(id)) return new Response(null, { status: 400 });
  try {
    const response = await fetch(
      "https://i.ytimg.com/vi/" + id + "/mqdefault.jpg",
      {
        credentials: "omit",
        referrerPolicy: "no-referrer",
        redirect: "manual",
        signal: AbortSignal.timeout(10000),
        headers: { Accept: "image/jpeg" },
      },
    );
    const bytes = new Uint8Array(await response.arrayBuffer());
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (!response.ok || !jpeg || bytes.length > maxBytes) throw Error();
    return new Response(bytes, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return new Response(null, {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
