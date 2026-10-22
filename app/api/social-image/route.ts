import { blueskyImagePath } from "../../../lib/social/bluesky-images";

const maxBytes = 1_500_000;
const cache = new Map<
  string,
  { bytes: Uint8Array; mime: string; expires: number }
>();
let cacheBytes = 0;

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

function imageResponse(bytes: Uint8Array, mime: string) {
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
  const path = new URL(request.url).searchParams.get("path") || "";
  const kind = path.startsWith("/img/avatar_thumbnail/") ? "avatar" : "photo";
  if (blueskyImagePath("https://cdn.bsky.app" + path, kind) !== path)
    return new Response(null, { status: 400 });
  const cached = cache.get(path);
  if (cached && cached.expires > Date.now())
    return imageResponse(cached.bytes, cached.mime);
  try {
    let url = "https://cdn.bsky.app" + path;
    let response: Response | undefined;
    // Validate every redirect. Never pass through visitor headers or cookies.
    for (let hop = 0; hop < 3; hop++) {
      response = await fetch(url, {
        redirect: "manual",
        credentials: "omit",
        referrerPolicy: "no-referrer",
        signal: AbortSignal.timeout(10000),
        headers: { Accept: "image/jpeg,image/png,image/webp" },
      });
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) throw Error();
      const next = new URL(location, url).href;
      if (!blueskyImagePath(next, kind)) throw Error();
      url = next;
    }
    if (
      !response?.ok ||
      !response.body ||
      Number(response.headers.get("content-length")) > maxBytes
    ) {
      await response?.body?.cancel();
      throw Error();
    }
    const reader = response.body.getReader(),
      chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw Error();
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const mime = imageMime(bytes);
    if (!mime) throw Error();
    const previous = cache.get(path);
    if (previous) {
      cache.delete(path);
      cacheBytes -= previous.bytes.length;
    }
    while (
      cache.size &&
      (cache.size >= 100 || cacheBytes + size > 16_000_000)
    ) {
      const key = cache.keys().next().value!;
      cacheBytes -= cache.get(key)!.bytes.length;
      cache.delete(key);
    }
    cache.set(path, { bytes, mime, expires: Date.now() + 3_600_000 });
    cacheBytes += size;
    return imageResponse(bytes, mime);
  } catch {
    return new Response(null, {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
