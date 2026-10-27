// Central team catalog: IDs plus the ordered list of client-safe team profiles.
import type { TeamProfile } from "./team-types";
import { wolvesProfile } from "./wolves/profile";
import { wildProfile } from "./wild/profile";
import { vikingsProfile } from "./vikings/profile";
import { twinsProfile } from "./twins/profile";
import { loonsProfile } from "./loons/profile";
import { palaceProfile } from "./palace/profile";
import { discProfile } from "./disc/profile";
import { lynxProfile } from "./lynx/profile";
import { zalgirisProfile } from "./zalgiris/profile";
import { frostProfile } from "./frost/profile";
import { usmntProfile } from "./usmnt/profile";

export const TEAM_IDS = {
  WOLVES: "wolves",
  WILD: "wild",
  VIKINGS: "vikings",
  TWINS: "twins",
  LOONS: "loons",
  PALACE: "palace",
  DISC: "disc",
  LYNX: "lynx",
  ZALGIRIS: "zalgiris",
  FROST: "frost",
  USMNT: "usmnt",
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
  zalgirisProfile,
  frostProfile,
  usmntProfile,
] as const satisfies readonly TeamProfile[];

export const teamPriority = (id: TeamId) => teams.findIndex((t) => t.id === id);

// Widened lookup for optional profile fields that only some teams define.
export const teamProfile = (id: string): TeamProfile | undefined =>
  teams.find((t) => t.id === id);
