import assert from "node:assert/strict";
import test from "node:test";
import { restoreStoredPage } from "../lib/dashboard/page-selection.ts";
import { isDashboardPageId } from "../lib/dashboard/page-id.ts";

type Page = "all" | "twins";
const isPage = (value: unknown): value is Page =>
  value === "all" || value === "twins";

test("a missing stored page uses the fallback", () => {
  assert.equal(
    restoreStoredPage({ getItem: () => null }, isPage, "all"),
    "all",
  );
});

test("a valid stored page is preserved", () => {
  assert.equal(
    restoreStoredPage({ getItem: () => "twins" }, isPage, "all"),
    "twins",
  );
});

test("invalid or unavailable storage uses the fallback", () => {
  assert.equal(
    restoreStoredPage({ getItem: () => "nope" }, isPage, "all"),
    "all",
  );
  assert.equal(
    restoreStoredPage(
      {
        getItem: () => {
          throw new Error("Unavailable");
        },
      },
      isPage,
      "all",
    ),
    "all",
  );
});

test("retired team selections fall back to All while active pages are preserved", () => {
  for (const id of ["zalgiris", "usmnt"]) {
    assert.equal(
      restoreStoredPage({ getItem: () => id }, isDashboardPageId, "all"),
      "all",
    );
  }
  for (const id of ["wolves", "frost", "all", "march-madness"]) {
    assert.equal(
      restoreStoredPage({ getItem: () => id }, isDashboardPageId, "all"),
      id,
    );
  }
});
