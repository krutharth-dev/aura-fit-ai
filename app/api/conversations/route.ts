import { adoptGuestConversations, createConversation, historyDatabase, historyIdentity, historyJson, listConversations, titleFromMessage } from "../../../db/history";

export async function GET(request: Request) {
  const identity = await historyIdentity(request);
  const db = await historyDatabase();
  if (!db) return historyJson({ error: "Conversation storage is unavailable" }, identity, { status: 503 });
  await adoptGuestConversations(db, identity);
  return historyJson({ conversations: await listConversations(db, identity.ownerId), scope: identity.authType }, identity);
}

export async function POST(request: Request) {
  const identity = await historyIdentity(request);
  const db = await historyDatabase();
  if (!db) return historyJson({ error: "Conversation storage is unavailable" }, identity, { status: 503 });
  await adoptGuestConversations(db, identity);
  let body: { title?: unknown; initial_message?: unknown } = {};
  try { body = await request.json() as typeof body; } catch { /* An empty body creates an untitled chat. */ }
  const initial = typeof body.initial_message === "string" ? body.initial_message.slice(0, 2_000) : "";
  const title = typeof body.title === "string" ? body.title : initial ? titleFromMessage(initial) : "New conversation";
  return historyJson({ conversation: await createConversation(db, identity.ownerId, title), scope: identity.authType }, identity, { status: 201 });
}
