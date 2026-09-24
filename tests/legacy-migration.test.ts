/**
 * Safety net for prisma/migrate-content.ts. Delete alongside src/content/legacy.ts
 * once the backfill has run in every environment.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { activities, plans } from "../src/content/catalog";
import { activityToBlocks, planToBlocks } from "../src/content/legacy";
import { blockProblems, isAssignable, questionBlocks, totalPoints } from "../src/content/blocks";
import { gradeBlock } from "../src/lib/grading";

test("every published activity converts to assignable blocks", () => {
  for (const activity of activities) {
    const blocks = activityToBlocks(activity);
    assert.equal(isAssignable(blocks), true, `${activity.key}: ${blockProblems(blocks).join(" ")}`);
    assert.deepEqual(
      questionBlocks(blocks).map((block) => block.id),
      activity.questions.map((question) => question.id),
      `${activity.key}: question ids must survive so existing Response rows still resolve`,
    );
    assert.equal(totalPoints(blocks), activity.questions.reduce((sum, question) => sum + question.points, 0));
  }
});

test("converted numeric questions still grade the way they did as number questions", () => {
  const blocks = activityToBlocks(activities.find((item) => item.key === "numbers-foundations")!);
  const root = questionBlocks(blocks).find((block) => block.id === "sqrt-576")!;
  assert.equal(root.type, "fill");
  assert.equal(gradeBlock(root, "24"), 1);
  assert.equal(gradeBlock(root, "24.0"), 1);
  assert.equal(gradeBlock(root, "25"), 0);
});

test("every class plan converts to blocks that keep its bullets", () => {
  for (const plan of plans) {
    const blocks = planToBlocks(plan);
    const body = blocks.map((block) => ("body" in block ? block.body : "")).join("\n");
    for (const item of [...plan.math, ...plan.english, ...plan.preparation]) {
      assert.ok(body.includes(item), `${plan.key} lost a bullet: ${item}`);
    }
    assert.equal(questionBlocks(blocks).length, 0, "a plan carries no questions of its own");
  }
});
