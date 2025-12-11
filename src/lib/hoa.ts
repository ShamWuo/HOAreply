import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const hoaWithRelations = Prisma.validator<Prisma.HOADefaultArgs>()({
  include: {
    gmailAccount: {
      select: {
        id: true,
        email: true,
        lastPolledAt: true,
        lastPollError: true,
      },
    },
    threads: {
      select: {
        id: true,
      },
    },
  },
});

export type HoaWithRelations = Prisma.HOAGetPayload<typeof hoaWithRelations>;

export function listUserHoas(userId: string) {
  return prisma.hOA.findMany({
    where: { userId },
    ...hoaWithRelations,
    orderBy: { createdAt: "desc" },
  });
}

export async function assertHoaOwnership(hoaId: string, userId: string) {
  const hoa = await prisma.hOA.findFirst({
    where: { id: hoaId, userId },
    include: {
      gmailAccount: true,
    },
  });

  if (!hoa) {
    throw new Error("HOA not found or access denied");
  }

  return hoa;
}

export function createHoa(userId: string, name: string, riskProtectionEnabled = false) {
  return prisma.hOA.create({
    data: {
      name,
      userId,
      riskProtectionEnabled,
    },
  });
}
