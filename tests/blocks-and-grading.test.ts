import assert from "node:assert/strict";
import test from "node:test";
import { blockProblems, blocksSchema, isAssignable, newBlock, questionBlocks, totalPoints, type Block } from "../src/content/blocks";
import { paginateBlocks, parseFill, readBlocks, serializeFill } from "../src/lib/blocks";
import { gradeBlock, studentBlocks, summaryByTopic } from "../src/lib/grading";
import { hashCredential, verifyCredential } from "../src/lib/credentials";

const mcq: Block = {
  type: "mcq", id: "q1", topic: "Number classification", points: 1,
  prompt: "Most specific set containing -12?", explanation: "It is an integer.",
  options: [{ id: "natural", text: "Natural" }, { id: "integer", text: "Integers" }],
  correctOptionId: "integer",
};
const numeric: Block = {
  type: "fill", id: "q2", topic: "Roots", points: 1, prompt: "Find the square root of 576.",
  explanation: "24.", blanks: [{ id: "k1", accepted: ["24"] }], caseSensitive: false,
};
const multi: Block = {
  type: "fill", id: "q3", topic: "Vocabulary", points: 4,
  prompt: "The {{1}} ran past the {{2}}.", explanation: "",
  blanks: [{ id: "k1", accepted: ["fox"] }, { id: "k2", accepted: ["hedge", "hedgerow"] }],
  caseSensitive: false,
};
const short: Block = {
  type: "short", id: "q4", topic: "Mathematical reasoning", points: 3,
  prompt: "Explain why not every square root is irrational.", explanation: "",
  rubric: ["Identifies a rational example."],
};
const passage: Block = { type: "passage", id: "p1", title: "The lighthouse", body: "It stood alone." };
const sample = [passage, mcq, numeric, multi, short];

test("multiple choice grades on the correct option id", () => {
  assert.equal(gradeBlock(mcq as never, "integer"), 1);
  assert.equal(gradeBlock(mcq as never, "natural"), 0);
  assert.equal(gradeBlock(mcq as never, ""), 0);
});

test("a single blank fill keeps numeric tolerance", () => {
  assert.equal(gradeBlock(numeric as never, "24"), 1);
  assert.equal(gradeBlock(numeric as never, "24.0"), 1, "24.0 must still score as 24");
  assert.equal(gradeBlock(numeric as never, "−24"), 0, "a unicode minus is still the wrong value");
  assert.equal(gradeBlock(numeric as never, "abc"), 0);
  assert.equal(gradeBlock(numeric as never, ""), 0);
});

test("a multi blank fill awards partial credit and ignores case", () => {
  const all = serializeFill(multi as never, { k1: "fox", k2: "Hedgerow" });
  const half = serializeFill(multi as never, { k1: "fox", k2: "wall" });
  assert.equal(gradeBlock(multi as never, all), 4);
  assert.equal(gradeBlock(multi as never, half), 2);
  assert.equal(gradeBlock(multi as never, serializeFill(multi as never, { k1: "", k2: "" })), 0);
  assert.deepEqual(parseFill(multi as never, all), { k1: "fox", k2: "Hedgerow" });
});

test("short answers stay pending until a teacher reviews them", () => {
  assert.equal(gradeBlock(short as never, "A full response"), null);
  assert.equal(gradeBlock(short as never, "   "), 0);
});

test("the active student payload discloses no answer key", () => {
  const payload = JSON.stringify(studentBlocks(sample));
  assert.equal(payload.includes("correctOptionId"), false);
  assert.equal(payload.includes("rubric"), false);
  assert.equal(payload.includes("explanation"), false);
  assert.equal(payload.includes("accepted"), false, "fill blanks must not ship their accepted answers");
  assert.equal(payload.includes("hedgerow"), false);
  assert.equal(payload.includes("It is an integer."), false);
});

test("topic rollups cover question blocks only", () => {
  const rows = summaryByTopic(sample, [{ questionId: "q1", score: 1 }, { questionId: "q4", score: null }]);
  assert.deepEqual(rows.find((row) => row.topic === "Mathematical reasoning"), { topic: "Mathematical reasoning", earned: 0, total: 3, pending: 3 });
  assert.equal(rows.some((row) => row.topic === "The lighthouse"), false);
  assert.equal(totalPoints(sample), 9);
  assert.equal(questionBlocks(sample).length, 4);
});

test("pagination hoists passages and attaches the context run to the next question", () => {
  const blocks: Block[] = [{ type: "heading", id: "h1", text: "Part A" }, passage, mcq, short];
  const { passages, pages } = paginateBlocks(blocks);
  assert.deepEqual(passages.map((item) => item.id), ["p1"]);
  assert.deepEqual(pages.map((page) => page.question.id), ["q1", "q4"]);
  assert.deepEqual(pages[0].context.map((item) => item.id), ["h1"]);
  assert.deepEqual(pages[1].context, []);
});

test("readBlocks degrades to an empty document instead of throwing", () => {
  assert.deepEqual(readBlocks(null), []);
  assert.deepEqual(readBlocks({ nope: true }), []);
  assert.deepEqual(readBlocks(sample), sample);
});

test("a freshly added block is a valid draft but is not yet assignable", () => {
  const draft = [newBlock("mcq")];
  assert.equal(blocksSchema.safeParse(draft).success, false);
  assert.equal(isAssignable(draft), false);
  assert.ok(blockProblems(draft).some((problem) => problem.includes("mark which option is correct")));
  assert.equal(isAssignable(sample), true, blockProblems(sample).join(" "));
});

test("login codes are hashed and verified", async () => {
  const hash = await hashCredential("private-code-123");
  assert.equal(hash.includes("private-code-123"), false);
  assert.equal(await verifyCredential("private-code-123", hash), true);
  assert.equal(await verifyCredential("wrong-code", hash), false);
});
