import { env } from "@/lib/env";

const GOOGLE_AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
];

export function buildGoogleOAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: GMAIL_SCOPES.join(" "),
    state,
  });

  return `${GOOGLE_AUTH_BASE}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

async function exchangeToken(body: Record<string, string>) {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    ...body,
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to exchange token: ${errorText}`);
  }

  return (await response.json()) as TokenResponse;
}

export async function exchangeCodeForTokens(code: string) {
  const data = await exchangeToken({
    code,
    redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI,
    grant_type: "authorization_code",
  });

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const data = await exchangeToken({
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

async function gmailRequest<T>(path: string, accessToken: string, init?: RequestInit) {
  const response = await fetch(`${GMAIL_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail API error (${response.status}): ${errorText}`);
  }

  return (await response.json()) as T;
}

type GmailListResponse = {
  messages?: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
};

export async function listGmailMessages(accessToken: string, query: string, pageToken?: string) {
  const params = new URLSearchParams({
    q: query,
    maxResults: "50",
    labelIds: "INBOX",
  });

  if (pageToken) {
    params.set("pageToken", pageToken);
  }

  return gmailRequest<GmailListResponse>(`/messages?${params.toString()}`, accessToken);
}

export type GmailMessage = {
  id: string;
  threadId: string;
  internalDate?: string;
  payload: {
    mimeType: string;
    headers?: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: GmailMessage["payload"][];
  };
};

export async function getGmailMessage(accessToken: string, id: string) {
  return gmailRequest<GmailMessage>(`/messages/${id}?format=full`, accessToken);
}

export async function sendGmailMessage(accessToken: string, body: { raw: string; threadId?: string }) {
  return gmailRequest(`/messages/send`, accessToken, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchGmailProfile(accessToken: string) {
  return gmailRequest<{ emailAddress: string }>(`/profile`, accessToken);
}
