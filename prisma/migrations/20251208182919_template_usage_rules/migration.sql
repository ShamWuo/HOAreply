-- Ensure templates can declare required fields without re-introducing legacy status columns.
ALTER TABLE "PolicyTemplate"
ADD COLUMN IF NOT EXISTS "missingFields" TEXT[] DEFAULT ARRAY[]::TEXT[];
