import {
  salaryPlayerNameKey,
  salarySeasonLabel,
  type SalarySwishRoster,
} from "./salaryswish.ts";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function playersIn(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(playersIn);
  if (!isRecord(value)) return [];
  if (typeof value.name === "string" && Array.isArray(value.contracts))
    return [value];
  return Object.values(value).flatMap(playersIn);
}

export function parseCapWagesRoster(
  html: string,
  seasonYear: number,
): SalarySwishRoster {
  const embedded = html.match(
    /<script\b[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  if (!embedded) throw new Error("CapWages contract data is unavailable");
  const payload: unknown = JSON.parse(embedded[1]);
  const props = isRecord(payload) ? payload.props : undefined;
  const pageProps = isRecord(props) ? props.pageProps : undefined;
  const data = isRecord(pageProps) ? pageProps.data : undefined;
  if (!isRecord(data)) throw new Error("Invalid CapWages contract data");

  const season = salarySeasonLabel(seasonYear);
  const salaries = new Map<string, number>();
  const ambiguous = new Set<string>();
  for (const player of [
    ...playersIn(data.roster),
    ...playersIn(data.inactive),
    ...playersIn(data["non-roster"]),
  ]) {
    if (typeof player.name !== "string" || !Array.isArray(player.contracts))
      continue;
    const details = player.contracts.flatMap((contract: unknown) =>
      isRecord(contract) && Array.isArray(contract.details)
        ? contract.details.filter(isRecord)
        : [],
    );
    const current = details.filter((detail) => detail.season === season);
    if (current.length !== 1) continue;
    // Total annual cash includes signing bonuses, unlike cap hit or AAV.
    const raw = current[0].totalSalary;
    if (typeof raw !== "string" || !/^\$[\d,]+$/.test(raw)) continue;
    const amount = Number(raw.replace(/[$,]/g, ""));
    const key = salaryPlayerNameKey(player.name);
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
    throw new Error(`CapWages roster has no ${season} annual salaries`);
  return { season, salaries: Object.fromEntries(salaries) };
}
