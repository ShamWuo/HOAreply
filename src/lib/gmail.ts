import type { AIReply, EmailMessage, EmailThread, GmailAccount } from "@prisma/client";
import type { HOAEmailInput } from "@/lib/n8n-draft-types";
import { MessageDirection } from "@prisma/client";
import { refreshAccessToken, getGmailMessage, listGmailMessages, sendGmailMessage } from "@/lib/google-api";
import { prisma } from "@/lib/prisma";
import type { GmailMessage } from "@/lib/google-api";
import { logError, logInfo } from "@/lib/logger";
import { decryptString, encryptString } from "@/lib/crypto";

const REFRESH_THRESHOLD_MS = 60 * 1000;

type DecryptedGmailAccount = GmailAccount & { accessToken: string; refreshToken: string };

function withDecryptedTokens(account: GmailAccount): DecryptedGmailAccount {
  return {
    ...account,
    accessToken: decryptString(account.accessToken),
    refreshToken: decryptString(account.refreshToken),
  };
}

export async function ensureAccessToken(account: GmailAccount): Promise<DecryptedGmailAccount> {
  const usableAccount = withDecryptedTokens(account);

  if (usableAccount.expiryDate.getTime() - Date.now() > REFRESH_THRESHOLD_MS) {
    return usableAccount;
  }

  console.info(`Refreshing Gmail token for HOA ${account.hoaId}`);
  const refreshed = await refreshAccessToken(usableAccount.refreshToken);
  const updated = await prisma.gmailAccount.update({
    where: { id: account.id },
    data: {
      accessToken: encryptString(refreshed.accessToken),
      expiryDate: new Date(Date.now() + refreshed.expiresIn * 1000),
    },
  });

  return withDecryptedTokens(updated);
}

export function parseGmailHeaders(message: GmailMessage) {
  const headers = message.payload.headers ?? [];
  const headerMap = new Map(headers.map((header) => [header.name.toLowerCase(), header.value]));

  return {
    subject: headerMap.get("subject") ?? "(no subject)",
    from: headerMap.get("from") ?? "",
    to: headerMap.get("to") ?? "",
    messageId: headerMap.get("message-id"),
    references: headerMap.get("references"),
    inReplyTo: headerMap.get("in-reply-to"),
    date: headerMap.get("date"),
  };
}

function decodeBody(data?: string) {
  if (!data) {
    return "";
  }

  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function extractBody(
  payload: GmailMessage["payload"],
  mimeType: "text/plain" | "text/html",
): string {
  if (payload.mimeType?.includes(mimeType) && payload.body?.data) {
    return decodeBody(payload.body.data);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      const body = extractBody(part, mimeType);
      if (body) {
        return body;
      }
    }
  }

  return "";
}

export function normalizeGmailMessage(message: GmailMessage) {
  const headers = parseGmailHeaders(message);
  const plain = extractBody(message.payload, "text/plain");
  const html = extractBody(message.payload, "text/html");

  return {
    headers,
    plainText: plain || html,
    html,
    receivedAt: headers.date ? new Date(headers.date) : new Date(Number(message.internalDate ?? Date.now())),
  };
}

export async function fetchNewInboxMessages(account: DecryptedGmailAccount, query: string) {
  logInfo("gmail list messages", { accountId: account.id, email: account.email, query });

  let list;
  try {
    list = await listGmailMessages(account.accessToken, query);
  } catch (error) {
    logError("gmail list failed", {
      accountId: account.id,
      email: account.email,
      query,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  const count = list.messages?.length ?? 0;
  logInfo("gmail list results", { accountId: account.id, email: account.email, count, query });

  if (!count || !list.messages) {
    return [];
  }

  const detailed: GmailMessage[] = [];
  const messages = list.messages ?? [];

  for (const meta of messages) {
    const exists = await prisma.emailMessage.findUnique({
      where: { gmailMessageId: meta.id },
      select: { id: true },
    });

    if (exists) {
      continue;
    }

    try {
      const message = await getGmailMessage(account.accessToken, meta.id);
      detailed.push(message);
    } catch (error) {
      logError("gmail get message failed", {
        accountId: account.id,
        email: account.email,
        messageId: meta.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return detailed;
}

function buildReplyMime(params: {
  from: string;
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string | null;
  references?: string | null;
}) {
  const headers = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=\"UTF-8\"",
  ];

  if (params.inReplyTo) {
    headers.push(`In-Reply-To: ${params.inReplyTo}`);
  }

  if (params.references) {
    headers.push(`References: ${params.references}`);
  }

  return `${headers.join("\r\n")}\r\n\r\n${params.body}`;
}

export async function sendGmailReply(params: {
  account: GmailAccount;
  thread: EmailThread;
  originalMessage: EmailMessage;
  aiReply: AIReply;
}) {
  const freshAccount = await ensureAccessToken(params.account);
  const meta = (params.originalMessage.metaJson ?? {}) as Record<string, string | undefined>;

  const rawMime = buildReplyMime({
    from: freshAccount.email,
    to: params.originalMessage.from,
    subject: params.thread.subject.startsWith("Re:")
      ? params.thread.subject
      : `Re: ${params.thread.subject}`,
    body: params.aiReply.replyText,
    inReplyTo: meta.messageId,
    references: meta.references,
  });

  const encoded = Buffer.from(rawMime).toString("base64url");

  await sendGmailMessage(freshAccount.accessToken, {
    raw: encoded,
    threadId: params.thread.gmailThreadId,
  });

  await prisma.emailMessage.create({
    data: {
      threadId: params.thread.id,
      gmailMessageId: null,
      direction: MessageDirection.OUTGOING,
      from: freshAccount.email,
      to: params.originalMessage.from,
      bodyText: params.aiReply.replyText,
      bodyHtml: null,
      receivedAt: new Date(),
    },
  });

  await prisma.aIReply.update({
    where: { id: params.aiReply.id },
    data: {
      sent: true,
      sentAt: new Date(),
      error: null,
    },
  });
}

export function buildPlainTextMimeEmail(opts: { to: string; from: string; subject: string; body: string }) {
  const { to, from, subject, body } = opts;

  return [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    body,
  ].join("\r\n");
}

export async function createGmailDraftForManager(params: {
  account: GmailAccount;
  originalEmail: HOAEmailInput;
  managerEmail: string;
  draftBody: string;
}) {
  const freshAccount = await ensureAccessToken(params.account);
  const subject = params.originalEmail.subject?.startsWith("Re:")
    ? params.originalEmail.subject
    : `Re: ${params.originalEmail.subject}`;

  const rawMime = buildPlainTextMimeEmail({
    to: params.originalEmail.from,
    from: params.managerEmail,
    subject,
    body: params.draftBody,
  });

  const encoded = Buffer.from(rawMime)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${freshAccount.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        raw: encoded,
        threadId: params.originalEmail.threadId,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Failed to create Gmail draft: ${response.status} ${errorText}`);
  }
}
