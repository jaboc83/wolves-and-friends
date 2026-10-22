// Returns the bundled local logo path for a team ID.
import type { TeamId } from "./teams";
export function teamLogoPath(teamId: TeamId) {
  const extension =
    teamId === "disc" || teamId === "usmnt" || teamId === "zalgiris"
      ? "svg"
      : "png";
  return `/logos/${teamId}.${extension}`;
}
