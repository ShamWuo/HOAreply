import type { Metadata } from "next";

const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

const metadataBase = new URL(appBaseUrl.replace(/\/+$/, ""));

const defaultTitle = "HOA Reply AI | Automate HOA inbox triage with Gmail in minutes";
const defaultDescription =
  "HOA Reply AI reads every resident email, classifies it, and drafts replies for your approval. Connect Gmail securely and ship faster responses to every HOA.";

export function buildMetadata(options?: {
  title?: string;
  description?: string;
  canonicalPath?: string;
  noIndex?: boolean;
}): Metadata {
  const title = options?.title ?? defaultTitle;
  const description = options?.description ?? defaultDescription;
  const canonicalPath = options?.canonicalPath ?? "/";

  return {
    metadataBase,
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      siteName: "HOA Reply AI",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: options?.noIndex
      ? {
          index: false,
          follow: false,
        }
      : undefined,
  };
}

export const baseMetadata: Metadata = buildMetadata();
