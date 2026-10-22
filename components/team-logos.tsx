import Image from "next/image";
import { teams } from "../lib/teams/teams";
import { teamLogoPath } from "../lib/teams/team-logo";
export default function TeamLogos({ teamIds }: { teamIds: string[] }) {
  return (
    <div className="team-logos">
      {teamIds.map((id) => {
        const team = teams.find((t) => t.id === id);
        if (!team) return null;
        return (
          <span key={id} className="team-logo" title={team.name}>
            <Image
              unoptimized
              src={teamLogoPath(id)}
              alt={
                id === "disc" ? "Disc Golf Pro Tour logo" : team.name + " logo"
              }
              width={40}
              height={40}
              loading="lazy"
            />
          </span>
        );
      })}
    </div>
  );
}
