import { addBreadcrumb, captureException } from "@sentry/nextjs";
import { MessageDirection, ThreadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureAccessToken, fetchNewInboxMessages, normalizeGmailMessage, sendGmailReply } from "@/lib/gmail";
import { callN8nWebhook } from "@/lib/n8n";
import { logError, logInfo, logWarn } from "@/lib/logger";
import { acquireJobLock, releaseJobLock } from "@/lib/job-lock";
import { env } from "@/lib/env";

const DEFAULT_QUERY = "label:INBOX newer_than:7d";
const POLL_JOB_ID = "poll-gmail";
const POLL_INTERVAL_MINUTES = Math.max(env.GMAIL_POLL_INTERVAL_MINUTES, 5);
const POLL_LOCK_WINDOW_MS = POLL_INTERVAL_MINUTES * 60 * 1000;

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

function isMarketingLike(subject: string, from: string, html: string | null | undefined, text: string | null | undefined) {
  const haystack = `${subject} ${from} ${html ?? ""} ${text ?? ""}`.toLowerCase();
  if (haystack.includes("list-unsubscribe") || haystack.includes("unsubscribe")) return true;
  if (haystack.includes("newsletter") || haystack.includes("sale") || haystack.includes("promo")) return true;
  if (haystack.includes("microsoft store") || haystack.includes("deal") || haystack.includes("pricing update")) return true;
  return false;
}

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
    include: { hoa: { include: { user: true } } },
  });

  logInfo("poll-gmail start", { accounts: accounts.length });
  const summaries: PollSummary[] = [];

  for (const account of accounts) {
    try {
      addBreadcrumb({
        category: "poll-gmail",
        message: "start account",
        level: "info",
        data: { accountId: account.id, email: account.email },
      });
      const processed = await processAccount(account.id);
      logInfo("poll-gmail processed account", { accountId: account.id, processed });
      await prisma.gmailAccount.update({
        where: { id: account.id },
        data: { lastPolledAt: new Date(), lastPollError: null },
      });
      summaries.push({ accountId: account.id, processed });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown poll error";
      logError("poll-gmail error", { accountId: account.id, error: message });
      addBreadcrumb({
        category: "poll-gmail",
        message: "account error",
        level: "error",
        data: { accountId: account.id, error: message },
      });
      captureException(error, { extra: { accountId: account.id } });
      await prisma.gmailAccount.update({
        where: { id: account.id },
        data: { lastPolledAt: new Date(), lastPollError: message },
      }).catch((updateError) => {
        logWarn("poll-gmail failed to record poll error", {
          accountId: account.id,
          error: updateError instanceof Error ? updateError.message : String(updateError),
        });
      });
      summaries.push({ accountId: account.id, processed: 0, error: message });
    }
  }

  return summaries;
}

export async function pollGmailAccount(accountId: string) {
  try {
    const processed = await processAccount(accountId);
    await prisma.gmailAccount.update({
      where: { id: accountId },
      data: { lastPolledAt: new Date(), lastPollError: null },
    });
    return processed;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown poll error";
    await prisma.gmailAccount.update({
      where: { id: accountId },
      data: { lastPolledAt: new Date(), lastPollError: message },
    }).catch((updateError) => {
      logWarn("poll-gmail failed to record poll error", {
        accountId,
        error: updateError instanceof Error ? updateError.message : String(updateError),
      });
    });
    throw error;
  }
}

async function processAccount(accountId: string) {
  const account = await prisma.gmailAccount.findUnique({
    where: { id: accountId },
    include: { hoa: { include: { user: true } } },
  });

  if (!account) {
    logWarn("poll-gmail attempted to process missing account", { accountId });
    return 0;
  }

  const pollRun = await prisma.pollRun.create({
    data: {
      gmailAccountId: account.id,
      status: "running",
      processedCount: 0,
    },
  });

  let processed = 0;

  try {
    const freshAccount = await ensureAccessToken(account);
    logInfo("poll-gmail account", { accountId: account.id, email: freshAccount.email, hoaId: account.hoaId, query: DEFAULT_QUERY });
    const messages = await fetchNewInboxMessages(freshAccount, DEFAULT_QUERY);
    logInfo("poll-gmail messages fetched", { accountId: account.id, email: freshAccount.email, count: messages.length });

    for (const message of messages) {
      const normalized = normalizeGmailMessage(message);
      const senderEmail = extractEmail(normalized.headers.from) ?? normalized.headers.from ?? "";

      const resident = await upsertResident({
        hoaId: account.hoaId,
        email: senderEmail,
        name: extractName(senderEmail),
        receivedAt: normalized.receivedAt,
      });

      const marketing = isMarketingLike(
        normalized.headers.subject ?? "",
        normalized.headers.from ?? "",
        normalized.html,
        normalized.plainText,
      );

      const thread = await prisma.emailThread.upsert({
        where: { gmailThreadId: message.threadId },
        update: {
          subject: normalized.headers.subject,
          updatedAt: new Date(),
          gmailAccountId: freshAccount.id,
          status: marketing ? ThreadStatus.FOLLOW_UP : ThreadStatus.NEW,
          category: marketing ? "Marketing / System" : undefined,
          unreadCount: { increment: 1 },
        },
        create: {
          gmailThreadId: message.threadId,
          subject: normalized.headers.subject,
          hoaId: account.hoaId,
          gmailAccountId: freshAccount.id,
          status: marketing ? ThreadStatus.FOLLOW_UP : ThreadStatus.NEW,
          category: marketing ? "Marketing / System" : undefined,
          unreadCount: 1,
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
            marketing,
          },
          residentId: resident?.id,
        },
      });

      processed += 1;

      try {
        const managerName = account.hoa?.user?.name ?? account.hoa?.user?.email ?? "Manager";
        const hoaName = account.hoa?.name ?? "HOA";
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
          managerName,
          hoaName,
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

        if (webhookResponse.classification || webhookResponse.priority) {
          const category = webhookResponse.classification ?? null;
          const priority = webhookResponse.priority ?? null;
          await prisma.$transaction([
            prisma.emailThread.update({
              where: { id: thread.id },
              data: { category, priority },
            }),
            prisma.threadClassificationHistory.create({
              data: {
                threadId: thread.id,
                category,
                priority,
              },
            }),
          ]);
        }

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

    await prisma.pollRun.update({
      where: { id: pollRun.id },
      data: { status: "success", processedCount: processed, completedAt: new Date(), error: null },
    });
    return processed;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    await prisma.pollRun.update({
      where: { id: pollRun.id },
      data: { status: "error", processedCount: processed, completedAt: new Date(), error: errMsg },
    }).catch(() => {});
    throw error;
  }
}

function extractName(address: string | null | undefined) {
  if (!address) return null;
  const match = address.match(/^"?([^"<]+)"?\s*</);
  const name = match?.[1]?.trim();
  return name && name.includes("@") ? null : name ?? null;
}

function extractEmail(address: string | null | undefined) {
  if (!address) return null;
  const match = address.match(/<([^>]+)>/);
  if (match?.[1]) return match[1].trim().toLowerCase();
  return address.trim().toLowerCase();
}

async function upsertResident(params: { hoaId: string; email: string; name: string | null; receivedAt: Date }) {
  if (!params.email) return null;

  try {
    const existing = await prisma.resident.findUnique({
      where: { hoaId_email: { hoaId: params.hoaId, email: params.email } },
    });

    if (existing) {
      return prisma.resident.update({
        where: { id: existing.id },
        data: {
          lastMessageAt: params.receivedAt,
          messageCount: { increment: 1 },
          name: existing.name ?? params.name ?? undefined,
        },
      });
    }

    return prisma.resident.create({
      data: {
        hoaId: params.hoaId,
        email: params.email,
        name: params.name,
        firstMessageAt: params.receivedAt,
        lastMessageAt: params.receivedAt,
        messageCount: 1,
      },
    });
  } catch (error) {
    logWarn("resident upsert failed", { hoaId: params.hoaId, email: params.email, error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}
