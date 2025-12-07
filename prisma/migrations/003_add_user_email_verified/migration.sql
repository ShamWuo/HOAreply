-- Add missing emailVerified column expected by NextAuth Prisma Adapter
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "emailVerified" TIMESTAMP(3);
