"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Story } from "../../lib/feeds";

const leagueBrands: Record<
  string,
  { name: string; logo: string; espnUrl: string }
> = {
  "basketball/nba": {
    name: "NBA",
    logo: "/logos/league-nba.png",
    espnUrl: "https://www.espn.com/nba/",
  },
  "hockey/nhl": {
    name: "NHL",
    logo: "/logos/league-nhl.png",
    espnUrl: "https://www.espn.com/nhl/",
  },
  "football/nfl": {
    name: "NFL",
    logo: "/logos/league-nfl.png",
    espnUrl: "https://www.espn.com/nfl/",
  },
  "baseball/mlb": {
    name: "MLB",
    logo: "/logos/league-mlb.png",
    espnUrl: "https://www.espn.com/mlb/",
  },
  "basketball/wnba": {
    name: "WNBA",
    logo: "/logos/league-wnba.png",
    espnUrl: "https://www.espn.com/wnba/",
  },
  "soccer/usa.1": {
    name: "MLS",
    logo: "/logos/league-mls.png",
    espnUrl: "https://www.espn.com/soccer/league/_/name/usa.1",
  },
  "soccer/eng.1": {
    name: "Premier League",
    logo: "/logos/league-premier.png",
    espnUrl: "https://www.espn.com/soccer/league/_/name/eng.1",
  },
  "soccer/fifa.friendly": {
    name: "International Friendly",
    logo: "/logos/league-international.png",
    espnUrl: "https://www.espn.com/soccer/league/_/name/fifa.friendly",
  },
};

export default function LeagueHeadlines({
  league,
  leaguePath,
  className = "muted",
}: {
  league: string;
  leaguePath: string;
  className?: string;
}) {
  const brand = leagueBrands[leaguePath];
  const [open, setOpen] = useState(false);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setStories([]);
    setFailed(false);
    setLoading(true);
    void fetch("/api/league-news?league=" + encodeURIComponent(leaguePath), {
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Headlines unavailable");
        return response.json() as Promise<{ stories: Story[] }>;
      })
      .then((result) => setStories(result.stories))
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [leaguePath, open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={`league-news-trigger ${className}`}
        >
          {league}
        </button>
      </DialogTrigger>
      <DialogContent className="league-headlines-dialog max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader className="league-headlines-header">
          {brand && (
            <Image
              unoptimized
              src={brand.logo}
              alt=""
              width={48}
              height={48}
            />
          )}
          <div>
            <DialogTitle>{(brand?.name || league) + " headlines"}</DialogTitle>
            <DialogDescription>Latest stories from ESPN</DialogDescription>
          </div>
        </DialogHeader>
        {loading ? (
          <p role="status">Loading headlines…</p>
        ) : failed ? (
          <p role="status">Headlines are unavailable right now.</p>
        ) : stories.length ? (
          <ol className="league-headlines-list">
            {stories.map((story) => (
              <li key={story.id}>
                <a href={story.url} target="_blank" rel="noreferrer">
                  {story.title}
                </a>
                <time dateTime={story.date}>
                  {new Date(story.date).toLocaleDateString()}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p>No recent headlines found.</p>
        )}
        <footer className="league-headlines-footer">
          <a
            href={brand?.espnUrl || "https://www.espn.com/"}
            target="_blank"
            rel="noreferrer"
          >
            Go to ESPN <ExternalLink size={14} aria-hidden="true" />
          </a>
        </footer>
      </DialogContent>
    </Dialog>
  );
}