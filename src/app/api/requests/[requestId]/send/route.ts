import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendDraftReply } from "@/lib/workflows/request-actions";

export async function POST(_: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId } = await params;
  try {
    const result = await sendDraftReply({
      requestId,
      userId: session.user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Send failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
