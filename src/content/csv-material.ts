import { blockId, promptBlankCount, type Block, type BlockType } from "./blocks";

/**
 * Maps a parsed CSV into blocks. One row is one block.
 *
 * Separators: `|` splits items (options, blanks, rubric points); `;` splits
 * alternatives within one item. `;` rather than a comma because a comma inside a
 * cell has to be quoted, and a missing quote is the most common authoring
 * mistake — exactly the one a generated file makes.
 */

const known = ["type", "text", "title", "prompt", "topic", "points", "options", "correct", "accepted", "case_sensitive", "rubric", "explanation"] as const;

function splitItems(value: string): string[] {
  return value.split("|").map((item) => item.trim()).filter(Boolean);
}

function splitAlternatives(value: string): string[] {
  return value.split(";").map((item) => item.trim()).filter(Boolean);
}

function truthy(value: string) {
  return ["yes", "true", "y", "1"].includes(value.trim().toLowerCase());
}

export function blocksFromCsv(rows: string[][]): { blocks: Block[]; problems: string[] } {
  const problems: string[] = [];
  if (!rows.length) return { blocks: [], problems: ["The file is empty."] };

  const header = rows[0].map((cell) => cell.trim().toLowerCase().replace(/\s+/g, "_"));
  if (!header.includes("type")) {
    return { blocks: [], problems: [`The first row must be a header containing a "type" column. Found: ${rows[0].join(", ") || "(blank)"}.`] };
  }
  const unknown = header.filter((name) => name && !known.includes(name as (typeof known)[number]));
  if (unknown.length) problems.push(`Ignored unrecognised column${unknown.length === 1 ? "" : "s"}: ${unknown.join(", ")}.`);

  const blocks: Block[] = [];
  rows.slice(1).forEach((cells, position) => {
    const line = position + 2; // 1-based, and the header is line 1
    const get = (name: string) => {
      const at = header.indexOf(name);
      return at === -1 ? "" : (cells[at] ?? "").trim();
    };
    const type = get("type").toLowerCase() as BlockType;
    const at = `Row ${line}`;

    if (type === "heading") { blocks.push({ type, id: blockId(), text: get("text") || get("title") }); return; }
    if (type === "text") { blocks.push({ type, id: blockId(), body: get("text") }); return; }
    if (type === "passage") { blocks.push({ type, id: blockId(), title: get("title"), body: get("text") }); return; }

    if (type !== "mcq" && type !== "short" && type !== "fill") {
      problems.push(`${at}: unknown type “${get("type")}”. Use heading, text, passage, mcq, short or fill.`);
      return;
    }

    const rawPoints = get("points");
    if (rawPoints && !/^\d+$/.test(rawPoints)) problems.push(`${at}: points must be a whole number, got “${rawPoints}”. Using 1.`);
    const base = {
      id: blockId(),
      topic: get("topic"),
      prompt: get("prompt"),
      points: /^\d+$/.test(rawPoints) ? Math.max(1, Number(rawPoints)) : 1,
      explanation: get("explanation"),
    };

    if (type === "short") { blocks.push({ ...base, type, rubric: splitItems(get("rubric")) }); return; }

    if (type === "fill") {
      const groups = splitItems(get("accepted"));
      if (!groups.length) problems.push(`${at}: a fill row needs an "accepted" answer.`);
      const markers = promptBlankCount(base.prompt);
      if (markers && groups.length && markers !== groups.length) {
        problems.push(`${at}: the prompt has ${markers} {{n}} marker${markers === 1 ? "" : "s"} but ${groups.length} accepted group${groups.length === 1 ? "" : "s"}.`);
      }
      blocks.push({
        ...base, type,
        blanks: (groups.length ? groups : [""]).map((group) => ({ id: blockId("k"), accepted: splitAlternatives(group) })),
        caseSensitive: truthy(get("case_sensitive")),
      });
      return;
    }

    const options = splitItems(get("options")).map((label) => ({ id: blockId("o"), text: label }));
    if (options.length < 2) problems.push(`${at}: a multiple choice row needs at least two options separated by |.`);
    const correctRaw = get("correct");
    // `correct` may be the option's text or its 1-based position.
    const byIndex = /^\d+$/.test(correctRaw) ? options[Number(correctRaw) - 1] : undefined;
    const byText = options.find((option) => option.text.toLowerCase() === correctRaw.toLowerCase());
    const correct = byIndex ?? byText;
    if (!correct && options.length) problems.push(`${at}: “${correctRaw || "(blank)"}” does not match any option. Use the option's exact text or its number.`);
    blocks.push({ ...base, type: "mcq", options, correctOptionId: correct?.id ?? "" });
  });

  if (!blocks.length && !problems.length) problems.push("No rows found after the header.");
  return { blocks, problems };
}
