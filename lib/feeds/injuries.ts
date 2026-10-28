// Normalizes ESPN injury reports into the shared game injury shape for one team.
import type { Game } from "./feed-types";

type ESPNInjury = {
  athlete?: {
    displayName?: string;
    fullName?: string;
    team?: { displayName?: string; name?: string };
  };
  status?: string;
  type?: string;
  details?: { detail?: string; type?: string };
  longComment?: string;
  team?: { displayName?: string; name?: string };
};

export type ESPNInjuryGroup = ESPNInjury & {
  injuries?: ESPNInjury[];
  displayName?: string;
};

export type PremierLeagueInjuryPromo = {
  id: number;
  title?: string;
  description?: string;
};

export type PremierLeagueInjuryPlaylist = {
  items?: { id: number; type?: string }[];
  coverItem?: PremierLeagueInjuryPromo;
};

export function normalizeESPNInjuries(
  groups: ESPNInjuryGroup[],
  teamName: string,
): NonNullable<Game["injuries"]> {
  return groups
    .flatMap((group) =>
      group.injuries
        ? group.injuries.map((injury) => ({
            ...injury,
            team: group.team || { displayName: group.displayName },
          }))
        : [group],
    )
    .map((item) => ({
      player:
        item.athlete?.displayName || item.athlete?.fullName || "Unknown player",
      status: item.status || item.type || "Unavailable",
      detail:
        item.details?.detail ||
        item.details?.type ||
        item.longComment ||
        undefined,
      team:
        item.team?.displayName ||
        item.team?.name ||
        item.athlete?.team?.displayName ||
        item.athlete?.team?.name ||
        teamName,
    }))
    .filter((item) => item.player);
}

export function parseMLSAvailabilityReport(
  html: string,
  teamName: string,
): NonNullable<Game["injuries"]> {
  const lines = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<(?:br\b[^>]*|\/(?:p|li|h[1-6]|div|section|article|tr|td))>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(x[\da-f]+|\d+);/gi, (_, code: string) => {
      const hex = /^x/i.test(code);
      const value = Number.parseInt(code.replace(/^x/i, ""), hex ? 16 : 10);
      return value <= 0x10ffff ? String.fromCodePoint(value) : "";
    })
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const target = normalize(teamName);
  const headingIndex = lines.findIndex((line) => {
    const heading = normalize(line);
    return (
      heading === target ||
      heading.startsWith(target + " ") ||
      heading.endsWith(" " + target) ||
      target.startsWith(heading + " ")
    );
  });
  if (headingIndex < 0) throw new Error("MLS availability team not found");

  const injuries: NonNullable<Game["injuries"]> = [];
  for (const line of lines.slice(headingIndex + 1)) {
    const entry = line.match(
      /^[•·-]?\s*(OUT|QUESTIONABLE|DOUBTFUL|SUSPENDED|INTERNATIONAL DUTY)\s*:\s*(.+)$/i,
    );
    if (!entry) break;
    const detail = entry[2].match(/^(.+?)\s*\(([^()]*)\)$/);
    injuries.push({
      player: (detail?.[1] || entry[2]).trim(),
      status: entry[1],
      detail: detail?.[2],
      team: teamName,
    });
  }
  return injuries;
}

export function normalizePremierLeagueInjuries(
  playlist: PremierLeagueInjuryPlaylist,
  promos: PremierLeagueInjuryPromo[],
  teamName: string,
): NonNullable<Game["injuries"]> {
  const promosById = new Map<number, PremierLeagueInjuryPromo>();
  if (playlist.coverItem) promosById.set(playlist.coverItem.id, playlist.coverItem);
  for (const promo of promos) promosById.set(promo.id, promo);

  return (playlist.items || []).flatMap((item) => {
    const promo = promosById.get(item.id);
    if (!promo?.title) return [];
    const description = promo.description?.trim();
    return [
      {
        player: promo.title,
        status: "Injured",
        detail:
          description && !["-", "–", "—"].includes(description)
            ? description
            : undefined,
        team: teamName,
      },
    ];
  });
}
