## Required privacy constraints

The owner requires this site to remain free of personal-data and browser-identifier collection. Non-identifying sports preferences may be included in first-party requests under the rules below. Apply these rules to every future change:

- Store read/saved stories, team selections, and other preferences in browser localStorage. A first-party request may include non-identifying sports preferences or filter criteria, such as team, league, read, or saved-story filters, when useful to filter or serve that request efficiently. Keep these values request-scoped: never persist or log them remotely, include personal information or person/device identifiers, or forward them to third parties.
- No analytics, telemetry, fingerprinting, tracking pixels, advertising, accounts, personal-data forms, remote preference storage, or user/browser request logging in application code.
- Never read visitor identity headers, IP addresses, user agents, cookies, or other browser identifiers for collection, persistence, or forwarding.
- Browser feed requests must be same-origin, omit credentials, and use no referrer. Include non-identifying sports filters only when useful. Fetch third-party feeds only server-side without forwarding visitor headers or sports preferences/filter values.
- Use local assets; do not add third-party embeds or background browser requests. External links must suppress referrers.
- Preserve the response privacy policies. Ordinary host network processing and external sites opened deliberately are outside application control; do not promise zero network metadata or host logs.

## Shared source and publication

- Shared private repository: https://github.com/jaboc83/wolves-and-friends
- Before making changes, inspect the latest GitHub main branch for owner edits. Preserve those edits and avoid replacing the branch with an older Sites snapshot.
- Keep source changes and relevant validation in GitHub commits or pull requests.
- The live website is still published with Sites. GitHub pushes alone do not deploy it; keep the two source copies synchronized explicitly when publishing.

## Deployment

- Automatic deployment triggers are disabled. A deployment requires the owner to explicitly request it in ChatGPT; merging a pull request or pushing to GitHub does not deploy. See DEPLOYMENT.md.
- Verify the pinned GitHub source, privacy constraints, type check, and production build before publishing. Preserve the current live version on failure.
- .openai/github-deployment.json is a Sites-only deployed-source checkpoint; do not push it back to GitHub or mistake an unpublished candidate for the live checkpoint.
