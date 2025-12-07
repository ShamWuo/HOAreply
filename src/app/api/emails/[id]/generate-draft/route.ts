import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createGmailDraftForManager } from "@/lib/gmail";
import { handleInboundRequest } from "@/lib/workflows/request-pipeline";
import type { HOAEmailInput, HOAManagerContext } from "@/lib/email-types";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const email = await prisma.emailMessage.findUnique({
      where: { id },
      include: {
        resident: true,
        thread: {
          include: {
            hoa: {
              include: {
                user: true,
                gmailAccount: true,
              },
            },
          },
        },
      },
    });

    if (!email || !email.thread || !email.thread.hoa) {
      return new NextResponse("Not found", { status: 404 });
    }

    const { thread } = email;
    const { hoa } = thread;

    if (hoa.userId !== session.user.id) {
      return new NextResponse("Not found", { status: 404 });
    }

    const gmailAccount = hoa.gmailAccount;
    if (!gmailAccount) {
      return new NextResponse("HOA Gmail is not connected", { status: 400 });
    }

    if (!thread.gmailThreadId) {
      return new NextResponse("Original email is missing Gmail thread id", {
        status: 400,
      });
    }

    const emailInput: HOAEmailInput = {
      from: email.from,
      to: email.to,
      subject: thread.subject,
      body: email.bodyText,
      receivedAt: email.receivedAt.toISOString(),
      messageId: email.gmailMessageId ?? email.id,
      threadId: thread.gmailThreadId,
    };

    const managerContext: HOAManagerContext = {
      hoaName: hoa.name,
      managerName: session.user.name ?? session.user.email ?? "Manager",
      managerEmail: gmailAccount.email,
    };

    const result = await handleInboundRequest({
      hoaId: hoa.id,
      hoaName: hoa.name,
      managerName: managerContext.managerName,
      threadId: thread.id,
      residentId: email.residentId,
      residentName: email.resident?.name ?? email.resident?.email ?? "Resident",
      subject: thread.subject,
      bodyText: email.bodyText,
      bodyHtml: email.bodyHtml,
    });

    await createGmailDraftForManager({
      account: gmailAccount,
      originalEmail: emailInput,
      managerEmail: managerContext.managerEmail,
      draftBody: result.draft.content,
    });

    return NextResponse.json({ ok: true, classification: result.classification });
  } catch (error) {
    console.error("generate-draft error", {
      error,
      emailId: id,
      userId: session.user.id,
    });
    return new NextResponse("Failed to generate draft", { status: 500 });
  }
}
