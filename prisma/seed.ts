import { PrismaClient, MessageDirection } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("changeme", 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@hoareply.ai" },
    update: {},
    create: {
      email: "demo@hoareply.ai",
      name: "Demo Manager",
      passwordHash,
    },
  });

  const hoa = await prisma.hOA.upsert({
    where: { id: "demo-hoa" },
    update: {},
    create: {
      id: "demo-hoa",
      name: "Sunset Villas HOA",
      userId: user.id,
    },
  });

  const existingThread = await prisma.emailThread.findUnique({
    where: { gmailThreadId: "demo-thread" },
  });

  if (!existingThread) {
    await prisma.emailThread.create({
      data: {
        gmailThreadId: "demo-thread",
        subject: "Pool key replacement",
        hoaId: hoa.id,
        messages: {
          create: {
            direction: MessageDirection.INCOMING,
            from: "resident@example.com",
            to: "demo@hoareply.ai",
            bodyText: "Hi there, can I grab a new pool key?",
            receivedAt: new Date(),
          },
        },
      },
    });
  }

  console.log("Seed data ready - demo user: demo@hoareply.ai / changeme");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
