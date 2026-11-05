// Returns the bundled local logo path for a team ID.
import { teams, type TeamId } from "./teams";
export function teamLogoPath(teamId: TeamId): string {
  return teams.find((t) => t.id === teamId)?.logo || `/logos/${teamId}.png`;
}
