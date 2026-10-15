## Required privacy constraints

The owner requires this site to remain free of personal-data collection. Apply these rules to every future change:

- Read/saved stories, team selections, and other preferences may be kept only in browser localStorage. Never transmit them or identifiers off-device.
- No analytics, telemetry, fingerprinting, tracking pixels, advertising, accounts, personal-data forms, remote preference storage, or user/browser request logging in application code.
- Never read visitor identity headers, IP addresses, user agents, cookies, or other browser identifiers for collection, persistence, or forwarding.
- The browser's feed request must stay generic with credentials omitted and no referrer. Fetch third-party feeds only server-side without forwarding visitor headers or data.
- Use local assets; do not add third-party embeds or background browser requests. External links must suppress referrers.
- Preserve the response privacy policies. Ordinary host network processing and external sites opened deliberately are outside application control; do not promise zero network metadata or host logs.

## Shared source and publication

- Shared private repository: https://github.com/jaboc83/wolves-and-friends
- Before making changes, inspect the latest GitHub main branch for owner edits. Preserve those edits and avoid replacing the branch with an older Sites snapshot.
- Keep source changes and relevant validation in GitHub commits or pull requests.
- The live website is still published with Sites. GitHub pushes alone do not deploy it; keep the two source copies synchronized explicitly when publishing.

## Automatic deployment

- Merged pull requests targeting GitHub main trigger a cloud deployment task; see DEPLOYMENT.md. Direct pushes do not trigger it.
- Verify the pinned GitHub source, privacy constraints, type check, and production build before publishing. Preserve the current live version on failure.
- .openai/github-deployment.json is a Sites-only deployed-source checkpoint; do not push it back to GitHub or mistake an unpublished candidate for the live checkpoint.
