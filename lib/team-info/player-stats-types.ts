export type PlayerStats = {
  title: string;
  values: { label: string; value: string; description: string }[];
};

export type Stat = {
  name?: string;
  abbreviation?: string;
  displayValue?: string | number | null;
  displayName?: string;
  description?: string;
  value?: number;
  teamId?: string | number;
  season?: { year?: string | number; displayName?: string };
  stats?: (string | number | null)[];
};

export type StatRow = Stat & {
  stats?: (string | number | null)[];
};

export type Category = {
  name?: string;
  displayName?: string;
  statistics?: StatRow[];
  stats?: Stat[];
  labels?: string[];
  names?: string[];
  displayNames?: string[];
  descriptions?: string[];
  totals?: (string | number | null)[];
};

export type StatsSplit = {
  teamId?: string | number;
  leagueSlug?: string;
  displayName?: string;
  stats?: (string | number | null)[];
};

export type StatisticsOverview = {
  displayName?: string;
  labels?: string[];
  names?: string[];
  displayNames?: string[];
  splits?: StatsSplit[] | { categories?: Category[] };
  categories?: Category[];
  statistics?: Stat[];
};

export type StatsSummary = { displayName?: string; statistics?: Stat[] };

export type PlayerStatsData = {
  categories?: Category[];
  splits?: Category[] | { categories?: Category[] };
  season?: { displayName?: string; year?: string | number };
  statistics?: StatisticsOverview | Stat[];
  statsSummary?: StatsSummary;
  statisticsSummary?: StatsSummary;
  athlete?: {
    statsSummary?: StatsSummary;
    statistics?: Stat[];
    statisticsSummary?: StatsSummary;
  };
  glossary?: { abbreviation?: string; displayName?: string }[];
  displayName?: string;
};
