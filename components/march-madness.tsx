"use client";
import { useEffect, useState } from "react";
import initial from "../data/snapshots/march-madness-initial.json";
import type { MarchData } from "../lib/games/march-madness";
import { espnTeamLogoUrl } from "../lib/games/march-madness";
import BracketConnectors from "./bracket-connectors";
import Image from "next/image";
import { useLocalTimeZone } from "../hooks/use-local-time-zone";
import { formatInTimeZone, timeZoneLabel } from "../lib/browser/local-time";
export default function MarchMadness({
  revealResults,
  onToggleResults,
}: {
  revealResults: boolean;
  onToggleResults: () => void;
}) {
  const timeZone = useLocalTimeZone();
  const [data, setData] = useState<MarchData>(initial as MarchData);
  const [region, setRegion] = useState("All regions");
  useEffect(() => {
    let alive = true,
      pending = false;
    async function refresh() {
      if (pending) return;
      pending = true;
      try {
        const r = await fetch("/api/march-madness", {
          credentials: "omit",
          referrerPolicy: "no-referrer",
          cache: "no-store",
        });
        if (!r.ok) throw Error();
        const next = (await r.json()) as MarchData;
        if (alive) setData(next);
      } catch {
        if (alive) setData((previous) => ({ ...previous, unavailable: true }));
      } finally {
        pending = false;
      }
    }
    void refresh();
    const timer = setInterval(refresh, 60000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  const regions = ["East", "West", "South", "Midwest", "Final Four"].filter(
    (r) => data.games.some((g) => g.region === r),
  );
  const final = data.games.find((g) => g.order === 6 && g.completed);
  const champion = final?.teams.find((t) => t.winner);
  return (
    <section
      className="march-panel"
      id="march-bracket"
      aria-label="Men's March Madness bracket"
    >
      <div className="march-toolbar">
        <div>
          <h2>{data.year} men’s tournament</h2>
          <p className="panel-note">
            {data.games.filter((g) => g.completed).length} completed games ·
            Seeds, team pages, scores and box scores
          </p>
        </div>
        <button className="results-toggle" onClick={onToggleResults}>
          {revealResults ? "Hide scores" : "Show scores"}
        </button>
      </div>
      {revealResults && champion && (
        <p className="march-champion">
          <strong>{data.year} champion:</strong>{" "}
          <a href={champion.url} target="_blank" rel="noreferrer">
            {champion.name} ↗
          </a>
        </p>
      )}
      <p className="panel-note">
        Showing the {data.year} bracket. The next tournament replaces it after
        the official field is published.
      </p>
      <div className="march-sources">
        <a
          href={`https://www.ncaa.com/brackets/basketball-men/d1/${data.year}`}
          target="_blank"
          rel="noreferrer"
        >
          Official NCAA bracket ↗
        </a>
        <a
          href={`https://www.espn.com/mens-college-basketball/bracket/_/season/${data.year}`}
          target="_blank"
          rel="noreferrer"
        >
          ESPN bracket ↗
        </a>
      </div>
      {data.unavailable && (
        <p className="alert" role="status">
          The tournament feed could not refresh. Showing the last verified
          bracket.
        </p>
      )}
      <nav className="march-regions" aria-label="Bracket regions">
        {["All regions", ...regions].map((r) => (
          <button
            key={r}
            onClick={() => setRegion(r)}
            aria-pressed={region === r}
          >
            {r}
          </button>
        ))}
      </nav>
      {regions
        .filter((r) => region === "All regions" || region === r)
        .map((r) => (
          <section className="march-region" key={r}>
            <h3>
              {r === "Final Four" ? "Final Four & championship" : r + " region"}
            </h3>
            <div
              className="march-rounds"
              role="region"
              tabIndex={0}
              aria-label={r + " bracket rounds"}
            >
              {[
                ...new Set(
                  data.games.filter((g) => g.region === r).map((g) => g.order),
                ),
              ]
                .sort((a, b) => a - b)
                .map((order) => {
                  const games = data.games.filter(
                    (g) => g.region === r && g.order === order,
                  );
                  return (
                    <section className="march-round" key={order}>
                      <h4>{games[0].round}</h4>
                      {games.map((g) => (
                        <article className="march-game" key={g.id}>
                          <p className="march-date">
                            {formatInTimeZone(g.date, timeZone, {
                              month: "short",
                              day: "numeric",
                              ...(g.completed
                                ? {}
                                : { hour: "numeric", minute: "2-digit" }),
                            })}
                            {!g.completed &&
                              " " + timeZoneLabel(timeZone, g.date)}
                          </p>
                          {g.teams.map((t, i) => (
                            <div
                              className={
                                revealResults && t.winner ? "march-winner" : ""
                              }
                              key={t.id + i}
                            >
                              <small>{t.seed || "—"}</small>
                              <Image
                                unoptimized
                                className="bracket-team-logo"
                                src={
                                  t.logo ||
                                  espnTeamLogoUrl(
                                    "basketball/mens-college-basketball",
                                    t.id,
                                  )
                                }
                                alt=""
                                width={22}
                                height={22}
                                loading="lazy"
                              />
                              {t.url ? (
                                <a
                                  href={t.url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {t.name}
                                </a>
                              ) : (
                                <span>{t.name}</span>
                              )}
                              <b>{revealResults ? t.score : ""}</b>
                            </div>
                          ))}
                          <a
                            className="march-result-link"
                            href={g.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {revealResults ? g.status : "Scores hidden"} ·{" "}
                            {g.completed ? "Box score" : "Game details"} ↗
                          </a>
                        </article>
                      ))}
                    </section>
                  );
                })}
              <BracketConnectors
                key={data.checked + r}
                roundClass="march-round"
                matchClass="march-game"
              />
            </div>
          </section>
        ))}
      <p className="panel-note">
        Results: ESPN · Last update: {formatInTimeZone(data.checked, timeZone)}{" "}
        {timeZoneLabel(timeZone, data.checked)}
      </p>
    </section>
  );
}
