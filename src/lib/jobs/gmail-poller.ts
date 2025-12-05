import { captureException } from "@sentry/nextjs";
import { MessageDirection } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureAccessToken, fetchNewInboxMessages, normalizeGmailMessage, sendGmailReply } from "@/lib/gmail";
import { callN8nWebhook } from "@/lib/n8n";
import { logError, logInfo, logWarn } from "@/lib/logger";
import { acquireJobLock, releaseJobLock } from "@/lib/job-lock";
import { env } from "@/lib/env";

const DEFAULT_QUERY = "label:INBOX newer_than:7d";
const POLL_JOB_ID = "poll-gmail";
const POLL_LOCK_WINDOW_MS = Math.max(env.GMAIL_POLL_INTERVAL_MINUTES, 1) * 60 * 1000;

type PollSummary = {
  accountId: string;
  processed: number;
  error?: string;
};

type PollJobResult = {
  skipped: boolean;
  summaries: PollSummary[];
  reason?: string;
};

export async function runGmailPollJob(): Promise<PollJobResult> {
  const lockAcquired = await acquireJobLock(POLL_JOB_ID, POLL_LOCK_WINDOW_MS);
  if (!lockAcquired) {
    logWarn("poll-gmail skipped - lock held", { jobId: POLL_JOB_ID });
    return { skipped: true, summaries: [], reason: "Job already running" };
  }

  try {
    const summaries = await pollAllGmailAccounts();
    return { skipped: false, summaries };
  } finally {
    await releaseJobLock(POLL_JOB_ID);
  }
}

export async function pollAllGmailAccounts() {
  const accounts = await prisma.gmailAccount.findMany({
    include: { hoa: true },
  });

  logInfo("poll-gmail start", { accounts: accounts.length });
  const summaries: PollSummary[] = [];

  for (const account of accounts) {
    try {
      const processed = await processAccount(account.id);
      logInfo("poll-gmail processed account", { accountId: account.id, processed });
      summaries.push({ accountId: account.id, processed });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown poll error";
      logError("poll-gmail error", { accountId: account.id, error: message });
      captureException(error, { extra: { accountId: account.id } });
      summaries.push({ accountId: account.id, processed: 0, error: message });
    }
  }

  return summaries;
}

export async function pollGmailAccount(accountId: string) {
  return processAccount(accountId);
}

async function processAccount(accountId: string) {
  const account = await prisma.gmailAccount.findUnique({
    where: { id: accountId },
    include: { hoa: true },
  });

  if (!account) {
    logWarn("poll-gmail attempted to process missing account", { accountId });
    return 0;
  }

  const freshAccount = await ensureAccessToken(account);
  logInfo("poll-gmail account", { accountId: account.id, email: freshAccount.email, hoaId: account.hoaId, query: DEFAULT_QUERY });
  const messages = await fetchNewInboxMessages(freshAccount, DEFAULT_QUERY);
  logInfo("poll-gmail messages fetched", { accountId: account.id, email: freshAccount.email, count: messages.length });

  let processed = 0;

  for (const message of messages) {
    const normalized = normalizeGmailMessage(message);
    const thread = await prisma.emailThread.upsert({
      where: { gmailThreadId: message.threadId },
      update: {
        subject: normalized.headers.subject,
        updatedAt: new Date(),
        gmailAccountId: freshAccount.id,
      },
      create: {
        gmailThreadId: message.threadId,
        subject: normalized.headers.subject,
        hoaId: account.hoaId,
        gmailAccountId: freshAccount.id,
      },
    });

    const dbMessage = await prisma.emailMessage.create({
      data: {
        threadId: thread.id,
        gmailMessageId: message.id,
        direction: MessageDirection.INCOMING,
        from: normalized.headers.from,
        to: normalized.headers.to,
        bodyText: normalized.plainText,
        bodyHtml: normalized.html || null,
        receivedAt: normalized.receivedAt,
        metaJson: {
          messageId: normalized.headers.messageId,
          references: normalized.headers.references,
          inReplyTo: normalized.headers.inReplyTo,
        },
      },
    });

    processed += 1;

    try {
      const webhookResponse = await callN8nWebhook({
        hoaId: account.hoaId,
        messageId: dbMessage.id,
        threadId: thread.gmailThreadId,
        gmailMessageId: message.id,
        from: dbMessage.from,
        to: dbMessage.to,
        subject: thread.subject,
        bodyText: dbMessage.bodyText,
        bodyHtml: dbMessage.bodyHtml ?? undefined,
        receivedAt: dbMessage.receivedAt.toISOString(),
        meta: {
          gmailAccountEmail: freshAccount.email,
        },
      });

      const aiReply = await prisma.aIReply.create({
        data: {
          messageId: dbMessage.id,
          replyText: webhookResponse.replyText,
          sent: false,
        },
      });

      if (webhookResponse.send) {
        await sendGmailReply({
          account: freshAccount,
          thread,
          originalMessage: dbMessage,
          aiReply,
        });
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "n8n error";
      await prisma.aIReply.create({
        data: {
          messageId: dbMessage.id,
          replyText: "",
          sent: false,
          error: messageText,
        },
      });
      logError("n8n webhook failure", { accountId: account.id, threadId: thread.id, error: messageText });
      captureException(error, { extra: { accountId: account.id, threadId: thread.id } });
    }
  }

  return processed;
}
