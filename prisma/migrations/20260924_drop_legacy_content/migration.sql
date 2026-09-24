-- Cleanup. MUST NOT run before `pnpm db:migrate-content` has completed against
-- this database: it destroys the only pointer back to the source-code content.

ALTER TABLE "Assignment" ALTER COLUMN "title" DROP DEFAULT;
ALTER TABLE "Assignment" ALTER COLUMN "blocks" DROP DEFAULT;

ALTER TABLE "Assignment" DROP CONSTRAINT IF EXISTS "Assignment_classSessionId_fkey";
ALTER TABLE "Assignment" DROP COLUMN "contentKey";
ALTER TABLE "Assignment" DROP COLUMN "contentVersion";
ALTER TABLE "Assignment" DROP COLUMN "classSessionId";

DROP TABLE "ClassSession";
