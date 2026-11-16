export type BlueskyImage = {
  thumb?: string;
  fullsize?: string;
  alt?: string;
  aspectRatio?: { width?: number; height?: number };
};

type BlueskyAuthor = {
  handle?: string;
  displayName?: string;
};

type BlueskyExternal = {
  title?: string;
  description?: string;
};

type BlueskyQuoteRecord = {
  uri?: string;
  author?: BlueskyAuthor;
  value?: { text?: string };
  embeds?: BlueskyEmbed[];
};

export type BlueskyEmbed = {
  $type?: string;
  external?: BlueskyExternal;
  record?: BlueskyQuoteRecord;
  images?: BlueskyImage[];
  media?: BlueskyEmbed;
};

export type BlueskyQuote = {
  author: string;
  handle: string;
  text: string;
  url?: string;
  linkTitle?: string;
  linkDescription?: string;
};

function quotedPostUrl(handle: string, uri?: string) {
  const key = uri?.match(
    /^at:\/\/[^/]+\/app\.bsky\.feed\.post\/([^/?#]+)$/,
  )?.[1];
  if (!key) return undefined;
  return `https://bsky.app/profile/${encodeURIComponent(handle)}/post/${encodeURIComponent(key)}`;
}

export function parseBlueskyQuote(
  embed?: BlueskyEmbed,
): BlueskyQuote | undefined {
  const record = embed?.record;
  if (!record) return undefined;
  const handle = record.author?.handle?.trim();
  const text = record.value?.text?.trim();
  if (!handle || !text) return undefined;

  const external = record.embeds?.find((item) => item.external)?.external;
  const author = record.author?.displayName?.trim() || handle;
  const url = quotedPostUrl(handle, record.uri);
  const linkTitle = external?.title?.trim();
  const linkDescription = external?.description?.trim();

  return {
    author,
    handle,
    text,
    ...(url ? { url } : {}),
    ...(linkTitle ? { linkTitle } : {}),
    ...(linkDescription ? { linkDescription } : {}),
  };
}
