import assert from "node:assert/strict";
import test from "node:test";
import { parseCsv } from "../src/lib/csv";
import { blocksFromCsv } from "../src/content/csv-material";
import { blockProblems, isAssignable, questionBlocks, totalPoints } from "../src/content/blocks";
import { gradeBlock } from "../src/lib/grading";
import { serializeFill } from "../src/lib/blocks";

test("the reader handles quoting, escapes, embedded newlines and CRLF", () => {
  assert.deepEqual(parseCsv("a,b\r\n1,2\r\n"), [["a", "b"], ["1", "2"]]);
  assert.deepEqual(parseCsv('a,b\n"x, y",z'), [["a", "b"], ["x, y", "z"]]);
  assert.deepEqual(parseCsv('a\n"he said ""hi"""'), [["a"], ['he said "hi"']]);
  assert.deepEqual(parseCsv('a\n"line one\nline two"'), [["a"], ["line one\nline two"]]);
  assert.deepEqual(parseCsv("﻿a,b\n1,2"), [["a", "b"], ["1", "2"]], "a BOM must not become part of the first header");
  assert.deepEqual(parseCsv("a,b\n\n\n1,2\n"), [["a", "b"], ["1", "2"]], "blank lines are dropped");
});

const fixture = `type,prompt,text,title,topic,points,options,correct,accepted,rubric,explanation,case_sensitive
heading,,Part A: number sense,,,,,,,,,
text,,"Work through each question, showing your method.",,,,,,,,,
passage,,"The lighthouse stood alone.

Nobody had lit it for years.",The lighthouse,,,,,,,,
mcq,What is the most specific set containing -12?,,,Number classification,1,Natural numbers|Whole numbers|Integers,Integers,,,"-12 is an integer.",
mcq,Which is even?,,,Number classification,1,Three|Four,2,,,Four is even.,
fill,Two plus two is {{1}} and three plus three is {{2}}.,,,Arithmetic,2,,,4;four|6;six,,Four and six.,
short,Explain why not every square root is irrational.,,,Reasoning,3,,,,Identifies a rational example|Explains the counterexample,Root 36 is 6.,
`;

test("a complete file maps to assignable blocks", () => {
  const { blocks, problems } = blocksFromCsv(parseCsv(fixture));
  assert.deepEqual(problems, []);
  assert.deepEqual(blocks.map((block) => block.type), ["heading", "text", "passage", "mcq", "mcq", "fill", "short"]);
  assert.equal(isAssignable(blocks), true, blockProblems(blocks).join(" "));
  assert.equal(questionBlocks(blocks).length, 4);
  assert.equal(totalPoints(blocks), 7);

  const passage = blocks[2];
  assert.equal(passage.type === "passage" && passage.title, "The lighthouse");
  assert.ok(passage.type === "passage" && passage.body.includes("\n\n"), "a quoted cell keeps its paragraph break");
});

test("correct answers resolve by option text and by 1-based index", () => {
  const { blocks } = blocksFromCsv(parseCsv(fixture));
  const [byText, byIndex] = questionBlocks(blocks).filter((block) => block.type === "mcq");
  assert.equal(byText.type === "mcq" && byText.options.find((o) => o.id === byText.correctOptionId)?.text, "Integers");
  assert.equal(byIndex.type === "mcq" && byIndex.options.find((o) => o.id === byIndex.correctOptionId)?.text, "Four");
});

test("multi blank fills split on | then ; and grade with partial credit", () => {
  const { blocks } = blocksFromCsv(parseCsv(fixture));
  const fill = questionBlocks(blocks).find((block) => block.type === "fill")!;
  assert.equal(fill.type === "fill" && fill.blanks.length, 2);
  assert.deepEqual(fill.type === "fill" ? fill.blanks[0].accepted : [], ["4", "four"]);
  assert.deepEqual(fill.type === "fill" ? fill.blanks[1].accepted : [], ["6", "six"]);
  if (fill.type !== "fill") throw new Error("expected a fill");
  const [a, b] = fill.blanks;
  assert.equal(gradeBlock(fill, serializeFill(fill, { [a.id]: "four", [b.id]: "six" })), 2);
  assert.equal(gradeBlock(fill, serializeFill(fill, { [a.id]: "4", [b.id]: "nine" })), 1);
});

test("short answers keep their rubric split on |", () => {
  const { blocks } = blocksFromCsv(parseCsv(fixture));
  const short = questionBlocks(blocks).find((block) => block.type === "short")!;
  assert.deepEqual(short.type === "short" ? short.rubric : [], ["Identifies a rational example", "Explains the counterexample"]);
});

test("a missing header is rejected rather than silently mapped", () => {
  const { blocks, problems } = blocksFromCsv(parseCsv("mcq,What is 2+2?,,,,1,Three|Four,Four\n"));
  assert.deepEqual(blocks, []);
  assert.match(problems[0], /header/);
});

test("bad rows report readable problems instead of throwing", () => {
  const { blocks, problems } = blocksFromCsv(parseCsv(
    `type,prompt,topic,points,options,correct,accepted
quiz,Something,T,1,,,
mcq,Pick one,T,1,Only one option,Only one option,
mcq,Pick two,T,1,A|B,Zebra,
fill,No answers here,T,1,,,
short,Fine question,T,three,,,
`));
  assert.match(problems.join(" "), /unknown type .quiz./);
  assert.match(problems.join(" "), /at least two options/);
  assert.match(problems.join(" "), /does not match any option/);
  assert.match(problems.join(" "), /needs an "accepted" answer/);
  assert.match(problems.join(" "), /points must be a whole number/);
  assert.equal(blocks.some((block) => block.type === "short" && block.points === 1), true, "a bad points value falls back to 1");
  assert.equal(isAssignable(blocks), false);
});

test("a marker count that disagrees with the accepted groups is reported", () => {
  const { problems } = blocksFromCsv(parseCsv(
    "type,prompt,topic,points,accepted\nfill,One {{1}} two {{2}},T,2,onlyone\n"));
  assert.match(problems.join(" "), /2 \{\{n\}\} markers but 1 accepted group/);
});

test("unrecognised columns are ignored with a note, not a failure", () => {
  const { blocks, problems } = blocksFromCsv(parseCsv(
    "type,prompt,topic,points,options,correct,difficulty\nmcq,Pick,T,1,A|B,A,hard\n"));
  assert.match(problems.join(" "), /Ignored unrecognised column: difficulty/);
  assert.equal(blocks.length, 1);
});
