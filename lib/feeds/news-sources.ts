// Registry of public news and author feeds that the feed coordinator refreshes.
export const newsSources: [string, string, string[] | undefined][] = [
  ["PDGA News", "https://www.pdga.com/rss.xml", ["disc"]],
  ["Dunking with Wolves", "https://dunkingwithwolves.com/feed/", ["wolves"]],
  [
    "Yard Barker · Timberwolves",
    "https://www.yardbarker.com/rss/team/83",
    ["wolves"],
  ],
  ["Yard Barker · Wild", "https://www.yardbarker.com/rss/team/115", ["wild"]],
  [
    "Yard Barker · MNUFC",
    "https://www.yardbarker.com/rss/team/17423",
    ["loons"],
  ],
  ["Gone Puck Wild", "https://gonepuckwild.com/feed/", ["wild"]],
  [
    "Twins Daily",
    "https://twinsdaily.com/rss/3-twins-daily-content.xml/",
    ["twins"],
  ],
  ["Puckett's Pond", "https://puckettspond.com/feed/", ["twins"]],
  [
    "Eurohoops Žalgiris",
    "https://www.eurohoops.net/basket/zalgiris-kaunas/feed/?lang=en",
    ["zalgiris"],
  ],
  ["Canis Hoopus", "https://www.canishoopus.com/rss/index.xml", undefined],
  [
    "Daily Norseman",
    "https://www.dailynorseman.com/rss/index.xml",
    ["vikings"],
  ],
  ["The Ice Garden", "https://www.theicegarden.com/rss/", undefined],
  ["Ultiworld Disc Golf", "https://discgolf.ultiworld.com/feed/", ["disc"]],
  [
    "Stars and Stripes FC",
    "https://www.starsandstripesfc.com/rss/index.xml",
    ["usmnt"],
  ],
  [
    "Howls and Growls",
    "https://www.youtube.com/feeds/videos.xml?channel_id=UCHQf4fxeaf1MHDz9fW2mhsw",
    ["wolves"],
  ],
];
export const authorSources = [
  {
    name: "Jess Myers",
    label: "Google News index · bylines unverified",
    url: "https://www.twincities.com/author/jess-myers/",
    feed: "https://news.google.com/rss/search?q=%22Jess%20Myers%22%20site%3Atwincities.com%20when%3A14d&hl=en-US&gl=US&ceid=US%3Aen",
  },
  {
    name: "Alec Lewis",
    label: "Google News index · bylines unverified",
    url: "https://www.nytimes.com/athletic/author/alec-lewis/",
    feed: "https://news.google.com/rss/search?q=%22Alec%20Lewis%22%20site%3Anytimes.com%20when%3A14d&hl=en-US&gl=US&ceid=US%3Aen",
  },
  {
    name: "Will Ragatz",
    label: "Google News index · bylines unverified",
    url: "https://www.si.com/nfl/vikings/onsi/author/will-ragatz",
    feed: "https://news.google.com/rss/search?q=%22Will%20Ragatz%22%20site%3Asi.com%20when%3A14d&hl=en-US&gl=US&ceid=US%3Aen",
  },
  {
    name: "Ben Goessling",
    label: "Google News index · bylines unverified",
    url: "https://www.startribune.com/author/ben-goessling/6134708",
    feed: "https://news.google.com/rss/search?q=%22Ben%20Goessling%22%20site%3Astartribune.com%20when%3A14d&hl=en-US&gl=US&ceid=US%3Aen",
  },
  {
    name: "Britt Robson",
    label: "Google News index · bylines unverified",
    url: "https://www.minnpost.com/author/britt-robson/",
    feed: "https://news.google.com/rss/search?q=%22Britt+Robson%22+site%3Aminnpost.com+when%3A14d&hl=en-US&gl=US&ceid=US%3Aen",
  },
  {
    name: "Michael Russo",
    label: "Google News index · bylines unverified",
    url: "https://www.nytimes.com/athletic/author/michael-russo/",
    feed: "https://news.google.com/rss/search?q=%22Michael+Russo%22+site%3Anytimes.com%2Fathletic%20when%3A14d&hl=en-US&gl=US&ceid=US%3Aen",
  },
  {
    name: "Jon Krawczynski",
    label: "Google News index · bylines unverified",
    url: "https://www.nytimes.com/athletic/author/jon-krawczynski/",
    feed: "https://news.google.com/rss/search?q=%22Jon+Krawczynski%22+when%3A14d&hl=en-US&gl=US&ceid=US%3Aen",
  },
];
