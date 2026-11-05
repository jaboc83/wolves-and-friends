import assert from "node:assert/strict";
import test from "node:test";
import {
  loadScorePreference,
  saveScorePreference,
} from "../lib/browser/score-preference.ts";

test("scores show by default and legacy prompt choices are ignored", () => {
  for (const ask of [null, "true", "false"]) {
    assert.deepEqual(
      loadScorePreference({
        getItem: (key) => (key === "wf-ask-scores" ? ask : null),
      }),
      { hidden: false },
    );
  }
});

test("score visibility persists in browser storage", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  for (const hidden of [true, false]) {
    saveScorePreference(storage, hidden);
    assert.deepEqual(loadScorePreference(storage), { hidden });
  }
  assert.deepEqual([...values.keys()], ["wf-hide-results"]);
});

test("scores show when browser storage is unavailable", () => {
  assert.deepEqual(
    loadScorePreference({
      getItem: () => {
        throw new Error("Unavailable");
      },
    }),
    { hidden: false },
  );
  assert.doesNotThrow(() =>
    saveScorePreference(
      {
        setItem: () => {
          throw new Error("Unavailable");
        },
      },
      true,
    ),
  );
});
