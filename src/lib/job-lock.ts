import { prisma } from "@/lib/prisma";
import { logError, logInfo } from "@/lib/logger";

const EPOCH = new Date(0);

async function upsertLock(job: string, lockedUntil: Date) {
  await prisma.jobLock.upsert({
    where: { job },
    update: { lockedUntil },
    create: { job, lockedUntil },
  });
}

export async function acquireJobLock(job: string, ttlMs: number) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.jobLock.findUnique({ where: { job } });
    if (existing && existing.lockedUntil > now) {
      return false;
    }

    await tx.jobLock.upsert({
      where: { job },
      update: { lockedUntil: expiresAt },
      create: { job, lockedUntil: expiresAt },
    });

    logInfo("job-lock acquired", { job, lockedUntil: expiresAt.toISOString() });
    return true;
  });
}

export async function releaseJobLock(job: string) {
  try {
    await upsertLock(job, EPOCH);
    logInfo("job-lock released", { job });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError("job-lock release failed", { job, error: message });
  }
}
