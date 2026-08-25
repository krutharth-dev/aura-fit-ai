import { env } from "cloudflare:workers";
import { clearSessionCookie, deleteAuthSession, safeReturnPath, sessionTokenFromCookie, type D1DatabaseLike } from "../../../../lib/password-auth";

async function signOut(request: Request) {
  const db = (env as unknown as { DB?: D1DatabaseLike }).DB ?? null;
  const token = sessionTokenFromCookie(request.headers.get("cookie"));
  try { await deleteAuthSession(db, token); } catch { /* Expire the browser session even if storage is unavailable. */ }
  const url = new URL(request.url);
  const returnTo = safeReturnPath(url.searchParams.get("return_to"));
  return new Response(null, { status: 303, headers: {
    Location: new URL(returnTo, request.url).toString(),
    "Set-Cookie": clearSessionCookie(request.url),
    "Cache-Control": "no-store",
  } });
}

export const GET = signOut;
export const POST = signOut;
