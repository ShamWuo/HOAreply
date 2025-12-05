-- CreateTable
CREATE TABLE "JobLock" (
    "job" TEXT PRIMARY KEY,
    "lockedUntil" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Backfill default row for poll job to avoid null lookups
INSERT INTO "JobLock" ("job", "lockedUntil") VALUES ('poll-gmail', '1970-01-01T00:00:00.000')
ON CONFLICT ("job") DO NOTHING;
