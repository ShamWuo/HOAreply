import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const host = req.headers.get("host")?.toLowerCase();

  // Canonicalize apex -> www to keep Auth.js PKCE cookies on the same origin.
  if (host === "hoareply.com") {
    const url = new URL(req.url);
    url.hostname = "www.hoareply.com";
    return NextResponse.redirect(url, 308);
  }

  // Run NextAuth auth middleware for protected paths.
  return auth(req);
}

export const config = {
  matcher: ["/app/:path*", "/connect/:path*", "/api/jobs/poll-gmail", "/api/auth/:path*", "/auth/:path*"],
};
