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
