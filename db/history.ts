import { env } from "cloudflare:workers";
import type { FitnessProfile, FitnessProfileInput } from "../lib/fitness-profile";

type BindValue = string | number | null;
type Row = Record<string, unknown>;

interface D1Statement {
  bind(...values: BindValue[]): D1Statement;
  first<T extends Row = Row>(): Promise<T | null>;
  all<T extends Row = Row>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

export interface D1DatabaseLike {
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
  authType: "account" | "guest";
  user: { displayName: string; email: string } | null;
};

export type ObservabilitySummary = {
  since: number;
  totals: { pageViews: number; chatResponses: number; errors: number; averageChatMs: number; maxChatMs: number };
  routes: Array<{ route: string; count: number }>;
  errorCodes: Array<{ code: string; area: string; count: number; lastSeenAt: number }>;
};

const OBSERVABILITY_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;
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
      db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS messages_conversation_sequence_unique ON messages (conversation_id, sequence)"),
      db.prepare(`CREATE TABLE IF NOT EXISTS rate_limits (
        bucket_key TEXT PRIMARY KEY NOT NULL,
        count INTEGER NOT NULL,
        reset_at INTEGER NOT NULL
      )`),
      db.prepare("CREATE INDEX IF NOT EXISTS rate_limits_reset_idx ON rate_limits (reset_at)"),
      db.prepare(`CREATE TABLE IF NOT EXISTS fitness_profiles (
        owner_id TEXT PRIMARY KEY NOT NULL,
        goal TEXT NOT NULL,
        experience TEXT NOT NULL,
        days_per_week INTEGER NOT NULL,
        session_minutes INTEGER NOT NULL,
        equipment TEXT NOT NULL,
        limitations TEXT NOT NULL,
        preferred_exercises TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`),
      db.prepare("CREATE INDEX IF NOT EXISTS fitness_profiles_updated_idx ON fitness_profiles (updated_at)"),
      db.prepare(`CREATE TABLE IF NOT EXISTS usage_events (
        id TEXT PRIMARY KEY NOT NULL,
        event_name TEXT NOT NULL,
        route TEXT NOT NULL,
        auth_type TEXT NOT NULL,
        status_code INTEGER NOT NULL,
        duration_ms INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )`),
      db.prepare("CREATE INDEX IF NOT EXISTS usage_events_created_idx ON usage_events (created_at)"),
      db.prepare("CREATE INDEX IF NOT EXISTS usage_events_name_created_idx ON usage_events (event_name, created_at)"),
      db.prepare(`CREATE TABLE IF NOT EXISTS error_events (
        id TEXT PRIMARY KEY NOT NULL,
        area TEXT NOT NULL,
        code TEXT NOT NULL,
        route TEXT NOT NULL,
        auth_type TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )`),
      db.prepare("CREATE INDEX IF NOT EXISTS error_events_created_idx ON error_events (created_at)"),
      db.prepare("CREATE INDEX IF NOT EXISTS error_events_code_created_idx ON error_events (code, created_at)"),
    ]).then(() => undefined).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
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
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  if (email) {
    const fullName = fullNameFromRequest(request);
    return {
      ownerId: await accountOwnerId(email),
      authType: "account",
      user: { displayName: fullName || email, email },
    };
  }
  return {
    ownerId: "",
    authType: "guest",
    user: null,
  };
}

export function historyJson(payload: unknown, identity: HistoryIdentity, init: ResponseInit = {}) {
  return Response.json(payload, init);
}

export async function historyDatabase() {
  const db = database();
  if (!db) return null;
  await ensureSchema(db);
  return db;
}

export async function rateLimitKey(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function consumeRateLimit(db: D1DatabaseLike, bucketKey: string, limit: number, windowMs: number) {
  const now = Date.now();
  const resetAt = now + windowMs;
  const bucket = await db.prepare(`INSERT INTO rate_limits (bucket_key, count, reset_at)
      VALUES (?, 1, ?)
      ON CONFLICT(bucket_key) DO UPDATE SET
        count = CASE WHEN rate_limits.reset_at <= ? THEN 1 ELSE rate_limits.count + 1 END,
        reset_at = CASE WHEN rate_limits.reset_at <= ? THEN excluded.reset_at ELSE rate_limits.reset_at END
      RETURNING count, reset_at`)
    .bind(bucketKey, resetAt, now, now)
    .first<{ count: number; reset_at: number }>();
  const count = Number(bucket?.count ?? 1);
  const activeResetAt = Number(bucket?.reset_at ?? resetAt);

  // Each new/reset bucket has a small deterministic chance to remove expired rows.
  // This bounds retained data without adding a cleanup write to every request.
  if (count === 1 && Number.parseInt(bucketKey.slice(-2), 16) < 16) {
    await db.prepare("DELETE FROM rate_limits WHERE reset_at <= ? AND bucket_key <> ?")
      .bind(now, bucketKey).run();
  }
  return {
    limited: count > limit,
    retryAfterSeconds: Math.max(1, Math.ceil((activeResetAt - now) / 1_000)),
  };
}

export async function loadFitnessProfile(db: D1DatabaseLike, ownerId: string): Promise<FitnessProfile | null> {
  const row = await db.prepare(`SELECT goal, experience, days_per_week, session_minutes,
      equipment, limitations, preferred_exercises, updated_at
    FROM fitness_profiles WHERE owner_id = ?`).bind(ownerId).first<{
      goal: FitnessProfile["goal"];
      experience: FitnessProfile["experience"];
      days_per_week: number;
      session_minutes: number;
      equipment: FitnessProfile["equipment"];
      limitations: string;
      preferred_exercises: string;
      updated_at: number;
    }>();
  if (!row) return null;
  return {
    goal: row.goal,
    experience: row.experience,
    daysPerWeek: Number(row.days_per_week),
    sessionMinutes: Number(row.session_minutes),
    equipment: row.equipment,
    limitations: row.limitations,
    preferredExercises: row.preferred_exercises,
    updatedAt: Number(row.updated_at),
  };
}

export async function saveFitnessProfile(db: D1DatabaseLike, ownerId: string, profile: FitnessProfileInput): Promise<FitnessProfile> {
  const now = Date.now();
  await db.prepare(`INSERT INTO fitness_profiles (
      owner_id, goal, experience, days_per_week, session_minutes, equipment,
      limitations, preferred_exercises, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(owner_id) DO UPDATE SET
      goal = excluded.goal,
      experience = excluded.experience,
      days_per_week = excluded.days_per_week,
      session_minutes = excluded.session_minutes,
      equipment = excluded.equipment,
      limitations = excluded.limitations,
      preferred_exercises = excluded.preferred_exercises,
      updated_at = excluded.updated_at`)
    .bind(
      ownerId,
      profile.goal,
      profile.experience,
      profile.daysPerWeek,
      profile.sessionMinutes,
      profile.equipment,
      profile.limitations,
      profile.preferredExercises,
      now,
      now,
    ).run();
  return { ...profile, updatedAt: now };
}

export async function deleteFitnessProfile(db: D1DatabaseLike, ownerId: string) {
  await db.prepare("DELETE FROM fitness_profiles WHERE owner_id = ?").bind(ownerId).run();
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
    FROM messages WHERE conversation_id = ? ORDER BY sequence DESC, created_at DESC, id DESC LIMIT 200`)
    .bind(id).all<{ id: string; role: "user" | "assistant"; content: string; route: string | null; source: string | null; trace_json: string | null; created_at: number }>();
  const messages: StoredMessage[] = rows.results.reverse().map((row) => {
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
  const now = Date.now();
  const suggestedTitle = owned.title === "New conversation" ? titleFromMessage(userContent) : owned.title;
  await db.batch([
    db.prepare(`INSERT INTO messages (id, conversation_id, role, content, route, source, trace_json, created_at, sequence)
      SELECT ?, ?, 'user', ?, NULL, NULL, NULL, ?, COALESCE(MAX(sequence), 0) + 1
      FROM messages WHERE conversation_id = ?`)
      .bind(`msg_${crypto.randomUUID()}`, conversationId, userContent, now, conversationId),
    db.prepare(`INSERT INTO messages (id, conversation_id, role, content, route, source, trace_json, created_at, sequence)
      SELECT ?, ?, 'assistant', ?, ?, ?, ?, ?, COALESCE(MAX(sequence), 0) + 1
      FROM messages WHERE conversation_id = ?`)
      .bind(`msg_${crypto.randomUUID()}`, conversationId, assistant.content, assistant.route ?? null, assistant.source ?? null, assistant.trace ? JSON.stringify(assistant.trace.slice(0, 20)) : null, now + 1, conversationId),
    db.prepare("UPDATE conversations SET title = ?, updated_at = ? WHERE id = ? AND device_id = ?")
      .bind(suggestedTitle, now + 1, conversationId, ownerId),
  ]);
  return true;
}

function safeMetricValue(value: string, fallback: string) {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 48);
  return normalized || fallback;
}

async function maybePruneObservability(db: D1DatabaseLike, id: string, now: number) {
  if (Number.parseInt(id.slice(-2), 16) >= 8) return;
  const cutoff = now - OBSERVABILITY_RETENTION_MS;
  await db.batch([
    db.prepare("DELETE FROM usage_events WHERE created_at < ?").bind(cutoff),
    db.prepare("DELETE FROM error_events WHERE created_at < ?").bind(cutoff),
  ]);
}

export async function recordUsageEvent(
  db: D1DatabaseLike,
  event: { eventName: string; route?: string; authType: HistoryIdentity["authType"]; statusCode?: number; durationMs?: number },
) {
  const id = crypto.randomUUID().replaceAll("-", "");
  const now = Date.now();
  await db.prepare(`INSERT INTO usage_events
      (id, event_name, route, auth_type, status_code, duration_ms, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      `usage_${id}`,
      safeMetricValue(event.eventName, "unknown"),
      safeMetricValue(event.route ?? "none", "none"),
      event.authType,
      Math.max(100, Math.min(599, Math.round(event.statusCode ?? 200))),
      Math.max(0, Math.min(120_000, Math.round(event.durationMs ?? 0))),
      now,
    ).run();
  await maybePruneObservability(db, id, now);
}

export async function recordOperationalError(
  db: D1DatabaseLike,
  event: { area: string; code: string; route?: string; authType: HistoryIdentity["authType"] },
) {
  const id = crypto.randomUUID().replaceAll("-", "");
  const now = Date.now();
  await db.prepare(`INSERT INTO error_events
      (id, area, code, route, auth_type, created_at)
      VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(
      `error_${id}`,
      safeMetricValue(event.area, "application"),
      safeMetricValue(event.code, "unknown_error"),
      safeMetricValue(event.route ?? "none", "none"),
      event.authType,
      now,
    ).run();
  await maybePruneObservability(db, id, now);
}

export async function loadObservabilitySummary(db: D1DatabaseLike, since = Date.now() - 7 * 24 * 60 * 60 * 1_000): Promise<ObservabilitySummary> {
  const [totalsResult, routeResult, errorResult] = await Promise.all([
    db.prepare(`SELECT
        SUM(CASE WHEN event_name = 'page_view' THEN 1 ELSE 0 END) AS page_views,
        SUM(CASE WHEN event_name = 'chat_response' THEN 1 ELSE 0 END) AS chat_responses,
        AVG(CASE WHEN event_name = 'chat_response' THEN duration_ms END) AS average_chat_ms,
        MAX(CASE WHEN event_name = 'chat_response' THEN duration_ms END) AS max_chat_ms
      FROM usage_events WHERE created_at >= ?`).bind(since).first<{
        page_views: number | null; chat_responses: number | null; average_chat_ms: number | null; max_chat_ms: number | null;
      }>(),
    db.prepare(`SELECT route, COUNT(*) AS count FROM usage_events
      WHERE created_at >= ? AND event_name = 'chat_response'
      GROUP BY route ORDER BY count DESC LIMIT 12`).bind(since).all<{ route: string; count: number }>(),
    db.prepare(`SELECT code, area, COUNT(*) AS count, MAX(created_at) AS last_seen_at
      FROM error_events WHERE created_at >= ?
      GROUP BY code, area ORDER BY last_seen_at DESC LIMIT 20`).bind(since).all<{ code: string; area: string; count: number; last_seen_at: number }>(),
  ]);
  const errorTotal = errorResult.results.reduce((sum, row) => sum + Number(row.count), 0);
  return {
    since,
    totals: {
      pageViews: Number(totalsResult?.page_views ?? 0),
      chatResponses: Number(totalsResult?.chat_responses ?? 0),
      errors: errorTotal,
      averageChatMs: Math.round(Number(totalsResult?.average_chat_ms ?? 0)),
      maxChatMs: Number(totalsResult?.max_chat_ms ?? 0),
    },
    routes: routeResult.results.map((row) => ({ route: row.route, count: Number(row.count) })),
    errorCodes: errorResult.results.map((row) => ({ code: row.code, area: row.area, count: Number(row.count), lastSeenAt: Number(row.last_seen_at) })),
  };
}
