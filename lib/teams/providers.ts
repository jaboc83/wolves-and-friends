// Server-only registry of per-team provider config; never import from client code.
import type { TeamProviders } from "./team-types";
import { wolvesProviders } from "./wolves/providers";
import { wildProviders } from "./wild/providers";
import { vikingsProviders } from "./vikings/providers";
import { twinsProviders } from "./twins/providers";
import { loonsProviders } from "./loons/providers";
import { palaceProviders } from "./palace/providers";
import { discProviders } from "./disc/providers";
import { lynxProviders } from "./lynx/providers";
import { zalgirisProviders } from "./zalgiris/providers";
import { frostProviders } from "./frost/providers";
import { usmntProviders } from "./usmnt/providers";

export const teamProviders: readonly TeamProviders[] = [
  wolvesProviders,
  wildProviders,
  vikingsProviders,
  twinsProviders,
  loonsProviders,
  palaceProviders,
  discProviders,
  lynxProviders,
  zalgirisProviders,
  frostProviders,
  usmntProviders,
];
