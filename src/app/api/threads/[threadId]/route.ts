import { NextResponse } from "next/server";
import { ThreadStatus } from "@prisma/client";
import { addBreadcrumb } from "@sentry/nextjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logError, logInfo } from "@/lib/logger";

export async function POST(request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = await params;
  const formData = await request.formData();
  const statusInput = formData.get("status")?.toString();
  const assignInput = formData.get("assign")?.toString();
  const assignUserId = formData.get("assignUserId")?.toString();
  const clearUnread = formData.get("clearUnread")?.toString() === "true";

  const thread = await prisma.emailThread.findUnique({
    where: { id: threadId },
    include: { hoa: true },
  });

  if (!thread || thread.hoa.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: { status?: ThreadStatus; assignedToUserId?: string | null; unreadCount?: number } = {};

  if (statusInput) {
    const normalized = statusInput.toUpperCase();
    if (!(normalized in ThreadStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = normalized as ThreadStatus;
  }

  if (assignInput) {
    if (assignInput === "me") {
      data.assignedToUserId = session.user.id;
    } else if (assignInput === "none") {
      data.assignedToUserId = null;
    } else {
      return NextResponse.json({ error: "Invalid assignment" }, { status: 400 });
    }
  }

  if (assignUserId !== undefined) {
    if (assignUserId === "") {
      data.assignedToUserId = null;
    } else {
      const user = await prisma.user.findUnique({ where: { id: assignUserId } });
      if (!user) {
        return NextResponse.json({ error: "Assignee not found" }, { status: 404 });
      }
      data.assignedToUserId = assignUserId;
    }
  }

  if (clearUnread) {
    data.unreadCount = 0;
  }

  try {
    addBreadcrumb({
      category: "thread",
      message: "update thread",
      level: "info",
      data: { threadId, status: data.status, assign: data.assignedToUserId, clearUnread },
    });
    await prisma.emailThread.update({
      where: { id: threadId },
      data,
    });
    logInfo("thread update", { threadId, status: data.status, assignedToUserId: data.assignedToUserId });
    const url = new URL(`/app/hoa/${thread.hoaId}/inbox?thread=${thread.id}`, process.env.APP_BASE_URL ?? "http://localhost:3000");
    return NextResponse.redirect(url);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logError("thread update failed", { threadId, error: errMsg });
    return NextResponse.json({ error: "Failed to update thread" }, { status: 500 });
  }
}
