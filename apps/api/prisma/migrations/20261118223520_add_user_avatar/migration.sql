-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar_id" UUID,
ADD COLUMN     "avatar_type" TEXT;

-- An avatar is a file id plus its type: both set or both null.
ALTER TABLE "users" ADD CONSTRAINT "users_avatar_check"
CHECK (("avatar_id" IS NULL) = ("avatar_type" IS NULL));
