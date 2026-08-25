export interface D1StatementLike {
  bind(...values: Array<string | number | null>): D1StatementLike;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<unknown>;
}

export interface D1DatabaseLike {
  prepare(sql: string): D1StatementLike;
}

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
};

export type AuthSession = {
  token: string;
  expiresAt: number;
  user: AuthUser;
};

export type AuthErrorCode =
  | "invalid_email"
  | "invalid_name"
  | "weak_password"
  | "email_taken"
  | "invalid_credentials"
  | "service_unavailable";

export class AuthError extends Error {
  constructor(public readonly code: AuthErrorCode) {
    super(code);
    this.name = "AuthError";
  }
}

export const SESSION_COOKIE_NAME = "aurafit_session";
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const PASSWORD_ITERATIONS = 120_000;
const encoder = new TextEncoder();
let schemaReady: Promise<void> | null = null;

async function ensureAuthSchema(db: D1DatabaseLike) {
  if (!schemaReady) {
    schemaReady = (async () => {
      await db.prepare(`CREATE TABLE IF NOT EXISTS auth_users (
        id TEXT PRIMARY KEY NOT NULL,
        email TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        is_admin INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`).run();
      await db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS auth_users_email_idx ON auth_users (email)").run();
      await db.prepare(`CREATE TABLE IF NOT EXISTS auth_sessions (
        token_hash TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
      )`).run();
      await db.prepare("CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions (user_id, expires_at)").run();
      await db.prepare("CREATE INDEX IF NOT EXISTS auth_sessions_expires_idx ON auth_sessions (expires_at)").run();
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function validateDisplayName(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 80);
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value: string) {
  if (!/^[0-9a-f]+$/i.test(value) || value.length % 2 !== 0) throw new Error("Invalid hex value");
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2) bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  return bytes;
}

function randomHex(byteLength: number) {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(byteLength)));
}

async function sha256(value: string) {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

async function passwordHash(password: string, saltHex: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    hash: "SHA-256",
    salt: hexToBytes(saltHex),
    iterations: PASSWORD_ITERATIONS,
  }, key, 256);
  return bytesToHex(new Uint8Array(bits));
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

async function createSession(db: D1DatabaseLike, user: AuthUser): Promise<AuthSession> {
  const token = randomHex(32);
  const tokenHash = await sha256(token);
  const createdAt = Date.now();
  const expiresAt = createdAt + SESSION_TTL_SECONDS * 1_000;
  await db.prepare("INSERT INTO auth_sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .bind(tokenHash, user.id, createdAt, expiresAt).run();
  if (Number.parseInt(tokenHash.slice(-2), 16) < 16) {
    await db.prepare("DELETE FROM auth_sessions WHERE expires_at <= ?").bind(createdAt).run();
  }
  return { token, expiresAt, user };
}

export async function signUpWithPassword(db: D1DatabaseLike, input: { email: string; displayName: string; password: string }): Promise<AuthSession> {
  await ensureAuthSchema(db);
  const email = normalizeEmail(input.email);
  const displayName = validateDisplayName(input.displayName);
  if (!validateEmail(email)) throw new AuthError("invalid_email");
  if (displayName.length < 2) throw new AuthError("invalid_name");
  if (input.password.length < 8 || input.password.length > 128) throw new AuthError("weak_password");
  if (await db.prepare("SELECT id FROM auth_users WHERE email = ?").bind(email).first()) throw new AuthError("email_taken");

  const salt = randomHex(16);
  const hash = await passwordHash(input.password, salt);
  const now = Date.now();
  const user: AuthUser = { id: crypto.randomUUID(), email, displayName, isAdmin: false };
  try {
    await db.prepare(`INSERT INTO auth_users (
      id, email, display_name, password_salt, password_hash, is_admin, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 0, ?, ?)`).bind(user.id, email, displayName, salt, hash, now, now).run();
  } catch {
    throw new AuthError("email_taken");
  }
  return createSession(db, user);
}

export async function signInWithPassword(db: D1DatabaseLike, input: { email: string; password: string }): Promise<AuthSession> {
  await ensureAuthSchema(db);
  const email = normalizeEmail(input.email);
  const row = await db.prepare(`SELECT id, email, display_name, password_salt, password_hash, is_admin
    FROM auth_users WHERE email = ?`).bind(email).first<{
      id: string;
      email: string;
      display_name: string;
      password_salt: string;
      password_hash: string;
      is_admin: number;
    }>();
  if (!row) throw new AuthError("invalid_credentials");
  const candidate = await passwordHash(input.password, row.password_salt);
  if (!constantTimeEqual(candidate, row.password_hash)) throw new AuthError("invalid_credentials");
  return createSession(db, {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    isAdmin: Number(row.is_admin) === 1,
  });
}

export function sessionTokenFromCookie(cookieHeader: string | null) {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [name, ...valueParts] = part.trim().split("=");
    if (name === SESSION_COOKIE_NAME) {
      const token = valueParts.join("=");
      return /^[0-9a-f]{64}$/i.test(token) ? token : null;
    }
  }
  return null;
}

export async function authenticatedUserFromRequest(request: Request, db?: D1DatabaseLike | null): Promise<AuthUser | null> {
  if (!db) return null;
  const token = sessionTokenFromCookie(request.headers.get("cookie"));
  if (!token) return null;
  try {
    await ensureAuthSchema(db);
    const tokenHash = await sha256(token);
    const now = Date.now();
    const row = await db.prepare(`SELECT u.id, u.email, u.display_name, u.is_admin, s.expires_at
      FROM auth_sessions s
      INNER JOIN auth_users u ON u.id = s.user_id
      WHERE s.token_hash = ?`).bind(tokenHash).first<{
        id: string;
        email: string;
        display_name: string;
        is_admin: number;
        expires_at: number;
      }>();
    if (!row) return null;
    if (Number(row.expires_at) <= now) {
      await db.prepare("DELETE FROM auth_sessions WHERE token_hash = ?").bind(tokenHash).run();
      return null;
    }
    return { id: row.id, email: row.email, displayName: row.display_name, isAdmin: Number(row.is_admin) === 1 };
  } catch {
    return null;
  }
}

export async function deleteAuthSession(db: D1DatabaseLike | null | undefined, token: string | null) {
  if (!db || !token) return;
  await ensureAuthSchema(db);
  await db.prepare("DELETE FROM auth_sessions WHERE token_hash = ?").bind(await sha256(token)).run();
}

export function sessionCookie(requestUrl: string, token: string) {
  const secure = new URL(requestUrl).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure}`;
}

export function clearSessionCookie(requestUrl: string) {
  const secure = new URL(requestUrl).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function safeReturnPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const url = new URL(value, "https://app.local");
    if (url.origin !== "https://app.local") return "/";
    if (["/signin", "/signup", "/signin-with-chatgpt", "/signout-with-chatgpt", "/callback"].includes(url.pathname)) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

export function sameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
