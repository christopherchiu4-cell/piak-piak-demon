"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getActivity } from "@/content/catalog";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { gradeQuestion } from "@/lib/grading";

async function authorizedAttempt(attemptId: string, studentId: string) {
  const attempt = await db.attempt.findUnique({ where: { id: attemptId }, include: { assignment: true } });
  if (!attempt || attempt.assignment.studentId !== studentId) throw new Error("Attempt not found.");
  return attempt;
}

export async function startAttempt(formData: FormData) {
  const student = await requireRole("STUDENT");
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const assignment = await db.assignment.findUnique({ where: { id: assignmentId }, include: { attempts: true } });
  if (!assignment || assignment.studentId !== student.id || assignment.availableAt > new Date()) throw new Error("Assignment unavailable.");
  const existing = assignment.attempts.find((attempt) => attempt.status === "IN_PROGRESS");
  if (existing) redirect(`/student/assignments/${assignmentId}`);
  if (assignment.attempts.length >= assignment.maxAttempts) throw new Error("No attempts remain.");
  await db.attempt.create({ data: { assignmentId, number: assignment.attempts.length + 1 } });
  redirect(`/student/assignments/${assignmentId}`);
}

export async function saveResponse(attemptId: string, questionId: string, answer: string) {
  const student = await requireRole("STUDENT");
  const attempt = await authorizedAttempt(attemptId, student.id);
  if (attempt.status !== "IN_PROGRESS") return { saved: false };
  const activity = getActivity(attempt.assignment.contentKey, attempt.assignment.contentVersion);
  const question = activity?.questions.find((item) => item.id === questionId);
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
  const activity = getActivity(attempt.assignment.contentKey, attempt.assignment.contentVersion);
  if (!activity) throw new Error("Published content version is missing from this deployment.");
  await db.$transaction(async (tx) => {
    const updated = await tx.attempt.updateMany({ where: { id: attemptId, status: "IN_PROGRESS" }, data: {
      status: "SUBMITTED", submittedAt: new Date(),
    } });
    if (updated.count !== 1) return;
    const existing = await tx.response.findMany({ where: { attemptId } });
    const previous = new Map(existing.map((response) => [response.questionId, response.answer]));
    for (const question of activity.questions) {
      const incoming = submittedAnswers[question.id];
      const answer = (typeof incoming === "string" ? incoming : previous.get(question.id) ?? "").slice(0, 20000);
      const score = gradeQuestion(question, answer);
      await tx.response.upsert({
        where: { attemptId_questionId: { attemptId, questionId: question.id } },
        update: { answer, score, maxPoints: question.points },
        create: { attemptId, questionId: question.id, answer, score, maxPoints: question.points },
      });
    }
  });
  revalidatePath(`/student/assignments/${attempt.assignmentId}`);
  redirect(`/student/assignments/${attempt.assignmentId}?attempt=${attemptId}`);
}
