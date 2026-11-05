# Dashboard boundaries

`app/page.tsx` coordinates layout and user actions. `hooks/use-dashboard-feeds.ts` owns independent public-feed state and refreshes. `lib/browser/public-requests.ts` deduplicates request keys, cancels work when the hook unmounts, and starts/cleans up the five-minute and one-minute polling timers. It enforces omitted credentials and no referrer for every browser feed fetch.

`lib/browser/storage.ts` guards access, JSON parsing and writes; preferences are stored locally. Team news requests include the selected public team ID as a filter, while read/saved state stays local. First-party requests may include other non-identifying sports filters when useful, but must not persist or log them remotely or forward them to third parties. `lib/dashboard/storage.ts` validates cached data and selected teams before applying them. Invalid read-history JSON falls back to an empty list; disabled/full storage never prevents live controls from working.

`lib/dashboard/selectors.ts` derives team/read/search filters, merged games and result windows without owning request state. `components/stories/story-card.tsx` renders a story and receives device actions. `lib/team-info/standings.ts` isolates pure table decoration from server provider code.

Calendar-day boundaries and displayed timestamps in the dashboard use the browser's configured timezone. It is read locally for rendering only, is not persisted, and is never included in feed requests; server-side feed windows retain their fixed source timezone.

Fallback JSON is dynamically imported after mounting, outside the main client module. A fallback cannot overwrite successfully loaded/cached schedules or team information. Seed headlines remain excluded from news pages. Splitting chunks does not establish a total-transfer saving: the validation workflow compares all client JavaScript assets (including lazy chunks) against the pinned PR base, and browser timing must be measured separately.

The Node regression suite is `pnpm test` (`tests/*.test.ts`). Its current coverage includes page-first refresh scheduling, local news partitioning, injury normalization, player statistics, roster responses and loading, and power-ranking data and fallbacks.
