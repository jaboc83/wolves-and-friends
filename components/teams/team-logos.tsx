// Row of local team logos for the teams a story is tagged with.
import Image from "next/image";
import { teamProfile, teams } from "../../lib/teams/teams";
import { teamLogoPath } from "../../lib/teams/team-logo";
import type { TeamId } from "../../lib/teams/teams";
export default function TeamLogos({ teamIds }: { teamIds: TeamId[] }) {
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
              alt={teamProfile(id)?.logoAlt || team.name + " logo"}
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
