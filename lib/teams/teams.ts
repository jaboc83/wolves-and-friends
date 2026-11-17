// Central team catalog: IDs plus the ordered list of client-safe team profiles.
import type { TeamProfile } from "./team-types";
import { wolvesProfile } from "./wolves/profile.ts";
import { wildProfile } from "./wild/profile.ts";
import { vikingsProfile } from "./vikings/profile.ts";
import { twinsProfile } from "./twins/profile.ts";
import { loonsProfile } from "./loons/profile.ts";
import { palaceProfile } from "./palace/profile.ts";
import { discProfile } from "./disc/profile.ts";
import { lynxProfile } from "./lynx/profile.ts";
import { frostProfile } from "./frost/profile.ts";

export const TEAM_IDS = {
  WOLVES: "wolves",
  WILD: "wild",
  VIKINGS: "vikings",
  TWINS: "twins",
  LOONS: "loons",
  PALACE: "palace",
  DISC: "disc",
  LYNX: "lynx",
  FROST: "frost",
} as const;

export type TeamId = (typeof TEAM_IDS)[keyof typeof TEAM_IDS];

const teamIdSet: ReadonlySet<string> = new Set(Object.values(TEAM_IDS));
export const isTeamId = (value: unknown): value is TeamId =>
  typeof value === "string" && teamIdSet.has(value);

// Per-team data lives in lib/teams/<id>/profile.ts; array order is tab/priority order.
export const teams = [
  wolvesProfile,
  wildProfile,
  vikingsProfile,
  twinsProfile,
  loonsProfile,
  palaceProfile,
  discProfile,
  lynxProfile,
  frostProfile,
] as const satisfies readonly TeamProfile[];

export const teamPriority = (id: TeamId) => teams.findIndex((t) => t.id === id);

// Widened lookup for optional profile fields that only some teams define.
export const teamProfile = (id: string): TeamProfile | undefined =>
  teams.find((t) => t.id === id);
