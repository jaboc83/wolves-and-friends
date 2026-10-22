import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
function loader(overrides = {}) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
    const module = { exports: {} }; cache.set(file, module);
    const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
    } }).outputText;
    new Function('require', 'module', 'exports', js)((name) => {
      if (name in overrides) return overrides[name];
      if (!name.startsWith('.')) return require(name);
      const resolved = path.resolve(path.dirname(file), name);
      return load(resolved.endsWith('.json') ? resolved : resolved + '.ts');
    }, module, module.exports);
    return module.exports;
  }
  return (file) => load(path.resolve(file));
}
const originalFetch = globalThis.fetch;
const originalNow = Date.now;
try {
  let now = Date.now(); Date.now = () => now;
  const stat = { title: 'Season', values: [{ label: 'PTS', value: '20', description: 'Points' }] };
  globalThis.fetch = async (url) => ({ ok: true, json: async () => String(url).endsWith('/roster') ? {
    team: { id: '16' }, season: { year: 2027 }, athletes: Array.from({ length: 307 }, (_, i) => ({ id: String(i + 1) })),
  } : {} });
  const overrides = { '../../../lib/teams': { teams: [{ league: 'basketball/nba', espn: 'min' }] }, '../../../lib/player-stats': { parsePlayerStats: () => stat } };
  const route = loader(overrides)('app/api/roster-stats/route.ts');
  const first = await (await route.GET(new Request('https://local?batch=0'))).json();
  assert.equal(first.totalBatches, 103);
  const last = await route.GET(new Request('https://local?batch=102&version=' + first.manifestVersion));
  assert.equal(last.status, 200); assert.equal((await last.json()).players.length, 1);
  assert.equal((await route.GET(new Request('https://local?batch=103'))).status, 400);
  assert.equal((await route.GET(new Request('https://local?batch=0&version=obsolete'))).status, 409);
  const another = loader(overrides)('app/api/roster-stats/route.ts');
  now += 100;
  assert.equal((await (await another.GET(new Request('https://local?batch=0'))).json()).manifestVersion, first.manifestVersion, 'version identical across Workers');

  const { createRosterStatsLoader } = loader()('lib/roster-stats-loader.ts');
  const load = createRosterStatsLoader(() => now); let fail = true; let calls = 0; let status; let received;
  const options = { initial: {}, fetchBatch: async (batch) => {
    calls++; if (batch === 1 && fail) throw Error('offline');
    return { totalBatches: 103, manifestVersion: 'stable', players: [{ key: String(batch), stats: stat }] };
  }, onStats: (stats) => { received = stats; }, onStatus: (s) => { status = s; } };
  const a = load(options); assert.equal(load(options), a); await a;
  assert.equal(status, 'partial'); assert.equal(Object.keys(received).length, 102);
  const partialCalls = calls; fail = false; now += 120001; await load(options);
  assert.equal(calls - partialCalls, 1, 'retry only failed page'); assert.equal(status, 'ready');
  assert.equal(Object.keys(received).length, 103); await load(options); assert.equal(calls, partialCalls + 1);
  now += 900001; await load(options); assert.equal(calls, partialCalls + 104, 'positive data revalidates after TTL');

  const { mergeTeamInfo } = loader()('lib/team-info-cache.ts');
  const table = (name) => ({ name, source: 'test', url: 'https://test/' + name, columns: [], rows: [], checked: 'old' });
  const previous = { id: 'zalgiris', tables: [table('EuroLeague'), table('LKL')], unavailable: [] };
  const merged = mergeTeamInfo({ ...previous, tables: [table('EuroLeague')], unavailable: ['LKL standings'] }, previous);
  assert.equal(merged.tables.length, 2); assert.equal(merged.tables[1].stale, true); assert.equal(merged.tables[1].checked, 'old');
  assert.equal(mergeTeamInfo({ ...previous, tables: [table('EuroLeague')], unavailable: [] }, previous).tables.length, 1, 'valid absence drops obsolete table');
  const recovered = mergeTeamInfo(previous, merged); assert.equal(recovered.tables.length, 2); assert.ok(recovered.tables.every(t => !t.stale));

  let upstream = 0;
  globalThis.fetch = async () => { upstream++; await Promise.resolve(); return { ok: true, json: async () => ({ events: [] }) }; };
  const { fetchScoreboard } = loader()('lib/scoreboard.ts');
  const data = await Promise.all(Array.from({ length: 3 }, () => fetchScoreboard('basketball/nba', '20261021')));
  assert.equal(upstream, 1); data[0].events.push('mutated'); assert.equal(data[1].events.length, 0);
  const scoreRoute = loader({ '../../../lib/scoreboard': { fetchScoreboard }, '../../../lib/competitions': { scoreboardLeagues: ['basketball/nba'] }, '../../../lib/feeds': { mergeLiveScoreboard: () => {} } })('app/api/scores/route.ts');
  await Promise.all([scoreRoute.GET(), scoreRoute.GET(), scoreRoute.GET()]);
  assert.ok(upstream <= 2, 'route requests coalesce');
  now += 30001; let failureCalls = 0;
  globalThis.fetch = async () => { failureCalls++; return { ok: false }; };
  await assert.rejects(fetchScoreboard('basketball/nba', '20261022'));
  await assert.rejects(fetchScoreboard('basketball/nba', '20261022'));
  assert.equal(failureCalls, 2, 'failed upstream not latched');

  const { loadedNewsData, newsDisplayMode } = loader()('lib/news-page-data.ts');
  assert.equal(newsDisplayMode(true, true, false), 'stories', 'refresh never replaces loaded stories with spinner');
  assert.equal(newsDisplayMode(false, true, true), 'stories', 'failed refresh keeps loaded stories visible');
  assert.equal(newsDisplayMode(true, false, false), 'loading');
  assert.equal(newsDisplayMode(false, false, true), 'error');
  const page = { checked: 'last-success', stories: [{ id: 'loaded' }], authors: [], health: [], games: [] };
  const pages = { wolves: page };
  // Loading/error transitions change status separately, never the successful page.
  for (const status of ['ready', 'loading', 'error']) {
    assert.equal(loadedNewsData(['wolves'], pages).stories[0].id, 'loaded', status);
    assert.equal(loadedNewsData(['wolves'], pages).checked, 'last-success');
  }
  assert.equal(loadedNewsData(['wild'], pages).stories.length, 0, 'no seed/other-team leakage');
  const feedMocks = {
    './bylines': { verifyAuthorFeed: async () => {} },
    './author-stories': { authorStories: () => [] },
    './scoreboard': { fetchScoreboard: async () => ({ events: [] }) },
    './initial.json': { games: [], stories: [], authors: [] },
    './teams': { teams: [{ id: 'wolves', short: 'Wolves', league: 'basketball/nba', espn: 'min', sport: 'NBA', pattern: 'timberwolves' }] },
    './competitions': { palaceCompetitions: {}, scoreboardLeagues: [], teamPlaysCompetition: () => true },
  };
  globalThis.fetch = async (url) => ({ ok: true, json: async () => String(url).includes('/injuries?') ? {
    injuries: [{ displayName: 'Minnesota Timberwolves', injuries: [{ athlete: { displayName: 'Player' }, status: 'Out' }] }],
  } : { events: [{ id: '1', name: 'Fixture', date: new Date().toISOString(), competitions: [{ competitors: [{ team: { displayName: 'Minnesota Timberwolves', abbreviation: 'MIN' }, homeAway: 'home' }] }] }], season: { year: 2027 } }, text: async () => '' });
  const { hubData } = loader(feedMocks)('lib/feeds.ts');
  const hub = await hubData('schedules');
  assert.equal(hub.games.find(g => g.team === 'wolves').injuries[0].player, 'Player');
  assert.equal(hub.health.find(h => h.name.startsWith('ESPN injury')).count, 1);
  console.log('Audit regressions passed: pagination/versioning, retries, partial tables, concurrent score fetches, injuries.');
} finally { globalThis.fetch = originalFetch; Date.now = originalNow; }
