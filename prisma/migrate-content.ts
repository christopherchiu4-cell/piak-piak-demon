/**
 * One-shot backfill: moves source-code content into Material rows, snapshots it
 * onto every existing Assignment, and converts ClassSession rows into class-plan
 * assignments. Run once per environment, after 20260924_materials and before
 * the cleanup migration. Delete this file, src/content/legacy.ts, and the legacy
 * content modules once it has run everywhere.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { activities, plans } from "../src/content/catalog";
import { activityToBlocks, planToBlocks } from "../src/content/legacy";
import { isAssignable, questionBlocks, type Block } from "../src/content/blocks";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL.");

type LegacyAssignment = { id: string; contentKey: string; contentVersion: number; classSessionId: string | null };
type LegacyClassSession = { id: string; studentId: string; startsAt: Date; title: string; planKey: string; planVersion: number; notes: string; notesPublishedAt: Date | null };

async function main(url: string) {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const teacher = await db.user.findFirst({ where: { role: "TEACHER" }, orderBy: { createdAt: "asc" } });
    if (!teacher) throw new Error("No teacher account. Run pnpm db:bootstrap first.");

    // 1. Every published activity and plan becomes an editable Material.
    const materialByKey = new Map<string, { id: string; version: number; blocks: Block[]; title: string; summary: string }>();
    for (const activity of activities) {
      const blocks = activityToBlocks(activity);
      if (!isAssignable(blocks)) throw new Error(`Converted activity ${activity.key} is not assignable.`);
      const material = await db.material.create({ data: {
        kind: "HOMEWORK", subject: activity.subject, title: activity.title, summary: activity.summary,
        topicIds: activity.topicIds, blocks, version: activity.version, authorId: teacher.id,
      } });
      materialByKey.set(`${activity.key}@${activity.version}`, { id: material.id, version: material.version, blocks, title: activity.title, summary: activity.summary });
    }
    for (const plan of plans) {
      const blocks = planToBlocks(plan);
      const material = await db.material.create({ data: {
        kind: "CLASS_PLAN", subject: "MATH", title: plan.title, summary: plan.summary,
        topicIds: [], blocks, version: plan.version, authorId: teacher.id,
      } });
      materialByKey.set(`${plan.key}@${plan.version}`, { id: material.id, version: material.version, blocks, title: plan.title, summary: plan.summary });
    }
    process.stdout.write(`Created ${materialByKey.size} materials.\n`);

    // 2. ClassSession rows become CLASS_PLAN assignments. Read via raw SQL: the
    //    model is already gone from schema.prisma.
    const sessions = await db.$queryRaw<LegacyClassSession[]>`SELECT "id","studentId","startsAt","title","planKey","planVersion","notes","notesPublishedAt" FROM "ClassSession"`;
    const assignmentBySession = new Map<string, string>();
    for (const session of sessions) {
      const source = materialByKey.get(`${session.planKey}@${session.planVersion}`);
      if (!source) throw new Error(`Class session ${session.id} references missing plan ${session.planKey}@${session.planVersion}.`);
      const created = await db.assignment.create({ data: {
        studentId: session.studentId, teacherId: teacher.id, materialId: source.id, materialVersion: source.version,
        kind: "CLASS_PLAN", subject: "MATH", title: session.title, summary: source.summary, blocks: source.blocks,
        scheduledAt: session.startsAt, availableAt: session.startsAt, notes: session.notes, notesPublishedAt: session.notesPublishedAt,
      } });
      assignmentBySession.set(session.id, created.id);
    }
    process.stdout.write(`Converted ${sessions.length} class sessions.\n`);

    // 3. Snapshot content onto every pre-existing assignment.
    const legacy = await db.$queryRaw<LegacyAssignment[]>`SELECT "id","contentKey","contentVersion","classSessionId" FROM "Assignment" WHERE "contentKey" <> ''`;
    for (const row of legacy) {
      const source = materialByKey.get(`${row.contentKey}@${row.contentVersion}`);
      if (!source) throw new Error(`Assignment ${row.id} references missing content ${row.contentKey}@${row.contentVersion}. Refusing to continue: this would silently lose a student's work.`);
      await db.assignment.update({ where: { id: row.id }, data: {
        materialId: source.id, materialVersion: source.version, title: source.title, summary: source.summary,
        blocks: source.blocks, classAssignmentId: row.classSessionId ? assignmentBySession.get(row.classSessionId) ?? null : null,
      } });
    }
    process.stdout.write(`Snapshotted ${legacy.length} assignments.\n`);

    // 4. Post-condition: every recorded answer must still resolve to a block.
    const responses = await db.response.findMany({ select: { questionId: true, attempt: { select: { assignment: { select: { id: true, blocks: true } } } } } });
    const orphans = responses.filter((response) => {
      const blocks = response.attempt.assignment.blocks as unknown as Block[];
      return !questionBlocks(blocks).some((block) => block.id === response.questionId);
    });
    if (orphans.length) throw new Error(`${orphans.length} responses no longer resolve to a question block. Roll back.`);
    process.stdout.write(`Verified ${responses.length} responses still resolve.\n`);
  } finally {
    await db.$disconnect();
  }
}

main(url).catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
