import { salaryPlayerNameKey, type SalarySwishRoster } from "./salaryswish.ts";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function parseFanGraphsRoster(
  html: string,
  seasonYear: number,
): SalarySwishRoster {
  const embedded = html.match(
    /<script\b[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  if (!embedded) throw new Error("FanGraphs contract data is unavailable");
  const payload: unknown = JSON.parse(embedded[1]);
  const props = isRecord(payload) ? payload.props : undefined;
  const pageProps = isRecord(props) ? props.pageProps : undefined;
  const dehydrated = isRecord(pageProps)
    ? pageProps.dehydratedState
    : undefined;
  const queries = isRecord(dehydrated) ? dehydrated.queries : undefined;
  if (!Array.isArray(queries))
    throw new Error("Invalid FanGraphs contract data");

  const salaries = new Map<string, number>();
  const ambiguous = new Set<string>();
  for (const query of queries.filter(isRecord)) {
    if (
      !Array.isArray(query.queryKey) ||
      !isRecord(query.queryKey[1]) ||
      query.queryKey[1].season !== seasonYear
    )
      continue;
    const state = query.state;
    const data = isRecord(state) ? state.data : undefined;
    const contracts = isRecord(data) ? data.dataContract : undefined;
    if (!Array.isArray(contracts)) continue;
    for (const contract of contracts.filter(isRecord)) {
      const summary = contract.contractSummary;
      if (
        !isRecord(summary) ||
        typeof summary.playerName !== "string" ||
        summary.isEstimate === 1 ||
        !Array.isArray(contract.contractYears)
      )
        continue;
      const years = contract.contractYears.filter(
        (year: unknown): year is Record<string, unknown> =>
          isRecord(year) && year.Season === seasonYear,
      );
      if (years.length !== 1) continue;
      const year = years[0];
      const amount = year.Salary;
      if (
        year.isEstimate !== 0 ||
        !["GUARANTEED", "PRE-ARB", "NOT 40 MAN"].includes(String(year.Type)) ||
        typeof amount !== "number" ||
        !Number.isFinite(amount) ||
        amount <= 0
      )
        continue;
      const key = salaryPlayerNameKey(summary.playerName);
      if (!key || ambiguous.has(key)) continue;
      if (salaries.has(key) && salaries.get(key) !== amount) {
        salaries.delete(key);
        ambiguous.add(key);
      } else {
        salaries.set(key, amount);
      }
    }
  }
  if (!salaries.size)
    throw new Error(`FanGraphs roster has no ${seasonYear} published salaries`);
  return { season: String(seasonYear), salaries: Object.fromEntries(salaries) };
}
