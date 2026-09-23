"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { activities, getActivity, getPlan } from "@/content/catalog";
import { requireRole } from "@/lib/auth";
import { hashCredential } from "@/lib/credentials";
import { db } from "@/lib/db";

function field(data: FormData, name: string) { return String(data.get(name) ?? "").trim(); }
function validDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}+08:00`);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date.");
  return date;
}

export async function createStudent(formData: FormData) {
  await requireRole("TEACHER");
  const login = field(formData, "login").toLowerCase();
  const displayName = field(formData, "displayName");
  const code = field(formData, "code");
  if (!/^[a-z0-9._-]{3,40}$/.test(login) || !displayName || code.length < 8) {
    throw new Error("Enter a valid username, name, and code of at least 8 characters.");
  }
  await db.user.create({ data: { login, displayName, role: "STUDENT", credentialHash: await hashCredential(code) } });
  revalidatePath("/teacher/students");
}

export async function resetStudentCode(formData: FormData) {
  await requireRole("TEACHER");
  const id = field(formData, "studentId");
  const code = field(formData, "code");
  if (code.length < 8) throw new Error("Code must contain at least 8 characters.");
  const student = await db.user.findUnique({ where: { id } });
  if (student?.role !== "STUDENT") throw new Error("Student not found.");
  await db.$transaction([
    db.user.update({ where: { id }, data: { credentialHash: await hashCredential(code), failedLogins: 0, lockedUntil: null } }),
    db.loginSession.deleteMany({ where: { userId: id } }),
  ]);
  revalidatePath("/teacher/students");
}

export async function setStudentActive(formData: FormData) {
  await requireRole("TEACHER");
  const id = field(formData, "studentId");
  const student = await db.user.findUnique({ where: { id } });
  if (student?.role !== "STUDENT") throw new Error("Student not found.");
  const active = !student.active;
  await db.$transaction([
    db.user.update({ where: { id }, data: { active } }),
    ...(!active ? [db.loginSession.deleteMany({ where: { userId: id } })] : []),
  ]);
  revalidatePath("/teacher/students");
}

export async function createClassSession(formData: FormData) {
  await requireRole("TEACHER");
  const studentId = field(formData, "studentId");
  const student = await db.user.findUnique({ where: { id: studentId } });
  if (student?.role !== "STUDENT" || !student.active) throw new Error("Choose an active student.");
  const [planKey, versionString] = field(formData, "plan").split("@");
  const planVersion = Number(versionString);
  const plan = getPlan(planKey, planVersion);
  const startsAt = validDate(field(formData, "startsAt"));
  if (!plan || !startsAt) throw new Error("Choose a plan and class date.");
  const session = await db.classSession.create({ data: {
    studentId, planKey, planVersion, startsAt, title: field(formData, "title") || plan.title,
  } });
  redirect(`/teacher/classes/${session.id}`);
}

export async function saveClassNotes(formData: FormData) {
  await requireRole("TEACHER");
  const id = field(formData, "classSessionId");
  const notes = field(formData, "notes");
  if (notes.length > 30000) throw new Error("Notes are too long.");
  await db.classSession.update({ where: { id }, data: {
    notes, notesPublishedAt: field(formData, "publish") === "yes" && notes ? new Date() : null,
  } });
  revalidatePath(`/teacher/classes/${id}`);
  revalidatePath("/student/plans");
}

export async function createAssignment(formData: FormData) {
  const teacher = await requireRole("TEACHER");
  const studentId = field(formData, "studentId");
  const student = await db.user.findUnique({ where: { id: studentId } });
  if (student?.role !== "STUDENT" || !student.active) throw new Error("Choose an active student.");
  const [contentKey, versionString] = field(formData, "content").split("@");
  const contentVersion = Number(versionString);
  const activity = getActivity(contentKey, contentVersion);
  if (!activity || !activities.includes(activity)) throw new Error("Choose deployed content.");
  const kind = field(formData, "kind");
  if (kind !== "CLASSWORK" && kind !== "HOMEWORK") throw new Error("Choose classwork or homework.");
  const classSessionId = field(formData, "classSessionId") || null;
  if (classSessionId) {
    const classSession = await db.classSession.findUnique({ where: { id: classSessionId } });
    if (!classSession || classSession.studentId !== studentId) throw new Error("Choose this student's class.");
  }
  const dueAt = validDate(field(formData, "dueAt"));
  const assignment = await db.assignment.create({ data: {
    studentId, teacherId: teacher.id, classSessionId,
    contentKey, contentVersion, kind, subject: activity.subject, dueAt,
  } });
  redirect(`/teacher/assignments/${assignment.id}`);
}

export async function reopenAssignment(formData: FormData) {
  await requireRole("TEACHER");
  const id = field(formData, "assignmentId");
  await db.assignment.update({ where: { id }, data: { maxAttempts: { increment: 1 } } });
  revalidatePath(`/teacher/assignments/${id}`);
}

export async function gradeWritten(formData: FormData) {
  const teacher = await requireRole("TEACHER");
  const responseId = field(formData, "responseId");
  const response = await db.response.findUnique({ where: { id: responseId }, include: { attempt: { include: { assignment: true } } } });
  if (!response || response.attempt.status !== "SUBMITTED" || response.attempt.deletedAt || response.attempt.assignment.teacherId !== teacher.id) throw new Error("Submitted response not found.");
  const activity = getActivity(response.attempt.assignment.contentKey, response.attempt.assignment.contentVersion);
  const question = activity?.questions.find((item) => item.id === response.questionId);
  if (!question || question.type !== "written") throw new Error("Only written responses can be graded here.");
  const score = Number(field(formData, "score"));
  if (!Number.isInteger(score) || score < 0 || score > question.points) throw new Error("Score is outside the allowed range.");
  await db.response.update({ where: { id: responseId }, data: {
    score, feedback: field(formData, "feedback").slice(0, 10000), reviewedAt: new Date(),
  } });
  revalidatePath(`/teacher/assignments/${response.attempt.assignmentId}`);
  revalidatePath(`/student/assignments/${response.attempt.assignmentId}`);
}

export async function trashSubmission(formData: FormData) {
  const teacher = await requireRole("TEACHER");
  await db.attempt.updateMany({
    where: { id: field(formData, "attemptId"), status: "SUBMITTED", deletedAt: null, assignment: { teacherId: teacher.id } },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/teacher", "layout");
  revalidatePath("/student", "layout");
}

export async function restoreSubmission(formData: FormData) {
  const teacher = await requireRole("TEACHER");
  await db.attempt.updateMany({
    where: { id: field(formData, "attemptId"), status: "SUBMITTED", deletedAt: { not: null }, assignment: { teacherId: teacher.id } },
    data: { deletedAt: null },
  });
  revalidatePath("/teacher", "layout");
  revalidatePath("/student", "layout");
}
