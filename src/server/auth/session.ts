import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { AppSession } from "@/server/domain/types";

export const SESSION_COOKIE = "doqto_session";

function secretKey() {
  const secret = process.env.SESSION_SECRET || "dev-only-insecure-session-secret";
  return new TextEncoder().encode(secret);
}

export async function sealSession(session: AppSession): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());
}

export async function unsealSession(token: string): Promise<AppSession | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload as unknown as AppSession;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<AppSession | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return unsealSession(token);
}

export async function setSessionCookie(session: AppSession) {
  const token = await sealSession(session);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
