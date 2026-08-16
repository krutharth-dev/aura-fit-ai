import { deleteConversation, historyDatabase, historyIdentity, historyJson, loadConversation, renameConversation } from "../../../../db/history";

type RouteContext = { params: Promise<{ id: string }> };
const ID_PATTERN = /^chat_[a-f0-9-]{36}$/;

function accountRequired(identity: Awaited<ReturnType<typeof historyIdentity>>) {
  return historyJson({ error: "Sign in to access saved conversations" }, identity, { status: 401 });
}

export async function GET(request: Request, context: RouteContext) {
  const identity = await historyIdentity(request);
  if (identity.authType !== "account") return accountRequired(identity);
  const { id } = await context.params;
  if (!ID_PATTERN.test(id)) return historyJson({ error: "Invalid conversation" }, identity, { status: 400 });
  const db = await historyDatabase();
  if (!db) return historyJson({ error: "Conversation storage is unavailable" }, identity, { status: 503 });
  const conversation = await loadConversation(db, identity.ownerId, id);
  return conversation ? historyJson({ conversation }, identity) : historyJson({ error: "Conversation not found" }, identity, { status: 404 });
}

export async function PATCH(request: Request, context: RouteContext) {
  const identity = await historyIdentity(request);
  if (identity.authType !== "account") return accountRequired(identity);
  const { id } = await context.params;
  if (!ID_PATTERN.test(id)) return historyJson({ error: "Invalid conversation" }, identity, { status: 400 });
  let body: { title?: unknown };
  try { body = await request.json() as { title?: unknown }; } catch { return historyJson({ error: "Request must contain valid JSON" }, identity, { status: 400 }); }
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title || title.length > 80) return historyJson({ error: "Title must be 1–80 characters" }, identity, { status: 400 });
  const db = await historyDatabase();
  if (!db) return historyJson({ error: "Conversation storage is unavailable" }, identity, { status: 503 });
  const renamed = await renameConversation(db, identity.ownerId, id, title);
  return renamed ? historyJson({ id, title: renamed }, identity) : historyJson({ error: "Conversation not found" }, identity, { status: 404 });
}

export async function DELETE(request: Request, context: RouteContext) {
  const identity = await historyIdentity(request);
  if (identity.authType !== "account") return accountRequired(identity);
  const { id } = await context.params;
  if (!ID_PATTERN.test(id)) return historyJson({ error: "Invalid conversation" }, identity, { status: 400 });
  const db = await historyDatabase();
  if (!db) return historyJson({ error: "Conversation storage is unavailable" }, identity, { status: 503 });
  const deleted = await deleteConversation(db, identity.ownerId, id);
  return deleted ? historyJson({ deleted: true }, identity) : historyJson({ error: "Conversation not found" }, identity, { status: 404 });
}
