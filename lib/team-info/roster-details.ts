// Derives safe roster details such as age from public athlete data.
import type { ESPNContract } from "./provider-types";

export type RosterDetails = {
  age?: number;
  annualSalary?: number;
  campTeam?: string;
  signedForSeason?: boolean;
  draftPick?: boolean;
};

export function highestPaidPlayers<T extends { annualSalary?: number }>(
  players: readonly T[],
): Set<T> {
  return new Set(
    players
      .filter(
        (player) =>
          player.annualSalary !== undefined &&
          Number.isFinite(player.annualSalary) &&
          player.annualSalary > 0,
      )
      .sort((a, b) => b.annualSalary! - a.annualSalary!)
      .slice(0, 5),
  );
}

export function rosterDetails(
  athlete: {
    dateOfBirth?: string;
    age?: number;
    contract?: ESPNContract;
    contracts?: ESPNContract[];
  },
  league: string,
  _season: string | number,
  checked: string,
  _team: string,
): RosterDetails {
  void _team;
  const birth = String(athlete.dateOfBirth || "").slice(0, 10),
    now = new Date(checked);
  let age: number | undefined;
  const hasValidBirthDate =
    /^\d{4}-\d{2}-\d{2}$/.test(birth) &&
    Number.isFinite(Date.parse(birth)) &&
    Number.isFinite(now.getTime());
  if (hasValidBirthDate) {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Chicago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    const calculatedAge =
      Number(today.slice(0, 4)) -
      Number(birth.slice(0, 4)) -
      (today.slice(5) < birth.slice(5) ? 1 : 0);
    if (calculatedAge >= 15 && calculatedAge < 100) age = calculatedAge;
  } else {
    const rosterAge = athlete.age;
    if (
      typeof rosterAge === "number" &&
      Number.isInteger(rosterAge) &&
      rosterAge >= 15 &&
      rosterAge < 100
    ) {
      age = rosterAge;
    }
  }
  const salaryYear = String(now.getUTCFullYear());
  const salaryFromSeasonContracts = athlete.contracts?.find(
    (contract) => String(contract.season?.year ?? "") === salaryYear,
  )?.salary;
  const salaryFromCurrentContract =
    String(athlete.contract?.season?.year ?? "") === salaryYear
      ? athlete.contract?.salary
      : undefined;
  const annualSalary =
    league === "basketball/nba"
      ? undefined
      : Number(salaryFromSeasonContracts ?? salaryFromCurrentContract);
  return {
    ...(age !== undefined ? { age } : {}),
    ...(annualSalary !== undefined &&
    Number.isFinite(annualSalary) &&
    annualSalary > 0
      ? { annualSalary }
      : {}),
  };
}
