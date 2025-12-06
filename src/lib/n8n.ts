import { env } from "@/lib/env";
import type { HOAEmailInput, HOAManagerContext, N8nClassifyDraftResponse } from "@/lib/n8n-draft-types";

const WEBHOOK_TIMEOUT_MS = 10_000;
const FALLBACK_DRAFT =
  "Draft unavailable from automation. Please review and send manually.";

export interface N8nWebhookPayload {
  hoaId: string;
  messageId: string;
  threadId: string;
  gmailMessageId: string;
  from: string;
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string | null;
  receivedAt: string;
  managerName: string;
  hoaName: string;
  variant?: string;
  tone?: string;
  length?: string;
  meta: {
    gmailAccountEmail: string;
  };
}

export interface N8nWebhookResponse {
  replyText: string;
  send?: boolean;
  classification?: string;
  priority?: string;
}

type N8nLogItem = {
  output?: string;
  logReplyDraft?: string;
  logCategory?: string;
  logPriority?: string;
  logSummary?: string;
  logSentiment?: string;
};

function safeParseJson<T>(body: string | null): T | null {
  if (!body) return null;
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

export async function callN8nWebhook(payload: N8nWebhookPayload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const response = await fetch(env.N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const rawBody = await response.text();

    if (!response.ok) {
      throw new Error(`n8n webhook error (${response.status}): ${rawBody || "empty response"}`);
    }

    if (!rawBody) {
      return { replyText: FALLBACK_DRAFT, send: false };
    }

    const parsed = safeParseJson<unknown>(rawBody);

    // Handle array-of-log-object responses
    if (Array.isArray(parsed) && parsed.length > 0) {
      const first = parsed[0] as N8nLogItem;
      const replyText = first.logReplyDraft ?? first.output;
      if (!replyText || typeof replyText !== "string" || !replyText.trim()) {
        return { replyText: FALLBACK_DRAFT, send: false };
      }
      return { replyText, send: false };
    }

    const data = parsed as N8nWebhookResponse | null;
    if (!data || typeof data.replyText !== "string" || data.replyText.trim().length === 0) {
      return { replyText: FALLBACK_DRAFT, send: false };
    }

    return {
      replyText: data.replyText,
      send: data.send ?? false,
      classification: data.classification,
      priority: data.priority,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`n8n webhook timed out after ${WEBHOOK_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// Classification + draft helper for HOAReply workflows
export async function getClassificationAndDraftFromN8n(
  email: HOAEmailInput,
  manager: HOAManagerContext,
): Promise<N8nClassifyDraftResponse> {
  const url = process.env.N8N_CLASSIFY_DRAFT_URL;
  const secret = process.env.N8N_HOAREPLY_SECRET;

  if (!url) {
    console.error("N8N_CLASSIFY_DRAFT_URL is not set");
    throw new Error("n8n integration misconfigured");
  }

  if (!secret) {
    console.error("N8N_HOAREPLY_SECRET is not set");
    throw new Error("n8n integration misconfigured");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-hoareply-secret": secret,
    },
    body: JSON.stringify({ email, manager }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("n8n classify-draft error", response.status, text);
    throw new Error("Failed to get classification/draft from n8n");
  }

  const data = (await response.json()) as N8nClassifyDraftResponse;
  if (!data || typeof data.draftReply !== "string") {
    console.error("Invalid response from n8n", data);
    throw new Error("Invalid response from n8n");
  }

  return data;
}
