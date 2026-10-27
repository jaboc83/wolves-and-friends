// Converts public DGPT schedule and StatMando standings pages into shared shapes.
import type { Game } from "./feed-types";
import type { Table } from "../team-info/index";
import { eventLifecycle } from "../games/event-time";
import { discProviders } from "../teams/disc/providers";
const plain = (s: string) =>
  s
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
export function parseDGPT(
  html: string,
  division: string,
  checked: string,
): Table {
  const rankingsUrl = discProviders.urls.rankings;
  const tbody = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/)?.[1] || "";
  const rows = [...tbody.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
    .slice(0, 10)
    .flatMap((m) => {
      const cells = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(
        (c) => c[1],
      );
      const link = cells[2]?.match(
        /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/,
      );
      if (!link || cells.length < 4) return [];
      return [
        {
          id: link[1],
          name: plain(link[2]),
          url: new URL(rankingsUrl).origin + link[1],
          cells: [plain(cells[0]), plain(cells[3])],
        },
      ];
    });
  const week = html.match(/Week:[\s\S]{0,250}?(202\d-\d{2})/)?.[1];
  return {
    name: "DGPT " + division + " · Top 10",
    columns: ["#", "Points"],
    rows,
    source: "DGPT standings · StatMando",
    url: rankingsUrl + division.toLowerCase(),
    checked,
    note: week ? "Standings week " + week : undefined,
  };
}
const clean = (s: string) =>
  s
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:nbsp|amp|#038);/g, (x) => (x === "&nbsp;" ? " " : "&"))
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/\s+/g, " ")
    .trim();
const months =
  "January February March April May June July August September October November December".split(
    " ",
  );
const monthPattern = months.join("|");
export function parseDgptSchedule(html: string, now = new Date()): Game[] {
  const events: Game[] = [];
  // Event headings have links; the adjacent unlinked Champions/Resources headings
  // belong to that event, rather than starting another tournament.
  const headings = [
    ...html.matchAll(/<h[23]\b[^>]*>[\s\S]*?<\/h[23]>/gi),
  ].filter((m) => /<a\b/i.test(m[0]) && /\b20\d{2}\b/.test(clean(m[0])));
  for (let i = 0; i < headings.length; i++) {
    const h = headings[i],
      title = clean(h[0]),
      year = Number(title.match(/\b(20\d{2})\b/)?.[1]);
    const href = h[0].match(/href=["']([^"']+)["']/i)?.[1];
    if (!href || !year) continue;
    let url: URL;
    try {
      url = new URL(href, new URL(discProviders.urls.officialSchedule).origin);
    } catch {
      continue;
    }
    if (
      url.protocol !== "https:" ||
      !["dgpt.com", "www.dgpt.com"].includes(url.hostname) ||
      !url.pathname.startsWith("/event/")
    )
      continue;
    const block = html.slice(h.index! + h[0].length, headings[i + 1]?.index),
      text = clean(block);
    const date = text.match(
      new RegExp(
        `(${monthPattern})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*[-–—]\\s*(?:(${monthPattern})\\s+)?(\\d{1,2})(?:st|nd|rd|th)?`,
        "i",
      ),
    );
    if (!date) continue;
    const startMonth =
      months.findIndex((x) => x.toLowerCase() === date[1].toLowerCase()) + 1;
    const endMonth = date[3]
      ? months.findIndex((x) => x.toLowerCase() === date[3].toLowerCase()) + 1
      : startMonth;
    const stamp = (m: number, d: number, y = year) =>
      `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T12:00:00-05:00`;
    const start = stamp(startMonth, Number(date[2])),
      end = stamp(
        endMonth,
        Number(date[4]),
        endMonth < startMonth ? year + 1 : year,
      );
    if (
      !Number.isFinite(Date.parse(start)) ||
      !Number.isFinite(Date.parse(end)) ||
      end < start
    )
      continue;
    const after = text.slice(date.index! + date[0].length);
    const venue = after
      .split(/\b20\d{2}\s+Champions?\b|Watch\b|Get Your Tickets|Resources:/i)[0]
      .trim()
      .slice(0, 160);
    // Never present a prior year's champion as the current tournament's result.
    const champions =
      text.match(
        new RegExp(
          `${year}\\s+Champions?:\\s*([\\s\\S]*?)(?:Watch|Get Your Tickets|Resources:|$)`,
          "i",
        ),
      )?.[1] || "";
    const eventResults = [
      ...champions.matchAll(/(MPO|FPO):\s*([^|]+)\|\s*([+−-]?\d+|E)\b/g),
    ].map((m) => {
      const margin = champions.match(
        new RegExp(
          m[1] +
            "[^|]{0,180}(?:won by|lead(?:ing)? by|margin)\\s*(\\d+)\\s*stroke",
          "i",
        ),
      )?.[1];
      return {
        division: m[1],
        name: m[2].trim(),
        score: m[3],
        ...(margin ? { margin } : {}),
      };
    });
    events.push(
      eventLifecycle(
        {
          id: "dgpt:" + url.pathname,
          team: "disc",
          name: title,
          date: start,
          endDate: end,
          dateOnly: true,
          eventOnly: true,
          state: "pre",
          status: "Scheduled",
          league: "DGPT",
          venue,
          broadcast: "",
          url: url.href,
          boxUrl: url.href,
          sourceName: "DGPT official schedule",
          sourceChecked: now.toISOString(),
          competitors: [],
          eventResults,
        },
        now,
      ),
    );
  }
  return [...new Map(events.map((g) => [g.id, g])).values()];
}
