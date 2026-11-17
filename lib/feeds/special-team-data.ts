// Parses PWHL rosters, standings, and schedules.
import type { Game } from "./feed-types";
import type { Depth, Table } from "../team-info/index";
import type { RosterDetails } from "../team-info/roster-details";
import { frostProviders } from "../teams/frost/providers.ts";

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([\da-f]+);/gi, (_, n) =>
      String.fromCodePoint(parseInt(n, 16)),
    )
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
const stripNonContent = (s: string) =>
  s
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ");
const plain = (s: string) =>
  decode(stripNonContent(s).replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
const links = (html: string) =>
  [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((m) => ({
    text: plain(m[2]),
    href: decode(m[1].match(/\bhref=["']([^"']+)["']/i)?.[1] || ""),
    index: m.index || 0,
  }));
const absolute = (href: string, origin: string) => {
  try {
    const u = new URL(href, origin);
    return u.protocol === "https:" ? u.href : "";
  } catch {
    return "";
  }
};

function ageFromText(value: string, checked: string): RosterDetails {
  const birth = value.match(/\b(19\d{2}|20\d{2})-(\d{2})-(\d{2})\b/);
  if (!birth) return {};
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(checked));
  const age =
    Number(today.slice(0, 4)) -
    Number(birth[1]) -
    (today.slice(5) < `${birth[2]}-${birth[3]}` ? 1 : 0);
  return age >= 15 && age < 100 ? { age } : {};
}

const pwhlTeams = [
  "Minnesota Frost",
  "Boston Fleet",
  "Toronto Sceptres",
  "Montréal Victoire",
  "Montreal Victoire",
  "Ottawa Charge",
  "New York Sirens",
  "Seattle Torrent",
  "Vancouver Goldeneyes",
  "PWHL Detroit",
  "PWHL Hamilton",
  "PWHL Las Vegas",
  "PWHL San Jose",
];
export function parsePwhlRoster(
  payload: unknown,
  checked: string,
): Depth | undefined {
  if (
    !isRecord(payload) ||
    payload.teamName !== "Minnesota Frost" ||
    !Array.isArray(payload.roster)
  )
    return;

  const sections = payload.roster.flatMap((teamRoster) =>
    isRecord(teamRoster) && Array.isArray(teamRoster.sections)
      ? teamRoster.sections.filter(isRecord)
      : [],
  );
  const groups = sections.flatMap((section) => {
    if (
      typeof section.title !== "string" ||
      !Array.isArray(section.data) ||
      section.title === "Coaches"
    )
      return [];
    const players = section.data.flatMap((entry) => {
      if (!isRecord(entry) || !isRecord(entry.row)) return [];
      const row = entry.row;
      const name = typeof row.name === "string" ? row.name.trim() : "";
      if (!name) return [];
      const playerProperties =
        isRecord(entry.prop) && isRecord(entry.prop.name)
          ? entry.prop.name
          : undefined;
      const playerId =
        (typeof playerProperties?.playerLink === "string" &&
        /^\d+$/.test(playerProperties.playerLink)
          ? playerProperties.playerLink
          : undefined) ||
        (typeof row.player_id === "string" && /^\d+$/.test(row.player_id)
          ? row.player_id
          : undefined);
      return [
        {
          name,
          url: playerId
            ? `https://www.thepwhl.com/en/stats/player/${playerId}`
            : frostProviders.urls.roster,
          ...ageFromText(
            typeof row.birthdate === "string" ? row.birthdate : "",
            checked,
          ),
        },
      ];
    });
    if (!players.length) return [];
    return [
      {
        position: section.title === "Goalies" ? "Goaltenders" : section.title,
        players,
      },
    ];
  });
  if (!groups.length) return;

  const seasonName =
    typeof payload.seasonName === "string"
      ? payload.seasonName
      : "current season";
  return {
    label: "Roster",
    groups,
    source: "PWHL official roster",
    url: frostProviders.urls.roster,
    checked,
    note: `${seasonName} · checked ${checked.slice(0, 10)}.`,
  };
}

const pwhlStandingsUrl = "https://www.thepwhl.com/en/stats/standings";

type JsonRecord = Record<string, unknown>;
const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function parseCallbackJson(input: string): unknown {
  const start = input.indexOf("(");
  const end = input.lastIndexOf(")");
  if (start < 0 || end <= start) return;
  try {
    return JSON.parse(input.slice(start + 1, end));
  } catch {
    return;
  }
}

export function parsePwhlStandings(
  response: string,
  checked: string,
  seasonName = "current season",
): Table | undefined {
  const payload = parseCallbackJson(response);
  const firstPayload = Array.isArray(payload) ? payload[0] : payload;
  const sections = isRecord(firstPayload) ? firstPayload.sections : undefined;
  if (!Array.isArray(sections)) return;
  const entries = sections.flatMap((section: unknown) =>
    isRecord(section) && Array.isArray(section.data)
      ? section.data.filter(isRecord)
      : [],
  );
  const standings = entries.flatMap((entry) => {
    const row = isRecord(entry.row) ? entry.row : entry;
    const name = String(row?.name || row?.team_name || "").trim();
    const rank = row?.rank ?? row?.overall_rank;
    if (!name || !/^\d+$/.test(String(rank))) return [];
    const value = (key: string) => {
      const result = row[key];
      return result === undefined || result === null || result === ""
        ? "—"
        : String(result);
    };
    const id = name
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return [
      {
        id,
        name,
        url: pwhlStandingsUrl,
        highlight: /minnesota frost/i.test(name),
        cells: [
          String(rank),
          value("games_played"),
          value("games_remaining"),
          value("points"),
          value("regulation_wins"),
          value("non_reg_wins"),
          value("non_reg_losses"),
          value("losses"),
          value("percentage"),
          value("goals_for"),
          value("goals_against"),
        ],
      },
    ];
  });
  if (standings.length < 8 || !standings.some((row) => row.highlight)) return;
  return {
    name: `PWHL · ${seasonName} standings`,
    columns: [
      "#",
      "GP",
      "GR",
      "PTS",
      "W",
      "OTW",
      "OTL",
      "L",
      "PCT",
      "GF",
      "GA",
    ],
    rows: standings,
    source: "PWHL official standings",
    url: pwhlStandingsUrl,
    checked,
    seasonType: /pre.?season/i.test(seasonName) ? 1 : 2,
    note: `${seasonName} standings · checked ${checked.slice(0, 10)}.`,
  };
}

function easternOffset(year: number, month: number, day: number): string {
  const instant = new Date(Date.UTC(year, month - 1, day, 12));
  const zone =
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      timeZoneName: "shortOffset",
    })
      .formatToParts(instant)
      .find((p) => p.type === "timeZoneName")?.value || "GMT-5";
  const match = zone.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  return match
    ? `${match[1]}${match[2].padStart(2, "0")}:${match[3] || "00"}`
    : "-05:00";
}

function dateTimeFromText(
  value: string,
  checked: string,
): { date: string; dateOnly: boolean } | undefined {
  const iso = value.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  const monthMap: Record<string, number> = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  };
  let year: number, month: number, day: number;
  if (iso)
    [, year, month, day] = [
      iso[0],
      Number(iso[1]),
      Number(iso[2]),
      Number(iso[3]),
    ];
  else {
    const m = value.match(
      /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2})(?:,?\s+(20\d{2}))?/i,
    );
    if (!m) return;
    month = monthMap[m[1].slice(0, 3).toLowerCase()];
    day = Number(m[2]);
    const current = Number(checked.slice(0, 4));
    const todayMonth = Number(checked.slice(5, 7));
    year = m[3] ? Number(m[3]) : month < todayMonth - 2 ? current + 1 : current;
  }
  const time = value.match(
    /\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\s*(?:ET|EST|EDT)?\b/i,
  );
  if (!time)
    return {
      date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00${easternOffset(year, month, day)}`,
      dateOnly: true,
    };
  let hour = Number(time[1]) % 12;
  if (/p/i.test(time[3])) hour += 12;
  const minute = Number(time[2] || 0);
  return {
    date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00${easternOffset(year, month, day)}`,
    dateOnly: false,
  };
}

export function parsePwhlSchedule(
  html: string,
  checked: string,
  sourceUrl: string = frostProviders.urls.schedule,
): Game[] {
  const output = new Map<string, Game>();
  const candidates = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) => ({
    html: match[1],
    text: plain(match[1]),
    href: links(match[1]).find((a) => /game|schedule|match/i.test(a.href))?.href,
    index: match.index || 0,
  }));
  for (const anchor of links(html)) {
    if (
      /Minnesota Frost/i.test(anchor.text) &&
      /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2}\b/i.test(
        anchor.text,
      )
    ) {
      candidates.push({
        html: anchor.text,
        text: anchor.text,
        href: anchor.href,
        index: anchor.index,
      });
    }
  }
  for (const candidate of candidates) {
    const text = candidate.text;
    if (!/Minnesota Frost|\bMinnesota\b/i.test(text)) continue;
    const dateTime = dateTimeFromText(text, checked);
    if (!dateTime) continue;
    const clubs = [...pwhlTeams]
      .sort((a, b) => b.length - a.length)
      .filter((name) =>
        new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(text),
      );
    if (!clubs.some((x) => /Minnesota/i.test(x))) clubs.push("Minnesota Frost");
    const other = clubs.find((x) => !/Minnesota/i.test(x));
    if (!other) continue;
    const frostIndex = text.search(/Minnesota Frost|\bMinnesota\b/i);
    const otherIndex = text.toLowerCase().indexOf(other.toLowerCase());
    const frostHome = otherIndex < frostIndex;
    const home = frostHome ? "Minnesota Frost" : other;
    const away = frostHome ? other : "Minnesota Frost";
    const score = text.match(/\b(\d{1,2})\s*[-–]\s*(\d{1,2})\b/);
    const hasResult =
      Boolean(score) && Date.parse(dateTime.date) < Date.parse(checked);
    const firstScore = score?.[1] || "";
    const secondScore = score?.[2] || "";
    const homeScore = hasResult ? (frostHome ? firstScore : secondScore) : "";
    const awayScore = hasResult ? (frostHome ? secondScore : firstScore) : "";
    const timeMarker = text.match(
      /\b\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)(?:\s*(?:ET|EST|EDT))?\b/i,
    );
    const afterTime = timeMarker
      ? text.slice((timeMarker.index || 0) + timeMarker[0].length)
      : text;
    const venue =
      afterTime
        .match(
          /([A-Z][^|\n]*(?:Arena|Center|Centre|Coliseum|Place Bell|TBA)(?:\s*\|\s*[^|\n]+)?)/i,
        )?.[1]
        ?.trim() || "";
    const broadcast =
      text
        .match(/(?:TV|Radio|Broadcast|Watch)\s*[:·-]\s*([^|\n]+)/i)?.[1]
        ?.trim() || "";
    const eventUrl =
      absolute(candidate.href || "", new URL(sourceUrl).origin) || sourceUrl;
    const earlierScheduleText = plain(html.slice(0, candidate.index));
    const seasonMarkers = [
      ...earlierScheduleText.matchAll(/\b(pre[- ]?season|regular season)\b/gi),
    ];
    const sectionLabel = seasonMarkers.at(-1)?.[1] || "";
    const competitionNote =
      /pre[- ]?season/i.test(text) || /pre[- ]?season/i.test(sectionLabel)
        ? "Preseason"
        : undefined;
    const id = `pwhl-frost-${dateTime.date.slice(0, 10)}-${other.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    output.set(id, {
      id,
      team: "frost",
      name: `${away} at ${home}`,
      date: dateTime.date,
      dateOnly: dateTime.dateOnly,
      status: hasResult ? "Final" : "Scheduled",
      state: Date.parse(dateTime.date) > Date.parse(checked) ? "pre" : "post",
      league: "hockey/pwhl",
      competitionNote,
      venue,
      broadcast,
      url: eventUrl,
      sourceName: "PWHL official schedule",
      sourceChecked: checked,
      competitors: [
        {
          name: away,
          score: awayScore,
          winner: hasResult && Number(awayScore) > Number(homeScore),
          homeAway: "away",
        },
        {
          name: home,
          score: homeScore,
          winner: hasResult && Number(homeScore) > Number(awayScore),
          homeAway: "home",
        },
      ],
    });
  }
  return [...output.values()].sort(
    (a, b) => Date.parse(a.date) - Date.parse(b.date),
  );
}
