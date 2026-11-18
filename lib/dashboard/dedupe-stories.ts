// Republished wire stories share a headline; keep only the earliest posting.
// Expects stories sorted newest first.
export function dedupeByTitle<T extends { title: string }>(stories: T[]): T[] {
  const kept = new Map<string, T>();
  for (let i = stories.length - 1; i >= 0; i--) {
    const key = stories[i].title.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
    if (key && !kept.has(key)) kept.set(key, stories[i]);
  }
  const keep = new Set(kept.values());
  return stories.filter((s) => keep.has(s) || !s.title.trim());
}
