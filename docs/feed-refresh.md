# Public feed collection

`lib/feeds.ts` registers provider tasks; `lib/provider-tasks.ts` runs at most six tasks concurrently with a 20-second refresh deadline. Every provider owns its buffer. Completed results merge in registration order, so response ordering does not depend on network completion. Failed or late results are excluded and reported in source health. Official fixtures retain their merge rules, live scoreboards overlay schedules, and injuries attach after those merges.

`lib/feed-parsers.ts` contains pure RSS/ESPN parsers, `lib/feed-types.ts` holds the normalized contracts, and `lib/news-sources.ts` configures publishers/authors. New providers should use the scoped transport so collection cancellation reaches upstream requests. Shared scoreboards use their independent short-lived cache; one collection timing out must not cancel another caller's shared fetch.

News, schedules and odds have separate per-Worker caches and in-flight requests. These are public data caches, not globally shared storage. The legacy combined endpoint only attempts odds within its remaining refresh budget, using isolated objects so late odds cannot mutate returned schedules. Author verification expires after an hour and holds at most 256 results.

Preserve browser-only preferences, generic credentials-omitted/no-referrer feed calls, independent section completion, safe source-health codes and no stale seed headline injection. Regression coverage lives in `scripts/test-provider-pipeline.mjs`, `scripts/test-independent-refresh.mjs` and `scripts/test-audit-feeds.mjs`.
