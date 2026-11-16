import assert from "node:assert/strict";
import test from "node:test";
import { restoreStoredPage } from "../lib/dashboard/page-selection.ts";

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
