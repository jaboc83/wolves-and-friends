// Combines already-loaded team news and determines which empty/loading/error view to show.
import type { HubData } from "../feeds/feed-types";
import type { TeamId } from "../teams/teams";
// Availability and request status are independent: revalidation never removes data.
export function loadedNewsData(
  ids: readonly TeamId[],
  pages: Partial<Record<TeamId, HubData>>,
): HubData {
  return {
    checked:
      ids
        .map((id) => pages[id]?.checked || "")
        .filter(Boolean)
        .sort()[0] || "",
    stories: ids.flatMap((id) => pages[id]?.stories || []),
    authors: ids.flatMap((id) => pages[id]?.authors || []),
    health: ids.flatMap((id) => pages[id]?.health || []),
    games: [],
  };
}
export function newsDisplayMode(
  loading: boolean,
  hasStories: boolean,
  failed: boolean,
) {
  if (hasStories) return "stories";
  return loading ? "loading" : failed ? "error" : "empty";
}
