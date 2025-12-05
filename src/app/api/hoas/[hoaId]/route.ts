import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { assertHoaOwnership } from "@/lib/hoa";
import { prisma } from "@/lib/prisma";
import { hoaSchema } from "@/lib/validators";

type Params = Promise<{ hoaId: string }>;

export async function PATCH(request: Request, { params }: { params: Params }) {
  const { hoaId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = hoaSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid HOA name" }, { status: 400 });
  }

  await assertHoaOwnership(hoaId, session.user.id);
  await prisma.hOA.update({
    where: { id: hoaId },
    data: { name: parsed.data.name },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  const { hoaId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await assertHoaOwnership(hoaId, session.user.id);
  await prisma.hOA.delete({ where: { id: hoaId } });

  return NextResponse.json({ ok: true });
}
