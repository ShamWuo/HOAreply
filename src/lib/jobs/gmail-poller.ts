import { MessageDirection } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureAccessToken, fetchNewInboxMessages, normalizeGmailMessage, sendGmailReply } from "@/lib/gmail";
import { callN8nWebhook } from "@/lib/n8n";

const DEFAULT_QUERY = "label:INBOX newer_than:1d";

export async function pollAllGmailAccounts() {
  const accounts = await prisma.gmailAccount.findMany({
    include: { hoa: true },
  });

  const summaries: Array<{ accountId: string; processed: number; error?: string }> = [];

  for (const account of accounts) {
    try {
      const processed = await processAccount(account.id);
      summaries.push({ accountId: account.id, processed });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown poll error";
      console.error("poll-gmail error", message);
      summaries.push({ accountId: account.id, processed: 0, error: message });
    }
  }

  return summaries;
}

async function processAccount(accountId: string) {
  const account = await prisma.gmailAccount.findUnique({
    where: { id: accountId },
    include: { hoa: true },
  });

  if (!account) {
    return 0;
  }

  const freshAccount = await ensureAccessToken(account);
  const messages = await fetchNewInboxMessages(freshAccount, DEFAULT_QUERY);

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
      console.error("n8n webhook failure", messageText);
    }
  }

  return processed;
}
