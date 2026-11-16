export type SalarySwishRoster = {
  season: string;
  salaries: Record<string, number>;
};

export type RosterSalaryResponse = SalarySwishRoster & {
  team: string;
  checked: string;
  stale?: boolean;
};

export const salarySeasonLabel = (year: number, league = "") =>
  league === "baseball/mlb"
    ? String(year)
    : `${year}-${String(year + 1).slice(-2)}`;

export function salarySourceForYear(source: string, year: number): string {
  const url = new URL(source);
  if (url.hostname === "www.fangraphs.com")
    url.searchParams.set("season", String(year));
  return url.href;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function isSalaryMap(value: unknown): value is Record<string, number> {
  return (
    isRecord(value) &&
    Object.keys(value).length > 0 &&
    Object.entries(value).every(
      ([key, amount]) =>
        key.length > 0 &&
        typeof amount === "number" &&
        Number.isFinite(amount) &&
        amount > 0,
    )
  );
}

export function isRosterSalaryResponse(
  value: unknown,
): value is RosterSalaryResponse {
  return (
    isRecord(value) &&
    typeof value.team === "string" &&
    typeof value.checked === "string" &&
    Number.isFinite(Date.parse(value.checked)) &&
    typeof value.season === "string" &&
    /^\d{4}(?:-\d{2})?$/.test(value.season) &&
    (value.stale === undefined || typeof value.stale === "boolean") &&
    isSalaryMap(value.salaries)
  );
}

export function salaryPlayerNameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&amp;/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((part) => !["jr", "sr", "ii", "iii", "iv"].includes(part))
    .sort()
    .join(" ");
}

export function salaryForPlayer(
  salaries: Record<string, number>,
  playerName: string,
): number | undefined {
  const key = salaryPlayerNameKey(playerName);
  if (Object.hasOwn(salaries, key)) return salaries[key];
  const tokens = key.split(" ");
  if (tokens.length < 2) return undefined;
  const matches = Object.entries(salaries).filter(([candidate]) => {
    const candidateTokens = candidate.split(" ");
    return tokens.every((token) => candidateTokens.includes(token));
  });
  return matches.length === 1 ? matches[0][1] : undefined;
}

function plainText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => {
      const codePoint = Number.parseInt(hex, 16);
      return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : "";
    })
    .replace(/&#(\d+);/g, (_, decimal: string) => {
      const codePoint = Number.parseInt(decimal, 10);
      return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : "";
    })
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function headerCells(row: string): string[] {
  return [...row.matchAll(/<th\b[^>]*>([\s\S]*?)(?=<th\b|<\/tr>)/gi)].map(
    (match) => match[1],
  );
}

function salaryFromCell(cell: string): number | undefined {
  const salarySpan = [
    ...cell.matchAll(
      /<span\b[^>]*class=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/span>/gi,
    ),
  ].find((match) => match[2].split(/\s+/).includes("base_salary"));
  if (!salarySpan) return undefined;
  const amount = Number(plainText(salarySpan[3]).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : undefined;
}

export function parseSalarySwishRoster(
  html: string,
  seasonYear: number,
): SalarySwishRoster {
  const season = salarySeasonLabel(seasonYear);
  const salaries = new Map<string, number>();
  const ambiguousNames = new Set<string>();
  const tables = [...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)];

  for (const tableMatch of tables) {
    const rows = [...tableMatch[0].matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)].map(
      (match) => match[0],
    );
    const headerIndex = rows.findIndex((row) =>
      headerCells(row).some((cell) => plainText(cell) === season),
    );
    if (headerIndex < 0) continue;

    const seasonIndex = headerCells(rows[headerIndex]).findIndex(
      (cell) => plainText(cell) === season,
    );
    for (const row of rows.slice(headerIndex + 1)) {
      const player = row.match(
        /<a\b[^>]*href=["']\/players\/[^"']+["'][^>]*>([\s\S]*?)<\/a>/i,
      );
      if (!player) continue;
      const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(
        (match) => match[1],
      );
      const salary = cells[seasonIndex]
        ? salaryFromCell(cells[seasonIndex])
        : undefined;
      const nameKey = salaryPlayerNameKey(plainText(player[1]));
      if (!salary || !nameKey || ambiguousNames.has(nameKey)) continue;
      if (salaries.has(nameKey)) {
        salaries.delete(nameKey);
        ambiguousNames.add(nameKey);
        continue;
      }
      salaries.set(nameKey, salary);
    }
  }

  if (!salaries.size)
    throw new Error(`SalarySwish roster has no ${season} base salaries`);
  return { season, salaries: Object.fromEntries(salaries) };
}
