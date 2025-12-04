export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/app/:path*", "/connect/:path*", "/api/jobs/poll-gmail"],
};
