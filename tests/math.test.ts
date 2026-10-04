import assert from "node:assert/strict";
import test from "node:test";
import { mathSegments } from "../src/lib/math";

test("renders inline and display TeX while preserving surrounding text", () => {
  const segments = mathSegments("Use $x^2$ and then $$\\frac{1}{2}$$.");
  assert.equal(segments.filter((segment) => segment.type === "math").length, 2);
  assert.equal(segments[1]?.type, "math");
  if (segments[1]?.type === "math") {
    assert.equal(segments[1].source, "x^2");
    assert.equal(segments[1].display, false);
    assert.match(segments[1].html, /class="katex"/);
  }
  assert.equal(segments[3]?.type, "math");
  if (segments[3]?.type === "math") assert.equal(segments[3].display, true);
});

test("leaves unmatched delimiters as text and unescapes literal dollars", () => {
  assert.deepEqual(mathSegments("A \\$5 fee and unmatched $x"), [
    { type: "text", value: "A $5 fee and unmatched $x" },
  ]);
});
