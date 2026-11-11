// Team picker menu for switching dashboard pages, marking teams that play today.
"use client";
import { useState } from "react";
import Image from "next/image";
import { sportTerms } from "../../lib/teams/sport-terms";
import { teamLogoPath } from "../../lib/teams/team-logo";
import { teamProfile, teams } from "../../lib/teams/teams";
import type { DashboardPageId } from "../../lib/dashboard/page-id";

type TeamNavigationProps = {
  active: DashboardPageId;
  teamsPlayingToday: ReadonlySet<string>;
  onChoose: (id: DashboardPageId) => void;
};

export default function TeamNavigation({
  active,
  teamsPlayingToday,
  onChoose,
}: TeamNavigationProps) {
  const [open, setOpen] = useState(false);
  const activeTeam = teams.find((team) => team.id === active);
  const menuTitle =
    active === "march-madness"
      ? "March Madness"
      : activeTeam?.short || "All teams";

  function choose(id: DashboardPageId) {
    setOpen(false);
    onChoose(id);
  }

  return (
    <>
      <button
        className="team-menu-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="team-filters"
      >
        <span aria-hidden="true">{open ? "×" : "☰"}</span>
        <strong>{menuTitle}</strong>
        <span className="team-menu-caption">
          {open ? "Close teams" : "Choose team"}
        </span>
      </button>
      <nav
        id="team-filters"
        className={"team-nav " + (open ? "menu-open" : "")}
        aria-label="Team filters"
      >
        <button
          aria-pressed={active === "all"}
          className={active === "all" ? "selected" : ""}
          onClick={() => choose("all")}
        >
          <Image
            unoptimized
            className="team-tab-logo"
            src="/logos/wolves-friends-neutral.png"
            alt=""
            width={40}
            height={40}
          />
          <span>All teams</span>
        </button>
        {teams.map((team) => (
          <button
            key={team.id}
            data-tab-team={team.id}
            aria-pressed={active === team.id}
            className={active === team.id ? "selected" : ""}
            onClick={() => choose(team.id)}
          >
            <span className="dot" style={{ background: team.color }} />
            <Image
              unoptimized
              className="team-tab-logo"
              src={teamProfile(team.id)?.tabLogo || teamLogoPath(team.id)}
              alt=""
              width={40}
              height={40}
            />
            <span>{team.short}</span>
            {teamsPlayingToday.has(team.id) && (
              <span
                className="team-today"
                title={`${sportTerms(team.id).event} today`}
              >
                Today
              </span>
            )}
          </button>
        ))}
        <button
          data-tab-team="march-madness"
          aria-pressed={active === "march-madness"}
          className={active === "march-madness" ? "selected" : ""}
          onClick={() => choose("march-madness")}
        >
          <Image
            unoptimized
            className="team-tab-logo"
            src="/logos/march-madness.svg"
            alt=""
            width={40}
            height={40}
          />
          <span>March Madness</span>
        </button>
      </nav>
    </>
  );
}
