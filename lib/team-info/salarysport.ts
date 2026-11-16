import {
  plainText,
  salaryPlayerNameKey,
  salarySeasonLabel,
  type SalarySwishRoster,
} from "./salaryswish.ts";

export function parseSalarySportRoster(
  html: string,
  seasonYear: number,
): SalarySwishRoster {
  if (!/<html\b[^>]*\bdata-page-currency=["']GBP["']/i.test(html))
    throw new Error("SalarySport GBP wage data is unavailable");

  const season = salarySeasonLabel(seasonYear);
  const seasonPattern = new RegExp(`\\b${season.replace("-", "/")}\\b`);
  const salaries = new Map<string, number>();
  const ambiguous = new Set<string>();

  for (const [table] of html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)) {
    if (!/<table\b[^>]*\bdata-squad-table\b/i.test(table)) continue;
    const caption = table.match(/<caption\b[^>]*>([\s\S]*?)<\/caption>/i);
    if (!caption || !seasonPattern.test(plainText(caption[1]))) continue;

    for (const [row] of table.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)) {
      const attributes = row.slice(0, row.indexOf(">") + 1);
      const name = attributes.match(/\bdata-name=(["'])(.*?)\1/i)?.[2];
      const raw = attributes.match(/\bdata-yearly=(["'])(.*?)\1/i)?.[2];
      if (!name || !raw || !/^\d+(?:\.\d{1,2})?$/.test(raw)) continue;
      const amount = Number(raw);
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
  }

  if (!salaries.size)
    throw new Error(`SalarySport roster has no ${season} annual wages`);
  return { season, salaries: Object.fromEntries(salaries) };
}
