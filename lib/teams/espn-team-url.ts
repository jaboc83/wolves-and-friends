type EspnTeam = {
  abbreviation?: string;
  displayName?: string;
  links?: { href?: string }[];
};

export function espnTeamUrl(league: string, team?: EspnTeam) {
  const route = league.split("/")[1];
  if (!route || league.startsWith("soccer/")) return undefined;
  const prefix = `/${route}/team/_/name/`;
  for (const { href } of team?.links || []) {
    if (!href || !/^https?:\/\/(?:www\.)?espn\.com\//i.test(href)) continue;
    const url = new URL(href);
    if (url.pathname.startsWith(prefix) && url.pathname.length > prefix.length)
      return `https://www.espn.com${url.pathname}`;
  }
  if (!team?.abbreviation || !/^[a-z]+$/i.test(team.abbreviation))
    return undefined;
  const name = (team.displayName || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return (
    `https://www.espn.com${prefix}${team.abbreviation.toLowerCase()}` +
    (name ? `/${name}` : "")
  );
}
