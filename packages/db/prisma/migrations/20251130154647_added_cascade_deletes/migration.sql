-- DropForeignKey
ALTER TABLE "public"."Chat" DROP CONSTRAINT "Chat_roomId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Shape" DROP CONSTRAINT "Shape_roomId_fkey";

-- AddForeignKey
ALTER TABLE "public"."Chat" ADD CONSTRAINT "Chat_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Shape" ADD CONSTRAINT "Shape_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
