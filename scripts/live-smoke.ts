import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createToken, hashCredential, hashToken } from "../src/lib/credentials";
import { getActivity, getPlan } from "../src/content/catalog";

if (process.env.RUN_LIVE_SMOKE !== "yes") throw new Error("Set RUN_LIVE_SMOKE=yes to allow temporary test records.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

async function main() {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const studentId = randomUUID();
  const login = `smoke-${studentId.slice(0, 8)}`;
  const token = createToken();
  let sessionId: string | undefined;
  let classId: string | undefined;
  let assignmentId: string | undefined;
  let attemptId: string | undefined;
  try {
    const teacher = await db.user.findFirst({ where: { role: "TEACHER" } });
    assert.ok(teacher, "Teacher account must exist");
    await db.user.create({ data: { id: studentId, login, displayName: "Temporary smoke test", role: "STUDENT", credentialHash: await hashCredential(randomUUID()) } });
    const session = await db.loginSession.create({ data: { userId: studentId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
    sessionId = session.id;
    const plan = getPlan("numbers-and-reading", 1)!;
    const classSession = await db.classSession.create({ data: { studentId, startsAt: new Date(), title: "Temporary test class", planKey: plan.key, planVersion: plan.version } });
    classId = classSession.id;
    const activity = getActivity("numbers-foundations", 1)!;
    const assignment = await db.assignment.create({ data: { teacherId: teacher.id, studentId, classSessionId: classId, contentKey: activity.key, contentVersion: activity.version, subject: activity.subject, kind: "HOMEWORK" } });
    assignmentId = assignment.id;
    const attempt = await db.attempt.create({ data: { assignmentId, number: 1 } });
    attemptId = attempt.id;
    const request = async (path: string) => {
      const response = await fetch(`http://127.0.0.1:3000${path}`, { headers: { Cookie: `tutoring_session=${token}` } });
      assert.equal(response.status, 200, `${path} returned ${response.status}`);
      return response.text();
    };
    const planPage = await request(`/student/plans/${classId}`);
    assert.ok(planPage.includes(plan.title));
    const activePage = await request(`/student/assignments/${assignmentId}`);
    assert.ok(activePage.includes(activity.questions[0].prompt));
    assert.equal(activePage.includes(activity.questions[0].explanation), false, "Active page exposed an explanation");
    await db.attempt.update({ where: { id: attemptId }, data: { status: "SUBMITTED", submittedAt: new Date() } });
    await db.response.createMany({ data: activity.questions.map((question) => ({
      attemptId: attemptId!, questionId: question.id, maxPoints: question.points,
      answer: question.type === "written" ? "A test explanation" : "",
      score: question.type === "written" ? null : 0,
    })) });
    const resultPage = await request(`/student/assignments/${assignmentId}?attempt=${attemptId}`);
    assert.ok(resultPage.includes(activity.questions[0].explanation), "Submitted explanation missing");
    assert.ok(resultPage.includes("awaiting teacher review"), "Pending written score missing");
    process.stdout.write("Student plan, active work, answer privacy, and submitted review verified.\n");
  } finally {
    if (attemptId) await db.response.deleteMany({ where: { attemptId } });
    if (attemptId) await db.attempt.delete({ where: { id: attemptId } });
    if (assignmentId) await db.assignment.delete({ where: { id: assignmentId } });
    if (classId) await db.classSession.delete({ where: { id: classId } });
    if (sessionId) await db.loginSession.delete({ where: { id: sessionId } });
    await db.user.deleteMany({ where: { id: studentId } });
    await db.$disconnect();
  }
}

main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
