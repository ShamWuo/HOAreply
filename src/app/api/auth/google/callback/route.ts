import { NextResponse } from "next/server";
import { exchangeCodeForTokens, fetchGmailProfile } from "@/lib/google-api";
import { prisma } from "@/lib/prisma";
import { verifySignedState } from "@/lib/state";
import { pollGmailAccount } from "@/lib/jobs/gmail-poller";
import { logError } from "@/lib/logger";

function buildRedirectUrl(request: Request, hoaId: string, status: "success" | "error", message?: string) {
  const base = new URL(`/app/hoa/${hoaId}/inbox`, request.url);
  base.searchParams.set(status, "1");
  if (message) {
    base.searchParams.set("message", message);
  }

  return base;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");

  if (!code || !stateParam) {
    return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
  }

  try {
    const state = verifySignedState(stateParam);

    const tokens = await exchangeCodeForTokens(code);
    const gmailProfile = await fetchGmailProfile(tokens.accessToken);

    const existingAccount = await prisma.gmailAccount.findUnique({
      where: { hoaId: state.hoaId },
    });

    const refreshToken = tokens.refreshToken ?? existingAccount?.refreshToken;
    if (!refreshToken) {
      throw new Error("Missing refresh token in Google response");
    }

    const expiryDate = new Date(Date.now() + tokens.expiresIn * 1000 - 60 * 1000);

    const gmailAccount = await prisma.gmailAccount.upsert({
      where: { hoaId: state.hoaId },
      update: {
        email: gmailProfile.emailAddress,
        accessToken: tokens.accessToken,
        refreshToken,
        expiryDate,
      },
      create: {
        hoaId: state.hoaId,
        email: gmailProfile.emailAddress,
        accessToken: tokens.accessToken,
        refreshToken,
        expiryDate,
      },
    });

    try {
      await pollGmailAccount(gmailAccount.id);
    } catch (err) {
      logError("poll-gmail immediate sync failed", { hoaId: state.hoaId, error: err instanceof Error ? err.message : String(err) });
    }

    return NextResponse.redirect(buildRedirectUrl(request, state.hoaId, "success"));
  } catch (error) {
    console.error("Google OAuth callback error", error);
    const message = error instanceof Error ? error.message : "OAuth error";
    const hoaId = (() => {
      try {
        return verifySignedState(stateParam ?? "").hoaId;
      } catch {
        return "";
      }
    })();

    if (!hoaId) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.redirect(buildRedirectUrl(request, hoaId, "error", message));
  }
}
