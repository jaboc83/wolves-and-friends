// Returns the bundled local logo path for a team ID.
export function teamLogoPath(teamId: string) {
  const extension =
    teamId === "disc" || teamId === "usmnt" || teamId === "zalgiris"
      ? "svg"
      : "png";
  return `/logos/${teamId}.${extension}`;
}
