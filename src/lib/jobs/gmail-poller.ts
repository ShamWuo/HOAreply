import { addBreadcrumb, captureException } from "@sentry/nextjs";
import { MessageDirection, ThreadKind, ThreadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureAccessToken, fetchNewInboxMessages, normalizeGmailMessage } from "@/lib/gmail";
import { logError, logInfo, logWarn } from "@/lib/logger";
import { acquireJobLock, releaseJobLock } from "@/lib/job-lock";
import { env } from "@/lib/env";
import { handleInboundRequest } from "@/lib/workflows/request-pipeline";

// Pull everything except promotions/updates, exclude mail sent by the HOA account, last 7d.
const DEFAULT_QUERY = "in:anywhere newer_than:7d -category:promotions -category:updates -from:me";
const POLL_JOB_ID = "poll-gmail";
const POLL_INTERVAL_MINUTES = Math.max(env.GMAIL_POLL_INTERVAL_MINUTES, 5);
const POLL_LOCK_WINDOW_MS = POLL_INTERVAL_MINUTES * 60 * 1000;
const DEFAULT_TOOL_DOMAINS = [
  "sentry.io",
  "md.getsentry.com",
  "github.com",
  "vercel.com",
  "stripe.com",
  "notion.so",
  "linear.app",
  "openai.com",
];
const DEFAULT_NOREPLY_MARKERS = ["noreply@", "no-reply@", "notification@", "notifications@", "do-not-reply@"];
const DEFAULT_SYSTEM_PATTERNS = [
  "confirm your email",
  "confirm email",
  "verify your email",
  "verify email",
  "email verification",
  "security alert",
  "new sign-in",
  "new login",
  "unusual activity",
  "reset your password",
  "password reset",
];

const VENDOR_DOMAINS = ["contractor", "services", "repairs", "maintenance", "hvac", "plumbing", "electric"]; // basic heuristic

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

type PrefilterEmail = {
  from: string;
  fromEmail: string;
  to: string[];
  cc: string[];
  subject: string;
  snippet: string;
};

function parseList(value: string | undefined, fallback: string[]) {
  if (!value) return fallback;
  return value
    .split(/[,\n;]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

const TOOL_DOMAINS = parseList(env.HOAREPLY_TOOL_DOMAINS, DEFAULT_TOOL_DOMAINS);
const NOREPLY_MARKERS = parseList(env.HOAREPLY_NOREPLY_MARKERS, DEFAULT_NOREPLY_MARKERS);
const SYSTEM_PATTERNS = parseList(env.HOAREPLY_SYSTEM_PATTERNS, DEFAULT_SYSTEM_PATTERNS);
const HOA_RECIPIENTS_ALLOWLIST = parseList(env.HOAREPLY_HOA_RECIPIENTS, []);

function isMarketingLike(subject: string, from: string, html: string | null | undefined, text: string | null | undefined) {
  const haystack = `${subject} ${from} ${html ?? ""} ${text ?? ""}`.toLowerCase();
  if (haystack.includes("list-unsubscribe") || haystack.includes("unsubscribe")) return true;
  if (haystack.includes("newsletter") || haystack.includes("sale") || haystack.includes("promo")) return true;
  if (haystack.includes("microsoft store") || haystack.includes("deal") || haystack.includes("pricing update")) return true;
  return false;
}

function parseRecipientList(value: string | null | undefined) {
  if (!value) return [] as string[];
  return value
    .split(/[;,]/)
    .map((entry) => extractEmail(entry)?.toLowerCase())
    .filter((email): email is string => Boolean(email));
}

function buildAllowedRecipients(accountEmail: string, hoaUserEmail?: string | null) {
  const base = [accountEmail, hoaUserEmail].filter(Boolean).map((email) => email!.toLowerCase());
  return [...base, ...HOA_RECIPIENTS_ALLOWLIST];
}

function buildSnippet(plainText: string | null | undefined, html: string | null | undefined) {
  const raw = (plainText || html || "").trim();
  return raw.slice(0, 200);
}

function buildPrefilterEmail(normalized: ReturnType<typeof normalizeGmailMessage>): PrefilterEmail {
  return {
    from: normalized.headers.from ?? "",
    fromEmail: extractEmail(normalized.headers.from) ?? normalized.headers.from ?? "",
    to: parseRecipientList(normalized.headers.to),
    cc: parseRecipientList(normalized.headers.cc),
    subject: normalized.headers.subject ?? "",
    snippet: buildSnippet(normalized.plainText, normalized.html),
  };
}

function isToHoaAddress(msg: PrefilterEmail, allowedRecipients: string[]) {
  if (!allowedRecipients.length) return false;
  const recipients = [...msg.to, ...msg.cc];
  return recipients.some((r) => allowedRecipients.some((hoa) => r.includes(hoa)));
}

function isToolDomain(msg: PrefilterEmail) {
  const domain = msg.fromEmail.split("@")[1] ?? "";
  return TOOL_DOMAINS.some((toolDomain) => domain.endsWith(toolDomain));
}

function isNoReplySender(msg: PrefilterEmail) {
  const email = msg.fromEmail.toLowerCase();
  return NOREPLY_MARKERS.some((marker) => email.includes(marker));
}

function looksLikeSystemConfirmation(msg: PrefilterEmail) {
  const text = `${msg.subject} ${msg.snippet}`.toLowerCase();
  return SYSTEM_PATTERNS.some((pattern) => text.includes(pattern));
}

function shouldSkipForAI(msg: PrefilterEmail, allowedRecipients: string[]) {
  if (!isToHoaAddress(msg, allowedRecipients)) return true;
  if (isToolDomain(msg)) return true;
  if (isNoReplySender(msg)) return true;
  if (looksLikeSystemConfirmation(msg)) return true;
  return false;
}

function classifyThreadKind(msg: PrefilterEmail, marketing: boolean, hasResident: boolean): ThreadKind {
  if (marketing || msg.snippet.toLowerCase().includes("unsubscribe")) return ThreadKind.newsletter_spam;
  if (hasResident) return ThreadKind.resident;
  const domain = (msg.fromEmail.split("@")[1] ?? "").toLowerCase();
  if (VENDOR_DOMAINS.some((d) => domain.includes(d))) return ThreadKind.vendor;
  return ThreadKind.unknown;
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
      const prefilterEmail = buildPrefilterEmail(normalized);
      const allowedRecipients = buildAllowedRecipients(freshAccount.email, account.hoa?.user?.email);

      if (shouldSkipForAI(prefilterEmail, allowedRecipients)) {
        logInfo("poll-gmail skip prefilter", {
          accountId: account.id,
          email: freshAccount.email,
          threadId: message.threadId,
          subject: normalized.headers.subject,
          from: prefilterEmail.fromEmail,
        });
        continue;
      }

      const marketing = isMarketingLike(
        normalized.headers.subject ?? "",
        normalized.headers.from ?? "",
        normalized.html,
        normalized.plainText,
      );

      const senderEmail = extractEmail(normalized.headers.from) ?? normalized.headers.from ?? "";

      const resident = await upsertResident({
        hoaId: account.hoaId,
        email: senderEmail,
        name: extractName(senderEmail),
        receivedAt: normalized.receivedAt,
      });

      const threadKind = classifyThreadKind(prefilterEmail, marketing, Boolean(resident));

      const thread = await prisma.emailThread.upsert({
        where: { gmailThreadId: message.threadId },
        update: {
          subject: normalized.headers.subject,
          updatedAt: new Date(),
          gmailAccountId: freshAccount.id,
          category: marketing ? "spam" : undefined,
          kind: threadKind,
          unreadCount: { increment: 1 },
        },
        create: {
          gmailThreadId: message.threadId,
          subject: normalized.headers.subject,
          hoaId: account.hoaId,
          gmailAccountId: freshAccount.id,
          status: ThreadStatus.NEW,
          category: marketing ? "spam" : undefined,
          kind: threadKind,
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

      if (marketing) {
        logInfo("poll-gmail labeled spam/marketing", {
          accountId: account.id,
          email: freshAccount.email,
          threadId: message.threadId,
          subject: normalized.headers.subject,
        });
        continue;
      }

      try {
        const managerName = account.hoa?.user?.name ?? account.hoa?.user?.email ?? "Manager";
        const hoaName = account.hoa?.name ?? "HOA";

        await handleInboundRequest({
          hoaId: account.hoaId,
          hoaName,
          managerName,
          threadId: thread.id,
          residentId: resident?.id,
          residentName: resident?.name ?? resident?.email ?? "Resident",
          residentEmail: resident?.email ?? senderEmail,
          fromEmail: senderEmail,
          marketing,
          subject: thread.subject,
          bodyText: dbMessage.bodyText,
          bodyHtml: dbMessage.bodyHtml,
        });
      } catch (error) {
        const messageText = error instanceof Error ? error.message : "request pipeline error";
        logError("request pipeline failure", { accountId: account.id, threadId: thread.id, error: messageText });
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
