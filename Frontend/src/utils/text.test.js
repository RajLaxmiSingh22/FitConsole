import assert from "node:assert/strict";
import test from "node:test";
import { clampWords } from "./text.js";

test("short text is returned unchanged (whitespace tidied)", () => {
  assert.equal(clampWords("  Fitness   conditioning training. "), "Fitness conditioning training.");
});

test("long text is cut at a whole word with an ellipsis, never mid-word", () => {
  const text = "Beginner-friendly boxing training covering stance, footwork, punches, defence, conditioning, and supervised practice for every level.";
  const out = clampWords(text, 110);
  assert.ok(out.endsWith("…"));
  assert.ok(out.length <= 111);
  assert.ok(text.startsWith(out.slice(0, -1)), "a prefix of the original");
  assert.ok(!/\w…$/.test(out) || text.includes(out.slice(0, -1) + " "), "does not end inside a word");
});
