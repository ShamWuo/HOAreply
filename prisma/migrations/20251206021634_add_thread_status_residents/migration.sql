-- CreateEnum
CREATE TYPE "ThreadStatus" AS ENUM ('NEW', 'PENDING', 'AWAITING_RESIDENT', 'FOLLOW_UP', 'RESOLVED', 'ERROR');

-- AlterTable
ALTER TABLE "EmailMessage" ADD COLUMN     "residentId" TEXT;

-- AlterTable
ALTER TABLE "EmailThread" ADD COLUMN     "assignedToUserId" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "priority" TEXT,
ADD COLUMN     "status" "ThreadStatus" NOT NULL DEFAULT 'NEW',
ADD COLUMN     "unreadCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "GmailAccount" ADD COLUMN     "lastPollError" TEXT,
ADD COLUMN     "lastPolledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "JobLock" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Resident" (
    "id" TEXT NOT NULL,
    "hoaId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "firstMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messageCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Resident_hoaId_idx" ON "Resident"("hoaId");

-- CreateIndex
CREATE UNIQUE INDEX "Resident_hoaId_email_key" ON "Resident"("hoaId", "email");

-- CreateIndex
CREATE INDEX "EmailMessage_residentId_idx" ON "EmailMessage"("residentId");

-- CreateIndex
CREATE INDEX "EmailThread_status_idx" ON "EmailThread"("status");

-- AddForeignKey
ALTER TABLE "EmailThread" ADD CONSTRAINT "EmailThread_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resident" ADD CONSTRAINT "Resident_hoaId_fkey" FOREIGN KEY ("hoaId") REFERENCES "HOA"("id") ON DELETE CASCADE ON UPDATE CASCADE;
