-- CreateTable
CREATE TABLE "meetings" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "owner_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_participants" (
    "meeting_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "meeting_participants_pkey" PRIMARY KEY ("meeting_id","user_id")
);

-- CreateIndex
CREATE INDEX "meetings_owner_id_date_idx" ON "meetings"("owner_id", "date");

-- CreateIndex
CREATE INDEX "meeting_participants_user_id_idx" ON "meeting_participants"("user_id");

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
