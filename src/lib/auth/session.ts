import { createHmac, timingSafeEqual } from "crypto";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  username?: string | null;
};

type SessionPayload = {
  user: SessionUser;
  expiresAt: number;
};

export const SESSION_COOKIE_NAME = "crypto_wallet_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

function getSessionSecret() {
  const secret = process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error("Configure NEXTAUTH_SECRET no arquivo .env.local.");
  }

  return secret;
}

function signValue(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function isValidSignature(value: string, signature: string) {
  const expectedSignature = signValue(value);
  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function createSessionToken(user: SessionUser) {
  const payload: SessionPayload = {
    user,
    expiresAt: Date.now() + SESSION_DURATION_SECONDS * 1000,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signValue(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function getSessionFromToken(token?: string) {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature || !isValidSignature(encodedPayload, signature)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as SessionPayload;

    if (!payload.expiresAt || payload.expiresAt < Date.now()) {
      return null;
    }

    return payload.user;
  } catch {
    return null;
  }
}
