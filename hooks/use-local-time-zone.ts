// Returns the browser's time zone, falling back to UTC during server rendering.
"use client";
import { useSyncExternalStore } from "react";
import { localTimeZone } from "../lib/browser/local-time";

const subscribe = () => () => {};
const serverTimeZone = () => "UTC";

export function useLocalTimeZone() {
  return useSyncExternalStore(subscribe, localTimeZone, serverTimeZone);
}
