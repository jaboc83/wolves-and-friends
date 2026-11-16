// Dashboard news column: story list, social posts, YouTube headlines, and loading/error/empty states.
"use client";
import type { ReactNode } from "react";
import Image from "next/image";
import StoryCard from "../stories/story-card";
import { recentStories } from "../../lib/browser/news-window";
import { OLDER_BATCH_SIZE } from "../../lib/dashboard/selectors";
import { teamLogoPath } from "../../lib/teams/team-logo";
import { teams } from "../../lib/teams/teams";
import type { DashboardPageId } from "../../lib/dashboard/page-id";
import type { Health, Story } from "../../lib/feeds";

type NewsMode = "stories" | "loading" | "error" | "empty";

type NewsSectionState = {
  active: DashboardPageId;
  timeZone: string;
  teamName?: string;
  socialPosts: Story[];
  socialUnavailable: string[];
  socialRefreshing: boolean;
  socialRefreshError: boolean;
  youtubeHeadlines: Story[];
  youtubeUnavailable: string[];
  displayed: Story[];
  newest?: Story;
  olderCount: number;
  olderRemaining: number;
  compactNews: boolean;
  newsMode: NewsMode;
  newsFailed: boolean;
  loading: boolean;
  checked: string;
  failed: Health[];
  readIds: string[];
  search: string;
  showRead: boolean;
  showOlder: boolean;
};

type NewsSectionActions = {
  choose: (id: DashboardPageId) => void;
  markRead: (id: string) => void;
  setSearch: (value: string) => void;
  setShowRead: (value: boolean) => void;
  toggleOlder: () => void;
  refreshSocial: (force?: boolean) => unknown;
};

type NewsSectionProps = {
  state: NewsSectionState;
  actions: NewsSectionActions;
  teamDetails: ReactNode;
  zoneLabel: string;
  localDateTime: (
    value: string,
    options?: Intl.DateTimeFormatOptions,
  ) => string;
};

export default function NewsSection({
  state,
  actions,
  teamDetails,
  zoneLabel,
  localDateTime,
}: NewsSectionProps) {
  const team = teams.find((candidate) => candidate.id === state.active);
  const story = (item: Story) => (
    <StoryCard
      key={item.id}
      story={item}
      choose={actions.choose}
      markRead={actions.markRead}
      readIds={state.readIds}
    />
  );

  return (
    <section className="news">
      <div className="headlines-content">
        <div className="ultrawide-left-column">
          <section
            id="latest-messages"
            className="message-feed"
            aria-label="Latest Social Media"
          >
            <div className="social-heading">
              <h2>Latest Social Media</h2>
              <button
                type="button"
                className="social-refresh"
                onClick={() => void actions.refreshSocial(true)}
                disabled={state.socialRefreshing}
                aria-label="Refresh latest social media"
                title={
                  state.socialRefreshing
                    ? "Refreshing social posts…"
                    : "Refresh social posts"
                }
                aria-busy={state.socialRefreshing}
              >
                <span
                  aria-hidden="true"
                  className={state.socialRefreshing ? "refresh-spinning" : ""}
                >
                  ↻
                </span>
              </button>
            </div>
            <p className="feed-description">
              {state.active === "all"
                ? "Latest posts for your teams · Bluesky"
                : state.teamName + " posts"}
            </p>
            {state.socialRefreshError && (
              <p className="feed-description" role="status">
                Social posts could not refresh. Try again shortly.
              </p>
            )}
            {state.socialPosts.length ? (
              state.socialPosts.map(story)
            ) : (
              <p className="feed-description">
                No unread matching posts in the current feed.
              </p>
            )}
            {state.socialUnavailable.some(
              (id) => state.active === "all" || state.active === id,
            ) && (
              <p className="feed-description">
                Some social feeds are unavailable; cached posts may remain.
              </p>
            )}
          </section>
          {teamDetails}
          <div className="news-resources">
            <details className="community-panel">
              <summary>
                <h2>External Links</h2>
              </summary>
              <p>
                Team sources, fan communities, and news from around the league.
              </p>
              {(team ? [team] : teams).map((sourceTeam) => (
                <div key={sourceTeam.id}>
                  {!team && <h3>{sourceTeam.short}</h3>}
                  {[
                    ...sourceTeam.communities.map(
                      ({ name, url }) => [name, url] as const,
                    ),
                    ...sourceTeam.sources,
                  ].map(([name, url]) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Image
                        unoptimized
                        src={teamLogoPath(sourceTeam.id)}
                        alt=""
                        width={24}
                        height={24}
                      />
                      <span>{name} ↗</span>
                    </a>
                  ))}
                </div>
              ))}
            </details>
            {state.failed.length > 0 && (
              <details className="health">
                <summary>
                  {state.failed.length} feed
                  {state.failed.length === 1 ? "" : "s"} unavailable · cached
                  items may remain
                </summary>
                {state.failed.map((health) => (
                  <p key={health.name}>
                    {health.name} · checked{" "}
                    {localDateTime(health.checked, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                    {zoneLabel}
                  </p>
                ))}
              </details>
            )}
          </div>
        </div>
        <div className="headline-column">
          <div className="section-heading">
            <h2 className="latest-heading">
              Latest stories <small>{state.displayed.length}</small>
            </h2>
            <label className="show-read">
              <input
                type="checkbox"
                checked={state.showRead}
                onChange={(event) => actions.setShowRead(event.target.checked)}
              />{" "}
              Show read
            </label>
            <label className="search">
              <span aria-hidden="true">⌕</span>
              <input
                value={state.search}
                onChange={(event) => actions.setSearch(event.target.value)}
                placeholder="Find a headline"
                aria-label="Search headlines"
              />
            </label>
          </div>
          {state.youtubeHeadlines.length > 0 && (
            <section
              className="youtube-headlines"
              aria-label="Latest YouTube videos"
            >
              <h3>Latest videos</h3>
              {state.youtubeHeadlines.map(story)}
            </section>
          )}
          {state.youtubeUnavailable.some(
            (id) => state.active === "all" || state.active === id,
          ) && (
            <p className="feed-description">
              Some official YouTube feeds are temporarily unavailable.
            </p>
          )}
          {state.loading && state.displayed.length > 0 && (
            <p className="headline-loading" role="status">
              <span className="headline-spinner" aria-hidden="true" />
              Fetching more headlines…
            </p>
          )}
          {state.newsMode === "loading" ? (
            <div
              className="empty headline-loading"
              role="status"
              aria-live="polite"
            >
              <span className="headline-spinner" aria-hidden="true" />
              Fetching headlines…
            </div>
          ) : state.newsMode === "error" ? (
            <div className="empty" role="status">
              Headlines are temporarily unavailable. We’ll try again
              automatically.
            </div>
          ) : state.displayed.length ? (
            state.displayed.map(story)
          ) : (
            <div className="empty">
              <h3>
                {state.search
                  ? "No matching headlines."
                  : state.newest &&
                      recentStories([state.newest], state.active, {
                        timeZone: state.timeZone,
                      }).length === 0
                    ? "No news since " +
                      localDateTime(state.newest.date, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : state.active === "all"
                      ? "No unread headlines from today."
                      : "No unread headlines from the last week."}
              </h3>
              <p>
                {state.olderCount > 0
                  ? "Use View older to catch up on earlier articles."
                  : "Check External Links for more coverage."}
              </p>
            </div>
          )}
          {state.checked && (
            <p className="feed-description">
              Last update:{" "}
              {localDateTime(state.checked, {
                dateStyle: "medium",
                timeStyle: "short",
              })}{" "}
              {zoneLabel}
            </p>
          )}
          {!state.loading && state.newsFailed && state.displayed.length > 0 && (
            <p className="feed-description">
              Some headline feeds are unavailable.
            </p>
          )}
          {!state.loading && state.compactNews && (
            <div className="news-more">
              <p></p>
              {(state.olderCount > 0 || state.showOlder) && (
                <button onClick={actions.toggleOlder}>
                  {!state.showOlder
                    ? "View older (" + state.olderCount + ")"
                    : state.olderRemaining > 0
                      ? "View " +
                        Math.min(OLDER_BATCH_SIZE, state.olderRemaining) +
                        " more (" +
                        state.olderRemaining +
                        " left)"
                      : "Hide older"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
