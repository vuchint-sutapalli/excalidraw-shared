-- CreateTable
CREATE TABLE "public"."Element" (
    "id" TEXT NOT NULL,
    "roomId" INTEGER NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "Element_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Element_roomId_idx" ON "public"."Element"("roomId");

-- AddForeignKey
ALTER TABLE "public"."Element" ADD CONSTRAINT "Element_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
