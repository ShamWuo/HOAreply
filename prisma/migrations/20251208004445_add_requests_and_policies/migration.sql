-- CreateEnum
CREATE TYPE "RequestCategory" AS ENUM ('MAINTENANCE', 'VIOLATION', 'BILLING', 'GENERAL', 'BOARD', 'LEGAL', 'SPAM');

-- CreateEnum
CREATE TYPE "RequestPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('NEW', 'NEEDS_INFO', 'IN_PROGRESS', 'AWAITING_REPLY', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('EMAIL_RECEIVED', 'REQUEST_CREATED', 'CLASSIFIED', 'DRAFT_GENERATED', 'DRAFT_REGENERATED', 'STATUS_CHANGED', 'APPROVED', 'SENT');

-- CreateEnum
CREATE TYPE "DraftAuthor" AS ENUM ('ai', 'user');

-- CreateTable
CREATE TABLE "Request" (
    "id" TEXT NOT NULL,
    "hoaId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "residentId" TEXT,
    "category" "RequestCategory" NOT NULL,
    "priority" "RequestPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "RequestStatus" NOT NULL DEFAULT 'NEW',
    "assigneeUserId" TEXT,
    "slaDueAt" TIMESTAMP(3),
    "lastActionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "classification" JSONB,
    "missingInfo" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hasLegalRisk" BOOLEAN NOT NULL DEFAULT false,
    "flags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyTemplate" (
    "id" TEXT NOT NULL,
    "hoaId" TEXT NOT NULL,
    "category" "RequestCategory" NOT NULL,
    "priority" "RequestPriority",
    "title" TEXT NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolicyTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplyDraft" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "templateId" TEXT,
    "messageId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" "DraftAuthor" NOT NULL DEFAULT 'ai',
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "sentAt" TIMESTAMP(3),
    "sentByUserId" TEXT,

    CONSTRAINT "ReplyDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "hoaId" TEXT NOT NULL,
    "userId" TEXT,
    "requestId" TEXT,
    "action" "AuditAction" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Request_threadId_key" ON "Request"("threadId");

-- CreateIndex
CREATE INDEX "Request_hoaId_idx" ON "Request"("hoaId");

-- CreateIndex
CREATE INDEX "Request_status_idx" ON "Request"("status");

-- CreateIndex
CREATE INDEX "Request_priority_idx" ON "Request"("priority");

-- CreateIndex
CREATE INDEX "Request_residentId_idx" ON "Request"("residentId");

-- CreateIndex
CREATE INDEX "Request_hoaId_status_priority_slaDueAt_idx" ON "Request"("hoaId", "status", "priority", "slaDueAt");

-- CreateIndex
CREATE INDEX "PolicyTemplate_hoaId_category_idx" ON "PolicyTemplate"("hoaId", "category");

-- CreateIndex
CREATE INDEX "PolicyTemplate_hoaId_category_priority_idx" ON "PolicyTemplate"("hoaId", "category", "priority");

-- CreateIndex
CREATE INDEX "ReplyDraft_requestId_idx" ON "ReplyDraft"("requestId");

-- CreateIndex
CREATE INDEX "ReplyDraft_createdAt_idx" ON "ReplyDraft"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_hoaId_idx" ON "AuditLog"("hoaId");

-- CreateIndex
CREATE INDEX "AuditLog_requestId_idx" ON "AuditLog"("requestId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "EmailThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_hoaId_fkey" FOREIGN KEY ("hoaId") REFERENCES "HOA"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyTemplate" ADD CONSTRAINT "PolicyTemplate_hoaId_fkey" FOREIGN KEY ("hoaId") REFERENCES "HOA"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplyDraft" ADD CONSTRAINT "ReplyDraft_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplyDraft" ADD CONSTRAINT "ReplyDraft_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PolicyTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplyDraft" ADD CONSTRAINT "ReplyDraft_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplyDraft" ADD CONSTRAINT "ReplyDraft_sentByUserId_fkey" FOREIGN KEY ("sentByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplyDraft" ADD CONSTRAINT "ReplyDraft_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "EmailMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_hoaId_fkey" FOREIGN KEY ("hoaId") REFERENCES "HOA"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;
