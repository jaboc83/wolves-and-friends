// Parses specialist league data: Žalgiris, EuroLeague, LKL, and PWHL rosters/tables.
import type { Game } from "./feed-types";
import type { Depth, Table } from "../team-info/index";
import type { RosterDetails } from "../team-info/roster-details";
import { zalgirisProviders } from "../teams/zalgiris/providers";
import { frostProviders } from "../teams/frost/providers";

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
const rows = (html: string) =>
  [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => m[1]);
const cells = (html: string) =>
  [...html.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) =>
    plain(m[1]),
  );
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

const euroNames: Record<string, string> = {
  PAO: "Panathinaikos AKTOR Athens",
  OLY: "Olympiacos Piraeus",
  FBB: "Fenerbahce Beko Istanbul",
  VBC: "Valencia Basket",
  HTA: "Hapoel IBI Tel Aviv",
  CZV: "Crvena Zvezda Meridianbet Belgrade",
  VIR: "Virtus Bologna",
  DUB: "Dubai Basketball",
  BAR: "FC Barcelona",
  RBM: "Real Madrid",
  PAR: "Paris Basketball",
  BJK: "Besiktas GAIN Istanbul",
  ASV: "LDLC ASVEL Villeurbanne",
  BAY: "FC Bayern Munich",
  EFS: "Anadolu Efes Istanbul",
  MTA: "Maccabi Rapyd Tel Aviv",
  ZAL: "Žalgiris Kaunas",
  BKN: "Baskonia",
  PBB: "Partizan Mozzart Bet Belgrade",
  EA7: "Olimpia Milano",
};

export function parseEuroLeagueStandings(
  html: string,
  checked: string,
): Table | undefined {
  const eurohoops = rows(html).filter((row) =>
    /bapro-standings__name/.test(row),
  );
  const euroRows = eurohoops.flatMap((row) => {
    const name = plain(
      row.match(
        /<span\b[^>]*class=["']bapro-standings__name["'][^>]*>([\s\S]*?)<\/span>/i,
      )?.[1] || "",
    );
    const rank = plain(
      row.match(
        /<span\b[^>]*class=["']bapro-standings__pos["'][^>]*>([\s\S]*?)<\/span>/i,
      )?.[1] || "",
    );
    const values = cells(row);
    if (
      !name ||
      !/^\d{1,2}$/.test(rank) ||
      values.length < 8 ||
      !/^\d+$/.test(values[2]) ||
      !/^\d+$/.test(values[3])
    )
      return [];
    const code =
      Object.keys(euroNames).find(
        (key) => euroNames[key].toLowerCase() === name.toLowerCase(),
      ) || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return [
      {
        id: code,
        name,
        url: "https://www.eurohoops.net/euroleague-standings/",
        highlight: /zalgiris|žalgiris/i.test(name),
        cells: [rank, values[2], values[3], values[7]],
      },
    ];
  });
  if (euroRows.length >= 10 && euroRows.some((row) => row.highlight))
    return {
      name: "EuroLeague · regular season",
      columns: ["#", "W", "L", "+/−"],
      rows: euroRows,
      source: "Eurohoops standings",
      url: "https://www.eurohoops.net/euroleague-standings/",
      checked,
      seasonType: 2,
      note: `Regular-season standings · checked ${checked.slice(0, 10)}. Tie-break information remains with the source.`,
    };
  const candidates = [
    ...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi),
  ].map((m) => m[0]);
  const table = candidates.find(
    (candidate) =>
      /\bZAL\b/i.test(plain(candidate)) &&
      rows(candidate).some((row) =>
        links(row).some((a) => a.text.toUpperCase() === "ZAL"),
      ),
  );
  if (!table) return;
  const parsed = rows(table).flatMap((row) => {
    const values = cells(row);
    const teamLink = links(row).find((a) => euroNames[a.text.toUpperCase()]);
    if (!teamLink || values.length < 5) return [];
    const rank = values.find((v, i) => i === 0 && /^\d{1,2}$/.test(v));
    const code = teamLink.text.toUpperCase();
    if (!rank || !code) return [];
    const index = values.findIndex((v) => v === teamLink.text);
    const tail = values.slice(index + 1);
    const stats = tail.filter((v) => /^[+-]?\d+(?:\.\d+)?$/.test(v));
    if (stats.length < 3) return [];
    const teamHref = absolute(
      teamLink.href,
      "https://euroleague-standings.com",
    );
    return [
      {
        id: code,
        name: euroNames[code],
        url:
          teamHref ||
          "https://www.euroleaguebasketball.net/en/euroleague/standings/",
        highlight: code === "ZAL",
        cells: [rank, stats[0], stats[1], stats[2]],
      },
    ];
  });
  if (!parsed.length) return;
  const season =
    plain(html)
      .match(/20\d{2}\s*\/\s*\d{2}/)?.[0]
      .replace(/\s/g, "") || "current season";
  return {
    name: `EuroLeague · ${season} regular season`,
    columns: ["#", "W", "L", "+/−"],
    rows: parsed,
    source: "EuroLeague standings · euroleague-standings.com",
    url: "https://euroleague-standings.com/",
    checked,
    seasonType: 2,
    note: `Regular-season standings · checked ${checked.slice(0, 10)}. Tie-break information remains with the source.`,
  };
}

const lklStandingsUrl = "https://en.lkl.lt/turnyrine-lentele";

export function parseLklStandings(
  html: string,
  checked: string,
): Table | undefined {
  const standings = rows(html).flatMap((row) => {
    const values = cells(row);
    if (values.length < 6) return [];
    const rank = values[0].replace(/\.$/, "");
    const teamLink = links(row).find((link) =>
      /žalgiris|zalgiris/i.test(link.text),
    );
    const name = teamLink?.text || values[1] || "";
    if (!/^\d{1,2}$/.test(rank) || !name) return [];
    const numbers = (value: string) =>
      [...value.matchAll(/-?\d+(?:[.,]\d+)?/g)].map((match) =>
        match[0].replace(",", "."),
      );
    const ppg = numbers(values.slice(6).join(" "));
    if (ppg.length < 2) return [];
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return [
      {
        id: slug,
        name,
        url: lklStandingsUrl,
        highlight: /žalgiris|zalgiris/i.test(name),
        cells: [
          rank,
          values[2],
          values[3],
          values[4],
          values[5],
          ppg[0],
          ppg[1],
        ],
      },
    ];
  });
  if (standings.length < 8 || !standings.some((row) => row.highlight)) return;
  const season =
    plain(html)
      .match(/20\d{2}\s*[/–-]\s*\d{2,4}/)?.[0]
      .replace(/\s/g, "") || "current season";
  return {
    name: `LKL · ${season}`,
    columns: ["#", "G", "W", "L", "Win%", "PPG", "OPPG"],
    rows: standings,
    source: "LKL official standings",
    url: lklStandingsUrl,
    checked,
    seasonType: 2,
    note: `Regular-season standings · checked ${checked.slice(0, 10)}.`,
  };
}

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

function rosterFromRows(
  html: string,
  checked: string,
  origin: string,
  sourceName: string,
  sourceUrl: string,
): Depth | undefined {
  const groups = new Map<
    string,
    ({ name: string; url: string } & RosterDetails)[]
  >();
  for (const row of rows(html)) {
    const values = cells(row);
    const rowText = plain(row);
    const player = links(row).find(
      (a) =>
        /\/player(?:\/|\?|$)|\/athlete(?:\/|\?|$)/i.test(a.href) &&
        a.text.length > 2,
    );
    if (!player || values.length < 2 || /^(?:player|name)$/i.test(player.text))
      continue;
    const position =
      values.find((v) =>
        /^(?:C|PF|SF|SG|PG|F|G|D|LW|RW|LD|RD|G|F|D|Forward|Defence|Defense|Goaltender)$/i.test(
          v,
        ),
      ) || "Roster";
    const group = /^(?:PG|SG|G)$/i.test(position)
      ? "Guards"
      : /^(?:C|PF|SF|F|Forward)$/i.test(position)
        ? "Forwards / Centers"
        : /^(?:D|LD|RD|Defence|Defense)$/i.test(position)
          ? "Defense"
          : /^(?:LW|RW)$/i.test(position)
            ? "Forwards"
            : /^(?:Goaltender)$/i.test(position)
              ? "Goaltenders"
              : position;
    const entry = {
      name: player.text,
      url: absolute(player.href, origin) || sourceUrl,
      ...ageFromText(rowText, checked),
    };
    if (!groups.has(group)) groups.set(group, []);
    if (!groups.get(group)!.some((p) => p.name === entry.name))
      groups.get(group)!.push(entry);
  }
  if (!groups.size) return;
  return {
    label: "Roster",
    groups: [...groups].map(([position, players]) => ({ position, players })),
    source: sourceName,
    url: sourceUrl,
    checked,
    note: "Player names, positions, and ages when published by the source.",
  };
}

export function parseZalgirisRoster(
  html: string,
  checked: string,
): Depth | undefined {
  return rosterFromRows(
    html,
    checked,
    new URL(zalgirisProviders.urls.roster).origin,
    "BeBasket · current roster",
    zalgirisProviders.urls.roster,
  );
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
  html: string,
  checked: string,
): Depth | undefined {
  if (!/Minnesota Frost|Minnesota/i.test(plain(html).slice(0, 12000))) return;
  return rosterFromRows(
    html,
    checked,
    new URL(frostProviders.urls.roster).origin,
    "PWHL · Minnesota Frost roster",
    frostProviders.urls.roster,
  );
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

const trainingCampRosterUrl = frostProviders.urls.trainingCampRoster;

export function parsePwhlTrainingCampRoster(
  html: string,
  checked: string,
): Depth | undefined {
  if (
    !/Minnesota Frost announce 2026.?27 training camp roster/i.test(plain(html))
  )
    return;
  const groups: Depth["groups"] = [];
  const groupPatterns = [
    { title: "Forwards", pattern: /Forwards\s*\(\d+\):/i },
    { title: "Defenders", pattern: /Defenders\s*\(\d+\):/i },
    { title: "Goaltenders", pattern: /Goaltenders\s*\(\d+\):/i },
  ];
  const text =
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:p|li|h[1-6])\s*>/gi, "\n")
      .replace(/<[^>]*>/g, " ")
      .split("2026-27 Frost Training Camp Roster")
      .pop() || "";
  const normalized = decode(text)
    .replace(/&nbsp;|\u00a0/g, " ")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  for (const group of groupPatterns) {
    const headingIndex = normalized.findIndex((line) =>
      group.pattern.test(line),
    );
    if (headingIndex < 0) continue;
    const players: Depth["groups"][number]["players"] = [];
    for (const line of normalized.slice(headingIndex + 1)) {
      if (groupPatterns.some((other) => other.pattern.test(line))) break;
      const match = line.match(/^(.+?)\s+\(([^()]*)\)\s*([*^]*)$/);
      if (!match) continue;
      const name = match[1].trim();
      const team = match[2].trim();
      const markers = match[3];
      if (!name || !team || players.some((player) => player.name === name))
        continue;
      players.push({
        name,
        url: trainingCampRosterUrl,
        campTeam: team,
        signedForSeason: markers.includes("*"),
        draftPick: markers.includes("^"),
      });
    }
    if (players.length) groups.push({ position: group.title, players });
  }
  if (
    !groups.length ||
    groups.reduce((total, group) => total + group.players.length, 0) < 25
  )
    return;
  return {
    label: "Training camp roster",
    groups,
    source: "PWHL · 2026–27 training camp announcement",
    url: trainingCampRosterUrl,
    checked,
    note: "Preliminary training camp roster announced Oct. 7, 2026. “Signed” marks players signed for 2026–27; this is not yet the final season roster.",
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
