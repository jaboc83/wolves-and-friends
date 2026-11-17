// Sortable roster table with per-player stats, loaded when the panel is opened.
"use client";
import {
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";
import { ExternalLink } from "lucide-react";
import type { TeamInfo } from "../../lib/team-info";
import { teamProfile } from "../../lib/teams/teams";
import type { PlayerStats } from "../../lib/team-info/player-stats";
import type { StatsStatus } from "../../lib/team-info/roster-stats-loader";
import { useRosterSalaries } from "../../hooks/use-roster-salaries";
import { salaryForPlayer } from "../../lib/team-info/salaryswish";
import { highestPaidPlayers } from "../../lib/team-info/roster-details";
import {
  combineBasketballRosterGroups,
  combineHockeyForwardGroups,
  combineTwinsRosterGroups,
  combineVikingsDefensiveLineGroups,
  combineVikingsLinebackerAndDefensiveBackGroups,
  combineVikingsOffensiveLineGroups,
  combineVikingsReceiverGroups,
  combineVikingsRunningBackGroups,
  createRosterStatsTable,
  orderVikingsRosterGroups,
  rosterStatValue,
  visibleRosterStatColumns,
  type RosterStatRow,
} from "../../lib/team-info/roster-stats-table";

type Depth = NonNullable<TeamInfo["depth"]>;
type RosterPlayer = Depth["groups"][number]["players"][number] & {
  position: string;
};
type RosterSort = { column: string; direction: "asc" | "desc" };
type Row = RosterStatRow<RosterPlayer>;
type RosterExternalLinks = {
  contracts: string;
  advancedStats: string;
  draftInfo?: string;
};
const emptySalaries: Record<string, number> = {};
const rosterExternalLinks: Partial<Record<string, RosterExternalLinks>> = {
  wolves: {
    contracts: "https://www.basketball-reference.com/contracts/MIN.html",
    advancedStats: "https://cleaningtheglass.com/stats/team/18",
    draftInfo: "https://www.spotrac.com/nba/draft/future#future-draft-tabs_109",
  },
  lynx: {
    contracts: "https://www.spotrac.com/wnba/minnesota-lynx/yearly",
    advancedStats: "https://www.basketball-reference.com/wnba/teams/MIN/2026.html",
    draftInfo: "https://www.spotrac.com/wnba/minnesota-lynx/draft",
  },
  wild: {
    contracts: "https://puckpedia.com/team/minnesota-wild",
    advancedStats: "https://hockeyviz.com/team/MIN/2627",
    draftInfo: "https://www.spotrac.com/nhl/minnesota-wild/draft",
  },
  vikings: {
    contracts: "https://www.spotrac.com/nfl/minnesota-vikings/yearly",
    advancedStats: "https://nflsavant.com/teams/MIN",
    draftInfo: "https://www.spotrac.com/nfl/minnesota-vikings/draft",
  },
  twins: {
    contracts: "https://www.nbcsports.com/mlb/minnesota-twins/contracts",
    advancedStats: "https://www.baseball-reference.com/teams/MIN/",
    draftInfo: "https://www.spotrac.com/mlb/draft",
  },
  loons: {
    contracts: "https://www.spotrac.com/mls/minnesota-united-fc/cap",
    advancedStats:
      "https://www.mlssoccer.com/clubs/minnesota-united-fc/stats/",
    draftInfo: "https://www.spotrac.com/mls/draft",
  },
  palace: {
    contracts: "https://www.spotrac.com/epl/crystal-palace/yearly",
    advancedStats:
      "https://theanalyst.com/football/team/scm-31/crystal-palace/stats",
  },
};

const defaultSortDirection = (column: string): "asc" | "desc" =>
  column === "Player" || column === "Position" ? "asc" : "desc";

const annualSalaryFormatters = {
  USD: new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }),
  GBP: new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "GBP",
    notation: "compact",
    maximumFractionDigits: 1,
  }),
};

const abbreviation = (position: string) => {
  const value = position.toLowerCase();
  if (/goalkeeper|goaltender|\bgk\b/.test(value)) return "GK";
  if (/offensive tackle|\bot\b/.test(value)) return "OT";
  if (/\bleft tackle\b|\blt\b/.test(value)) return "LT";
  if (/\bright tackle\b|\brt\b/.test(value)) return "RT";
  if (/left guard|\blg\b/.test(value)) return "LG";
  if (/right guard|\brg\b/.test(value)) return "RG";
  if (/offensive guard|\bog\b/.test(value)) return "OG";
  if (/long snapper|\bls\b/.test(value)) return "LS";
  if (/fullback|\bfb\b/.test(value)) return "FB";
  if (/running back|\brb\b/.test(value)) return "RB";
  if (/quarterback|\bqb\b/.test(value)) return "QB";
  if (/wide receiver|\bwr\b/.test(value)) return "WR";
  if (/tight end|\bte\b/.test(value)) return "TE";
  if (/outside linebacker|\bolb\b/.test(value)) return "OLB";
  if (/inside linebacker|\bilb\b/.test(value)) return "ILB";
  if (/linebacker|\blb\b/.test(value)) return "LB";
  if (/defensive end|\bde\b/.test(value)) return "DE";
  if (/defensive tackle|\bdt\b/.test(value)) return "DT";
  if (/cornerback|\bcb\b/.test(value)) return "CB";
  if (/free safety|\bfs\b/.test(value)) return "FS";
  if (/strong safety|\bss\b/.test(value)) return "SS";
  if (/safety/.test(value)) return "S";
  if (/defender|defen[cs]e|back|\bdef\b|\bdb\b/.test(value)) return "D";
  if (/\bleft winger?\b/.test(value)) return "LW";
  if (/\bright winger?\b/.test(value)) return "RW";
  if (/forward|wing|\bf\b/.test(value)) return "F";
  if (/center|centre|\bc\b/.test(value)) return "C";
  if (/guard|\bg\b/.test(value)) return "G";
  return position.slice(0, 4).toUpperCase();
};

function sortValue(row: Row, column: string) {
  if (column === "Player") return row.player.name;
  if (column === "Position") return row.player.position;
  return rosterStatValue(row.summary, column);
}

function compareRows(a: Row, b: Row, sort: RosterSort) {
  const av = sortValue(a, sort.column);
  const bv = sortValue(b, sort.column);
  const an = Number(av.replace(/[%,$,]/g, ""));
  const bn = Number(bv.replace(/[%,$,]/g, ""));
  const result =
    Number.isFinite(an) && Number.isFinite(bn) ? an - bn : av.localeCompare(bv);
  return sort.direction === "asc" ? result : -result;
}

function PlayerMeta({ player }: { player: RosterPlayer }) {
  const { campTeam, signedForSeason, draftPick } = player;
  if (!campTeam && !signedForSeason && !draftPick) return null;
  return (
    <span className="roster-table-player-meta">
      {[
        campTeam,
        signedForSeason && "Signed for 2026–27",
        draftPick && "2026 draft pick",
      ]
        .filter(Boolean)
        .join(" · ")}
    </span>
  );
}

function PlayerAgeAndSalary({
  player,
  highestPaid,
  currency,
}: {
  player: RosterPlayer;
  highestPaid: boolean;
  currency: keyof typeof annualSalaryFormatters;
}) {
  if (player.age === undefined && player.annualSalary === undefined)
    return null;
  const SalaryTag = highestPaid ? "strong" : "span";
  return (
    <span className="roster-player-age">
      {player.age !== undefined && `Age ${player.age}`}
      {player.age !== undefined && player.annualSalary !== undefined && " · "}
      {player.annualSalary !== undefined && (
        <SalaryTag
          className={highestPaid ? "roster-salary-top" : undefined}
          title={
            highestPaid
              ? "One of this team's five highest-paid players"
              : undefined
          }
        >
          {annualSalaryFormatters[currency].format(player.annualSalary)}/yr
        </SalaryTag>
      )}
    </span>
  );
}

const statusNotes: Partial<Record<StatsStatus, string>> = {
  idle: "Season stats will load shortly.",
  loading: "Loading ESPN season stats…",
  partial: "Some season stats could not refresh and will be retried.",
  empty: "Season stats could not be loaded for these players right now.",
  unavailable: "ESPN season stats are temporarily unavailable.",
};

export default function RosterPanel({
  teamId,
  league,
  depth,
  heading,
  noun,
  fallbackUrl,
  playerStats,
  playerStatsStatus,
  onRosterOpen,
}: {
  teamId: string;
  league?: string;
  depth?: Depth;
  heading: string;
  noun: string;
  fallbackUrl: string;
  playerStats: Record<string, PlayerStats>;
  playerStatsStatus: StatsStatus;
  onRosterOpen: (priorityKeys?: string[]) => void;
}) {
  const rosterNote = teamProfile(teamId)?.rosterNote;
  const salaryCurrency = league === "soccer/eng.1" ? "GBP" : "USD";
  const salaryState = useRosterSalaries(
    teamId,
    Boolean(depth?.salarySourceUrl),
    ["ready", "partial", "empty", "unavailable"].includes(playerStatsStatus),
    league,
    depth?.salarySeason,
  );
  const salaries =
    salaryState.team === teamId ? salaryState.salaries : emptySalaries;
  const salaryStatus =
    salaryState.team === teamId ? salaryState.status : "loading";
  const priorityKeys = useMemo(
    () =>
      depth?.groups.flatMap((group) =>
        group.players
          .map((player: { url: string }) => {
            const playerId = player.url.match(/\/_\/id\/(\d+)/)?.[1];
            return playerId && league ? `${league}:${playerId}` : "";
          })
          .filter(Boolean),
      ) || [],
    [depth, league],
  );
  const keyList = priorityKeys.join("|");
  const preload = useEffectEvent(() => onRosterOpen(priorityKeys));
  // Preload as soon as the team's roster is known, not when the panel opens.
  useEffect(() => {
    if (keyList) preload();
  }, [keyList]);

  const [sortOverride, setSortOverride] = useState<RosterSort | null>(null);
  const [sortTeam, setSortTeam] = useState(teamId);
  if (sortTeam !== teamId) {
    setSortTeam(teamId);
    setSortOverride(null);
  }

  const groups = useMemo(() => {
    if (!depth) return [];
    const sourceGroups = depth.groups.map((group) => ({
      position: group.position,
      players: group.players.map((player) => {
        const annualSalary = salaryForPlayer(salaries, player.name);
        return {
          ...player,
          ...(annualSalary !== undefined ? { annualSalary } : {}),
          position: abbreviation(group.position),
        };
      }),
    }));
    const runningBackGroups = combineVikingsRunningBackGroups(
      sourceGroups,
      teamId,
      league || "",
    );
    const offensiveLineGroups = combineVikingsOffensiveLineGroups(
      runningBackGroups,
      teamId,
      league || "",
    );
    const receiverGroups = combineVikingsReceiverGroups(
      offensiveLineGroups,
      teamId,
      league || "",
    );
    const defensiveLineGroups = combineVikingsDefensiveLineGroups(
      receiverGroups,
      teamId,
      league || "",
    );
    const orderedGroups = orderVikingsRosterGroups(
      combineVikingsLinebackerAndDefensiveBackGroups(
        defensiveLineGroups,
        teamId,
        league || "",
      ),
      teamId,
      league || "",
    );
    return combineTwinsRosterGroups(
      combineHockeyForwardGroups(
        combineBasketballRosterGroups(orderedGroups, teamId, league || ""),
        teamId,
        league || "",
      ),
      teamId,
      league || "",
    );
  }, [depth, league, salaries, teamId]);

  const highestPaid = useMemo(
    () => highestPaidPlayers(groups.flatMap((group) => group.players)),
    [groups],
  );
  const note = league ? statusNotes[playerStatsStatus] : undefined;
  const externalLinks = rosterExternalLinks[teamId];

  return (
    <details
      id="team-roster"
      className="data-panel"
      onToggle={(event) => {
        if (event.currentTarget.open) onRosterOpen(priorityKeys);
      }}
    >
      <summary>{heading}</summary>
      {depth ? (
        <>
          {externalLinks && (
            <div className="roster-contracts-actions">
              <a
                className="roster-contracts-button"
                href={externalLinks.contracts}
                target="_blank"
                rel="noreferrer"
              >
                <span>Player Contracts</span>
                <ExternalLink size={14} aria-hidden="true" />
              </a>
              <a
                className="roster-contracts-button"
                href={externalLinks.advancedStats}
                target="_blank"
                rel="noreferrer"
              >
                <span>Advanced Stats</span>
                <ExternalLink size={14} aria-hidden="true" />
              </a>
              {externalLinks.draftInfo && (
                <a
                  className="roster-contracts-button"
                  href={externalLinks.draftInfo}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>Draft Info</span>
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              )}
            </div>
          )}
          {note && (
            <p
              className="panel-note"
              aria-live={playerStatsStatus === "idle" ? undefined : "polite"}
            >
              {note}
            </p>
          )}
          {groups.map((group, i) => {
            const statsTable = createRosterStatsTable(
              group.players,
              league || "",
              playerStats,
            );
            const {
              columns,
              positionOnly: positionOnlyTable,
            } = visibleRosterStatColumns(
              teamId,
              league || "",
              group.position,
              statsTable.columns,
            );
            const seasonTitles = Array.from(
              new Set(
                statsTable.rows
                  .map(({ summary }) => summary?.title)
                  .filter((title): title is string => Boolean(title)),
              ),
            );
            const defaultColumn = columns[0] ?? "Player";
            const sort: RosterSort =
              sortOverride &&
              (sortOverride.column === "Player" ||
                sortOverride.column === "Position" ||
                columns.includes(sortOverride.column))
                ? sortOverride
                : {
                    column: defaultColumn,
                    direction: defaultSortDirection(defaultColumn),
                  };
            const toggleSort = (column: string) =>
              setSortOverride({
                column,
                direction:
                  sort.column === column
                    ? sort.direction === "asc"
                      ? "desc"
                      : "asc"
                    : defaultSortDirection(column),
              });
            const header = (
              column: string,
              label: string,
              className?: string,
            ) => (
              <th
                scope="col"
                key={column}
                title={
                  column === "Position"
                    ? "Position"
                    : statsTable.rows
                        .flatMap(({ summary }) => summary?.values ?? [])
                        .find((stat) => stat.label === column)?.description
                }
                className={
                  [className, sort.column === column && "sorted-column"]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
                onClick={() => toggleSort(column)}
                onKeyDown={(event: KeyboardEvent<HTMLTableCellElement>) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggleSort(column);
                  }
                }}
                aria-sort={
                  sort.column === column
                    ? sort.direction === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
                tabIndex={0}
              >
                {label}{" "}
                {sort.column === column
                  ? sort.direction === "asc"
                    ? "↑"
                    : "↓"
                  : ""}
              </th>
            );
            const sortedClass = (column: string) =>
              sort.column === column ? "sorted-column" : undefined;
            return (
              <section className="depth-row" key={group.position + i}>
                <h3 className="visually-hidden">{group.position}</h3>
                {columns.length > 0 || positionOnlyTable ? (
                  <div
                    className="roster-stats-table-scroll"
                    role="region"
                    aria-label={`${group.position} ${positionOnlyTable ? "roster" : "player season stats"}`}
                    tabIndex={0}
                  >
                    <table className="roster-stats-table">
                      <caption>
                        {positionOnlyTable
                          ? group.position
                          : `${group.position} season stats`}
                        {!positionOnlyTable &&
                          seasonTitles.length > 0 &&
                          ` · ${seasonTitles.join(" / ")}`}
                      </caption>
                      <thead>
                        <tr>
                          {header("Player", "Player", "roster-player-header")}
                          {header("Position", "Pos.")}
                          {columns.map((column) =>
                            header(column, column),
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {[...statsTable.rows]
                          .sort((a, b) => compareRows(a, b, sort))
                          .map(({ player: p, summary }) => (
                            <tr key={p.url + p.name}>
                              <th scope="row" className={sortedClass("Player")}>
                                <a
                                  href={p.url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {p.name} ↗
                                </a>
                                <PlayerAgeAndSalary
                                  player={p}
                                  highestPaid={highestPaid.has(p)}
                                  currency={salaryCurrency}
                                />
                                <PlayerMeta player={p} />
                              </th>
                              <td className={sortedClass("Position")}>
                                {p.position || "—"}
                              </td>
                              {columns.map((column) => (
                                <td
                                  key={column}
                                  title={
                                    summary?.values.find(
                                      (value) => value.label === column,
                                    )?.description
                                  }
                                  className={sortedClass(column)}
                                >
                                  {rosterStatValue(summary, column)}
                                </td>
                              ))}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <ol className="roster-player-list">
                    {[...group.players]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((p) => (
                        <li key={p.url + p.name}>
                          <a href={p.url} target="_blank" rel="noreferrer">
                            {p.name} ↗
                          </a>
                          <PlayerAgeAndSalary
                            player={p}
                            highestPaid={highestPaid.has(p)}
                            currency={salaryCurrency}
                          />
                          <PlayerMeta player={p} />
                        </li>
                      ))}
                  </ol>
                )}
              </section>
            );
          })}
          <p className="panel-note">
            <a href={depth.url} target="_blank" rel="noreferrer">
              {depth.source} ↗
            </a>{" "}
            {depth.salarySourceUrl && (
              <>
                ·{" "}
                <a
                  href={depth.salarySourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {teamId === "lynx"
                    ? "Her Hoop Stats"
                    : teamId === "frost"
                      ? "PWHLPA"
                      : league === "hockey/nhl"
                    ? "CapWages"
                    : league === "baseball/mlb"
                      ? "FanGraphs"
                      : league === "soccer/eng.1"
                        ? "SalarySport"
                        : "SalarySwish"}{" "}
                  ↗
                </a>{" "}
              </>
            )}
            {rosterNote ? "· " + rosterNote : ""}
          </p>
          {depth.salarySourceUrl && league === "baseball/mlb" && (
            <p className="panel-note">
              Unreported or estimated amounts are omitted.
            </p>
          )}
          {depth.salarySourceUrl && league === "soccer/eng.1" && (
            <p className="panel-note">
              Reported annual basic wages in GBP; bonuses excluded.
            </p>
          )}
          {depth.salarySourceUrl && teamId === "lynx" && (
            <p className="panel-note">
              Her Hoop Stats 2026 salary-cap figures in USD; unreported figures
              are omitted.
            </p>
          )}
          {depth.salarySourceUrl && teamId === "frost" && (
            <p className="panel-note">
              PWHLPA 2025–26 salary guide in USD; current contracts may differ.
            </p>
          )}
          {depth.salarySourceUrl &&
            salaryStatus === "loading" &&
            !Object.keys(salaries).length && (
              <p className="panel-note" role="status">
                Loading salary data…
              </p>
            )}
          {depth.salarySourceUrl && salaryStatus === "error" && (
            <p className="panel-note" role="status">
              {Object.keys(salaries).length
                ? "Salary refresh unavailable; showing cached figures."
                : "Salary data is temporarily unavailable."}
            </p>
          )}
        </>
      ) : (
        <p className="panel-note">
          A {noun.toLowerCase()} is not available from the current feed.{" "}
          <a href={fallbackUrl} target="_blank" rel="noreferrer">
            Open team {noun.toLowerCase()} ↗
          </a>
        </p>
      )}
    </details>
  );
}
