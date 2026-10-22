# Architecture overview

Wolves & Friends is a sports dashboard that brings public news, schedules, scores, odds, social posts, standings, and rosters into one page. It consists of a browser interface and a small server-side feed aggregator. There is no application database or user-account system.

This guide describes the implementation as of October 15, 2026. Start with the big picture, then use the file links to explore a feature.

## 1. The big picture

```mermaid
flowchart TD
    Sources["Public sports and news sources"] --> Server["Server: fetch, parse, combine and cache"]
    Server --> API["Four same-origin API endpoints"]
    Seeds["Bundled fallback snapshots"] --> Server
    Seeds --> Page["React dashboard in the browser"]
    API --> Page
    Local["Device-only localStorage"] <--> Page
    Page --> Links["Publisher pages opened by the reader"]
```

The browser asks **our own server** for generic public feeds. The server contacts ESPN, publishers, club websites, and Bluesky, then returns a common data format. Choosing a team filters the returned data in the browser; that choice is not sent to the feeds.

Headlines link to publishers rather than reproducing full articles. Deliberately opening a link takes the reader to that external site.

## 2. The main parts of the repository

| Part               | Responsibility                                                                           | Start here                                                                               |
| ------------------ | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Page controller    | Holds browser state, refreshes feeds, merges data, filters teams, and assembles sections | [app/page.tsx](app/page.tsx)                                                             |
| Shared page shell  | Imports styles and defines metadata and the mobile viewport                              | [app/layout.tsx](app/layout.tsx)                                                         |
| Presentation       | Responsive layout, colors, badges, spacing, and team themes                              | [app/globals.css](app/globals.css), [lib/teams/team-themes.ts](lib/teams/team-themes.ts) |
| Team configuration | Team IDs, priority order, ESPN identifiers, matching patterns, and source links          | [lib/teams/teams.ts](lib/teams/teams.ts)                                                 |
| Feed endpoints     | Return public data to the page                                                           | [app/api](app/api)                                                                       |
| Feed adapters      | Convert each provider's JSON, RSS, HTML, or calendar into shared objects                 | [lib/feeds/](lib/feeds/) and its provider modules                                        |
| Reusable sections  | Game cards, calendar, standings/rosters, and logo groups                                 | [components](components)                                                                 |
| Images             | Local header and team logos                                                              | [public/logos](public/logos)                                                             |
| Hosting            | Build and serve the application through Sites                                            | [vite.config.ts](vite.config.ts), [build/sites-worker.ts](build/sites-worker.ts)         |

The app uses **React and TypeScript**, with **Vinext/Vite** providing the Next-style page and API route structure. The production request handler runs as a **Cloudflare Worker** through Sites. Most of the dashboard logic is currently concentrated in `app/page.tsx`; separate components handle its larger reusable pieces.

## 3. What happens when someone opens the page

1. The page renders using bundled snapshots, so it has something to display before external feeds finish.
2. On the device, it restores cached public content and local preferences. A first visit selects Wolves; later visits restore the last valid team.
3. It requests the four API endpoints below. These requests do not contain the selected team, read IDs, saved stories, or browser identifiers.
4. React updates each section as responses arrive. A separate score feed can update game status without waiting for the larger news refresh.
5. While the page stays open, timers request updates. The Refresh button also requests fresh endpoint responses, subject to each server cache.

| Endpoint         | Data                                                   | Browser refresh                       | Server cache lifetime |
| ---------------- | ------------------------------------------------------ | ------------------------------------- | --------------------- |
| `/api/hub`       | News, author feeds, schedules, source health, and odds | On load, Refresh, and every 5 minutes | 5 minutes             |
| `/api/scores`    | Today's ESPN scoreboard data                           | On load, Refresh, and every minute    | 30 seconds            |
| `/api/social`    | Public Bluesky posts and inline avatars                | On load, Refresh, and every minute    | 1 minute              |
| `/api/team-info` | Standings, rosters, and available season metadata      | With the main refresh                 | 15 minutes            |

These are **request-driven, in-memory caches**. They can disappear when a Worker instance is restarted, and different instances need not share them. There is no background scheduler continuously refreshing the site while nobody is viewing it. The server cache lifetime also does not guarantee a provider has published newer information.

## 4. How provider data becomes page content

The shared types are defined in [lib/feeds/feed-types.ts](lib/feeds/feed-types.ts):

- **Story:** headline/post text, URL, publication date, source, associated team IDs, and optional avatar or original-language title.
- **Game:** ID, team, opponent information, date, competition, status, scores, venue, broadcast information, and optional odds.
- **Health:** whether a source request succeeded and when it was checked.
- **AuthorFeed:** candidate articles for a particular writer, including any byline-verification evidence.

A story can belong to several teams. A game belongs to one tracked team. ESPN games normally use an ID such as `wolves-<ESPN event ID>`; official club fixtures can have a different ID format. Matching across providers sometimes therefore requires the team and kickoff time as well as the ID.

| Module                                                                                     | What it does                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [feeds/index.ts](lib/feeds/index.ts)                                                       | Coordinates news and schedule requests, parses RSS/ESPN data, removes duplicates, retains selected cached data on source failures, and adds odds. Wolves schedules explicitly include season phases so the calendar is not limited to preseason. |
| [feed-parsers.ts](lib/feeds/feed-parsers.ts), [feed-types.ts](lib/feeds/feed-types.ts)     | Shared normalized contracts and pure parsers for provider responses.                                                                                                                                                                             |
| [provider-tasks.ts](lib/feeds/provider-tasks.ts), [scoreboard.ts](lib/feeds/scoreboard.ts) | Bounded provider execution and independently cached scoreboards.                                                                                                                                                                                 |
| [official-schedules.ts](lib/feeds/official-schedules.ts)                                   | Reads Palace's official fixtures and MNUFC's calendar, then merges compatible fixtures with ESPN schedules.                                                                                                                                      |
| [zalgiris.ts](lib/feeds/zalgiris.ts)                                                       | Extracts fixtures, available scores, and competition labels from the official Žalgiris page. Converts Lithuanian local times into timestamps.                                                                                                    |
| [club-news.ts](lib/feeds/club-news.ts)                                                     | Extracts official Žalgiris/Frost news and handles English headline translation where available.                                                                                                                                                  |
| [bylines.ts](lib/feeds/bylines.ts), [byline-status.ts](lib/feeds/byline-status.ts)         | Check available publisher author-page links and article author metadata, alongside known verification records. A name-search result is not automatically considered a verified byline.                                                           |
| [author-stories.ts](lib/feeds/author-stories.ts)                                           | Converts author-feed items into ordinary team headlines.                                                                                                                                                                                         |
| [odds.ts](lib/feeds/odds.ts)                                                               | Selects the competition feed and matches fixtures, including official Palace fixtures with different IDs. Produces plain-English favorites and expandable market details.                                                                        |
| [youtube.ts](lib/feeds/youtube.ts), [dgpt.ts](lib/feeds/dgpt.ts)                           | Parses public YouTube and DGPT schedule feeds.                                                                                                                                                                                                   |
| [bluesky.ts](lib/bluesky.ts), [social-tags.ts](lib/social-tags.ts)                         | Read the Wolves starter-pack list and other teams' tag searches. Fetch avatars on the server, prefer small thumbnails, validate image bytes, and inline them in the response.                                                                    |
| [team-info.ts](lib/team-info.ts)                                                           | Parses ESPN tables/rosters and DGPT standings from StatMando. Sorts ranks and adds supported qualification lines; NHL tables separate division places from wild cards.                                                                           |
| [event-seed.ts](lib/games/event-seed.ts)                                                   | Supplies explicitly entered, verified DGPT event dates. This is not a complete live disc-golf schedule service.                                                                                                                                  |
| [content-policy.ts](lib/content-policy.ts), [news-window.ts](lib/news-window.ts)           | Remove retired team IDs from cached content and apply the headline age windows.                                                                                                                                                                  |

Odds lookups are currently limited to eligible games within the next seven days and a bounded set of league/date requests. An unavailable market remains unlabeled. Competition-aware odds do not imply that every cup competition also has complete live-score coverage.

## 5. How the interface is assembled

[app/page.tsx](app/page.tsx) holds the selected team, search text, read/saved state, feed responses, and result-visibility controls. Its main sections are:

- **Today's games:** placed in the right rail on desktop and first in the mobile single-column content flow when games exist.
- **Latest Social Media:** separate from the headlines, showing two unread posts for All Teams and up to five for a selected team, within what the feed returned.
- **Headlines:** All Teams defaults to articles published today in Central Time. Individual teams default to the last 72 hours. View older widens the window over the loaded articles; it does not search an unlimited archive.
- **Team insights and calendar:** expandable standings, rosters with player-profile links, and a month calendar containing the available past and upcoming fixtures.
- **Communities/source links:** direct reference links to relevant communities and publishers.
- **Coming up/recent results:** compact cards with expandable details. All Teams shows the next future event per team; selected-team views show more.

[GameCard](components/game-card.tsx) owns its expanded state. Results start hidden. Opening a completed-game card reveals its result; unchecking Hide Results exposes W/L/D and scores on minimized cards too. Game-type badges come from [game-badges.ts](lib/games/game-badges.ts) and [GameBadges](components/game-badges.tsx).

[MatchCalendar](components/match-calendar.tsx) owns the displayed month and selected day. Past dates are muted but remain clickable. Calendar entries themselves do not expose scores. Display dates and the definition of today use **America/Chicago**; source-time conversion can use the provider's timezone. Date-only events avoid inventing a start time.

## 6. Where information is stored

| Storage              | Contents                                                                                                                                    | Lifetime / purpose                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| React state          | Current filters, expanded cards, visibility settings, and loaded responses                                                                  | Current page session                                             |
| Browser localStorage | `wf-team`, `wf-read`, `wf-saved`, and `wf-archive`                                                                                          | Device-only preferences and saved article snapshots              |
| Browser localStorage | `wf-cache` and `wf-social-cache`                                                                                                            | Device-only caches of public feed content and inline avatars     |
| Server module memory | Public feed responses, verification results, and avatar caches                                                                              | Temporary, shared public-data work within a Worker instance      |
| Bundled JSON         | [initial.json](lib/initial.json), [team-info-initial.json](lib/team-info-initial.json), and [byline records](lib/feeds/byline-records.json) | Fallback snapshots and verification data shipped with the source |

Clearing browser storage removes local read/saved history and choices. Those preferences do not sync between devices. The snapshots are fallbacks, not continuously updated files. Source-check timestamps and unavailable-feed notices help distinguish cached information from a successful refresh.

The repository contains starter authentication, connector, and UI scaffolding. Its presence does not mean the dashboard uses a login flow or every included component. The hosting manifest currently has no D1 database or R2 bucket binding.

## 7. Privacy boundary

[AGENTS.md](AGENTS.md) contains requirements for every future change:

- No analytics, advertising trackers, accounts, fingerprinting, or application logging of user/browser identifiers.
- Preferences remain on the device. Browser feed requests are generic, same-origin, with credentials omitted and no referrer.
- Public third-party feeds and avatar images are fetched server-side without forwarding visitor headers.
- Logos are local and avatars are inline image data. There are no third-party social embeds or background browser connections to those providers.
- External links suppress referrers. A deliberate visit to another website is then subject to that website's behavior.

[build/sites-worker.ts](build/sites-worker.ts) adds a no-referrer policy and a Content Security Policy restricting browser connections to the site's own origin, images to local/inline sources, and disallowing frames and form submissions. Ordinary hosting network processing is outside application control; these rules are not a promise of zero host metadata.

## 8. GitHub, your local editor, and the live site

```mermaid
flowchart TD
    Editor["VS Code: edit and review"] --> GitHub["GitHub: shared source and commits"]
    GitHub --> Checkout["Sites checkout: synchronize and validate"]
    Checkout --> Build["Build and save a Sites version"]
    Build --> Live["Publish the public website"]
```

The private [GitHub repository](https://github.com/jaboc83/wolves-and-friends) and the Sites source repository are separate repositories. A ChatGPT cloud automation watches merged pull requests and deploys eligible changes merged into `main`. It is not a GitHub Actions deployment workflow, and direct pushes do not trigger it. See [Automatic deployment](DEPLOYMENT.md).

For automatic or requested manual deployments, the workflow is to inspect the latest requested GitHub branch, preserve owner edits, bring its changes into the existing Sites checkout, run appropriate checks/builds, save the matching Sites version, and publish it. Do not blindly force-push one repository's history over the other. A documentation-only GitHub commit does not require republishing the website.

See [README.md](README.md) for local setup commands. A clean clone defaults to the portable execution profile; checkout-local runtime configuration is intentionally excluded from GitHub.

## 9. Where to make common changes

| Desired change                                  | Likely files                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------------- |
| Team order, source links, or team matching      | `lib/teams/teams.ts`                                                                  |
| Colors, mobile spacing, or layout               | `app/globals.css`, `lib/teams/team-themes.ts`, sometimes `app/page.tsx`               |
| Headline age/read/saved behavior                | `app/page.tsx`, `lib/news-window.ts`                                                  |
| New news or schedule provider                   | A parser/adapter in `lib/feeds/`, then its collection call in `lib/feeds/index.ts`    |
| Game and event rules                            | `lib/games/` for event dates, calendar exports, badges, links, and postseason logic   |
| Game-card details or score hiding               | `components/game-card.tsx`                                                            |
| Competition badges                              | `lib/games/game-badges.ts`, `components/game-badges.tsx`                              |
| Missing odds                                    | `lib/feeds/odds.ts`; check competition, provider availability, and fixture matching   |
| Calendar behavior                               | `components/match-calendar.tsx`; check schedule coverage upstream too                 |
| Missing social posts or avatars                 | `app/api/social/route.ts`, `lib/bluesky.ts`, browser cache handling in `app/page.tsx` |
| Standings, qualification lines, or player links | `lib/team-info.ts`, `components/team-insights.tsx`                                    |

External feeds and HTML layouts can change or become unavailable. Inspect the provider response and source-health information before treating missing content as a layout problem. Preserve accurate unavailable states instead of inventing scores, schedules, authors, rosters, or odds.
