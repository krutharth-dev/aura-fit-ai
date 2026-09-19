import {
  historyDatabase,
  historyIdentity,
  historyJson,
  loadFitnessProfile,
} from "../../../../db/history";

function accountRequired(identity: Awaited<ReturnType<typeof historyIdentity>>) {
  return historyJson({ error: "Sign in to export account data" }, identity, { status: 401 });
}

export async function GET(request: Request) {
  const identity = await historyIdentity(request);
  if (identity.authType !== "account") return accountRequired(identity);

  const db = await historyDatabase();
  if (!db) return historyJson({ error: "Account storage is unavailable" }, identity, { status: 503 });

  const [conversationResult, messageResult, workoutResult, profile] = await Promise.all([
    db.prepare(`SELECT id, title, created_at, updated_at
      FROM conversations WHERE device_id = ? ORDER BY updated_at DESC`)
      .bind(identity.ownerId)
      .all<{ id: string; title: string; created_at: number; updated_at: number }>(),
    db.prepare(`SELECT m.id, m.conversation_id, m.role, m.content, m.route, m.source, m.created_at, m.sequence
      FROM messages m
      INNER JOIN conversations c ON c.id = m.conversation_id
      WHERE c.device_id = ?
      ORDER BY m.conversation_id, m.sequence`)
      .bind(identity.ownerId)
      .all<{
        id: string;
        conversation_id: string;
        role: "user" | "assistant";
        content: string;
        route: string | null;
        source: string | null;
        created_at: number;
        sequence: number;
      }>(),
    db.prepare(`SELECT id, date, title, minutes, exercises_json, notes, created_at
      FROM workout_entries WHERE owner_id = ? ORDER BY date DESC, created_at DESC`)
      .bind(identity.ownerId)
      .all<{
        id: string;
        date: string;
        title: string;
        minutes: number;
        exercises_json: string;
        notes: string;
        created_at: number;
      }>(),
    loadFitnessProfile(db, identity.ownerId),
  ]);

  const messagesByConversation = new Map<string, Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    route: string | null;
    source: string | null;
    createdAt: number;
  }>>();

  for (const row of messageResult.results) {
    const current = messagesByConversation.get(row.conversation_id) ?? [];
    current.push({
      id: row.id,
      role: row.role,
      content: row.content,
      route: row.route,
      source: row.source,
      createdAt: Number(row.created_at),
    });
    messagesByConversation.set(row.conversation_id, current);
  }

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    account: identity.user,
    fitnessProfile: profile,
    conversations: conversationResult.results.map((row) => ({
      id: row.id,
      title: row.title,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
      messages: messagesByConversation.get(row.id) ?? [],
    })),
    workouts: workoutResult.results.map((row) => {
      let exercises: unknown = [];
      try { exercises = JSON.parse(row.exercises_json); } catch { exercises = []; }
      return {
        id: row.id,
        date: row.date,
        title: row.title,
        minutes: Number(row.minutes),
        exercises,
        notes: row.notes,
        createdAt: Number(row.created_at),
      };
    }),
  };

  const day = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="aura-fit-account-export-${day}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
