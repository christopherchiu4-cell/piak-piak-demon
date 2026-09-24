import assert from "node:assert/strict";
import test from "node:test";
import { applyBlockOp, joinAccepted, parseBlocksForm, splitAccepted } from "../src/lib/block-form";
import type { Block } from "../src/content/blocks";

function form(pairs: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(pairs)) data.append(key, value);
  return data;
}

test("a filled editor form round trips into blocks", () => {
  const blocks = parseBlocksForm(form({
    "blocks.0.type": "passage", "blocks.0.id": "p1", "blocks.0.title": "Storm", "blocks.0.body": "The sea rose.",
    "blocks.1.type": "mcq", "blocks.1.id": "q1", "blocks.1.topic": "Inference", "blocks.1.prompt": "Why?",
    "blocks.1.points": "2", "blocks.1.explanation": "Because.",
    "blocks.1.options.0.id": "a", "blocks.1.options.0.text": "First",
    "blocks.1.options.1.id": "b", "blocks.1.options.1.text": "Second",
    "blocks.1.correctOptionId": "b",
    "blocks.2.type": "fill", "blocks.2.id": "q2", "blocks.2.topic": "Roots", "blocks.2.prompt": "Root of 576?",
    "blocks.2.points": "1", "blocks.2.blanks.0.id": "k1", "blocks.2.blanks.0.accepted": "24, 24.0",
    "blocks.3.type": "short", "blocks.3.id": "q3", "blocks.3.topic": "Reasoning", "blocks.3.prompt": "Explain.",
    "blocks.3.points": "3", "blocks.3.rubric": "States a rational example.\n\nStates an irrational one.",
  }));
  assert.equal(blocks.length, 4);
  assert.deepEqual(blocks[0], { type: "passage", id: "p1", title: "Storm", body: "The sea rose." });
  assert.equal(blocks[1].type === "mcq" && blocks[1].correctOptionId, "b");
  assert.equal(blocks[1].type === "mcq" && blocks[1].points, 2);
  assert.deepEqual(blocks[2].type === "fill" && blocks[2].blanks, [{ id: "k1", accepted: ["24", "24.0"] }]);
  assert.deepEqual(blocks[3].type === "short" && blocks[3].rubric, ["States a rational example.", "States an irrational one."]);
});

test("a half typed block still parses so a draft save loses nothing", () => {
  const blocks = parseBlocksForm(form({ "blocks.0.type": "mcq", "blocks.0.id": "q1", "blocks.0.prompt": "", "blocks.0.points": "" }));
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type === "mcq" && blocks[0].points, 1, "points falls back to 1 rather than NaN");
});

test("non contiguous indexes keep their order after a removal", () => {
  const blocks = parseBlocksForm(form({
    "blocks.0.type": "heading", "blocks.0.id": "h1", "blocks.0.text": "One",
    "blocks.2.type": "heading", "blocks.2.id": "h3", "blocks.2.text": "Three",
    "blocks.10.type": "heading", "blocks.10.id": "h10", "blocks.10.text": "Ten",
  }));
  assert.deepEqual(blocks.map((block) => block.id), ["h1", "h3", "h10"]);
});

const base: Block[] = [
  { type: "heading", id: "h1", text: "One" },
  { type: "mcq", id: "q1", topic: "T", prompt: "P", points: 1, explanation: "", options: [{ id: "a", text: "A" }, { id: "b", text: "B" }], correctOptionId: "b" },
];

test("structural ops add, remove, and reorder blocks", () => {
  assert.equal(applyBlockOp(base, "add:short").length, 3);
  assert.equal(applyBlockOp(base, "add:short")[2].type, "short");
  assert.deepEqual(applyBlockOp(base, "remove:0").map((block) => block.id), ["q1"]);
  assert.deepEqual(applyBlockOp(base, "down:0").map((block) => block.id), ["q1", "h1"]);
  assert.deepEqual(applyBlockOp(base, "up:1").map((block) => block.id), ["q1", "h1"]);
  assert.deepEqual(applyBlockOp(base, "up:0").map((block) => block.id), ["h1", "q1"], "moving past the edge is a no-op");
  assert.deepEqual(applyBlockOp(base, "down:1").map((block) => block.id), ["h1", "q1"]);
  assert.deepEqual(applyBlockOp(base, null), base);
  assert.deepEqual(applyBlockOp(base, "remove:99"), base);
  assert.deepEqual(applyBlockOp(base, "nonsense:0"), base);
});

test("removing the option that was marked correct clears the answer key", () => {
  const [, question] = applyBlockOp(base, "removeOption:1:1");
  assert.equal(question.type === "mcq" && question.options.length, 1);
  assert.equal(question.type === "mcq" && question.correctOptionId, "", "a dangling correct id would silently fail grading");
  const [, kept] = applyBlockOp(base, "removeOption:1:0");
  assert.equal(kept.type === "mcq" && kept.correctOptionId, "b");
  const [, added] = applyBlockOp(base, "addOption:1");
  assert.equal(added.type === "mcq" && added.options.length, 3);
});

test("accepted answers split and rejoin on commas", () => {
  assert.deepEqual(splitAccepted(" 24 , 24.0 ,, "), ["24", "24.0"]);
  assert.equal(joinAccepted(["24", "24.0"]), "24, 24.0");
});
