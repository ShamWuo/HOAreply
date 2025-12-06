import { prisma } from "@/lib/prisma";
import { MessageDirection } from "@prisma/client";

async function backfillResidents() {
  const residents = await prisma.resident.findMany({ select: { id: true, hoaId: true, email: true } });
  for (const resident of residents) {
    const messages = await prisma.emailMessage.findMany({
      where: { residentId: resident.id },
      select: { receivedAt: true },
      orderBy: { receivedAt: "asc" },
    });

    if (!messages.length) continue;

    await prisma.resident.update({
      where: { id: resident.id },
      data: {
        messageCount: messages.length,
        firstMessageAt: messages[0].receivedAt,
        lastMessageAt: messages[messages.length - 1].receivedAt,
      },
    });
  }
}

async function backfillClassificationHistory() {
  const threads = await prisma.emailThread.findMany({
    select: { id: true, category: true, priority: true },
    where: {
      OR: [{ category: { not: null } }, { priority: { not: null } }],
    },
  });

  for (const thread of threads) {
    await prisma.threadClassificationHistory.upsert({
      where: { id: `${thread.id}-backfill` },
      update: {},
      create: {
        id: `${thread.id}-backfill`,
        threadId: thread.id,
        category: thread.category,
        priority: thread.priority,
      },
    });
  }
}

async function backfillUnreadCounts() {
  const threads = await prisma.emailThread.findMany({ select: { id: true } });
  for (const thread of threads) {
    const unread = await prisma.emailMessage.count({
      where: { threadId: thread.id, direction: MessageDirection.INCOMING },
    });
    await prisma.emailThread.update({ where: { id: thread.id }, data: { unreadCount: unread } });
  }
}

async function main() {
  await backfillResidents();
  await backfillClassificationHistory();
  await backfillUnreadCounts();
}

main()
  .then(() => {
    console.log("Backfill complete");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
