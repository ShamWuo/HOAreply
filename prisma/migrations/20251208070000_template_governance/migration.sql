-- Enforce template governance: scope by category + request status, drop priority, add draft source, extend audit actions.

-- Add new enum for draft source tracking.
CREATE TYPE "DraftSource" AS ENUM ('TEMPLATE', 'MANUAL', 'MODIFIED_FROM_TEMPLATE');

-- Extend AuditAction enum with template lifecycle events.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'TEMPLATE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'TEMPLATE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'TEMPLATE_ACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'TEMPLATE_DEACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'TEMPLATE_SET_AS_DEFAULT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'TEMPLATE_APPLIED';

-- Prepare indexes for removal before dropping columns.
DROP INDEX IF EXISTS "PolicyTemplate_hoaId_category_priority_idx";

-- Add required requestStatus column and backfill from existing appliesToStatus when present.
ALTER TABLE "PolicyTemplate" ADD COLUMN "requestStatus" "RequestStatus" NOT NULL DEFAULT 'OPEN';
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'PolicyTemplate' AND column_name = 'appliesToStatus'
  ) THEN
    UPDATE "PolicyTemplate" SET "requestStatus" = COALESCE("appliesToStatus", 'OPEN');
  ELSE
    UPDATE "PolicyTemplate" SET "requestStatus" = 'OPEN';
  END IF;
END $$;

-- Clean up legacy columns.
ALTER TABLE "PolicyTemplate" DROP COLUMN IF EXISTS "appliesToStatus";
ALTER TABLE "PolicyTemplate" DROP COLUMN IF EXISTS "priority";

-- New indexes and uniqueness guard for defaults.
CREATE INDEX IF NOT EXISTS "PolicyTemplate_hoaId_category_requestStatus_idx" ON "PolicyTemplate" ("hoaId", "category", "requestStatus");
CREATE UNIQUE INDEX IF NOT EXISTS "PolicyTemplate_default_per_state_idx" ON "PolicyTemplate" ("hoaId", "category", "requestStatus") WHERE "isDefault" = true;

-- Demote older defaults so only the most recent default remains per (hoa, category, status).
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "hoaId", "category", "requestStatus" ORDER BY "updatedAt" DESC, "createdAt" DESC) AS rn
  FROM "PolicyTemplate"
  WHERE "isDefault" = true
)
UPDATE "PolicyTemplate" SET "isDefault" = false WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Draft source tracking.
ALTER TABLE "ReplyDraft" ADD COLUMN "source" "DraftSource" NOT NULL DEFAULT 'MANUAL';
