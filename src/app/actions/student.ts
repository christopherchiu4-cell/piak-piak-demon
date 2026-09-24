"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { questionBlocks } from "@/content/blocks";
import { requireRole } from "@/lib/auth";
import { readBlocks } from "@/lib/blocks";
import { db } from "@/lib/db";
import { gradeBlock } from "@/lib/grading";

async function authorizedAttempt(attemptId: string, studentId: string) {
  const attempt = await db.attempt.findUnique({ where: { id: attemptId }, include: { assignment: true } });
  if (!attempt || attempt.deletedAt || attempt.assignment.studentId !== studentId) throw new Error("Attempt not found.");
  return attempt;
}

export async function startAttempt(formData: FormData) {
  const student = await requireRole("STUDENT");
  const assignmentId = String(formData.get("assignmentId") ?? "");
  await db.$transaction(async (tx) => {
    // Serialize starts for one assignment, including replacement attempts after trash.
    const available = await tx.assignment.updateMany({ where: { id: assignmentId, studentId: student.id, availableAt: { lte: new Date() } }, data: { maxAttempts: { increment: 0 } } });
    if (!available.count) throw new Error("Assignment unavailable.");
    const assignment = await tx.assignment.findUniqueOrThrow({ where: { id: assignmentId }, include: { attempts: true } });
    const visible = assignment.attempts.filter((attempt) => !attempt.deletedAt);
    if (visible.some((attempt) => attempt.status === "IN_PROGRESS")) return;
    if (visible.length >= assignment.maxAttempts) throw new Error("No attempts remain.");
    const number = Math.max(0, ...assignment.attempts.map((attempt) => attempt.number)) + 1;
    await tx.attempt.create({ data: { assignmentId, number } });
  }, { timeout: 15000 });
  redirect(`/student/assignments/${assignmentId}`);
}

export async function saveResponse(attemptId: string, questionId: string, answer: string) {
  const student = await requireRole("STUDENT");
  const attempt = await authorizedAttempt(attemptId, student.id);
  if (attempt.status !== "IN_PROGRESS") return { saved: false };
  const question = questionBlocks(readBlocks(attempt.assignment.blocks)).find((item) => item.id === questionId);
  if (!question) throw new Error("Question not found.");
  if (answer.length > 20000) throw new Error("Answer is too long.");
  return db.$transaction(async (tx) => {
    // Lock the attempt row so a late autosave cannot change a submitted answer.
    const open = await tx.attempt.updateMany({ where: { id: attemptId, status: "IN_PROGRESS" }, data: { startedAt: attempt.startedAt } });
    if (open.count !== 1) return { saved: false };
    await tx.response.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      update: { answer },
      create: { attemptId, questionId, answer, maxPoints: question.points },
    });
    return { saved: true };
  });
}

export async function submitAttempt(attemptId: string, submittedAnswers: Record<string, string>) {
  const student = await requireRole("STUDENT");
  const attempt = await authorizedAttempt(attemptId, student.id);
  if (attempt.status !== "IN_PROGRESS") redirect(`/student/assignments/${attempt.assignmentId}?attempt=${attemptId}`);
  const questions = questionBlocks(readBlocks(attempt.assignment.blocks));
  await db.$transaction(async (tx) => {
    const updated = await tx.attempt.updateMany({ where: { id: attemptId, status: "IN_PROGRESS" }, data: {
      status: "SUBMITTED", submittedAt: new Date(),
    } });
    if (updated.count !== 1) return;
    const existing = await tx.response.findMany({ where: { attemptId } });
    const previous = new Map(existing.map((response) => [response.questionId, response.answer]));
    const responses = questions.map((question) => {
      const incoming = submittedAnswers[question.id];
      const answer = (typeof incoming === "string" ? incoming : previous.get(question.id) ?? "").slice(0, 20000);
      const score = gradeBlock(question, answer);
      return { attemptId, questionId: question.id, answer, score, maxPoints: question.points };
    });
    // Finalize this attempt's draft answers in one batch, atomically with submission.
    // Earlier attempts and their reviewed responses are never touched.
    await tx.response.deleteMany({ where: { attemptId } });
    await tx.response.createMany({ data: responses });
  }, { timeout: 15000 });
  revalidatePath(`/student/assignments/${attempt.assignmentId}`);
  redirect(`/student/assignments/${attempt.assignmentId}?attempt=${attemptId}`);
}
