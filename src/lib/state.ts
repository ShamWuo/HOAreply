import { createHmac, timingSafeEqual } from "crypto";
import { googleStateSchema } from "@/lib/validators";
import { env } from "@/lib/env";

type SignedStatePayload = {
  userId: string;
  hoaId: string;
  exp: number;
};

function signPayload(payload: SignedStatePayload) {
  const json = JSON.stringify(payload);
  const signature = createHmac("sha256", env.NEXTAUTH_SECRET)
    .update(json)
    .digest("hex");
  return {
    json,
    signature,
  };
}

export function createSignedState(input: { userId: string; hoaId: string; ttlSeconds?: number }) {
  const payload: SignedStatePayload = {
    userId: input.userId,
    hoaId: input.hoaId,
    exp: Math.floor(Date.now() / 1000) + (input.ttlSeconds ?? 600),
  };

  const { json, signature } = signPayload(payload);
  const encoded = Buffer.from(json).toString("base64url");
  return `${encoded}.${signature}`;
}

export function verifySignedState(token: string) {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    throw new Error("Malformed state");
  }

  const json = Buffer.from(encoded, "base64url").toString("utf8");
  const expectedSignature = createHmac("sha256", env.NEXTAUTH_SECRET)
    .update(json)
    .digest("hex");

  const matches = timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expectedSignature, "hex"),
  );

  if (!matches) {
    throw new Error("Invalid state signature");
  }

  const payload = googleStateSchema.parse(JSON.parse(json));
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("State expired");
  }

  return payload;
}
