// Server-only registry of per-team behavior hooks; never import from client code.
import type { TeamServerHooks } from "./server-types";
import { wolvesServer } from "./wolves/server";
import { twinsServer } from "./twins/server";
import { loonsServer } from "./loons/server";
import { palaceServer } from "./palace/server";
import { discServer } from "./disc/server";
import { zalgirisServer } from "./zalgiris/server";
import { frostServer } from "./frost/server";
import { usmntServer } from "./usmnt/server";

export const teamServerHooks: readonly TeamServerHooks[] = [
  wolvesServer,
  twinsServer,
  loonsServer,
  palaceServer,
  discServer,
  zalgirisServer,
  frostServer,
  usmntServer,
];

export const serverHooksFor = (team: string) =>
  teamServerHooks.find((hooks) => hooks.team === team);
