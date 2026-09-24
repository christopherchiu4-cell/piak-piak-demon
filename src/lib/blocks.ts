import { draftBlocksSchema, isQuestionBlock, promptBlankCount, type Block, type FillBlock, type PassageBlock, type QuestionBlock } from "@/content/blocks";

/**
 * The single boundary between Prisma's Json columns and typed blocks.
 * Never cast a Json value to Block[] directly: a schema drift would crash a
 * server component at render time instead of degrading to an empty document.
 */
export function readBlocks(value: unknown): Block[] {
  if (value == null) return [];
  const parsed = draftBlocksSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  console.error("Stored blocks failed validation", parsed.error.issues.slice(0, 5));
  return [];
}

export type BlockPage = { question: QuestionBlock; context: Block[] };

/**
 * Splits a document into the passages that stay pinned beside the sheet and one
 * page per question, each carrying the heading/text run that introduced it.
 */
export function paginateBlocks(blocks: Block[]): { passages: PassageBlock[]; pages: BlockPage[]; intro: Block[] } {
  const passages: PassageBlock[] = [];
  const pages: BlockPage[] = [];
  let context: Block[] = [];
  for (const block of blocks) {
    if (block.type === "passage") { passages.push(block); continue; }
    if (!isQuestionBlock(block)) { context.push(block); continue; }
    pages.push({ question: block, context });
    context = [];
  }
  return { passages, pages, intro: context };
}

/** A single-blank fill stores the raw string; multi-blank stores a JSON object keyed by blank id. */
export function serializeFill(block: FillBlock, values: Record<string, string>): string {
  if (block.blanks.length <= 1) return values[block.blanks[0]?.id ?? ""] ?? "";
  return JSON.stringify(Object.fromEntries(block.blanks.map((blank) => [blank.id, values[blank.id] ?? ""])));
}

export function parseFill(block: FillBlock, answer: string): Record<string, string> {
  if (block.blanks.length <= 1) return { [block.blanks[0]?.id ?? ""]: answer };
  if (!answer.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(answer);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const record = parsed as Record<string, unknown>;
    return Object.fromEntries(block.blanks.map((blank) => [blank.id, typeof record[blank.id] === "string" ? (record[blank.id] as string) : ""]));
  } catch {
    return {};
  }
}

/** Splits a fill prompt into literal text and blank slots, in render order. */
export function fillSegments(block: FillBlock): Array<{ text: string } | { blankIndex: number }> {
  if (!promptBlankCount(block.prompt)) return [{ text: block.prompt }, { blankIndex: 0 }];
  const segments: Array<{ text: string } | { blankIndex: number }> = [];
  const pattern = /\{\{(\d+)\}\}/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(block.prompt)) !== null) {
    if (match.index > cursor) segments.push({ text: block.prompt.slice(cursor, match.index) });
    segments.push({ blankIndex: Number(match[1]) - 1 });
    cursor = match.index + match[0].length;
  }
  if (cursor < block.prompt.length) segments.push({ text: block.prompt.slice(cursor) });
  return segments;
}
