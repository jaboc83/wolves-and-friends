export type ESPNLink = { rel?: string[]; href?: string };

export type ESPNTeam = {
  id?: string | number;
  abbreviation?: string;
  displayName?: string;
  name?: string;
  logo?: string;
  logos?: { href?: string }[];
  links?: ESPNLink[];
  team?: ESPNTeam;
};

export type ESPNSeason = {
  type?: number | string | { type?: number | string };
  year?: number | string;
  startDate?: string;
  endDate?: string;
  displayName?: string;
};

export type ESPNStat = {
  name?: string;
  value?: string | number;
  displayValue?: string | number;
};

export type ESPNStandingEntry = {
  team?: ESPNTeam;
  stats?: ESPNStat[];
};

export type ESPNStandings = {
  entries?: ESPNStandingEntry[];
  links?: ESPNLink[];
  seasonType?: number | string | { type?: number | string };
  seasonDisplayName?: string;
};

export type ESPNStandingsNode = {
  name?: string;
  standings?: ESPNStandings;
  children?: ESPNStandingsNode[];
};

export type ESPNPosition = {
  displayName?: string;
  name?: string;
  abbreviation?: string;
};

export type ESPNAthlete = {
  id?: string | number;
  displayName?: string;
  fullName?: string;
  name?: string;
  dateOfBirth?: string;
  age?: number;
  links?: ESPNLink[];
  position?: ESPNPosition;
  items?: ESPNRosterEntry[];
  athlete?: ESPNAthlete;
};

export type ESPNRosterEntry = ESPNAthlete;

export type ESPNDepthPosition = {
  athletes?: ESPNAthlete[];
  position?: ESPNPosition;
};

export type ESPNDepthChart = { positions?: Record<string, ESPNDepthPosition> };

export type ESPNPowerIndexItem = {
  team?: { $ref?: string };
  predictives?: ESPNStat[];
  stats?: ESPNStat[];
  lastUpdated?: string;
  runCutoffDate?: string;
};

export type ESPNRankingEntry = {
  rank?: string | number;
  currentRating?: string | number;
  contestantId?: string | number;
  contestantName?: string;
};

export type ProviderResponse = ESPNStandingsNode & {
  pageCount?: string | number;
  items?: ESPNPowerIndexItem[];
  sports?: {
    leagues?: { teams?: { team?: ESPNTeam }[] }[];
  }[];
  season?: ESPNSeason;
  leagues?: { season?: ESPNSeason; name?: string }[];
  depthchart?: ESPNDepthChart[];
  athletes?: ESPNRosterEntry[];
  seasons?: { id?: string | number; name?: string }[];
  current_season_id?: string | number;
  current_league_id?: string | number;
  [key: string]: unknown;
  division?: { type?: string; ranking?: ESPNRankingEntry[] }[];
  lastUpdated?: string;
};
