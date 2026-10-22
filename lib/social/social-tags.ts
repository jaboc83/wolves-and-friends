// Team-specific hashtags used to discover public social posts.
import type { TeamId } from "../teams/teams";
export const socialTags = {
  wild: ["#MNWild"],
  vikings: ["#Skol"],
  twins: ["#MNTwins"],
  loons: ["#MNUFC"],
  palace: ["#CPFC"],
  disc: ["#DGPT", "#PDGA"],
  lynx: ["#MinnesotaLynx"],
  zalgiris: ["#Zalgiris"],
  frost: ["#MinnesotaFrost"],
  usmnt: ["#USMNT"],
} as const satisfies Partial<Record<TeamId, readonly string[]>>;
export type SocialTagTeam = keyof typeof socialTags;
