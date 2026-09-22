import assert from "node:assert/strict";
import test from "node:test";
import { activities, plans, getActivity, getPlan } from "../src/content/catalog";
import { validateActivity } from "../src/content/schema";
import { gradeQuestion, studentActivity, summaryByTopic } from "../src/lib/grading";
import { hashCredential, verifyCredential } from "../src/lib/credentials";

test("published content has unique versions and stable question IDs", () => {
  assert.equal(new Set(activities.map((item) => `${item.key}@${item.version}`)).size, activities.length);
  assert.equal(new Set(plans.map((item) => `${item.key}@${item.version}`)).size, plans.length);
  for (const activity of activities) {
    assert.deepEqual(validateActivity(activity), activity);
    assert.equal(getActivity(activity.key, activity.version), activity);
  }
  for (const plan of plans) assert.equal(getPlan(plan.key, plan.version), plan);
});

test("the active student payload does not disclose keys, explanations, or rubrics", () => {
  for (const activity of activities) {
    const payload = JSON.stringify(studentActivity(activity));
    for (const question of activity.questions) {
      assert.equal(payload.includes(question.explanation), false);
      if (question.type === "choice") assert.equal(payload.includes(`correctOptionId`), false);
      if (question.type === "written") assert.equal(payload.includes(`rubric`), false);
    }
  }
});

test("objective grading and pending written grading keep distinct score states", () => {
  const activity = getActivity("numbers-foundations", 1)!;
  const choice = activity.questions.find((item) => item.id === "classify-negative-12")!;
  const number = activity.questions.find((item) => item.id === "sqrt-576")!;
  const written = activity.questions.find((item) => item.id === "square-roots-reasoning")!;
  assert.equal(gradeQuestion(choice, "integer"), 1);
  assert.equal(gradeQuestion(choice, "natural"), 0);
  assert.equal(gradeQuestion(number, "24.0"), 1);
  assert.equal(gradeQuestion(number, "abc"), 0);
  assert.equal(gradeQuestion(written, "A full response"), null);
  assert.equal(gradeQuestion(written, ""), 0);
  const rows = summaryByTopic(activity, [
    { questionId: choice.id, score: 1 },
    { questionId: written.id, score: null },
  ]);
  assert.deepEqual(rows.find((item) => item.topic === "Mathematical reasoning"), {
    topic: "Mathematical reasoning", earned: 0, total: 3, pending: 3,
  });
});

test("login codes are hashed and verified", async () => {
  const hash = await hashCredential("private-code-123");
  assert.equal(hash.includes("private-code-123"), false);
  assert.equal(await verifyCredential("private-code-123", hash), true);
  assert.equal(await verifyCredential("wrong-code", hash), false);
});
