import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { blocksFromCsv } from "../../../../src/content/csv-material";
import { blockProblems, questionBlocks } from "../../../../src/content/blocks";
import { parseCsv } from "../../../../src/lib/csv";

const args = process.argv.slice(2);
const fileArg = args[0];

if (!fileArg) {
  console.error("Usage: validate-material-csv.ts <file> [--questions <expected-count>]");
  process.exit(2);
}

const expectedAt = args.indexOf("--questions");
const expectedQuestions = expectedAt === -1 ? undefined : Number(args[expectedAt + 1]);
if (expectedAt !== -1 && (!Number.isInteger(expectedQuestions) || expectedQuestions! < 0)) {
  console.error("--questions must be followed by a non-negative integer.");
  process.exit(2);
}

const file = resolve(fileArg);
const bytes = statSync(file).size;
const { blocks, problems: importProblems } = blocksFromCsv(parseCsv(readFileSync(file, "utf8")));
const problems = [...importProblems, ...blockProblems(blocks)];
const questions = questionBlocks(blocks).length;

if (bytes > 500_000) problems.push(`File is ${bytes} bytes; Tutor Desk rejects files larger than 500000 bytes.`);
if (expectedQuestions !== undefined && questions !== expectedQuestions) {
  problems.push(`Expected ${expectedQuestions} questions but found ${questions}.`);
}

if (problems.length) {
  console.error(`Invalid material CSV: ${file}`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`Valid material CSV: ${file}`);
console.log(`Blocks: ${blocks.length}; questions: ${questions}; bytes: ${bytes}`);
