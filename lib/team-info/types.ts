// Shared shapes for standings tables and power rankings.
export type Table = {
  stale?: boolean;
  seasonType?: number;
  name: string;
  columns: string[];
  rows: {
    id: string;
    name: string;
    url: string;
    cells: string[];
    highlight?: boolean;
    zone?: string;
  }[];
  source: string;
  url: string;
  checked: string;
  note?: string;
  cuts?: { after: number; label: string }[];
  qualification?: string;
};

export type PowerRanking = {
  name: string;
  metric: string;
  rows: (Table["rows"][number] & { logo?: string })[];
  source: string;
  url: string;
  checked: string;
  publishedAt: string;
  note?: string;
};
