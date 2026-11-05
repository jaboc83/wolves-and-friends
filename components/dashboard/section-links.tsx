// In-page jump links that open and scroll to the calendar, roster, and standings panels.
"use client";
import { sportTerms } from "../../lib/teams/sport-terms";
import { teamProfile } from "../../lib/teams/teams";
import type { DashboardPageId } from "../../lib/dashboard/page-id";

export default function SectionLinks({
  active,
  hasPowerRankings = false,
}: {
  active: DashboardPageId;
  hasPowerRankings?: boolean;
}) {
  const terms = sportTerms(active);
  const links =
    active === "all"
      ? [{ id: "event-calendar", label: "Calendar" }]
      : [
          { id: "event-calendar", label: "Calendar" },
          ...(teamProfile(active)?.individual
            ? []
            : [{ id: "team-roster", label: terms.roster }]),
          { id: "team-standings", label: terms.standings },
          ...(hasPowerRankings
            ? [{ id: "team-power-rankings", label: "Power rankings" }]
            : []),
        ];
  return (
    <nav className="section-links" aria-label="Jump to team information">
      {links.map(({ id, label }) => (
        <a
          key={id}
          href={`#${id}`}
          onClick={(event) => {
            const panel = document.getElementById(id);
            if (!(panel instanceof HTMLDetailsElement)) return;
            event.preventDefault();
            panel.open = true;
            panel.querySelector("summary")?.focus({ preventScroll: true });
            panel.scrollIntoView({
              behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                .matches
                ? "instant"
                : "smooth",
              block: "start",
            });
          }}
        >
          {label} <span aria-hidden="true">↓</span>
        </a>
      ))}
    </nav>
  );
}
