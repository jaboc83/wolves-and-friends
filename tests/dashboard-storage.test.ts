import assert from "node:assert/strict";
import test from "node:test";
import { storedDashboardPage } from "../lib/dashboard/storage.ts";

test("the dashboard defaults to All Teams without a stored page", () => {
  assert.equal(storedDashboardPage({ getItem: () => null }), "all");
});

test("the dashboard preserves a valid stored page", () => {
  assert.equal(storedDashboardPage({ getItem: () => "twins" }), "twins");
});

test("the dashboard defaults to All Teams for invalid or unavailable storage", () => {
  assert.equal(storedDashboardPage({ getItem: () => "not-a-page" }), "all");
  assert.equal(
    storedDashboardPage({
      getItem: () => {
        throw new Error("Unavailable");
      },
    }),
    "all",
  );
});
