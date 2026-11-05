export type ESPNNewsArticle = {
  headline?: string;
  published?: string;
  type?: string;
  links?: { web?: { href?: string } };
};

export function normalizeLeagueHeadlines(
  articles: readonly ESPNNewsArticle[],
) {
  return articles
    .flatMap((article) => {
      const url = article.links?.web?.href || "";
      return article.headline &&
        article.published &&
        /^https?:\/\//i.test(url)
        ? [
            {
              id: url,
              title: article.headline,
              url,
              date: article.published,
              source: "ESPN",
              teams: [],
              kind: article.type === "Media" ? "video" : "story",
            },
          ]
        : [];
    })
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 5);
}