import {
  plainText,
  salaryPlayerNameKey,
  type SalarySwishRoster,
} from "./salaryswish.ts";

export function parseSpotracRoster(
  html: string,
  seasonYear: number,
): SalarySwishRoster {
  if (!/Minnesota Lynx/i.test(plainText(html)))
    throw new Error("Spotrac Minnesota Lynx salary data is unavailable");

  const table = [...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)].find(
    (match) => /\bid=["']dataTable-active["']/i.test(match[0]),
  );
  if (!table)
    throw new Error("Spotrac active roster salary data is unavailable");

  const rows = [...table[0].matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)].map(
    (match) => match[0],
  );
  const headers = [...rows[0].matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map(
    (match) => plainText(match[1]),
  );
  const season = String(seasonYear);
  const salaryIndex = headers.indexOf(season);
  if (salaryIndex < 0)
    throw new Error(`Spotrac active roster has no ${season} salaries`);

  const salaries = new Map<string, number>();
  const ambiguous = new Set<string>();
  for (const row of rows.slice(1)) {
    const cells = [...row.matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/gi)];
    const nameCell = cells[0];
    const salaryCell = cells[salaryIndex];
    const name =
      nameCell?.[1].match(/\bdata-export=["']([^"']+)["']/i)?.[1] ||
      nameCell?.[2].match(/<a\b[^>]*>([\s\S]*?)<\/a>/i)?.[1];
    const rawAmount = salaryCell?.[1].match(
      /\bdata-export=["'](\d+)["']/i,
    )?.[1];
    if (!name || !rawAmount) continue;

    const amount = Number(rawAmount);
    const key = salaryPlayerNameKey(plainText(name));
    if (!key || !Number.isFinite(amount) || amount <= 0 || ambiguous.has(key))
      continue;
    if (salaries.has(key) && salaries.get(key) !== amount) {
      salaries.delete(key);
      ambiguous.add(key);
    } else {
      salaries.set(key, amount);
    }
  }

  if (!salaries.size)
    throw new Error(`Spotrac active roster has no ${season} cash salaries`);
  return { season, salaries: Object.fromEntries(salaries) };
}
