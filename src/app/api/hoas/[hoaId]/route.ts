import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { assertHoaOwnership } from "@/lib/hoa";
import { prisma } from "@/lib/prisma";
import { hoaUpdateSchema } from "@/lib/validators";

type Params = Promise<{ hoaId: string }>;

export async function PATCH(request: Request, { params }: { params: Params }) {
  const { hoaId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = hoaUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid HOA update" }, { status: 400 });
  }

  await assertHoaOwnership(hoaId, session.user.id);
  const updateData: { name?: string; riskProtectionEnabled?: boolean } = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.riskProtectionEnabled !== undefined) updateData.riskProtectionEnabled = parsed.data.riskProtectionEnabled;
  await prisma.hOA.update({
    where: { id: hoaId },
    data: updateData,
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
