import { prisma } from "@/lib/prisma";

export function listUserHoas(userId: string) {
  return prisma.hOA.findMany({
    where: { userId },
    include: {
      gmailAccount: true,
      threads: {
        select: {
          id: true,
        },
      },
    },
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

export function createHoa(userId: string, name: string) {
  return prisma.hOA.create({
    data: {
      name,
      userId,
    },
  });
}
