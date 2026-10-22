export function teamLogoPath(teamId: string) {
  const extension =
    teamId === "disc" || teamId === "usmnt" || teamId === "zalgiris"
      ? "svg"
      : "png";
  return `/logos/${teamId}.${extension}`;
}
