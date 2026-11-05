# Wolves headline investigation, October 22, 2026

The flaky Howls and Growls YouTube RSS provider has been removed from headline
collection. The team's clickable YouTube source link remains available in the
team catalog; removing the feed does not remove that external link.

Jon Krawczynski's Google News query is scoped to `site:nytimes.com/athletic` and
the collector requires New York Times results mentioning the Timberwolves or
Wolves. A live check returned five relevant stories, excluding unrelated search
results from other publishers.

The same review narrowed Alec Lewis to `site:nytimes.com/athletic` and applied
the existing Vikings/New York Times filter. Britt Robson's direct MinnPost feed
was reachable but also contained unrelated Twin Cities arts stories, so its
collector now retains only Timberwolves-relevant headlines. Jess Myers, Will
Ragatz, Ben Goessling, and Michael Russo already had effective publisher/team
filters.

The supplied export repeatedly records Yardbarker and ESPN HTTP 403 responses,
Howls and Growls YouTube HTTP 404 responses, official NBA request failures, and
Google News author search timeouts. These are distinct upstream failures.

Direct server-side probes from the development machine returned HTTP 200 for
Yardbarker, ESPN NBA news, Canis Hoopus, and the MinnPost Britt Robson author RSS.
Further controlled probes using the application's exact headers reproduced
Yardbarker's 403 locally for all three configured teams. With the same Accept
header, a short `WolvesAndFriendsFeed/1.0` User-Agent returns RSS successfully;
the URL-bearing identifier returns nginx's 403 HTML. Yardbarker requests now use
the short, honest server identifier. The precise upstream blocking rule is not
publicly established. This corrects the initial host-dependent assessment for
Yardbarker.

ESPN's NBA news and Wolves schedule endpoints also return HTTP 403 with the
URL-bearing identifier and HTTP 200 JSON with the short identifier (or Node's
default). The short identifier is now used for both `site.api.espn.com` and
`site.web.api.espn.com` in the shared feed transport. Verification returned HTTP
200 and 50 articles for each of the eight configured news leagues, HTTP 200 with
an injury group for the Wolves injury endpoint, and HTTP 200 with three events
for Palace's Europa League schedule. Separate scoreboard fetching already omits
the rejected custom header. No visitor headers are used or forwarded.

That does not establish availability from the deployed Sites host. Retain the
existing upstream health reporting; never proxy requests through visitors.

This change uses MinnPost's scoped author RSS instead of Google News for Britt
Robson, skips redundant byline requests for that publisher-provided author feed,
and preserves author-fetch error codes. News-only collections start all
registered provider tasks concurrently; other collections retain the bounded
default concurrency. The existing refresh deadline and exclusion of late results
remain in place. No browser requests, identifiers, preferences, tracking, or
privacy policies change.

Validation: TypeScript `--noEmit`, production build, and
`node scripts/check-news-feeds.mjs` passed. Live provider recovery must be checked
after an explicitly requested deployment; these changes do not claim to repair
other upstream blocking or the YouTube feed's 404 response.
