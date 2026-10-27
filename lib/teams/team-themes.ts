// Brand-color palette applied to each dashboard page; team colors live in team profiles.
import type { TeamProfile } from "./team-types";
import { teams } from "./teams";

export const teamThemes: Record<string, TeamProfile["theme"]> = {
  "march-madness": { primary: "#7a0019", accent: "#ffcc33", soft: "#fff7df" },
  ...Object.fromEntries(teams.map((t) => [t.id, t.theme])),
};
