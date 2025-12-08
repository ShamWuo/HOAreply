import { NextResponse } from "next/server";
import { RequestKind } from "@prisma/client";
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

export async function POST(req: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await safeParsePayload(req);
  const action = typeof body?.action === "string" ? body.action : "close";

  const { requestId } = await params;
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: { hoa: { select: { userId: true } } },
  });

  if (!request || request.hoa.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isNonRequestClose = action === "close-non-request";

  await prisma.request.update({
    where: { id: requestId },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
      kind: isNonRequestClose ? RequestKind.UNKNOWN : undefined,
    },
  });

  return NextResponse.json({ ok: true });
}

async function safeParsePayload(req: Request) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const text = await req.text();
      if (!text) return null;
      return JSON.parse(text);
    }

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      return Object.fromEntries(params.entries());
    }

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const entries: Record<string, string> = {};
      form.forEach((value, key) => {
        if (typeof value === "string") entries[key] = value;
      });
      return entries;
    }

    return null;
  } catch {
    return null;
  }
}
