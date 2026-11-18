import assert from "node:assert/strict";
import test from "node:test";
import { marchHighlights } from "../lib/games/march-media.ts";

const video = (title: string) => ({ title }) as never;
const game = (a: string, b: string) =>
  ({ teams: [{ name: a }, { name: b }] }) as never;

test("March Madness highlights match the bracket game by teams", () => {
  const videos = [
    video("UConn vs. Ohio State: 2026 Big East regular season men's basketball highlights"),
    video("UConn vs. Duke: 2026 March Madness Elite Eight full game (arena sound only)"),
    video("Duke vs. UConn: 2026 March Madness Elite Eight highlights"),
  ];
  assert.equal(marchHighlights(game("UConn", "Duke"), videos, 2026), videos[2]);
  assert.equal(marchHighlights(game("UConn", "Ohio State"), videos, 2026), undefined);
  assert.equal(marchHighlights(game("UConn", "Duke"), videos, 2025), undefined);
});
