-- CreateTable
CREATE TABLE "public"."_MemberOfRooms" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MemberOfRooms_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_MemberOfRooms_B_index" ON "public"."_MemberOfRooms"("B");

-- AddForeignKey
ALTER TABLE "public"."_MemberOfRooms" ADD CONSTRAINT "_MemberOfRooms_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_MemberOfRooms" ADD CONSTRAINT "_MemberOfRooms_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
