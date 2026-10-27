// Registry of public news and author feeds that the feed coordinator refreshes.
// Team news and author feeds are configured in lib/teams/<id>/providers.ts.
import type { TeamId } from "../teams/teams";
import type { TeamAuthorFeed } from "../teams/team-types";
import { teamProviders } from "../teams/providers";
export type NewsSource = {
  name: string;
  url: string;
  teams: TeamId[];
  // When set, stories are tagged by matching team patterns instead of `teams`.
  tagByContent: boolean;
};
export const newsSources: NewsSource[] = teamProviders.flatMap((p) =>
  (p.newsFeeds || []).map((feed) => ({
    name: feed.name,
    url: feed.url,
    teams: [p.team, ...(feed.alsoFor || [])],
    tagByContent: !!feed.tagByContent,
  })),
);
export type AuthorSource = TeamAuthorFeed & { team: TeamId };
export const authorSources: AuthorSource[] = teamProviders.flatMap((p) =>
  (p.authors || []).map((author) => ({ ...author, team: p.team })),
);
