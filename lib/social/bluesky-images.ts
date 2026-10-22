export type BlueskyImageKind = "avatar" | "photo";

// Accept only public Bluesky image renditions, never an arbitrary proxy URL.
export function blueskyImagePath(
  value: string,
  kind: BlueskyImageKind,
): string | undefined {
  try {
    const url = new URL(value);
    if (
      url.origin !== "https://cdn.bsky.app" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return;
    const match = url.pathname.match(
      /^\/img\/(avatar|avatar_thumbnail|feed_thumbnail|feed_fullsize)\/plain\/(did:(?:plc|web):[a-zA-Z0-9.:%-]+)\/(b[a-z2-7]+)(?:@(jpeg|png|webp))?$/,
    );
    if (
      !match ||
      match[2].includes("%") ||
      (kind === "avatar") !== match[1].startsWith("avatar")
    )
      return;
    const rendition = kind === "avatar" ? "avatar_thumbnail" : "feed_thumbnail";
    return `/img/${rendition}/plain/${match[2]}/${match[3]}@${match[4] || "jpeg"}`;
  } catch {
    return;
  }
}

export function blueskyImageUrl(
  value: string | undefined,
  kind: BlueskyImageKind,
): string | undefined {
  if (!value) return;
  const path = blueskyImagePath(value, kind);
  return path
    ? "/api/social-image?path=" + encodeURIComponent(path)
    : undefined;
}

export function isLocalSocialImage(value?: string): value is string {
  if (!value) return false;
  if (/^data:image\/(?:jpeg|png|webp);base64,/.test(value)) return true;
  try {
    const url = new URL(value, "https://local.invalid");
    if (
      !value.startsWith("/api/social-image?") ||
      url.origin !== "https://local.invalid" ||
      url.pathname !== "/api/social-image" ||
      url.hash ||
      [...url.searchParams.keys()].some((k) => k !== "path")
    )
      return false;
    const path = url.searchParams.get("path");
    return (
      !!path &&
      ["avatar", "photo"].some(
        (kind) =>
          blueskyImagePath(
            "https://cdn.bsky.app" + path,
            kind as BlueskyImageKind,
          ) === path,
      )
    );
  } catch {
    return false;
  }
}
