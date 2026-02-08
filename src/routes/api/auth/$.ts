import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { session, user, verification } from "@/lib/db/schema/auth";
import { createFileRoute } from "@tanstack/react-router";

const SESSION_COOKIE_NAME = "better-auth.session_token";
const SECURE_SESSION_COOKIE_NAME = "__Secure-better-auth.session_token";

const getCookieValue = (header: string | null, name: string): string | null => {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName === name) {
      const value = rawValue.join("=");
      return value ? decodeURIComponent(value) : null;
    }
  }
  return null;
};

const getSessionTokenFromRequest = (request: Request): string | null => {
  const cookieHeader = request.headers.get("cookie");
  const signedCookie =
    getCookieValue(cookieHeader, SESSION_COOKIE_NAME) ??
    getCookieValue(cookieHeader, SECURE_SESSION_COOKIE_NAME);

  if (!signedCookie) {
    return null;
  }

  const dotIndex = signedCookie.indexOf(".");
  return dotIndex > 0 ? signedCookie.slice(0, dotIndex) : signedCookie;
};

const deletedSessionResponse = (request: Request) => {
  const headers = new Headers();
  headers.append(
    "set-cookie",
    `${SESSION_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`,
  );
  headers.append(
    "set-cookie",
    `${SECURE_SESSION_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; Secure`,
  );

  const pathname = new URL(request.url).pathname;
  if (pathname.endsWith("/get-session")) {
    return Response.json(null, { status: 200, headers });
  }

  return Response.json({ error: "Session is no longer available." }, { status: 401, headers });
};

const isDeletedMagicLinkVerification = async (request: Request) => {
  const url = new URL(request.url);
  if (!url.pathname.endsWith("/magic-link/verify")) {
    return false;
  }

  const token = url.searchParams.get("token");
  if (!token) {
    return false;
  }

  const [magicLink] = await db
    .select({ value: verification.value })
    .from(verification)
    .where(eq(verification.identifier, token))
    .limit(1);

  if (!magicLink?.value) {
    return false;
  }

  let email: string | null = null;
  try {
    const payload = JSON.parse(magicLink.value) as { email?: string };
    if (typeof payload.email === "string") {
      email = payload.email;
    }
  } catch {
    return false;
  }

  if (!email) {
    return false;
  }

  const [targetUser] = await db
    .select({ completedAt: user.accountDeletionCompletedAt })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  return Boolean(targetUser?.completedAt);
};

const handleAuthRequest = async (request: Request) => {
  if (await isDeletedMagicLinkVerification(request)) {
    const redirectUrl = new URL("/login?error=account_deleted", request.url);
    return Response.redirect(redirectUrl, 302);
  }

  const sessionToken = getSessionTokenFromRequest(request);
  if (!sessionToken) {
    return auth.handler(request);
  }

  const [sessionOwner] = await db
    .select({ completedAt: user.accountDeletionCompletedAt })
    .from(session)
    .innerJoin(user, eq(session.userId, user.id))
    .where(eq(session.token, sessionToken))
    .limit(1);

  if (sessionOwner?.completedAt) {
    return deletedSessionResponse(request);
  }

  return auth.handler(request);
};

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }: { request: Request }) => {
        return handleAuthRequest(request);
      },
      POST: ({ request }: { request: Request }) => {
        return handleAuthRequest(request);
      },
    },
  },
});
