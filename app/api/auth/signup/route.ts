import { env } from "cloudflare:workers";
import { AuthError, safeReturnPath, sameOriginRequest, sessionCookie, signUpWithPassword, type D1DatabaseLike } from "../../../../lib/password-auth";

function database() { return (env as unknown as { DB?: D1DatabaseLike }).DB ?? null; }
function errorRedirect(request: Request, code: string, returnTo: string) {
  const url = new URL("/signup", request.url);
  url.searchParams.set("error", code);
  url.searchParams.set("return_to", returnTo);
  return new Response(null, { status: 303, headers: { Location: url.toString(), "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const returnFallback = "/";
  if (!sameOriginRequest(request)) return errorRedirect(request, "invalid_request", returnFallback);
  const form = await request.formData();
  const returnTo = safeReturnPath(String(form.get("return_to") ?? "/"));
  const db = database();
  if (!db) return errorRedirect(request, "service_unavailable", returnTo);
  try {
    const session = await signUpWithPassword(db, {
      email: String(form.get("email") ?? ""),
      displayName: String(form.get("display_name") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    return new Response(null, { status: 303, headers: {
      Location: new URL(returnTo, request.url).toString(),
      "Set-Cookie": sessionCookie(request.url, session.token),
      "Cache-Control": "no-store",
    } });
  } catch (error) {
    return errorRedirect(request, error instanceof AuthError ? error.code : "service_unavailable", returnTo);
  }
}
