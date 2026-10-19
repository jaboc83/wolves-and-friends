"use client";
import { sportTerms } from "../lib/sport-terms";

export default function SectionLinks({ active }: { active: string }) {
  const terms = sportTerms(active);
  const links = [
    { id: "event-calendar", label: "Calendar" },
    ...(active === "disc" ? [] : [{ id: "team-roster", label: terms.roster }]),
    { id: "team-standings", label: terms.standings },
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
