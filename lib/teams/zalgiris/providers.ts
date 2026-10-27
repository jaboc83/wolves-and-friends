// Žalgiris Kaunas: server-only provider config.
import type { TeamProviders } from "../team-types";

export const zalgirisProviders = {
  team: "zalgiris",
  newsFeeds: [
    {
      name: "Eurohoops Žalgiris",
      url: "https://www.eurohoops.net/basket/zalgiris-kaunas/feed/?lang=en",
    },
  ],
  youtube: {
    name: "Žalgiris Kaunas",
    page: "https://www.youtube.com/@BCZalgirisKaunas",
  },
  socialTags: ["#Zalgiris"],
  urls: {
    officialSchedule: "https://zalgiris.lt/rungtynes/",
    officialNews: "https://zalgiris.lt/naujienos/",
    roster: "https://www.be-basketball.com/team/zalgiris-kaunas/players",
  },
} as const satisfies TeamProviders;
