import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { eq, lt } from "drizzle-orm";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  signSessionToken,
  verifySessionToken,
  type SessionJWTPayload,
} from "./jwt";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateRawToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Creates a new DB session row, signs a JWT carrying its ID, sets the cookie.
 */
export async function createSession(params: {
  userId: string;
  workspaceId: string | null;
  userAgent?: string | null;
  ip?: string | null;
}): Promise<string> {
  const raw = generateRawToken();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

  const [row] = await db
    .insert(sessions)
    .values({
      userId: params.userId,
      tokenHash,
      userAgent: params.userAgent ?? null,
      ip: params.ip ?? null,
      expiresAt,
    })
    .returning({ id: sessions.id });

  const payload: SessionJWTPayload = {
    sub: params.userId,
    sid: row.id,
    ws: params.workspaceId,
  };
  const token = await signSessionToken(payload);

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return token;
}

export async function readSessionCookie(): Promise<SessionJWTPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const payload = await verifySessionToken(token);
    if (payload?.sid) {
      try {
        await db.delete(sessions).where(eq(sessions.id, payload.sid));
      } catch {
        /* ignore */
      }
    }
  }
  store.delete(SESSION_COOKIE);
}

export async function cleanExpiredSessions(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}
