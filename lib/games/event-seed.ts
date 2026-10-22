import type { Game } from "../feeds";
// Verified DGPT schedule snapshot, 2026-10-19: https://www.dgpt.com/schedule/
// Used only where the live schedule/cache has no matching event. Dates are all-day,
// and historical winners are never substituted for current results.
const snapshot: [
  string,
  string,
  string,
  string,
  string,
  Game["eventResults"]?,
][] = [
  [
    "2026-green-mountain-championship",
    "2026 Green Mountain Championship",
    "2026-09-17",
    "2026-09-20",
    "Jeffersonville, VT",
    [
      { division: "MPO", name: "Raven Newsom", score: "-41" },
      { division: "FPO", name: "Ohn Scoggins", score: "-20" },
    ],
  ],
  [
    "2026-mvp-open",
    "2026 MVP Open x OTB",
    "2026-09-24",
    "2026-09-27",
    "Leicester, MA",
    [
      { division: "MPO", name: "Ricky Wysocki", score: "-12" },
      { division: "FPO", name: "Sintija Klezberga", score: "-5" },
    ],
  ],
  [
    "2026-united-states-disc-golf-championship",
    "2026 United States Disc Golf Championship",
    "2026-10-08",
    "2026-10-11",
    "Rock Hill, SC",
    [{ division: "MPO", name: "Calvin Heimburg", score: "-23" }],
  ],
  [
    "2026-throw-pink-womens-disc-golf-championship",
    "2026 Throw Pink Women’s Disc Golf Championship",
    "2026-10-08",
    "2026-10-11",
    "Rock Hill, SC",
    [{ division: "FPO", name: "Holyn Handley", score: "-18" }],
  ],
  [
    "2026-powerball-cup",
    "2026 Powerball Cup · MPO / FPO",
    "2026-10-15",
    "2026-10-18",
    "Lynchburg / Bedford County, VA",
  ],
  [
    "2026-jomezpro-series-finale-at-cactus-rock",
    "2026 JomezPro Series Finale at Cactus Rock",
    "2026-11-06",
    "2026-11-08",
    "Tuscaloosa, AL",
  ],
];
export const discEvents: Game[] = snapshot.map(
  ([slug, name, start, end, venue, eventResults]) => ({
    id: `dgpt:/event/${slug}/`,
    team: "disc",
    name,
    date: start + "T12:00:00-05:00",
    endDate: end + "T12:00:00-05:00",
    dateOnly: true,
    eventOnly: true,
    state: "pre",
    status: "Scheduled",
    league: "DGPT",
    venue,
    broadcast: "",
    url: `https://www.dgpt.com/event/${slug}/`,
    boxUrl:
      slug === "2026-powerball-cup"
        ? "https://www.pdga.com/tour/event/96421"
        : `https://www.dgpt.com/event/${slug}/`,
    sourceName: "DGPT verified schedule snapshot · Oct 19, 2026",
    competitors: [],
    eventResults,
  }),
);
