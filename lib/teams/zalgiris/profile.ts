// Žalgiris Kaunas: client-safe identity and links.
import type { TeamProfile } from "../team-types";

export const zalgirisProfile = {
  id: "zalgiris",
  name: "Žalgiris Kaunas",
  short: "Žalgiris",
  sport: "EuroLeague / LKL",
  color: "#36986d",
  theme: { primary: "#006b3f", accent: "#f4d267", soft: "#eaf4ee" },
  logo: "/logos/zalgiris.svg",
  pattern: "zalgiris|žalgiris",
  league: "",
  espn: "",
  sources: [
    [
      "Official Žalgiris news",
      "https://zalgiris.lt/naujienos?category=zalgiris&subCategory=naujienos",
    ],
    [
      "EuroLeague · Žalgiris news",
      "https://www.euroleaguebasketball.net/en/euroleague/news/carousels/zalgiris-kaunas/?q=%7B%22articleId%22%3A%22%22%2C%22categoryId%22%3A%22%22%2C%22linkedId%22%3A%7B%22sourceSystem%22%3A%22FS_BASKETBALL_TEAM%22%2C%22sourceSystemId%22%3A%22zal%22%2C%22text%22%3A%22%22%7D%7D&carouselTitle=Zalgiris%20Kaunas",
    ],
    ["EuroLeague standings", "https://euroleague-standings.com/"],
    [
      "Eurohoops · Žalgiris",
      "https://www.eurohoops.net/basket/zalgiris-kaunas/?lang=en",
    ],
    [
      "BeBasket · Žalgiris roster",
      "https://www.be-basketball.com/team/zalgiris-kaunas/players",
    ],
    [
      "EuroLeague scoreboard",
      "https://www.euroleaguebasketball.net/euroleague/game-center/",
    ],
    ["LKL scoreboard", "https://en.lkl.lt/"],
  ],
  communities: [],
  injuryReportUrl: "",
  wikipediaPage: "BC Žalgiris",
  // Resolved per competition (Kaunas vs. Kaunas, Lithuania) in team-location.ts.
  homeLocation: "",
  sportKind: "basketball",
  standingsPage: "https://www.euroleaguebasketball.net/euroleague/standings/",
  rosterPage: "https://zalgiris.lt/komandos",
} as const satisfies TeamProfile;
