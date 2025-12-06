-- CreateTable
CREATE TABLE "ThreadClassificationHistory" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "category" TEXT,
    "priority" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThreadClassificationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ThreadClassificationHistory_threadId_idx" ON "ThreadClassificationHistory"("threadId");

-- AddForeignKey
ALTER TABLE "ThreadClassificationHistory" ADD CONSTRAINT "ThreadClassificationHistory_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "EmailThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
