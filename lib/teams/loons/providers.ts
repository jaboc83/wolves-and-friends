// Minnesota United (Loons): server-only provider config.
import type { TeamProviders } from "../team-types";

export const loonsProviders = {
  team: "loons",
  newsFeeds: [
    {
      name: "Yard Barker · MNUFC",
      url: "https://www.yardbarker.com/rss/team/17423",
    },
  ],
  youtube: { name: "Minnesota United FC", channel: "UCNTg0WSrMGrgAD1bY3Fuiug" },
  socialTags: ["#MNUFC"],
  powerRankingSource: "simmons-mls",
  urls: {
    // `{year}` is replaced with the current season year.
    officialCalendar:
      "https://images.mlssoccer.com/raw/upload/assets/min/calendar/mnufc{year}.ics",
    schedulePage: "https://www.mnufc.com/schedule/matches",
  },
} as const satisfies TeamProviders;
