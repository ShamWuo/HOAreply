import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().url(),
  N8N_WEBHOOK_URL: z.string().url(),
  GMAIL_POLL_INTERVAL_MINUTES: z.coerce.number().int().min(1).max(60).default(2),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  CRON_SECRET: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).optional(),
  N8N_CLASSIFY_DRAFT_URL: z.string().url().optional(),
  N8N_HOAREPLY_SECRET: z.string().optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  HOAREPLY_TOOL_DOMAINS: z.string().optional(),
  HOAREPLY_NOREPLY_MARKERS: z.string().optional(),
  HOAREPLY_SYSTEM_PATTERNS: z.string().optional(),
  HOAREPLY_HOA_RECIPIENTS: z.string().optional(),
  ENCRYPTION_KEY: z
    .string()
    .min(32)
    .describe("Base64-encoded 32-byte key used to encrypt Gmail tokens at rest"),
});

const envResult = envSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_OAUTH_REDIRECT_URI: process.env.GOOGLE_OAUTH_REDIRECT_URI,
  N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL,
  GMAIL_POLL_INTERVAL_MINUTES: process.env.GMAIL_POLL_INTERVAL_MINUTES,
  APP_BASE_URL: process.env.APP_BASE_URL,
  CRON_SECRET: process.env.CRON_SECRET,
  SENTRY_DSN: process.env.SENTRY_DSN,
  SENTRY_TRACES_SAMPLE_RATE: process.env.SENTRY_TRACES_SAMPLE_RATE,
  N8N_CLASSIFY_DRAFT_URL: process.env.N8N_CLASSIFY_DRAFT_URL,
  N8N_HOAREPLY_SECRET: process.env.N8N_HOAREPLY_SECRET,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  HOAREPLY_TOOL_DOMAINS: process.env.HOAREPLY_TOOL_DOMAINS,
  HOAREPLY_NOREPLY_MARKERS: process.env.HOAREPLY_NOREPLY_MARKERS,
  HOAREPLY_SYSTEM_PATTERNS: process.env.HOAREPLY_SYSTEM_PATTERNS,
  HOAREPLY_HOA_RECIPIENTS: process.env.HOAREPLY_HOA_RECIPIENTS,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
});

if (!envResult.success) {
  const flattened = envResult.error.flatten().fieldErrors;
  const details = Object.entries(flattened)
    .filter(([, issues]) => issues && issues.length)
    .map(([key, issues]) => `${key}: ${issues?.join(", ")}`)
    .join("\n");

  console.error("Invalid environment variables", flattened);
  const hint = details ? `\n${details}` : "";
  throw new Error(`Invalid environment configuration. Check your .env file.${hint}`);
}

export const env = envResult.data;
