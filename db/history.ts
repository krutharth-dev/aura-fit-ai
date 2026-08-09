import { env } from "cloudflare:workers";

type BindValue = string | number | null;
type Row = Record<string, unknown>;

interface D1Statement {
  bind(...values: BindValue[]): D1Statement;
  first<T extends Row = Row>(): Promise<T | null>;
  all<T extends Row = Row>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

interface D1DatabaseLike {
  prepare(sql: string): D1Statement;
  batch(statements: D1Statement[]): Promise<unknown[]>;
}

export type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  route?: string;
  source?: string;
  trace?: string[];
  createdAt: number;
};

export type ConversationSummary = {
  id: string;
  title: string;
  preview: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
};

export type HistoryIdentity = {
  ownerId: string;
  deviceId: string;
  authType: "account" | "guest";
  user: { displayName: string; email: string } | null;
  setCookie: string | null;
};

const COOKIE_NAME = "aura_device";
const DEVICE_PATTERN = /^device_[a-f0-9-]{36}$/;
let schemaReady: Promise<void> | null = null;

function database() {
  return (env as unknown as { DB?: D1DatabaseLike }).DB ?? null;
}

async function ensureSchema(db: D1DatabaseLike) {
  if (!schemaReady) {
    schemaReady = db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY NOT NULL,
        device_id TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`),
      db.prepare("CREATE INDEX IF NOT EXISTS conversations_device_updated_idx ON conversations (device_id, updated_at)"),
      db.prepare(`CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY NOT NULL,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        route TEXT,
        source TEXT,
        trace_json TEXT,
        created_at INTEGER NOT NULL,
        sequence INTEGER NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      )`),
      db.prepare("CREATE INDEX IF NOT EXISTS messages_conversation_sequence_idx ON messages (conversation_id, sequence)"),
    ]).then(() => undefined).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) ?? null;
}

function fullNameFromRequest(request: Request) {
  const encoded = request.headers.get("oai-authenticated-user-full-name");
  if (!encoded || request.headers.get("oai-authenticated-user-full-name-encoding") !== "percent-encoded-utf-8") return null;
  try { return decodeURIComponent(encoded); } catch { return null; }
}

async function accountOwnerId(email: string) {
  const bytes = new TextEncoder().encode(email.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `account_${Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("")}`;
}

export async function historyIdentity(request: Request): Promise<HistoryIdentity> {
  const existing = cookieValue(request, COOKIE_NAME);
  const deviceId = existing && DEVICE_PATTERN.test(existing) ? existing : `device_${crypto.randomUUID()}`;
  const setCookie = existing && DEVICE_PATTERN.test(existing)
    ? null
    : `${COOKIE_NAME}=${deviceId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  if (email) {
    const fullName = fullNameFromRequest(request);
    return {
      ownerId: await accountOwnerId(email),
      deviceId,
      authType: "account",
      user: { displayName: fullName || email, email },
      setCookie,
    };
  }
  return {
    ownerId: deviceId,
    deviceId,
    authType: "guest",
    user: null,
    setCookie,
  };
}

export function historyJson(payload: unknown, identity: HistoryIdentity, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  if (identity.setCookie) headers.set("Set-Cookie", identity.setCookie);
  return Response.json(payload, { ...init, headers });
}

export async function historyDatabase() {
  const db = database();
  if (!db) return null;
  await ensureSchema(db);
  return db;
}

export async function adoptGuestConversations(db: D1DatabaseLike, identity: HistoryIdentity) {
  if (identity.authType !== "account" || identity.ownerId === identity.deviceId) return;
  await db.prepare("UPDATE conversations SET device_id = ? WHERE device_id = ?")
    .bind(identity.ownerId, identity.deviceId).run();
}

export function titleFromMessage(message: string) {
  const compact = message.replace(/\s+/g, " ").trim().replace(/[.!?]+$/, "");
  return compact.length > 54 ? `${compact.slice(0, 51).trimEnd()}…` : compact || "New conversation";
}

export async function listConversations(db: D1DatabaseLike, ownerId: string): Promise<ConversationSummary[]> {
  const result = await db.prepare(`SELECT
      c.id, c.title, c.created_at, c.updated_at,
      COUNT(m.id) AS message_count,
      COALESCE((SELECT content FROM messages latest WHERE latest.conversation_id = c.id ORDER BY sequence DESC LIMIT 1), '') AS preview
    FROM conversations c
    LEFT JOIN messages m ON m.conversation_id = c.id
    WHERE c.device_id = ?
    GROUP BY c.id
    ORDER BY c.updated_at DESC
    LIMIT 50`).bind(ownerId).all<{
      id: string; title: string; preview: string; message_count: number; created_at: number; updated_at: number;
    }>();
  return result.results.map((row) => ({
    id: row.id, title: row.title, preview: row.preview, messageCount: Number(row.message_count),
    createdAt: Number(row.created_at), updatedAt: Number(row.updated_at),
  }));
}

export async function createConversation(db: D1DatabaseLike, ownerId: string, title = "New conversation") {
  const id = `chat_${crypto.randomUUID()}`;
  const now = Date.now();
  const safeTitle = titleFromMessage(title).slice(0, 80);
  await db.prepare("INSERT INTO conversations (id, device_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
    .bind(id, ownerId, safeTitle, now, now).run();
  return { id, title: safeTitle, preview: "", messageCount: 0, createdAt: now, updatedAt: now } satisfies ConversationSummary;
}

export async function loadConversation(db: D1DatabaseLike, ownerId: string, id: string) {
  const conversation = await db.prepare("SELECT id, title, created_at, updated_at FROM conversations WHERE id = ? AND device_id = ?")
    .bind(id, ownerId).first<{ id: string; title: string; created_at: number; updated_at: number }>();
  if (!conversation) return null;
  const rows = await db.prepare(`SELECT id, role, content, route, source, trace_json, created_at
    FROM messages WHERE conversation_id = ? ORDER BY sequence ASC LIMIT 200`)
    .bind(id).all<{ id: string; role: "user" | "assistant"; content: string; route: string | null; source: string | null; trace_json: string | null; created_at: number }>();
  const messages: StoredMessage[] = rows.results.map((row) => {
    let trace: string[] | undefined;
    try { trace = row.trace_json ? JSON.parse(row.trace_json) as string[] : undefined; } catch { trace = undefined; }
    return { id: row.id, role: row.role, content: row.content, route: row.route ?? undefined, source: row.source ?? undefined, trace, createdAt: Number(row.created_at) };
  });
  return { id: conversation.id, title: conversation.title, createdAt: Number(conversation.created_at), updatedAt: Number(conversation.updated_at), messages };
}

export async function renameConversation(db: D1DatabaseLike, ownerId: string, id: string, title: string) {
  const safeTitle = titleFromMessage(title).slice(0, 80);
  const owned = await db.prepare("SELECT id FROM conversations WHERE id = ? AND device_id = ?").bind(id, ownerId).first();
  if (!owned) return false;
  await db.prepare("UPDATE conversations SET title = ?, updated_at = ? WHERE id = ? AND device_id = ?")
    .bind(safeTitle, Date.now(), id, ownerId).run();
  return safeTitle;
}

export async function deleteConversation(db: D1DatabaseLike, ownerId: string, id: string) {
  const owned = await db.prepare("SELECT id FROM conversations WHERE id = ? AND device_id = ?").bind(id, ownerId).first();
  if (!owned) return false;
  await db.batch([
    db.prepare("DELETE FROM messages WHERE conversation_id = ?").bind(id),
    db.prepare("DELETE FROM conversations WHERE id = ? AND device_id = ?").bind(id, ownerId),
  ]);
  return true;
}

export async function saveExchange(
  db: D1DatabaseLike,
  ownerId: string,
  conversationId: string,
  userContent: string,
  assistant: { content: string; route?: string; source?: string; trace?: string[] },
) {
  const owned = await db.prepare("SELECT id, title FROM conversations WHERE id = ? AND device_id = ?")
    .bind(conversationId, ownerId).first<{ id: string; title: string }>();
  if (!owned) return false;
  const maximum = await db.prepare("SELECT COALESCE(MAX(sequence), 0) AS maximum FROM messages WHERE conversation_id = ?")
    .bind(conversationId).first<{ maximum: number }>();
  const sequence = Number(maximum?.maximum ?? 0);
  const now = Date.now();
  const suggestedTitle = owned.title === "New conversation" ? titleFromMessage(userContent) : owned.title;
  await db.batch([
    db.prepare("INSERT INTO messages (id, conversation_id, role, content, route, source, trace_json, created_at, sequence) VALUES (?, ?, 'user', ?, NULL, NULL, NULL, ?, ?)")
      .bind(`msg_${crypto.randomUUID()}`, conversationId, userContent, now, sequence + 1),
    db.prepare("INSERT INTO messages (id, conversation_id, role, content, route, source, trace_json, created_at, sequence) VALUES (?, ?, 'assistant', ?, ?, ?, ?, ?, ?)")
      .bind(`msg_${crypto.randomUUID()}`, conversationId, assistant.content, assistant.route ?? null, assistant.source ?? null, assistant.trace ? JSON.stringify(assistant.trace.slice(0, 20)) : null, now + 1, sequence + 2),
    db.prepare("UPDATE conversations SET title = ?, updated_at = ? WHERE id = ? AND device_id = ?")
      .bind(suggestedTitle, now + 1, conversationId, ownerId),
  ]);
  return true;
}
