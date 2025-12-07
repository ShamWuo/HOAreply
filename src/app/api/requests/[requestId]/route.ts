import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId } = await params;
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: {
      hoa: { select: { id: true, name: true, userId: true } },
      resident: true,
      thread: {
        include: {
          gmailAccount: true,
          messages: { orderBy: { receivedAt: "desc" }, take: 20, include: { aiReply: true } },
        },
      },
      drafts: { orderBy: { createdAt: "desc" } },
      auditLogs: { orderBy: { createdAt: "desc" }, take: 50, include: { user: true } },
    },
  });

  if (!request || request.hoa.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ request });
}
