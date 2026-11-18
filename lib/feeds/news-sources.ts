// Registry of public news feeds that the feed coordinator refreshes.
// Team news feeds are configured in lib/teams/<id>/providers.ts.
import type { TeamId } from "../teams/teams";
import { teamProviders } from "../teams/providers";
export type NewsSource = {
  name: string;
  url: string;
  teams: TeamId[];
  // When set, stories are tagged by matching team patterns instead of `teams`.
  tagByContent: boolean;
  categoryTeams?: Readonly<Record<string, TeamId>>;
};
export const newsSources: NewsSource[] = teamProviders.flatMap((p) =>
  (p.newsFeeds || []).map((feed) => ({
    name: feed.name,
    url: feed.url,
    teams: [p.team, ...(feed.alsoFor || [])],
    tagByContent: !!feed.tagByContent,
    categoryTeams: feed.categoryTeams,
  })),
);
