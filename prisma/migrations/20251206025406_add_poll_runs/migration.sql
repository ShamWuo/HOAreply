-- CreateTable
CREATE TABLE "PollRun" (
    "id" TEXT NOT NULL,
    "gmailAccountId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "PollRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PollRun_gmailAccountId_idx" ON "PollRun"("gmailAccountId");

-- CreateIndex
CREATE INDEX "PollRun_startedAt_idx" ON "PollRun"("startedAt");

-- AddForeignKey
ALTER TABLE "PollRun" ADD CONSTRAINT "PollRun_gmailAccountId_fkey" FOREIGN KEY ("gmailAccountId") REFERENCES "GmailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
