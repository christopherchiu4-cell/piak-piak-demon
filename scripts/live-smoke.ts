import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createToken, hashCredential, hashToken } from "../src/lib/credentials";
import type { Block } from "../src/content/blocks";

if (process.env.RUN_LIVE_SMOKE !== "yes") throw new Error("Set RUN_LIVE_SMOKE=yes to allow temporary test records.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const planBlocks: Block[] = [
  { type: "heading", id: "smoke-h", text: "Smoke plan" },
  { type: "text", id: "smoke-t", body: "A temporary class plan created by the smoke test." },
];
const homeworkBlocks: Block[] = [
  { type: "mcq", id: "smoke-q1", topic: "Smoke", points: 1, prompt: "Which one is two?", explanation: "Two is two.",
    options: [{ id: "one", text: "One" }, { id: "two", text: "Two" }], correctOptionId: "two" },
  { type: "fill", id: "smoke-q2", topic: "Smoke", points: 2, prompt: "Two plus two is {{1}} and three plus three is {{2}}.",
    explanation: "Four and six.", blanks: [{ id: "smoke-b1", accepted: ["4"] }, { id: "smoke-b2", accepted: ["6"] }], caseSensitive: false },
  { type: "short", id: "smoke-q3", topic: "Smoke", points: 3, prompt: "Explain your reasoning.", explanation: "", rubric: ["Says something."] },
];

async function main() {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const studentId = randomUUID();
  const login = `smoke-${studentId.slice(0, 8)}`;
  const token = createToken();
  let sessionId: string | undefined;
  let planMaterialId: string | undefined;
  let homeworkMaterialId: string | undefined;
  let classId: string | undefined;
  let assignmentId: string | undefined;
  let attemptId: string | undefined;
  try {
    const teacher = await db.user.findFirst({ where: { role: "TEACHER" } });
    assert.ok(teacher, "Teacher account must exist");
    await db.user.create({ data: { id: studentId, login, displayName: "Temporary smoke test", role: "STUDENT", credentialHash: await hashCredential(randomUUID()) } });
    const session = await db.loginSession.create({ data: { userId: studentId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
    sessionId = session.id;

    const planMaterial = await db.material.create({ data: { kind: "CLASS_PLAN", subject: "MATH", title: "Temporary smoke plan", summary: "Smoke", blocks: planBlocks, authorId: teacher.id } });
    planMaterialId = planMaterial.id;
    const homeworkMaterial = await db.material.create({ data: { kind: "HOMEWORK", subject: "MATH", title: "Temporary smoke homework", summary: "Smoke", blocks: homeworkBlocks, authorId: teacher.id } });
    homeworkMaterialId = homeworkMaterial.id;

    const classAssignment = await db.assignment.create({ data: {
      teacherId: teacher.id, studentId, materialId: planMaterial.id, kind: "CLASS_PLAN", subject: "MATH",
      title: planMaterial.title, summary: planMaterial.summary, blocks: planBlocks, scheduledAt: new Date(),
      notes: "Draft notes that must stay private.",
    } });
    classId = classAssignment.id;
    const assignment = await db.assignment.create({ data: {
      teacherId: teacher.id, studentId, materialId: homeworkMaterial.id, kind: "HOMEWORK", subject: "MATH",
      title: homeworkMaterial.title, summary: homeworkMaterial.summary, blocks: homeworkBlocks,
    } });
    assignmentId = assignment.id;
    const attempt = await db.attempt.create({ data: { assignmentId, number: 1 } });
    attemptId = attempt.id;

    const request = async (path: string) => {
      const response = await fetch(`${process.env.SMOKE_ORIGIN ?? "http://127.0.0.1:3000"}${path}`, { headers: { Cookie: `tutoring_session=${token}` } });
      assert.equal(response.status, 200, `${path} returned ${response.status}`);
      return response.text();
    };

    const classPage = await request(`/student/assignments/${classId}`);
    assert.ok(classPage.includes("Temporary smoke plan"), "Class plan title missing");
    assert.equal(classPage.includes("Draft notes that must stay private."), false, "Unpublished notes leaked to the student");

    const activePage = await request(`/student/assignments/${assignmentId}`);
    assert.ok(activePage.includes("Which one is two?"), "Question prompt missing");
    assert.equal(activePage.includes("Two is two."), false, "Active page exposed an explanation");
    assert.equal(activePage.includes("correctOptionId"), false, "Active page exposed the answer key");
    assert.equal(activePage.includes("accepted"), false, "Active page exposed fill answers");

    await db.attempt.update({ where: { id: attemptId }, data: { status: "SUBMITTED", submittedAt: new Date() } });
    await db.response.createMany({ data: [
      { attemptId, questionId: "smoke-q1", maxPoints: 1, answer: "two", score: 1 },
      { attemptId, questionId: "smoke-q2", maxPoints: 2, answer: JSON.stringify({ "smoke-b1": "4", "smoke-b2": "9" }), score: 1 },
      { attemptId, questionId: "smoke-q3", maxPoints: 3, answer: "A test explanation", score: null },
    ] });

    const resultPage = await request(`/student/assignments/${assignmentId}?attempt=${attemptId}`);
    assert.ok(resultPage.includes("Two is two."), "Submitted explanation missing");
    assert.ok(resultPage.includes("awaiting your tutor"), "Pending short-answer score missing");
    process.stdout.write("Class plan privacy, active work privacy, fill partial credit, and submitted review verified.\n");
  } finally {
    if (attemptId) await db.response.deleteMany({ where: { attemptId } });
    if (attemptId) await db.attempt.delete({ where: { id: attemptId } });
    if (assignmentId) await db.assignment.delete({ where: { id: assignmentId } });
    if (classId) await db.assignment.delete({ where: { id: classId } });
    if (homeworkMaterialId) await db.material.delete({ where: { id: homeworkMaterialId } });
    if (planMaterialId) await db.material.delete({ where: { id: planMaterialId } });
    if (sessionId) await db.loginSession.delete({ where: { id: sessionId } });
    await db.user.deleteMany({ where: { id: studentId } });
    await db.$disconnect();
  }
}

main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
