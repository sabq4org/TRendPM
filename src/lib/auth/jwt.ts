import { SignJWT, jwtVerify } from "jose";

const SESSION_TTL_DAYS = 30;

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET is not set or is shorter than 32 characters. " +
        "Add AUTH_SECRET to .env.local (e.g. `openssl rand -hex 32`)."
    );
  }
  return new TextEncoder().encode(secret);
}

export type SessionJWTPayload = {
  sub: string; // user id
  sid: string; // session id
  ws: string | null; // active workspace id
};

export async function signSessionToken(payload: SessionJWTPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_DAYS}d`)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string
): Promise<SessionJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") return null;
    const p = payload as Record<string, unknown>;
    return {
      sub: payload.sub,
      sid: typeof p.sid === "string" ? p.sid : "",
      ws: typeof p.ws === "string" ? p.ws : null,
    };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "trend_session";
export const SESSION_MAX_AGE = SESSION_TTL_DAYS * 24 * 60 * 60;
