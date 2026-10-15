# Wolves & Friends

A public sports hub for Wolves, Wild, Vikings, Twins, Loons, Crystal Palace, Disc Golf, Lynx, Žalgiris, Frost, and USMNT.

Live website: https://wolves-and-friends-hub.tastyfir6.chatgpt.site

This private repository is the shared source code. The live website is hosted through Sites; a GitHub commit does **not** automatically publish a new website version.

## Understand the architecture

Read the [Architecture overview](ARCHITECTURE.md) for a plain-English guide to the data flow, main files, caching, privacy boundaries, and publishing workflow.

## Browse the code

- `app/page.tsx`: page layout, team filters, read/saved stories, and refresh behavior.
- `app/globals.css`: styling, team themes, and mobile layout.
- `components/game-card.tsx`: compact games and hidden/revealed results.
- `components/match-calendar.tsx`: past and upcoming calendar events.
- `components/team-insights.tsx`: standings and rosters.
- `lib/feeds.ts`: news and schedule collection.
- `lib/odds.ts`: competition-aware odds lookups and fixture matching.
- `lib/bluesky.ts`: social feeds and server-fetched inline avatars.
- `app/api/`: same-origin public feed endpoints.
- `public/logos/`: local team and header images.

## Run locally

Use Node.js 22.13 or newer and pnpm 11 (the version is specified in `package.json`).

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed by the development server. A clean clone selects the portable development profile automatically.

```sh
pnpm exec tsc --noEmit
pnpm build
```

## Collaboration and publishing

Make changes in this repository so both the owner and the authorized GitHub connection can inspect them. Check the latest `main` branch before changing files to avoid overwriting the other person's work. Keep changes in commits or pull requests with a short description and relevant checks.

Publish to the existing Sites project using the Sites workflow after applying the reviewed source changes. Preserve its hosting identity and public audience. The Sites source repository and this GitHub repository are separate; automatic syncing and GitHub-triggered deployment are not configured.

Imported from Sites source commit `50e3e8436546613f408d60418e28eaf6817eccbb` on October 15, 2026. Generated archives, installed dependencies, credentials, and checkout-local runtime state are excluded.

## Privacy requirements

Read `AGENTS.md` before making changes. The app must not collect personal data, analytics, browser identifiers, cookies, user agents, IP addresses, or remotely stored preferences. Read/saved states and team choices stay in browser localStorage. Browser feed requests remain generic, same-origin, without credentials or referrers. Third-party feeds and avatars are fetched server-side. Assets are local or inline; no third-party embeds or background browser requests.
