// Shared data contracts for normalized stories, games, provider health, and feed responses.
import type { Odds } from "./odds";
import type { TeamId } from "../teams/teams";
import type { BlueskyQuote } from "../social/bluesky-quote";
export type Story = {
  socialPlatform?: "youtube";
  avatar?: string;
  images?: { src: string; alt: string; width?: number; height?: number }[];
  quotedPost?: BlueskyQuote;
  originalTitle?: string;
  dateApproximate?: boolean;
  premium?: boolean;
  id: string;
  title: string;
  url: string;
  source: string;
  date: string;
  teams: TeamId[];
  kind: string;
};
export type Game = {
  eventResults?: {
    division: string;
    name: string;
    score: string;
    margin?: string;
  }[];
  injuries?: {
    player: string;
    status: string;
    detail?: string;
    team?: string;
  }[];
  competitionNote?: string;
  eventOnly?: boolean;
  dateOnly?: boolean;
  endDate?: string;
  boxUrl?: string;
  sourceName?: string;
  sourceChecked?: string;
  odds?: Odds;
  id: string;
  team: TeamId;
  name: string;
  date: string;
  status: string;
  state: string;
  league: string;
  venue: string;
  broadcast: string;
  url: string;
  competitors: {
    record?: string;
    name: string;
    teamId?: string;
    teamUrl?: string;
    score: string;
    winner: boolean;
    homeAway: string;
  }[];
};
export type Health = {
  name: string;
  status: string;
  checked: string;
  count: number;
  teams: TeamId[];
  /** Safe diagnostic code for operators; never contains request or visitor data. */
  error?: string;
};
export type HubData = {
  checked: string;
  stories: Story[];
  games: Game[];
  health: Health[];
};
