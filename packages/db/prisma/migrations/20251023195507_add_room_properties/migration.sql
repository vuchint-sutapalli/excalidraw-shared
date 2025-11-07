-- AlterTable
ALTER TABLE "public"."Room" ADD COLUMN     "description" TEXT DEFAULT '',
ADD COLUMN     "isStarred" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
