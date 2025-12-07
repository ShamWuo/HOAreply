import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runRequestPipeline } from "@/lib/workflows/request-pipeline";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId } = await params;
  try {
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: { hoa: true },
    });

    if (!request || request.hoa.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const result = await runRequestPipeline(requestId);
    return NextResponse.json({ ok: true, draft: result.draft, classification: result.classification, status: result.routing.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Regeneration failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
