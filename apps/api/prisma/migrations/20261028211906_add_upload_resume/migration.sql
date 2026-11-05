-- AlterTable
-- Rows from before resumable uploads have no client timestamp: their creation time stands in, so
-- they never match a file a client sends again and simply expire or stay completed.
ALTER TABLE "meeting_files" ADD COLUMN     "last_modified" TIMESTAMP(3);
UPDATE "meeting_files" SET "last_modified" = "created_at";
ALTER TABLE "meeting_files" ALTER COLUMN "last_modified" SET NOT NULL;

-- CreateIndex
CREATE INDEX "meeting_files_status_updated_at_idx" ON "meeting_files"("status", "updated_at");
