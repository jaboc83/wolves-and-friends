// Horizontally scrolling row of video thumbnails for the latest official YouTube uploads.
"use client";
import { useRef } from "react";
import type { Story } from "../../lib/feeds";

const age = (s: string) => {
  const h = Math.max(0, Math.floor((Date.now() - Date.parse(s)) / 3600000));
  return h < 1
    ? "Just now"
    : h < 24
      ? h + "h ago"
      : Math.floor(h / 24) + "d ago";
};

export default function VideoCarousel({
  videos,
  readIds,
  markRead,
}: {
  videos: Story[];
  readIds: string[];
  markRead: (id: string) => void;
}) {
  const track = useRef<HTMLUListElement>(null);
  const scroll = (direction: 1 | -1) => {
    const el = track.current;
    if (el)
      el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  };
  return (
    <section
      className="youtube-headlines video-carousel"
      aria-label="Latest YouTube videos"
    >
      <div className="video-carousel-head">
        <h3>Latest videos</h3>
        <div className="video-carousel-nav">
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label="Previous videos"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label="Next videos"
          >
            ›
          </button>
        </div>
      </div>
      <ul className="video-carousel-track" ref={track}>
        {videos.map((video) => (
          <li
            key={video.id}
            className={
              "video-card" + (readIds.includes(video.id) ? " video-read" : "")
            }
          >
            <a
              href={video.url}
              target="_blank"
              rel="noreferrer noopener"
              onClick={() => markRead(video.id)}
              title={video.title}
            >
              <span className="video-thumb">
                {video.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={video.thumbnail}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                )}
              </span>
              <span className="video-title">{video.title}</span>
              <span className="video-meta">
                {video.source.replace("YouTube · ", "")} · {age(video.date)}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
