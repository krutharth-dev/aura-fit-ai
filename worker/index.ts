import handler from "vinext/server/app-router-entry";
import { authenticatedUserFromRequest, type D1DatabaseLike } from "../lib/password-auth";

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  DB?: D1DatabaseLike;
  [key: string]: unknown;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const protectedHeaders = [
  "x-aurafit-user-email",
  "x-aurafit-user-name",
  "x-aurafit-user-name-encoding",
  "x-aurafit-user-admin",
  "oai-authenticated-user-email",
  "oai-authenticated-user-full-name",
  "oai-authenticated-user-full-name-encoding",
];

function isLocalRequest(request: Request) {
  const host = new URL(request.url).hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function setIdentity(headers: Headers, email: string, displayName: string, isAdmin: boolean) {
  const encodedName = encodeURIComponent(displayName);
  headers.set("x-aurafit-user-email", email);
  headers.set("x-aurafit-user-name", encodedName);
  headers.set("x-aurafit-user-name-encoding", "percent-encoded-utf-8");
  headers.set("x-aurafit-user-admin", isAdmin ? "1" : "0");

  // Existing history/profile APIs use these internal identity headers. They are
  // removed from public requests below and can only be injected by this Worker.
  headers.set("oai-authenticated-user-email", email);
  headers.set("oai-authenticated-user-full-name", encodedName);
  headers.set("oai-authenticated-user-full-name-encoding", "percent-encoded-utf-8");
}

async function authenticatedRequest(request: Request, env: Env) {
  const headers = new Headers(request.headers);
  const allowLegacyLocalIdentity = isLocalRequest(request);
  const legacyEmail = allowLegacyLocalIdentity ? headers.get("oai-authenticated-user-email") : null;
  const legacyName = allowLegacyLocalIdentity ? headers.get("oai-authenticated-user-full-name") : null;
  const legacyEncoding = allowLegacyLocalIdentity ? headers.get("oai-authenticated-user-full-name-encoding") : null;

  for (const name of protectedHeaders) headers.delete(name);

  const user = await authenticatedUserFromRequest(request, env.DB);
  if (user) {
    setIdentity(headers, user.email, user.displayName, user.isAdmin);
  } else if (legacyEmail) {
    let displayName = legacyEmail;
    if (legacyName && legacyEncoding === "percent-encoded-utf-8") {
      try { displayName = decodeURIComponent(legacyName); } catch { /* Keep email fallback. */ }
    }
    setIdentity(headers, legacyEmail.trim().toLowerCase(), displayName, false);
  }
  return new Request(request, { headers });
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const response = await handler.fetch(await authenticatedRequest(request, env), env, ctx);
    const headers = new Headers(response.headers);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    headers.set("Cross-Origin-Opener-Policy", "same-origin");
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
};

export default worker;
