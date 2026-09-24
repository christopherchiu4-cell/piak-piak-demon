import { blockId, newBlock, type Block, type BlockType, blockTypes } from "@/content/blocks";

/**
 * The block editor keeps no client state. Every structural button is a submit
 * button carrying `op`, so each edit is one round trip that also persists whatever
 * the teacher had already typed. These two functions are the entire editor logic.
 */

function readString(data: FormData, name: string) {
  const value = data.get(name);
  return typeof value === "string" ? value : "";
}

function indexesFor(data: FormData, prefix: string) {
  const found = new Set<number>();
  for (const key of data.keys()) {
    const match = key.match(new RegExp(`^${prefix}\\.(\\d+)\\.`));
    if (match) found.add(Number(match[1]));
  }
  return [...found].sort((a, b) => a - b);
}

/** Accepted answers are typed as one comma-separated line per blank. */
export function splitAccepted(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function joinAccepted(values: string[]): string {
  return values.join(", ");
}

export function parseBlocksForm(data: FormData): Block[] {
  return indexesFor(data, "blocks").map((index) => {
    const at = `blocks.${index}`;
    const type = readString(data, `${at}.type`) as BlockType;
    const id = readString(data, `${at}.id`) || blockId();
    if (type === "heading") return { type, id, text: readString(data, `${at}.text`) } satisfies Block;
    if (type === "text") return { type, id, body: readString(data, `${at}.body`) } satisfies Block;
    if (type === "passage") return { type, id, title: readString(data, `${at}.title`), body: readString(data, `${at}.body`) } satisfies Block;
    const base = {
      id,
      topic: readString(data, `${at}.topic`),
      prompt: readString(data, `${at}.prompt`),
      points: Math.max(1, Math.round(Number(readString(data, `${at}.points`)) || 1)),
      explanation: readString(data, `${at}.explanation`),
    };
    if (type === "short") {
      const rubric = readString(data, `${at}.rubric`).split("\n").map((line) => line.trim()).filter(Boolean);
      return { ...base, type, rubric } satisfies Block;
    }
    if (type === "fill") {
      const blanks = indexesFor(data, `${at}.blanks`).map((blankIndex) => ({
        id: readString(data, `${at}.blanks.${blankIndex}.id`) || blockId("k"),
        accepted: splitAccepted(readString(data, `${at}.blanks.${blankIndex}.accepted`)),
      }));
      return { ...base, type, blanks: blanks.length ? blanks : [{ id: blockId("k"), accepted: [] }], caseSensitive: readString(data, `${at}.caseSensitive`) === "on" } satisfies Block;
    }
    const options = indexesFor(data, `${at}.options`).map((optionIndex) => ({
      id: readString(data, `${at}.options.${optionIndex}.id`) || blockId("o"),
      text: readString(data, `${at}.options.${optionIndex}.text`),
    }));
    return { ...base, type: "mcq", options, correctOptionId: readString(data, `${at}.correctOptionId`) } satisfies Block;
  });
}

function move(blocks: Block[], from: number, to: number) {
  if (to < 0 || to >= blocks.length) return blocks;
  const next = [...blocks];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Applies one `op` value from the clicked submit button. Unknown ops are a no-op. */
export function applyBlockOp(blocks: Block[], op: string | null): Block[] {
  if (!op) return blocks;
  const [verb, first, second] = op.split(":");
  const index = Number(first);
  if (verb === "add" && blockTypes.includes(first as BlockType)) return [...blocks, newBlock(first as BlockType)];
  if (!Number.isInteger(index) || index < 0 || index >= blocks.length) return blocks;
  if (verb === "remove") return blocks.filter((_, position) => position !== index);
  if (verb === "up") return move(blocks, index, index - 1);
  if (verb === "down") return move(blocks, index, index + 1);
  return blocks.map((block, position) => {
    if (position !== index) return block;
    if (verb === "addOption" && block.type === "mcq") return { ...block, options: [...block.options, { id: blockId("o"), text: "" }] };
    if (verb === "removeOption" && block.type === "mcq") {
      const options = block.options.filter((_, optionIndex) => optionIndex !== Number(second));
      const correctOptionId = options.some((option) => option.id === block.correctOptionId) ? block.correctOptionId : "";
      return { ...block, options, correctOptionId };
    }
    if (verb === "addBlank" && block.type === "fill") return { ...block, blanks: [...block.blanks, { id: blockId("k"), accepted: [] }] };
    if (verb === "removeBlank" && block.type === "fill") {
      const blanks = block.blanks.filter((_, blankIndex) => blankIndex !== Number(second));
      return { ...block, blanks: blanks.length ? blanks : block.blanks };
    }
    return block;
  });
}
