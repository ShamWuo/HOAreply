-- AlterTable
ALTER TABLE "PolicyTemplate" ADD COLUMN     "appliesToStatus" "RequestStatus",
ADD COLUMN     "missingFields" TEXT[] DEFAULT ARRAY[]::TEXT[];
