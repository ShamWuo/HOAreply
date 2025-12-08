/*
  Warnings:

  - The values [RESIDENT_REQUEST,VENDOR_INQUIRY,SALES_SPAM,OTHER_NON_REQUEST] on the enum `RequestKind` will be removed. If these variants are still used in the database, this will fail.
  - The values [IN_PROGRESS,AWAITING_REPLY,RESOLVED] on the enum `RequestStatus` will be removed. If these variants are still used in the database, this will fail.
  - Made the column `summary` on table `Request` required. This step will fail if there are existing NULL values in that column.

*/
-- Backfill summary to satisfy NOT NULL
UPDATE "Request" SET "summary" = COALESCE("summary", '');

-- AlterEnum RequestKind with mapping
BEGIN;
CREATE TYPE "RequestKind_new" AS ENUM ('RESIDENT', 'VENDOR', 'NEWSLETTER', 'UNKNOWN');
ALTER TABLE "Request" ALTER COLUMN "kind" DROP DEFAULT;
ALTER TABLE "Request" ALTER COLUMN "kind" TYPE "RequestKind_new" USING (
  CASE "kind"::text
    WHEN 'RESIDENT_REQUEST' THEN 'RESIDENT'
    WHEN 'VENDOR_INQUIRY' THEN 'VENDOR'
    WHEN 'SALES_SPAM' THEN 'NEWSLETTER'
    WHEN 'OTHER_NON_REQUEST' THEN 'UNKNOWN'
    ELSE 'UNKNOWN'
  END::"RequestKind_new"
);
ALTER TYPE "RequestKind" RENAME TO "RequestKind_old";
ALTER TYPE "RequestKind_new" RENAME TO "RequestKind";
DROP TYPE "RequestKind_old";
ALTER TABLE "Request" ALTER COLUMN "kind" SET DEFAULT 'RESIDENT';
COMMIT;

-- AlterEnum RequestStatus with mapping
BEGIN;
CREATE TYPE "RequestStatus_new" AS ENUM ('NEW', 'NEEDS_INFO', 'NEEDS_REVIEW', 'WAITING', 'CLOSED');
ALTER TABLE "Request" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Request" ALTER COLUMN "status" TYPE "RequestStatus_new" USING (
  CASE "status"::text
    WHEN 'AWAITING_REPLY' THEN 'WAITING'
    WHEN 'IN_PROGRESS' THEN 'NEEDS_REVIEW'
    WHEN 'RESOLVED' THEN 'CLOSED'
    ELSE "status"::text
  END::"RequestStatus_new"
);
ALTER TYPE "RequestStatus" RENAME TO "RequestStatus_old";
ALTER TYPE "RequestStatus_new" RENAME TO "RequestStatus";
DROP TYPE "RequestStatus_old";
ALTER TABLE "Request" ALTER COLUMN "status" SET DEFAULT 'NEW';
COMMIT;

-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "summaryUpdatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "summary" SET NOT NULL,
ALTER COLUMN "summary" SET DEFAULT '',
ALTER COLUMN "kind" SET DEFAULT 'RESIDENT';
