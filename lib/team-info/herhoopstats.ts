import {
  plainText,
  salaryPlayerNameKey,
  type SalarySwishRoster,
} from "./salaryswish.ts";

const isMinnesotaLynxPage = (html: string) =>
  [...html.matchAll(/<meta\b[^>]*>/gi)].some((match) => {
    const tag = match[0];
    if (!/\bproperty=["']og:title["']/i.test(tag)) return false;
    const title = tag.match(/\bcontent=["']([^"']+)["']/i)?.[1];
    return plainText(title || "") === "Minnesota Lynx WNBA Salary Cap Sheet";
  });

export function parseHerHoopStatsRoster(
  html: string,
  seasonYear: number,
): SalarySwishRoster {
  if (!isMinnesotaLynxPage(html))
    throw new Error(
      "Her Hoop Stats Minnesota Lynx salary sheet is unavailable",
    );

  const table = [...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)].find(
    (match) => /\bsalary_player_name\b/i.test(match[0]),
  );
  if (!table)
    throw new Error("Her Hoop Stats Lynx salary table is unavailable");

  const rows = [...table[0].matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)].map(
    (match) => match[0],
  );
  const header = rows.find((row) => /<th\b/i.test(row));
  if (!header)
    throw new Error("Her Hoop Stats Lynx salary table has no season headers");

  const headers = [...header.matchAll(/<th\b[^>]*>[\s\S]*?<\/th>/gi)].map(
    (match) => match[0],
  );
  const yearIndex = headers.findIndex((cell) => {
    const year = cell.match(
      /<span\b[^>]*class=["'][^"']*\bsalary_year\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
    )?.[1];
    return year !== undefined && plainText(year) === String(seasonYear);
  });
  if (yearIndex < 0)
    throw new Error(
      `Her Hoop Stats Lynx salary sheet has no ${seasonYear} data`,
    );

  const salaries = new Map<string, number>();
  const ambiguousNames = new Set<string>();
  for (const row of rows.slice(rows.indexOf(header) + 1)) {
    const cells = [...row.matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/gi)];
    const nameCell = cells[0]?.[2];
    const salaryCell = cells[yearIndex];
    if (!nameCell || !salaryCell || !/\bsalary_cap_hit\b/i.test(salaryCell[1]))
      continue;

    const name = nameCell.match(/<a\b[^>]*>([\s\S]*?)<\/a>/i)?.[1];
    const salaryText = salaryCell[2].match(
      /<span\b[^>]*class=["'][^"']*\bsalary_mode_salary\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
    )?.[1];
    const key = salaryPlayerNameKey(plainText(name || ""));
    const amount = Number(plainText(salaryText || "").replace(/[^0-9.-]/g, ""));
    if (
      !key ||
      !salaryText ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      ambiguousNames.has(key)
    )
      continue;

    if (salaries.has(key) && salaries.get(key) !== amount) {
      salaries.delete(key);
      ambiguousNames.add(key);
    } else {
      salaries.set(key, amount);
    }
  }

  if (!salaries.size)
    throw new Error(`Her Hoop Stats Lynx sheet has no ${seasonYear} salaries`);
  return { season: String(seasonYear), salaries: Object.fromEntries(salaries) };
}
