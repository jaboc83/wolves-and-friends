// Shapes for per-team config in lib/teams/<id>/profile.ts and providers.ts.
import type { TeamId } from "./teams";

// Client-safe: shipped to the browser. Only links the visitor opens deliberately.
export type TeamProfile = {
  id: TeamId;
  name: string;
  short: string;
  sport: string;
  color: string;
  theme: { primary: string; accent: string; soft: string };
  logo: string;
  // Regex source used to tag stories that mention the team.
  pattern: string;
  // ESPN `sport/league` slug; "" when ESPN does not cover the team.
  league: string;
  // ESPN team id or abbreviation used in ESPN API URLs; "" when not covered.
  espn: string;
  sources: readonly (readonly [label: string, url: string])[];
  communities: readonly { name: string; url: string }[];
  injuryReportUrl: string;
  // English Wikipedia page title for the team; "" when there is none.
  wikipediaPage: string;
  // Static home location shown on game cards; "" when it depends on context.
  homeLocation: string;
  // Drives sport vocabulary (match/game/tournament) and search context.
  sportKind:
    "basketball" | "hockey" | "football" | "baseball" | "soccer" | "disc";
  // A tour of individual players: player standings, no roster, no team page.
  individual?: boolean;
  // Overrides for the sport's default section labels.
  terms?: { roster?: string; calendar?: string };
  // Nav tab logo and alt text when they differ from `logo` / the team name.
  tabLogo?: string;
  logoAlt?: string;
  // "More scoreboards" link for teams whose imported schedules are partial.
  scoreboardUrl?: string;
  // Official pages used when the standings or roster feed returns nothing.
  standingsPage?: string;
  rosterPage?: string;
  noStandingsNote?: string;
  rosterNote?: string;
  standingsRules?: {
    qualification?: string;
    // `tableNameIncludes` limits a cut to tables whose name contains it.
    cuts?: readonly {
      after: number;
      label: string;
      tableNameIncludes?: string;
    }[];
    // ESPN labels these regular-season tables as preseason.
    preseasonTableIsRegularSeason?: boolean;
  };
  // Extra standings-panel sections for cups and continental competitions.
  competitionPanels?: {
    label: string;
    hideDuringPostseason?: boolean;
    sections: readonly {
      title: string;
      note?: string;
      links: readonly (readonly [label: string, url: string])[];
    }[];
  };
  // Game-card badges, first match wins; `pattern` is a case-insensitive regex source.
  badges?: readonly { pattern: string; label: string; tone: string }[];
  // Score pages for specific events whose provider link is wrong.
  eventScoreLinks?: readonly { pattern: string; url: string }[];
};

export type TeamNewsFeed = {
  name: string;
  url: string;
  // Tag stories by matching every team's pattern instead of assigning this team.
  tagByContent?: boolean;
  alsoFor?: readonly TeamId[];
};

export type TeamAuthorFeed = {
  name: string;
  label: string;
  url: string;
  feed: string;
  publisherAuthorFeed?: boolean;
  // Every pattern must match a headline for it to be kept.
  titleFilters: readonly RegExp[];
};

export type TeamSeason = {
  name: string;
  start: string;
  end: string;
  source: string;
  url: string;
  note?: string;
};

// Server-only: fetched by providers; never import from client code.
export type TeamProviders = {
  team: TeamId;
  newsFeeds?: readonly TeamNewsFeed[];
  authors?: readonly TeamAuthorFeed[];
  youtube?: {
    name: string;
    channel?: string;
    page?: string;
    officialSite?: string;
    pattern?: RegExp;
  };
  socialTags?: readonly string[];
  bluesky?: { list: string; pattern: RegExp };
  // Numeric ESPN team id (injuries API, own-team detection in game competitors).
  espnTeamId?: string;
  // Extra ESPN league slugs (cups, continental competitions) mapped to display names.
  extraCompetitions?: Readonly<Record<string, string>>;
  // Fixed season window when no provider publishes one.
  season?: TeamSeason;
  // Power-ranking source when ESPN has no league index; "snapshot" = fixed fallback rows in lib/team-info only.
  powerRankingSource?: "cbs-mlb" | "cbs-nhl" | "opta-epl" | "snapshot";
  // Team-specific pages and endpoints used by scrapers and parsers.
  urls?: Readonly<Record<string, string>>;
};
