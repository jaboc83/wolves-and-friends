import assert from "node:assert/strict";
import test from "node:test";
import { loadPageBeforeBackground } from "../lib/browser/page-first-feeds.ts";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test("background feeds wait for the visible page", async () => {
  const visible = deferred();
  const calls: string[] = [];
  const load = loadPageBeforeBackground({
    currentPage: () => "wolves",
    loadPage: async (page) => {
      calls.push(page);
      await visible.promise;
    },
    background: [
      async () => {
        calls.push("wild");
      },
    ],
    isRunning: () => true,
  });
  assert.deepEqual(calls, ["wolves"]);
  visible.resolve();
  await load;
  assert.deepEqual(calls, ["wolves", "wild"]);
});

test("navigation takes priority before the next background feed", async () => {
  const firstBackground = deferred();
  const nextPage = deferred();
  const backgroundStarted = deferred();
  let active = "wolves";
  const calls: string[] = [];
  const load = loadPageBeforeBackground({
    currentPage: () => active,
    loadPage: async (page) => {
      calls.push(page);
      if (page === "twins") await nextPage.promise;
    },
    background: [
      async () => {
        calls.push("wild");
        backgroundStarted.resolve();
        await firstBackground.promise;
      },
      async () => {
        calls.push("vikings");
      },
    ],
    isRunning: () => true,
  });
  await backgroundStarted.promise;
  active = "twins";
  firstBackground.resolve();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.deepEqual(calls, ["wolves", "wild", "twins"]);
  nextPage.resolve();
  await load;
  assert.deepEqual(calls, ["wolves", "wild", "twins", "vikings"]);
});

test("navigation while the initial page loads is rechecked", async () => {
  const firstPage = deferred();
  let active = "wolves";
  const calls: string[] = [];
  const load = loadPageBeforeBackground({
    currentPage: () => active,
    loadPage: async (page) => {
      calls.push(page);
      if (page === "wolves") await firstPage.promise;
    },
    background: [
      async () => {
        calls.push("background");
      },
    ],
    isRunning: () => true,
  });
  active = "all";
  firstPage.resolve();
  await load;
  assert.deepEqual(calls, ["wolves", "all", "background"]);
});

test("stopping prevents queued background requests", async () => {
  const visible = deferred();
  let running = true;
  let backgroundCalls = 0;
  const load = loadPageBeforeBackground({
    currentPage: () => "wolves",
    loadPage: () => visible.promise,
    background: [
      async () => {
        backgroundCalls += 1;
      },
    ],
    isRunning: () => running,
  });
  running = false;
  visible.resolve();
  await load;
  assert.equal(backgroundCalls, 0);
});

test("handled visible-feed failures do not retry before each background task", async () => {
  let attempts = 0;
  let backgroundCalls = 0;
  await loadPageBeforeBackground({
    currentPage: () => "wolves",
    loadPage: async () => {
      attempts += 1;
      await Promise.reject(new Error("unavailable")).catch(() => {});
    },
    background: [
      async () => {
        backgroundCalls += 1;
      },
      async () => {
        backgroundCalls += 1;
      },
    ],
    isRunning: () => true,
  });
  assert.equal(attempts, 1);
  assert.equal(backgroundCalls, 2);
});
