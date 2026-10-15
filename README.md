# Wolves & Friends

A public sports hub for Wolves, Wild, Vikings, Twins, Loons, Crystal Palace, Disc Golf, Lynx, Žalgiris, Frost, and USMNT.

Live website: https://wolves-and-friends-hub.tastyfir6.chatgpt.site

This private repository is the shared source code. The live website is hosted through Sites. A cloud automation deploys validated changes after a pull request is merged into `main`; direct pushes do not trigger deployment. See [Automatic deployment](DEPLOYMENT.md).

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

## Formatting and linting

Use Prettier's default formatting and the standard Next.js Core Web Vitals and
TypeScript ESLint rules. `eslint-config-prettier` disables conflicting formatting
rules so Prettier owns code style.

```sh
pnpm format        # Format supported project files
pnpm format:check  # Check formatting without changing files
pnpm lint          # Check code quality
pnpm lint:fix      # Apply available ESLint fixes
```

Generated files, local runtime state, and third-party styles/licenses are excluded
from formatting. These tools run during development and add no browser requests
or visitor-data collection.

## Collaboration and publishing

Make changes in this repository so both the owner and the authorized GitHub connection can inspect them. Check the latest `main` branch before changing files to avoid overwriting the other person's work. Keep changes in commits or pull requests with a short description and relevant checks.

Merge a reviewed pull request into `main` to trigger the deployment task. It checks the current source, preserves the privacy rules, validates and builds the app, then publishes through the existing Sites project. Failed checks leave the live version untouched. Direct pushes and merges into other branches do not trigger publishing. Documentation-only changes do not require an app deployment. Read [DEPLOYMENT.md](DEPLOYMENT.md) for the workflow and recovery details. The GitHub and Sites repositories remain separate; the task synchronizes them explicitly.

Imported from Sites source commit `50e3e8436546613f408d60418e28eaf6817eccbb` on October 15, 2026. Generated archives, installed dependencies, credentials, and checkout-local runtime state are excluded.

## Privacy requirements

Read `AGENTS.md` before making changes. The app must not collect personal data, analytics, browser identifiers, cookies, user agents, IP addresses, or remotely stored preferences. Read/saved states and team choices stay in browser localStorage. Browser feed requests remain generic, same-origin, without credentials or referrers. Third-party feeds and avatars are fetched server-side. Assets are local or inline; no third-party embeds or background browser requests.
