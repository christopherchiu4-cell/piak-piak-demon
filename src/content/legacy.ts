/**
 * One-shot converters from the old source-code content shape into blocks.
 * Delete this file, together with schema/catalog/math/english/plans, once
 * prisma/migrate-content.ts has run against every environment.
 */
import type { Block } from "./blocks";
import type { ActivityContent, PlanContent } from "./schema";

export function activityToBlocks(activity: ActivityContent): Block[] {
  const blocks: Block[] = [];
  if (activity.instructions.trim()) blocks.push({ type: "text", id: `${activity.key}-instructions`, body: activity.instructions });
  if (activity.passage?.trim()) blocks.push({ type: "passage", id: `${activity.key}-passage`, title: activity.title, body: activity.passage });
  for (const question of activity.questions) {
    const base = { id: question.id, topic: question.topic, prompt: question.prompt, points: question.points, explanation: question.explanation };
    if (question.type === "choice") {
      blocks.push({ ...base, type: "mcq", options: question.options.map((option) => ({ id: option.id, text: option.text })), correctOptionId: question.correctOptionId, numberLine: question.numberLine });
    } else if (question.type === "written") {
      blocks.push({ ...base, type: "short", rubric: question.rubric });
    } else {
      // A numeric question is exactly a one-blank fill with numeric accepted answers.
      blocks.push({ ...base, type: "fill", blanks: [{ id: `${question.id}-blank`, accepted: question.acceptedAnswers }], caseSensitive: false });
    }
  }
  return blocks;
}

export function planToBlocks(plan: PlanContent): Block[] {
  const blocks: Block[] = [];
  if (plan.summary.trim()) blocks.push({ type: "text", id: `${plan.key}-summary`, body: plan.summary });
  const sections: Array<[string, string[]]> = [["Math", plan.math], ["English", plan.english], ["Preparation", plan.preparation]];
  for (const [heading, items] of sections) {
    if (!items.length) continue;
    blocks.push({ type: "heading", id: `${plan.key}-${heading.toLowerCase()}`, text: heading });
    blocks.push({ type: "text", id: `${plan.key}-${heading.toLowerCase()}-body`, body: items.map((item) => `• ${item}`).join("\n") });
  }
  return blocks;
}
