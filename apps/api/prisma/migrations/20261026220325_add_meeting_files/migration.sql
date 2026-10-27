-- CreateEnum
CREATE TYPE "meeting_file_status" AS ENUM ('PENDING', 'COMPLETED');

-- CreateTable
CREATE TABLE "meeting_files" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "uploader_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "storage_key" TEXT,
    "status" "meeting_file_status" NOT NULL DEFAULT 'PENDING',
    "bytes_received" BIGINT NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeting_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meeting_files_meeting_id_status_completed_at_idx" ON "meeting_files"("meeting_id", "status", "completed_at");

-- CreateIndex
CREATE INDEX "meeting_files_uploader_id_idx" ON "meeting_files"("uploader_id");

-- AddForeignKey
ALTER TABLE "meeting_files" ADD CONSTRAINT "meeting_files_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_files" ADD CONSTRAINT "meeting_files_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
