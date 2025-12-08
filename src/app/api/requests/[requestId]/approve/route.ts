import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { approveDraft, ValidationError } from "@/lib/workflows/request-actions";

export async function POST(req: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId } = await params;
  const payload = await parsePayload(req);
  const overrideExternal = toBool(payload?.overrideExternal);
  try {
    const result = await approveDraft({
      requestId,
      userId: session.user.id,
      overrideExternal,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message, ...error.details }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Approval failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

async function parsePayload(req: Request) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return await req.json();
    }
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      return Object.fromEntries(new URLSearchParams(text).entries());
    }
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const entries: Record<string, string> = {};
      form.forEach((value, key) => {
        if (typeof value === "string") entries[key] = value;
      });
      return entries;
    }
    return null;
  } catch {
    return null;
  }
}

function toBool(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["true", "1", "yes", "on"].includes(value.toLowerCase());
  return false;
}
