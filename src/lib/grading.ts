import { isQuestionBlock, type Block, type QuestionBlock } from "@/content/blocks";
import { parseFill } from "@/lib/blocks";

function normalize(value: string, caseSensitive: boolean) {
  const cleaned = value.trim().replace(/[−–—]/g, "-").replace(/\s+/g, " ");
  return caseSensitive ? cleaned : cleaned.toLowerCase();
}

/** Numeric comparison so "24.0" still matches an accepted answer of "24". */
function numericMatch(given: string, accepted: string) {
  const a = Number(given.replace(/[−–—]/g, "-"));
  const b = Number(accepted.replace(/[−–—]/g, "-"));
  return Number.isFinite(a) && Number.isFinite(b) && a === b;
}

function blankMatches(given: string, accepted: string[], caseSensitive: boolean) {
  if (!given.trim()) return false;
  const numericBlank = accepted.length > 0 && accepted.every((value) => Number.isFinite(Number(value.replace(/[−–—]/g, "-"))));
  return accepted.some((value) => (numericBlank ? numericMatch(given, value) : normalize(given, caseSensitive) === normalize(value, caseSensitive)));
}

/** Returns null when the answer needs a human: short answers with content. */
export function gradeBlock(block: QuestionBlock, answer: string): number | null {
  const value = answer.trim();
  if (!value) return 0;
  if (block.type === "short") return null;
  if (block.type === "mcq") return value === block.correctOptionId ? block.points : 0;
  const given = parseFill(block, answer);
  const matched = block.blanks.filter((blank) => blankMatches(given[blank.id] ?? "", blank.accepted, block.caseSensitive)).length;
  if (!block.blanks.length) return 0;
  return Math.round((block.points * matched) / block.blanks.length);
}

export type PublicBlock =
  | Extract<Block, { type: "heading" | "text" | "passage" }>
  | { type: "mcq"; id: string; topic: string; prompt: string; points: number; options: Array<{ id: string; text: string }>; numberLine?: Extract<Block, { type: "mcq" }>["numberLine"] }
  | { type: "short"; id: string; topic: string; prompt: string; points: number }
  | { type: "fill"; id: string; topic: string; prompt: string; points: number; blanks: Array<{ id: string }>; caseSensitive: boolean };

/**
 * Strips every answer key before blocks reach a student who is still working.
 * Removes correctOptionId, rubric, explanation, and fill blanks' accepted values.
 */
export function studentBlocks(blocks: Block[]): PublicBlock[] {
  return blocks.map((block): PublicBlock => {
    if (block.type === "mcq") {
      return { type: "mcq", id: block.id, topic: block.topic, prompt: block.prompt, points: block.points, options: block.options.map((option) => ({ id: option.id, text: option.text })), numberLine: block.numberLine };
    }
    if (block.type === "short") {
      return { type: "short", id: block.id, topic: block.topic, prompt: block.prompt, points: block.points };
    }
    if (block.type === "fill") {
      return { type: "fill", id: block.id, topic: block.topic, prompt: block.prompt, points: block.points, blanks: block.blanks.map((blank) => ({ id: blank.id })), caseSensitive: block.caseSensitive };
    }
    return block;
  });
}

export function summaryByTopic(blocks: Block[], responses: Array<{ questionId: string; score: number | null }>) {
  const byId = new Map(responses.map((response) => [response.questionId, response]));
  const topics = new Map<string, { topic: string; earned: number; total: number; pending: number }>();
  for (const block of blocks) {
    if (!isQuestionBlock(block)) continue;
    const name = block.topic.trim() || "General";
    const row = topics.get(name) ?? { topic: name, earned: 0, total: 0, pending: 0 };
    const score = byId.get(block.id)?.score;
    row.total += block.points;
    if (score == null) row.pending += block.points;
    else row.earned += score;
    topics.set(name, row);
  }
  return [...topics.values()];
}
