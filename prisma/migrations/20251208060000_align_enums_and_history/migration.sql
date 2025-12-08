-- Align enums and constraints with new request model
-- RequestCategory: add OTHER, remove LEGAL/SPAM
CREATE TYPE "RequestCategory_new" AS ENUM ('GENERAL','MAINTENANCE','VIOLATION','BILLING','BOARD','OTHER');
ALTER TABLE "PolicyTemplate" ALTER COLUMN "category" TYPE "RequestCategory_new" USING "category"::text::"RequestCategory_new";
ALTER TABLE "Request" ALTER COLUMN "category" TYPE "RequestCategory_new" USING "category"::text::"RequestCategory_new";
DROP TYPE "RequestCategory";
ALTER TYPE "RequestCategory_new" RENAME TO "RequestCategory";

-- RequestStatus: create new enum and map old values to new ones during type change
ALTER TABLE "Request" ALTER COLUMN "status" DROP DEFAULT;
CREATE TYPE "RequestStatus_new" AS ENUM ('OPEN','IN_PROGRESS','NEEDS_INFO','RESOLVED','CLOSED');
ALTER TABLE "Request" ALTER COLUMN "status" TYPE "RequestStatus_new" USING (
	CASE
		WHEN "status"::text = 'NEW' THEN 'OPEN'
		WHEN "status"::text = 'NEEDS_REVIEW' THEN 'IN_PROGRESS'
		WHEN "status"::text = 'WAITING' THEN 'NEEDS_INFO'
		ELSE "status"::text
	END
)::"RequestStatus_new";
DROP TYPE "RequestStatus";
ALTER TYPE "RequestStatus_new" RENAME TO "RequestStatus";
ALTER TABLE "Request" ALTER COLUMN "status" SET DEFAULT 'OPEN';

-- AuditAction additions
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PRIORITY_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'AI_SUMMARY_GENERATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MESSAGE_SENT';

-- Gmail history tracking
ALTER TABLE "GmailAccount" ADD COLUMN IF NOT EXISTS "historyId" TEXT;

-- Enforce non-cascading HOA deletes for GmailAccount and EmailThread
ALTER TABLE "GmailAccount" DROP CONSTRAINT IF EXISTS "GmailAccount_hoaId_fkey";
ALTER TABLE "GmailAccount" ADD CONSTRAINT "GmailAccount_hoaId_fkey" FOREIGN KEY ("hoaId") REFERENCES "HOA"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EmailThread" DROP CONSTRAINT IF EXISTS "EmailThread_hoaId_fkey";
ALTER TABLE "EmailThread" ADD CONSTRAINT "EmailThread_hoaId_fkey" FOREIGN KEY ("hoaId") REFERENCES "HOA"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
