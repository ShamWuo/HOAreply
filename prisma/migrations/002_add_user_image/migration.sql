-- Add missing image column expected by NextAuth Prisma Adapter
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "image" TEXT;
