// Shapes for server-only per-team behavior in lib/teams/<id>/server.ts.
import type { TeamId } from "./teams";
import type { TeamProfile } from "./team-types";
import type { Game, Health, HubData, Story } from "../feeds/feed-types";
import type { ProviderResponse, TeamInfo } from "../team-info/index";

export type FeedTaskContext = {
  checked: string;
  // Server-side provider fetch; never forwards visitor data.
  get: (url: string) => Promise<Response>;
  // Last good section data from this Worker instance, or an empty hub.
  baseline: HubData;
};

export type TeamFeedTask = {
  // Also the provider health name.
  name: string;
  section: "news" | "schedules";
  run: (
    ctx: FeedTaskContext,
  ) => Promise<{ stories?: Story[]; games?: Game[]; count: number }>;
  // Official fixtures replace provider fixtures for the same match.
  official?: boolean;
  // Keep these fixtures' league/source labels when ESPN refreshes the match.
  preserveLabels?: boolean;
};

export type EspnScheduleContext = FeedTaskContext & {
  team: TeamProfile;
  // The team's default ESPN schedule response.
  json: unknown;
  // Parsed games so far; hooks append to it.
  games: Game[];
  health: Health[];
  // Fetches and parses an ESPN team schedule with the given query string.
  schedule: (query: string) => Promise<Game[]>;
};

export type TeamInfoContext = {
  info: TeamInfo;
  checked: string;
  getText: (url: string) => Promise<string>;
  // HockeyTech JSONP statistics feed (PWHL).
  getJsonp: (
    params: Record<string, string>,
  ) => Promise<ProviderResponse | ProviderResponse[]>;
};

export type TeamServerHooks = {
  team: TeamId;
  feedTasks?: readonly TeamFeedTask[];
  // Query string for the default ESPN team schedule request.
  espnScheduleQuery?: (year: number) => string;
  extendEspnSchedule?: (ctx: EspnScheduleContext) => Promise<void>;
  // Games always merged into schedules (e.g. seeded tour events).
  seedGames?: (cached: Game[]) => Game[];
  // Last-good cached data restored when the named provider health is unavailable.
  fallbacks?: Readonly<
    Record<
      string,
      { stories?: (s: Story) => boolean; games?: (g: Game) => boolean }
    >
  >;
  // Standings, roster, and season data for teams ESPN does not cover.
  loadTeamInfo?: (ctx: TeamInfoContext) => Promise<void>;
};
