// Minnesota Timberwolves: server-only provider config.
import type { TeamProviders } from "../team-types";

export const wolvesProviders = {
  team: "wolves",
  newsFeeds: [
    { name: "Dunking with Wolves", url: "https://dunkingwithwolves.com/feed/" },
    {
      name: "The Athletic",
      url: "https://www.nytimes.com/athletic/rss/nba/timberwolves/",
    },
    {
      name: "MPR News Sports",
      url: "https://www.mprnews.org/feed/sports",
      tagByContent: true,
      alsoFor: ["wild", "twins", "vikings", "lynx", "loons", "frost"],
    },
    {
      name: "MinnPost",
      url: "https://www.minnpost.com/sports/feed/",
      alsoFor: ["twins", "vikings", "wild", "lynx"],
      categoryTeams: {
        Timberwolves: "wolves",
        "Minnesota Twins": "twins",
        "Minnesota Vikings": "vikings",
        "Minnesota Wild": "wild",
        "Minnesota Lynx": "lynx",
      },
    },
    {
      name: "Star Tribune",
      url: "https://www.startribune.com/sports/index.rss2",
      alsoFor: ["wild", "twins", "vikings", "lynx", "loons", "frost"],
      categoryTeams: {
        "/sports/wolves": "wolves",
        "/sports/wild": "wild",
        "/sports/twins": "twins",
        "/sports/vikings": "vikings",
        "/sports/lynx": "lynx",
        "/sports/loons": "loons",
        "/sports/frost": "frost",
      },
    },
    {
      name: "Canis Hoopus",
      url: "https://www.canishoopus.com/rss/index.xml",
      tagByContent: true,
      alsoFor: ["lynx"],
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
