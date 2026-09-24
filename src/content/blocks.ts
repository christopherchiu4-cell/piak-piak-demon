import { z } from "zod";

const numberLine = z.object({
  min: z.number(),
  max: z.number(),
  ticks: z.array(z.number()),
  points: z.array(z.object({ label: z.string(), value: z.number() })),
});

function questionFields(lenient: boolean) {
  const text = lenient ? z.string() : z.string().min(1);
  return {
    id: z.string().min(1),
    topic: lenient ? z.string().default("") : z.string().min(1),
    prompt: text,
    points: z.number().int().positive(),
    explanation: z.string().default(""),
  };
}

function blockUnion(lenient: boolean) {
  const q = questionFields(lenient);
  const text = lenient ? z.string() : z.string().min(1);
  const optionList = z.array(z.object({ id: z.string().min(1), text: lenient ? z.string() : z.string().min(1) }));
  const blankList = z.array(z.object({
    id: z.string().min(1),
    accepted: lenient ? z.array(z.string()) : z.array(z.string().min(1)).min(1),
  }));
  return z.discriminatedUnion("type", [
    z.object({ type: z.literal("heading"), id: z.string().min(1), text }),
    z.object({ type: z.literal("text"), id: z.string().min(1), body: text }),
    z.object({ type: z.literal("passage"), id: z.string().min(1), title: z.string().default(""), body: text }),
    z.object({ ...q, type: z.literal("mcq"), options: lenient ? optionList : optionList.min(2), correctOptionId: z.string().default(""), numberLine: numberLine.optional() }),
    z.object({ ...q, type: z.literal("short"), rubric: z.array(z.string()).default([]) }),
    z.object({ ...q, type: z.literal("fill"), blanks: lenient ? blankList : blankList.min(1), caseSensitive: z.boolean().default(false) }),
  ]);
}

/** Lenient shape used when saving a draft from the editor: half-typed blocks still persist. */
export const draftBlockSchema = blockUnion(true);
/** Strict shape enforced before a material may be assigned to a student. */
export const blockSchema = blockUnion(false);

export const draftBlocksSchema = z.array(draftBlockSchema);
export const blocksSchema = z.array(blockSchema);

export type Block = z.infer<typeof draftBlockSchema>;
export type BlockType = Block["type"];
export type QuestionBlock = Extract<Block, { points: number }>;
export type McqBlock = Extract<Block, { type: "mcq" }>;
export type ShortBlock = Extract<Block, { type: "short" }>;
export type FillBlock = Extract<Block, { type: "fill" }>;
export type PassageBlock = Extract<Block, { type: "passage" }>;

export const blockTypes: BlockType[] = ["heading", "text", "passage", "mcq", "short", "fill"];
export const questionTypes: BlockType[] = ["mcq", "short", "fill"];

export const blockLabels: Record<BlockType, string> = {
  heading: "Heading", text: "Text", passage: "Passage",
  mcq: "Multiple choice", short: "Short answer", fill: "Fill in the blank",
};

export function isQuestionBlock(block: Block): block is QuestionBlock {
  return block.type === "mcq" || block.type === "short" || block.type === "fill";
}

export function questionBlocks(blocks: Block[]): QuestionBlock[] {
  return blocks.filter(isQuestionBlock);
}

export function totalPoints(blocks: Block[]): number {
  return questionBlocks(blocks).reduce((sum, block) => sum + block.points, 0);
}

let counter = 0;
export function blockId(prefix = "b") {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function newBlock(type: BlockType): Block {
  const base = { id: blockId(), topic: "", prompt: "", points: 1, explanation: "" };
  if (type === "heading") return { type, id: blockId(), text: "" };
  if (type === "text") return { type, id: blockId(), body: "" };
  if (type === "passage") return { type, id: blockId(), title: "", body: "" };
  if (type === "short") return { ...base, type, rubric: [] };
  if (type === "fill") return { ...base, type, blanks: [{ id: blockId("k"), accepted: [] }], caseSensitive: false };
  return { ...base, type: "mcq", options: [{ id: blockId("o"), text: "" }, { id: blockId("o"), text: "" }], correctOptionId: "" };
}

/** Count of `{{1}}`-style placeholders in a fill prompt. Zero means one trailing blank. */
export function promptBlankCount(prompt: string): number {
  return (prompt.match(/\{\{\d+\}\}/g) ?? []).length;
}

/**
 * Cross-field rules the Zod union cannot express. Returns human-readable problems
 * rather than throwing, so the editor can show them without blocking a draft save.
 */
export function blockProblems(blocks: Block[]): string[] {
  const problems: string[] = [];
  if (!blocks.length) problems.push("Add at least one block.");
  const seen = new Set<string>();
  blocks.forEach((block, index) => {
    const at = `Block ${index + 1}`;
    if (seen.has(block.id)) problems.push(`${at}: duplicate block id.`);
    seen.add(block.id);
    if (block.type === "heading" && !block.text.trim()) problems.push(`${at}: heading text is empty.`);
    if (block.type === "text" && !block.body.trim()) problems.push(`${at}: text is empty.`);
    if (block.type === "passage" && !block.body.trim()) problems.push(`${at}: passage body is empty.`);
    if (!isQuestionBlock(block)) return;
    if (!block.prompt.trim()) problems.push(`${at}: question prompt is empty.`);
    if (!block.topic.trim()) problems.push(`${at}: pick a topic so progress can be tracked.`);
    if (block.type === "mcq") {
      if (block.options.length < 2) problems.push(`${at}: needs at least two options.`);
      if (block.options.some((option) => !option.text.trim())) problems.push(`${at}: every option needs text.`);
      if (new Set(block.options.map((option) => option.id)).size !== block.options.length) problems.push(`${at}: duplicate option ids.`);
      if (!block.options.some((option) => option.id === block.correctOptionId)) problems.push(`${at}: mark which option is correct.`);
      if (block.numberLine && block.numberLine.min >= block.numberLine.max) problems.push(`${at}: number line minimum must be below its maximum.`);
    }
    if (block.type === "fill") {
      if (!block.blanks.length) problems.push(`${at}: needs at least one blank.`);
      if (block.blanks.some((blank) => !blank.accepted.filter((value) => value.trim()).length)) problems.push(`${at}: every blank needs an accepted answer.`);
      const markers = promptBlankCount(block.prompt);
      if (markers && markers !== block.blanks.length) problems.push(`${at}: prompt has ${markers} {{n}} markers but ${block.blanks.length} blanks.`);
    }
  });
  return problems;
}

/** True when the blocks are complete enough to hand to a student. */
export function isAssignable(blocks: Block[]): boolean {
  return blocksSchema.safeParse(blocks).success && blockProblems(blocks).length === 0;
}
