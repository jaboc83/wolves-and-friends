import { teams } from "./teams";
import type { HubData, Story } from "./feeds";
const retiredNews = (name: string) =>
  name === "EuroLeague · Google News index" ||
  name.startsWith("Official Žalgiris");
export function activeStories(stories: Story[]) {
  return stories
    .map((s) => ({
      ...s,
      teams: s.teams.filter((id) => teams.some((t) => t.id === id)),
    }))
    .filter((s) => s.teams.length && !retiredNews(s.source));
}
export function activeHub(d: HubData): HubData {
  return {
    ...d,
    stories: activeStories(d.stories),
    games: d.games.filter((g) => teams.some((t) => t.id === g.team)),
    health: d.health.filter(
      (h) =>
        h.teams.some((id) => teams.some((t) => t.id === id)) &&
        h.name !== "Official Žalgiris news" &&
        h.name !== "EuroLeague · Google News index",
    ),
  };
}
