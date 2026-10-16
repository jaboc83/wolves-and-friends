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

## Run and debug in VS Code

On Windows, the tasks use `scripts/vscode-node.ps1` to find Node on PATH,
then in the fnm installation matching `.node-version`, then in the ignored
checkout-local portable tools. This also works when VS Code starts without
an initialized fnm terminal environment.

Open the repository folder in VS Code. Install dependencies with
`pnpm install --frozen-lockfile` first, and make sure Node.js is on VS Code's PATH
(restart VS Code after installing Node or changing its version).

- **Build:** press Ctrl+Shift+B to run the default `Wolves: build` task.
- **Run:** choose Terminal → Run Task → `Wolves: dev`, then open
  http://127.0.0.1:5173.
- **Debug:** choose `Wolves: full stack (Brave)` or `Wolves: full stack (Edge)`
  in Run and Debug, then press F5.
  This starts the development server, opens your selected browser with debugging, and
  attaches to the local Worker for API/server breakpoints. Individual browser
  and Worker configurations are also available. Brave uses VS Code's Chrome
  debugger with its executable at the standard Windows system installation path.
  If Brave is installed elsewhere, update `runtimeExecutable` in
  `.vscode/launch.json` to its `brave.exe` path.
- **Type check:** choose Terminal → Run Task → `Wolves: typecheck`.

Set browser breakpoints in `app/page.tsx` or components, and server breakpoints
in `app/api/` or feed modules in `lib/`. Trigger an API request from the browser
to hit a server breakpoint; cached feeds may bypass provider-fetch code.
The Worker attachment follows the
[Cloudflare Vite debugging configuration](https://developers.cloudflare.com/workers/vite-plugin/reference/debugging/).

The development task stays running after debugging stops. Use Terminal →
Terminate Task → `Wolves: dev` when finished. Stop an existing `pnpm dev` before
starting this task: ports 5173 and 9229 must be free. The task enables the local
Worker inspector with `WF_DEBUG_WORKER=true`; normal development and production
builds keep it disabled. No application logging or collection is added.

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
