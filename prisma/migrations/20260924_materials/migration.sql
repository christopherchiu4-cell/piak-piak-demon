-- Additive migration. Legacy columns (Assignment.contentKey/contentVersion/classSessionId)
-- and the ClassSession table are deliberately left in place so that
-- `pnpm db:migrate-content` can read them. The follow-up migration drops them.

-- MaterialKind replaces ActivityKind. A brand new type is created and cast into,
-- rather than ALTER TYPE ... ADD VALUE, because Postgres forbids using a newly
-- added enum value inside the transaction that added it, and Prisma runs each
-- migration in a single transaction. CLASSWORK folds into CLASS_PLAN.
CREATE TYPE "MaterialKind" AS ENUM ('CLASS_PLAN', 'HOMEWORK');

ALTER TABLE "Assignment"
  ALTER COLUMN "kind" TYPE "MaterialKind"
  USING (CASE WHEN "kind"::text = 'HOMEWORK' THEN 'HOMEWORK' ELSE 'CLASS_PLAN' END)::"MaterialKind";

DROP TYPE "ActivityKind";

-- Teacher-authored, editable content.
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "kind" "MaterialKind" NOT NULL,
    "subject" "Subject" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "topicIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "blocks" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "authorId" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Material_kind_archivedAt_idx" ON "Material"("kind", "archivedAt");

ALTER TABLE "Material" ADD CONSTRAINT "Material_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Soft delete for students, and a teacher-readable copy of the access code.
ALTER TABLE "User" ADD COLUMN "accessCode" TEXT;
ALTER TABLE "User" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- Snapshot columns. title/blocks carry a temporary default so existing rows stay
-- valid; the backfill fills them in and the cleanup migration drops the defaults.
ALTER TABLE "Assignment" ADD COLUMN "materialId" TEXT;
ALTER TABLE "Assignment" ADD COLUMN "materialVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Assignment" ADD COLUMN "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Assignment" ADD COLUMN "summary" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Assignment" ADD COLUMN "blocks" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Assignment" ADD COLUMN "scheduledAt" TIMESTAMP(3);
ALTER TABLE "Assignment" ADD COLUMN "attendedAt" TIMESTAMP(3);
ALTER TABLE "Assignment" ADD COLUMN "notes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Assignment" ADD COLUMN "notesPublishedAt" TIMESTAMP(3);
ALTER TABLE "Assignment" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "Assignment" ADD COLUMN "classAssignmentId" TEXT;

CREATE INDEX "Assignment_studentId_scheduledAt_idx" ON "Assignment"("studentId", "scheduledAt");
CREATE INDEX "Assignment_studentId_dueAt_idx" ON "Assignment"("studentId", "dueAt");
CREATE INDEX "Assignment_classAssignmentId_idx" ON "Assignment"("classAssignmentId");

ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_materialId_fkey"
  FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_classAssignmentId_fkey"
  FOREIGN KEY ("classAssignmentId") REFERENCES "Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ClassSession rows still need reading during the backfill, so the student FK
-- stays until the cleanup migration.
