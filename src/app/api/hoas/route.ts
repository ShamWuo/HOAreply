import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listUserHoas, createHoa } from "@/lib/hoa";
import { hoaSchema } from "@/lib/validators";

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

  const hoa = await createHoa(session.user.id, parsed.data.name);
  return NextResponse.json({ hoa });
}
