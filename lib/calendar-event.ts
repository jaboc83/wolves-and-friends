import type { Game } from "./feeds";
import { eventDay } from "./event-time";
const date = (s: string) => eventDay(s).replace(/-/g, "");
const utc = (s: string) =>
  new Date(s)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
const escape = (s: string) =>
  s
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n|\r/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
function dates(g: Game) {
  const start = g.dateOnly ? date(g.date) : utc(g.date);
  if (!g.dateOnly)
    return [
      start,
      g.endDate
        ? utc(g.endDate)
        : utc(new Date(new Date(g.date).getTime() + 150 * 60000).toISOString()),
    ];
  const end = new Date(
    (g.endDate ? eventDay(g.endDate) : eventDay(g.date)) + "T00:00:00Z",
  );
  end.setUTCDate(end.getUTCDate() + 1);
  return [start, end.toISOString().slice(0, 10).replace(/-/g, "")];
}
export function googleCalendarUrl(g: Game) {
  const [start, end] = dates(g);
  const details = [
    g.broadcast ? "Radio / TV: " + g.broadcast : "",
    g.url ? "Event details: " + g.url : "",
  ]
    .filter(Boolean)
    .join("\n");
  return (
    "https://calendar.google.com/calendar/render?" +
    new URLSearchParams({
      action: "TEMPLATE",
      text: g.name,
      dates: start + "/" + end,
      details,
      location: g.venue || "",
      ctz: "America/Chicago",
    })
  );
}
export function calendarFile(g: Game, now = new Date()) {
  const [start, end] = dates(g),
    suffix = g.dateOnly ? ";VALUE=DATE" : "",
    details = [
      g.broadcast ? "Radio / TV: " + g.broadcast : "",
      g.url ? "Event details: " + g.url : "",
    ]
      .filter(Boolean)
      .join("\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wolves and Friends//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:" + encodeURIComponent(g.id) + "@wolvesandfriends.moening.org",
    "DTSTAMP:" + utc(now.toISOString()),
    "DTSTART" + suffix + ":" + start,
    "DTEND" + suffix + ":" + end,
    "SUMMARY:" + escape(g.name),
    "LOCATION:" + escape(g.venue || ""),
    "DESCRIPTION:" + escape(details),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  // RFC 5545 folds content lines at 75 UTF-8 octets, preserving Unicode names.
  return (
    lines
      .map((line) => {
        let out = "",
          bytes = 0;
        for (const char of line) {
          const n = new TextEncoder().encode(char).length;
          if (bytes + n > 75) {
            out += "\r\n ";
            bytes = 1;
          }
          out += char;
          bytes += n;
        }
        return out;
      })
      .join("\r\n") + "\r\n"
  );
}
