// Minnesota Timberwolves: server-only provider config.
import type { TeamProviders } from "../team-types";

export const wolvesProviders = {
  team: "wolves",
  newsFeeds: [
    { name: "Dunking with Wolves", url: "https://dunkingwithwolves.com/feed/" },
    {
      name: "Yard Barker · Timberwolves",
      url: "https://www.yardbarker.com/rss/team/83",
    },
    {
      name: "Canis Hoopus",
      url: "https://www.canishoopus.com/rss/index.xml",
      tagByContent: true,
      alsoFor: ["lynx"],
    },
  ],
  authors: [
    {
      name: "Britt Robson",
      label: "MinnPost author feed",
      url: "https://www.minnpost.com/author/britt-robson/",
      feed: "https://www.minnpost.com/author/britt-robson/feed/",
      publisherAuthorFeed: true,
      titleFilters: [/timberwolves|wolves|edwards|finch/i],
    },
  ],
  youtube: {
    name: "Minnesota Timberwolves",
    channel: "UCXWDN5NKVFgnPt25CMh98Cg",
  },
  bluesky: {
    list: "at://did:plc:7giugsiydb7mj2j3a5u6nuyn/app.bsky.graph.list/3lal4p6r7w62f",
    pattern:
      /timberwolves|\bwolves\b|timbies|anthony edwards|\bant\b|naz reid|jaden mcdaniels|rudy gobert|lamelo ball|jonathan kuminga|chris finch|ayo dosunmu|canis hoopus/i,
  },
  espnTeamId: "16",
  powerRankingSource: "cbs-nba",
  urls: {
    officialNews: "https://www.nba.com/timberwolves/news",
    salary: "https://www.salaryswish.com/teams/timberwolves",
  },
} as const satisfies TeamProviders;
