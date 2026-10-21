import type { HubData } from "./feeds";
// Availability and request status are independent: revalidation never removes data.
export function loadedNewsData(ids: string[], pages: Record<string, HubData>): HubData {
  return {
    checked: ids.map((id) => pages[id]?.checked || "").filter(Boolean).sort()[0] || "",
    stories: ids.flatMap((id) => pages[id]?.stories || []),
    authors: ids.flatMap((id) => pages[id]?.authors || []),
    health: ids.flatMap((id) => pages[id]?.health || []),
    games: [],
  };
}
