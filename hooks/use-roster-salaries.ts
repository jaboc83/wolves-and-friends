"use client";

import { useEffect, useState } from "react";
import { browserStorage } from "../lib/browser/storage";
import {
  readRosterSalaryCache,
  writeRosterSalaryCache,
} from "../lib/team-info/roster-salary-cache";
import {
  isRosterSalaryResponse,
  salarySeasonLabel,
} from "../lib/team-info/salaryswish";

type SalaryState = {
  team: string;
  salaries: Record<string, number>;
  status: "loading" | "ready" | "error";
};

export function useRosterSalaries(
  team: string,
  enabled: boolean,
  higherPriorityDataReady: boolean,
  league = "",
  sourceSeason?: string,
): SalaryState {
  const [state, setState] = useState<SalaryState>({
    team: "",
    salaries: {},
    status: "loading",
  });

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const controller = new AbortController();
    const season =
      sourceSeason || salarySeasonLabel(new Date().getUTCFullYear(), league);
    const cached = readRosterSalaryCache(browserStorage, team, season);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let deferTimer: ReturnType<typeof setTimeout> | undefined;
    let idleCallback: number | undefined;

    const refresh = async () => {
      try {
        const response = await fetch(
          `/api/roster-salaries?team=${encodeURIComponent(team)}`,
          {
            cache: "no-store",
            credentials: "omit",
            referrerPolicy: "no-referrer",
            signal: controller.signal,
          },
        );
        if (!response.ok) throw new Error("Salary data unavailable");
        const payload: unknown = await response.json();
        if (
          !isRosterSalaryResponse(payload) ||
          payload.team !== team ||
          payload.season !== season
        )
          throw new Error("Invalid salary data");
        if (!active) return;
        setState({
          team,
          salaries:
            payload.stale && Object.keys(cached).length > 0
              ? cached
              : payload.salaries,
          status: payload.stale ? "error" : "ready",
        });
        if (!payload.stale)
          writeRosterSalaryCache(
            browserStorage,
            team,
            payload.season,
            payload.salaries,
            Date.parse(payload.checked),
          );
      } catch {
        if (!active || controller.signal.aborted) return;
        setState({ team, salaries: cached, status: "error" });
      }
    };

    const startRefresh = () => {
      if ("requestIdleCallback" in window) {
        idleCallback = window.requestIdleCallback(() => void refresh(), {
          timeout: 10000,
        });
      } else {
        timeout = setTimeout(() => void refresh(), 2000);
      }
    };

    const cacheTimer = setTimeout(() => {
      if (!active) return;
      setState({ team, salaries: cached, status: "loading" });
      if (higherPriorityDataReady) startRefresh();
      else deferTimer = setTimeout(startRefresh, 20000);
    }, 0);

    return () => {
      active = false;
      controller.abort();
      clearTimeout(cacheTimer);
      if (deferTimer !== undefined) clearTimeout(deferTimer);
      if (idleCallback !== undefined && "cancelIdleCallback" in window)
        window.cancelIdleCallback(idleCallback);
      if (timeout !== undefined) clearTimeout(timeout);
    };
  }, [enabled, higherPriorityDataReady, league, sourceSeason, team]);

  return state;
}
