import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClassificationAndDraftFromN8n } from "@/lib/n8n";
import { createGmailDraftForManager } from "@/lib/gmail";
import type { HOAEmailInput, HOAManagerContext } from "@/lib/n8n-draft-types";

type GenerateDraftParams = {
  params: { id: string };
};

export async function POST(_req: NextRequest, { params }: GenerateDraftParams) {

  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const email = await prisma.emailMessage.findUnique({
      where: { id: params.id },
      include: {
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

    const {
      draftReply,
      classification,
      email: echoedEmail,
    } = await getClassificationAndDraftFromN8n(emailInput, managerContext);

    await createGmailDraftForManager({
      account: gmailAccount,
      originalEmail: echoedEmail,
      managerEmail: managerContext.managerEmail,
      draftBody: draftReply,
    });

    return NextResponse.json({ ok: true, classification });
  } catch (error) {
    console.error("generate-draft error", {
      error,
      emailId: params.id,
      userId: session.user.id,
    });
    return new NextResponse("Failed to generate draft", { status: 500 });
  }
}
