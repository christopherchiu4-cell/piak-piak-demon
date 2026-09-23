ALTER TABLE "Attempt" ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE INDEX "Attempt_deletedAt_idx" ON "Attempt"("deletedAt");
