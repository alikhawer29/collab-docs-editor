import { cookies } from "next/headers";
import { HttpError } from "./errors";
import { SESSION_COOKIE, createSessionToken, readSessionToken, sessionCookieOptions } from "./session";
import { getUserById } from "./store";
import type { PublicUser } from "./types";

export async function getCurrentUser(): Promise<PublicUser | null> {
  const jar = await cookies();
  const userId = readSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  return getUserById(userId);
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new HttpError("Sign in to continue.", 401);
  return user;
}

export async function startSession(userId: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, createSessionToken(userId), sessionCookieOptions());
}

export async function clearSession() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
}
