import crypto from "crypto";
import { SESSION_COOKIE } from "./constants";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function assertProductionConfig() {
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    throw new Error("Set SESSION_SECRET before running Folio in production.");
  }
}

function secret() {
  const value = process.env.SESSION_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Set SESSION_SECRET before running Folio in production.");
  }
  return "folio-dev-only-secret";
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

export function createSessionToken(userId: string, now = Date.now()) {
  const body = Buffer.from(JSON.stringify({ userId, exp: now + WEEK_MS })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function readSessionToken(token: string | undefined, now = Date.now()) {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString()) as { userId?: unknown; exp?: unknown };
    if (typeof parsed.userId !== "string" || typeof parsed.exp !== "number" || parsed.exp < now) return null;
    return parsed.userId;
  } catch {
    return null;
  }
}

export { SESSION_COOKIE };
