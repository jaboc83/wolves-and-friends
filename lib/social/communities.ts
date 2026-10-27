// Team-to-community links shown alongside public social stories; edit them in team profiles.
import { teams, type TeamId } from "../teams/teams";
export const communities: { team: TeamId; name: string; url: string }[] =
  teams.flatMap((t) => t.communities.map((c) => ({ team: t.id, ...c })));
