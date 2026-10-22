"use client";
import type { Story } from "../lib/feeds";
import { teams, teamPriority } from "../lib/teams/teams";
import SocialImage from "./social-image";
import TeamLogos from "./team-logos";
import { isLocalSocialImage } from "../lib/social/bluesky-images";
import type { DashboardPageId } from "../lib/dashboard/page-id";
import { useLocalTimeZone } from "../hooks/use-local-time-zone";
import {
  dayInTimeZone,
  formatInTimeZone,
  timeZoneLabel,
} from "../lib/browser/local-time";
const age = (s: string) => {
  const h = Math.max(0, Math.floor((Date.now() - Date.parse(s)) / 3600000));
  return h < 1
    ? "Just now"
    : h < 24
      ? h + "h ago"
      : Math.floor(h / 24) + "d ago";
};
export default function StoryCard({
  story: original,
  choose,
  markRead,
  readIds,
}: {
  story: Story;
  choose: (id: DashboardPageId) => void;
  markRead: (id: string) => void;
  readIds: string[];
}) {
  const timeZone = useLocalTimeZone();
  const localDateTime = (s: string, opts: Intl.DateTimeFormatOptions = {}) =>
    formatInTimeZone(s, timeZone, opts);
  let s = original;
  s = {
    ...s,
    teams: [...s.teams].sort((a, b) => teamPriority(a) - teamPriority(b)),
  };
  const isToday =
    s.kind !== "social" &&
    dayInTimeZone(s.date, timeZone) === dayInTimeZone(new Date(), timeZone);
  return (
    <article
      className={
        "story " +
        (s.kind === "social" ? "message-post" : "") +
        (isToday ? " story-today" : "")
      }
      key={s.id}
    >
      {s.socialPlatform === "youtube" ? (
        <TeamLogos teamIds={s.teams} />
      ) : s.kind === "social" ? (
        <div className="post-avatar">
          <SocialImage
            src={s.avatar}
            alt=""
            width={40}
            height={40}
            fallback={
              <span aria-hidden="true">
                {s.source.replace("Bluesky · ", "").charAt(0).toUpperCase()}
              </span>
            }
          />
        </div>
      ) : (
        <TeamLogos teamIds={s.teams} />
      )}
      <div className="story-content">
        <div className="story-meta">
          {isToday && <span className="today-badge">TODAY</span>}
          <span>{s.source}</span>
          <span>· {age(s.date)}</span>
          {s.kind === "social" && (
            <span className="video">
              {s.socialPlatform === "youtube" ? "VIDEO" : "POST"}
            </span>
          )}
          {s.premium && <span>INSIDER</span>}
          {s.kind === "video" && <span className="video">VIDEO</span>}
        </div>
        <h3>
          <a
            title={s.originalTitle}
            href={s.url}
            target="_blank"
            rel="noreferrer"
          >
            {s.title} <span>↗</span>
          </a>
        </h3>
        {s.kind === "social" && !!s.images?.length && (
          <div
            className={
              "post-images" +
              (s.images.length === 1 ? " post-images-single" : "")
            }
          >
            {s.images
              .slice(0, 4)
              .filter((image) => isLocalSocialImage(image.src))
              .map((image, index) => (
                <a
                  key={image.src + index}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={image.alt || "View photo on Bluesky"}
                >
                  <SocialImage
                    src={image.src}
                    alt={image.alt}
                    width={image.width}
                    height={image.height}
                    fallback={
                      <span className="post-image-fallback">
                        View photo on Bluesky ↗
                      </span>
                    }
                  />
                </a>
              ))}
          </div>
        )}
        <div className="story-bottom">
          <div>
            {s.teams.map((id) => {
              const t = teams.find((x) => x.id === id)!;
              return (
                <button
                  key={id}
                  onClick={() => choose(id)}
                  style={{ color: t.color }}
                >
                  {t.short}
                </button>
              );
            })}
            <time
              title={
                localDateTime(s.date, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }) +
                " " +
                timeZoneLabel(timeZone, s.date)
              }
            >
              {s.dateApproximate ? "Approx. " : ""}
              {localDateTime(s.date, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}{" "}
              {timeZoneLabel(timeZone, s.date)}
            </time>
          </div>
          <button className="read-toggle" onClick={() => markRead(s.id)}>
            {readIds.includes(s.id) ? "Mark unread" : "✓ Mark read"}
          </button>
        </div>
      </div>
    </article>
  );
}
