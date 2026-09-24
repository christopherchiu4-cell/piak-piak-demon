"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { blockProblems, blocksSchema, draftBlocksSchema, questionBlocks, type Block } from "@/content/blocks";
import { applyBlockOp, parseBlocksForm } from "@/lib/block-form";
import { blocksFromCsv } from "@/content/csv-material";
import { parseCsv } from "@/lib/csv";
import { readBlocks } from "@/lib/blocks";
import { requireRole } from "@/lib/auth";
import { generateAccessCode } from "@/lib/codes";
import { hashCredential } from "@/lib/credentials";
import { db } from "@/lib/db";

function field(data: FormData, name: string) { return String(data.get(name) ?? "").trim(); }
function validDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}+08:00`);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date.");
  return date;
}
function subjectOf(value: string) {
  if (value !== "MATH" && value !== "ENGLISH") throw new Error("Choose Math or English.");
  return value;
}
function kindOf(value: string) {
  if (value !== "CLASS_PLAN" && value !== "HOMEWORK") throw new Error("Choose a class plan or homework.");
  return value;
}

/* -------------------------------------------------------------- students */

export async function createStudent(formData: FormData) {
  await requireRole("TEACHER");
  const login = field(formData, "login").toLowerCase();
  const displayName = field(formData, "displayName");
  const code = field(formData, "code") || generateAccessCode();
  if (!/^[a-z0-9._-]{3,40}$/.test(login) || !displayName || code.length < 8) {
    throw new Error("Enter a valid username, name, and code of at least 8 characters.");
  }
  const existing = await db.user.findUnique({ where: { login } });
  if (existing) throw new Error("That username is already taken.");
  await db.user.create({ data: { login, displayName, role: "STUDENT", accessCode: code, credentialHash: await hashCredential(code) } });
  revalidatePath("/teacher/students");
  revalidatePath("/teacher");
}

export async function resetStudentCode(formData: FormData) {
  await requireRole("TEACHER");
  const id = field(formData, "studentId");
  const code = field(formData, "code") || generateAccessCode();
  if (code.length < 8) throw new Error("Code must contain at least 8 characters.");
  const student = await db.user.findUnique({ where: { id } });
  if (student?.role !== "STUDENT") throw new Error("Student not found.");
  await db.$transaction([
    db.user.update({ where: { id }, data: { accessCode: code, credentialHash: await hashCredential(code), failedLogins: 0, lockedUntil: null } }),
    db.loginSession.deleteMany({ where: { userId: id } }),
  ]);
  revalidatePath("/teacher/students");
  revalidatePath(`/teacher/students/${id}`);
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
  revalidatePath(`/teacher/students/${id}`);
}

/** Soft delete. Work stays on the student's record and can be restored. */
export async function archiveStudent(formData: FormData) {
  await requireRole("TEACHER");
  const id = field(formData, "studentId");
  const student = await db.user.findUnique({ where: { id } });
  if (student?.role !== "STUDENT") throw new Error("Student not found.");
  await db.$transaction([
    db.user.update({ where: { id }, data: { archivedAt: new Date() } }),
    db.loginSession.deleteMany({ where: { userId: id } }),
  ]);
  revalidatePath("/teacher", "layout");
  redirect("/teacher/students");
}

/**
 * Irreversible hard delete, for test accounts. Only reachable once a student is
 * already archived, so it takes two deliberate steps. Nothing cascades from
 * Assignment or Attempt in the schema, so the chain is deleted explicitly,
 * innermost first, inside one transaction.
 */
export async function deleteStudentForever(formData: FormData) {
  await requireRole("TEACHER");
  const id = field(formData, "studentId");
  const student = await db.user.findUnique({ where: { id } });
  if (student?.role !== "STUDENT") throw new Error("Student not found.");
  if (!student.archivedAt) throw new Error("Delete the student first, then remove them permanently.");

  await db.$transaction([
    db.response.deleteMany({ where: { attempt: { assignment: { studentId: id } } } }),
    db.attempt.deleteMany({ where: { assignment: { studentId: id } } }),
    db.assignment.deleteMany({ where: { studentId: id } }),
    db.loginSession.deleteMany({ where: { userId: id } }),
    db.user.delete({ where: { id } }),
  ]);
  revalidatePath("/teacher", "layout");
  redirect("/teacher/students");
}

export async function restoreStudent(formData: FormData) {
  await requireRole("TEACHER");
  const id = field(formData, "studentId");
  await db.user.updateMany({ where: { id, role: "STUDENT" }, data: { archivedAt: null } });
  revalidatePath("/teacher", "layout");
}

/* ------------------------------------------------------------- materials */

export async function createMaterial(formData: FormData) {
  const teacher = await requireRole("TEACHER");
  const kind = kindOf(field(formData, "kind"));
  const title = field(formData, "title");
  if (!title) throw new Error("Give it a title.");
  const material = await db.material.create({ data: {
    kind, subject: subjectOf(field(formData, "subject")), title, summary: field(formData, "summary"),
    blocks: [], authorId: teacher.id,
  } });
  redirect(`${kind === "HOMEWORK" ? "/teacher/homework" : "/teacher/plans"}/${material.id}`);
}

/**
 * The block editor's single action. Structural edits arrive as `op` on the clicked
 * submit button, so one round trip both applies the edit and saves what was typed.
 */
export async function saveMaterial(formData: FormData) {
  await requireRole("TEACHER");
  const id = field(formData, "materialId");
  const material = await db.material.findUnique({ where: { id } });
  if (!material) throw new Error("Material not found.");
  const title = field(formData, "title");
  if (!title) throw new Error("Give it a title.");
  const blocks = applyBlockOp(parseBlocksForm(formData), field(formData, "op") || null);
  const parsed = draftBlocksSchema.safeParse(blocks);
  if (!parsed.success) throw new Error("Those blocks could not be saved.");
  const topicIds = formData.getAll("topicIds").map((value) => String(value)).filter(Boolean);
  await db.material.update({ where: { id }, data: {
    title, summary: field(formData, "summary"), subject: subjectOf(field(formData, "subject")),
    topicIds, blocks: parsed.data, version: { increment: 1 },
  } });
  revalidatePath(`/teacher/${material.kind === "HOMEWORK" ? "homework" : "plans"}/${id}`);
  revalidatePath(`/teacher/${material.kind === "HOMEWORK" ? "homework" : "plans"}`);
}

/**
 * Creates a material from an uploaded CSV, one block per row. Always creates —
 * never appends or overwrites — and lands in the editor so the result is
 * reviewed before it can be assigned. See docs/material-csv.md for the format.
 */
export async function importMaterialCsv(formData: FormData) {
  const teacher = await requireRole("TEACHER");
  const kind = kindOf(field(formData, "kind"));
  const title = field(formData, "title");
  if (!title) throw new Error("Give it a title.");

  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) throw new Error("Choose a CSV file to import.");
  // Server Actions cap the request body at 1MB by default; fail clearly well below it.
  if (file.size > 500_000) throw new Error("That file is larger than 500KB. Split it into smaller sets.");
  if (!/\.csv$/i.test(file.name) && file.type && !file.type.includes("csv") && !file.type.includes("text")) {
    throw new Error("That does not look like a CSV file.");
  }

  const { blocks, problems } = blocksFromCsv(parseCsv(await file.text()));
  if (!blocks.length) throw new Error(problems[0] ?? "Nothing in that file could be imported.");
  const parsed = draftBlocksSchema.safeParse(blocks);
  if (!parsed.success) throw new Error("That file produced blocks that could not be saved.");

  const material = await db.material.create({ data: {
    kind, subject: subjectOf(field(formData, "subject")), title, summary: field(formData, "summary"),
    blocks: parsed.data, authorId: teacher.id,
  } });
  revalidatePath(`/teacher/${kind === "HOMEWORK" ? "homework" : "plans"}`);
  redirect(`${kind === "HOMEWORK" ? "/teacher/homework" : "/teacher/plans"}/${material.id}`);
}

export async function duplicateMaterial(formData: FormData) {
  const teacher = await requireRole("TEACHER");
  const source = await db.material.findUnique({ where: { id: field(formData, "materialId") } });
  if (!source) throw new Error("Material not found.");
  const copy = await db.material.create({ data: {
    kind: source.kind, subject: source.subject, title: `${source.title} (copy)`, summary: source.summary,
    topicIds: source.topicIds, blocks: source.blocks ?? [], authorId: teacher.id,
  } });
  redirect(`${source.kind === "HOMEWORK" ? "/teacher/homework" : "/teacher/plans"}/${copy.id}`);
}

/** Archiving never touches assignments: they hold their own content snapshot. */
export async function archiveMaterial(formData: FormData) {
  await requireRole("TEACHER");
  const id = field(formData, "materialId");
  const material = await db.material.findUnique({ where: { id } });
  if (!material) throw new Error("Material not found.");
  await db.material.update({ where: { id }, data: { archivedAt: material.archivedAt ? null : new Date() } });
  revalidatePath("/teacher", "layout");
}

/* ----------------------------------------------------------- assignments */

async function snapshotFor(materialId: string, kind: "CLASS_PLAN" | "HOMEWORK") {
  const material = await db.material.findUnique({ where: { id: materialId } });
  if (!material || material.kind !== kind || material.archivedAt) throw new Error("Choose an available material.");
  const blocks = readBlocks(material.blocks);
  if (kind === "HOMEWORK") {
    if (!blocksSchema.safeParse(blocks).success || blockProblems(blocks).length) {
      throw new Error("That homework is not ready to assign. Fix the problems listed on its page first.");
    }
  }
  return { material, blocks };
}

async function activeStudent(studentId: string) {
  const student = await db.user.findUnique({ where: { id: studentId } });
  if (student?.role !== "STUDENT" || !student.active || student.archivedAt) throw new Error("Choose an active student.");
  return student;
}

export async function assignHomework(formData: FormData) {
  const teacher = await requireRole("TEACHER");
  const studentId = field(formData, "studentId");
  await activeStudent(studentId);
  const { material, blocks } = await snapshotFor(field(formData, "materialId"), "HOMEWORK");
  const classAssignmentId = field(formData, "classAssignmentId") || null;
  if (classAssignmentId) {
    const parent = await db.assignment.findUnique({ where: { id: classAssignmentId } });
    if (!parent || parent.studentId !== studentId) throw new Error("Choose this student's class.");
  }
  const assignment = await db.assignment.create({ data: {
    studentId, teacherId: teacher.id, materialId: material.id, materialVersion: material.version,
    kind: "HOMEWORK", subject: material.subject, title: material.title, summary: material.summary,
    blocks, dueAt: validDate(field(formData, "dueAt")), classAssignmentId,
  } });
  revalidatePath("/teacher", "layout");
  revalidatePath("/student", "layout");
  redirect(`/teacher/assignments/${assignment.id}`);
}

export async function scheduleClass(formData: FormData) {
  const teacher = await requireRole("TEACHER");
  const studentId = field(formData, "studentId");
  await activeStudent(studentId);
  const { material, blocks } = await snapshotFor(field(formData, "materialId"), "CLASS_PLAN");
  const scheduledAt = validDate(field(formData, "scheduledAt"));
  if (!scheduledAt) throw new Error("Pick a date and time for the class.");
  const assignment = await db.assignment.create({ data: {
    studentId, teacherId: teacher.id, materialId: material.id, materialVersion: material.version,
    kind: "CLASS_PLAN", subject: material.subject, title: field(formData, "title") || material.title,
    summary: material.summary, blocks, scheduledAt, availableAt: new Date(),
  } });
  revalidatePath("/teacher", "layout");
  revalidatePath("/student", "layout");
  redirect(`/teacher/assignments/${assignment.id}`);
}

/** Re-copies the current material content. Only safe while nothing has been attempted. */
export async function refreshAssignmentContent(formData: FormData) {
  const teacher = await requireRole("TEACHER");
  const id = field(formData, "assignmentId");
  const assignment = await db.assignment.findUnique({ where: { id }, include: { material: true, attempts: true } });
  if (!assignment || assignment.teacherId !== teacher.id) throw new Error("Assignment not found.");
  if (assignment.attempts.length) throw new Error("This has already been started, so its content is locked.");
  if (!assignment.material) throw new Error("The source material no longer exists.");
  await db.assignment.update({ where: { id }, data: {
    blocks: readBlocks(assignment.material.blocks) as unknown as Block[],
    materialVersion: assignment.material.version, title: assignment.material.title, summary: assignment.material.summary,
  } });
  revalidatePath(`/teacher/assignments/${id}`);
}

export async function saveClassNotes(formData: FormData) {
  await requireRole("TEACHER");
  const id = field(formData, "assignmentId");
  const notes = field(formData, "notes");
  if (notes.length > 30000) throw new Error("Notes are too long.");
  await db.assignment.update({ where: { id }, data: {
    notes, notesPublishedAt: field(formData, "publish") === "yes" && notes ? new Date() : null,
  } });
  revalidatePath(`/teacher/assignments/${id}`);
  revalidatePath("/student", "layout");
}

export async function markAttendance(formData: FormData) {
  await requireRole("TEACHER");
  const id = field(formData, "assignmentId");
  const assignment = await db.assignment.findUnique({ where: { id } });
  if (!assignment) throw new Error("Class not found.");
  await db.assignment.update({ where: { id }, data: { attendedAt: assignment.attendedAt ? null : new Date() } });
  revalidatePath("/teacher", "layout");
}

export async function archiveAssignment(formData: FormData) {
  const teacher = await requireRole("TEACHER");
  const id = field(formData, "assignmentId");
  const assignment = await db.assignment.findUnique({ where: { id } });
  if (!assignment || assignment.teacherId !== teacher.id) throw new Error("Assignment not found.");
  await db.assignment.update({ where: { id }, data: { archivedAt: assignment.archivedAt ? null : new Date() } });
  revalidatePath("/teacher", "layout");
  revalidatePath("/student", "layout");
}

export async function reopenAssignment(formData: FormData) {
  await requireRole("TEACHER");
  const id = field(formData, "assignmentId");
  await db.assignment.update({ where: { id }, data: { maxAttempts: { increment: 1 } } });
  revalidatePath(`/teacher/assignments/${id}`);
}

/* ---------------------------------------------------------------- review */

export async function gradeWritten(formData: FormData) {
  const teacher = await requireRole("TEACHER");
  const responseId = field(formData, "responseId");
  const response = await db.response.findUnique({ where: { id: responseId }, include: { attempt: { include: { assignment: true } } } });
  if (!response || response.attempt.status !== "SUBMITTED" || response.attempt.deletedAt || response.attempt.assignment.teacherId !== teacher.id) throw new Error("Submitted response not found.");
  const block = questionBlocks(readBlocks(response.attempt.assignment.blocks)).find((item) => item.id === response.questionId);
  if (!block || block.type !== "short") throw new Error("Only short answers are graded by hand.");
  const score = Number(field(formData, "score"));
  if (!Number.isInteger(score) || score < 0 || score > block.points) throw new Error("Score is outside the allowed range.");
  await db.response.update({ where: { id: responseId }, data: {
    score, feedback: field(formData, "feedback").slice(0, 10000), reviewedAt: new Date(),
  } });
  revalidatePath("/teacher", "layout");
  revalidatePath("/student", "layout");
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
