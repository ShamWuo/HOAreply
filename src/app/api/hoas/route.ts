import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listUserHoas, createHoa } from "@/lib/hoa";
import { hoaSchema } from "@/lib/validators";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hoas = await listUserHoas(session.user.id);
  return NextResponse.json({ hoas });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = hoaSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid HOA name" }, { status: 400 });
  }

  const existingCount = await prisma.hOA.count({ where: { userId: session.user.id } });
  if (existingCount > 0) {
    return NextResponse.json({ error: "Only one HOA inbox is supported per workspace." }, { status: 400 });
  }

  const riskProtectionEnabled = parsed.data.riskProtectionEnabled ?? false;
  const hoa = await createHoa(session.user.id, parsed.data.name, riskProtectionEnabled);
  return NextResponse.json({ hoa });
}
