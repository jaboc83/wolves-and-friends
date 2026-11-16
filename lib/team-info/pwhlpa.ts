import {
  plainText,
  salaryPlayerNameKey,
  salarySeasonLabel,
  type SalarySwishRoster,
} from "./salaryswish.ts";

export function parsePwhlpaRoster(
  html: string | readonly string[],
  seasonYear: number,
): SalarySwishRoster {
  const pages = typeof html === "string" ? [html] : html;
  const season = salarySeasonLabel(seasonYear);
  const guideHeader = plainText(pages.join(" ")).match(
    /(\d{4}-\d{2})\s+SALARY\s*\(USD\)/i,
  );
  if (!guideHeader || guideHeader[1] !== season)
    throw new Error(`PWHLPA salary guide has no ${season} USD salaries`);

  const salaries = new Map<string, number>();
  const ambiguous = new Set<string>();
  for (const page of pages) {
    const rowStarts = [
      ...page.matchAll(
        /<div\b(?=[^>]*\brole=["']listitem["'])(?=[^>]*\bclass=["'][^"']*\bw-dyn-item\b)[^>]*>/gi,
      ),
    ];
    for (let index = 0; index < rowStarts.length; index += 1) {
      const start = rowStarts[index].index;
      const end = rowStarts[index + 1]?.index ?? page.length;
      const row = page.slice(start, end);
      const field = (name: string) =>
        row.match(
          new RegExp(
            `<div\\b[^>]*\\bfs-list-field=["']${name}["'][^>]*>([\\s\\S]*?)<\\/div>`,
            "i",
          ),
        )?.[1];
      if (plainText(field("team") || "") !== "Minnesota") continue;
      const firstName = plainText(field("name") || "");
      const lastName = plainText(field("last-name") || "");
      const rawAmount = row.match(
        /<div\b[^>]*\bclass=["'][^"']*\bprice-item\b[^"']*["'][^>]*>([\d,]+(?:\.\d{1,2})?)<\/div>/i,
      )?.[1];
      if (!firstName || !lastName || !rawAmount) continue;

      const amount = Number(rawAmount.replace(/,/g, ""));
      const key = salaryPlayerNameKey(`${firstName} ${lastName}`);
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
    throw new Error(`PWHLPA salary guide has no ${season} Minnesota salaries`);
  return { season, salaries: Object.fromEntries(salaries) };
}
