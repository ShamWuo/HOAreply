import { env } from "@/lib/env";

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
  meta: {
    gmailAccountEmail: string;
  };
}

export interface N8nWebhookResponse {
  replyText: string;
  send?: boolean;
}

export async function callN8nWebhook(payload: N8nWebhookPayload) {
  const response = await fetch(env.N8N_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`n8n webhook error: ${errorBody}`);
  }

  const data = (await response.json()) as N8nWebhookResponse;
  if (!data.replyText) {
    throw new Error("n8n response missing replyText");
  }

  return {
    replyText: data.replyText,
    send: data.send ?? false,
  };
}
