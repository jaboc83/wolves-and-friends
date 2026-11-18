// Builds the "Author (Publication)" source label shown on headlines.
export function bylineSource(
  publication: string,
  author?: string | null,
): string {
  const name = (author || "").trim();
  // Generic desk bylines such as "ESPN staff" just repeat the publication.
  if (!name || name.toLowerCase().startsWith(publication.toLowerCase()))
    return publication;
  return `${name} (${publication})`;
}

export function isPublication(source: string, publication: string): boolean {
  return source === publication || source.endsWith(` (${publication})`);
}
