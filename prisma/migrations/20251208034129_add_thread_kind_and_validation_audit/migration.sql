-- CreateEnum
CREATE TYPE "ThreadKind" AS ENUM ('resident', 'vendor', 'newsletter_spam', 'unknown');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'VALIDATION';

-- AlterTable
ALTER TABLE "EmailThread" ADD COLUMN     "kind" "ThreadKind" NOT NULL DEFAULT 'unknown';
