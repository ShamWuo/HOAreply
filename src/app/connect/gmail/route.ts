import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createSignedState } from "@/lib/state";
import { prisma } from "@/lib/prisma";
import { buildGoogleOAuthUrl } from "@/lib/google-api";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const hoaId = new URL(request.url).searchParams.get("hoaId");
  if (!hoaId) {
    return NextResponse.json({ error: "hoaId is required" }, { status: 400 });
  }

  const hoa = await prisma.hOA.findFirst({
    where: { id: hoaId, userId: session.user.id },
  });

  if (!hoa) {
    return NextResponse.json({ error: "HOA not found" }, { status: 404 });
  }

  const state = createSignedState({ userId: session.user.id, hoaId });
  const redirectUrl = buildGoogleOAuthUrl(state);

  return NextResponse.redirect(redirectUrl);
}
