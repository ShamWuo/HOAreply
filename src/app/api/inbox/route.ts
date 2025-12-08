import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getInboxItemsForUser } from "@/lib/queries/inbox";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { items, total } = await getInboxItemsForUser(session.user.id);
  return NextResponse.json({ items, total });
}
