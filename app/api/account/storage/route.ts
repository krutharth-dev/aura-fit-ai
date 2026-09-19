import { historyDatabase, historyIdentity, historyJson } from "../../../../db/history";

function accountRequired(identity: Awaited<ReturnType<typeof historyIdentity>>) {
  return historyJson({ error: "Sign in to view account storage" }, identity, { status: 401 });
}

export async function GET(request: Request) {
  const identity = await historyIdentity(request);
  if (identity.authType !== "account") return accountRequired(identity);

  const db = await historyDatabase();
  if (!db) return historyJson({ error: "Account storage is unavailable" }, identity, { status: 503 });

  const [conversationRow, messageRow, workoutRow, profileRow] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS count, MAX(updated_at) AS latest
      FROM conversations WHERE device_id = ?`).bind(identity.ownerId).first<{ count: number; latest: number | null }>(),
    db.prepare(`SELECT COUNT(*) AS count
      FROM messages m
      INNER JOIN conversations c ON c.id = m.conversation_id
      WHERE c.device_id = ?`).bind(identity.ownerId).first<{ count: number }>(),
    db.prepare(`SELECT COUNT(*) AS count, MAX(created_at) AS latest
      FROM workout_entries WHERE owner_id = ?`).bind(identity.ownerId).first<{ count: number; latest: number | null }>(),
    db.prepare("SELECT updated_at FROM fitness_profiles WHERE owner_id = ?")
      .bind(identity.ownerId).first<{ updated_at: number }>(),
  ]);

  const latestActivityAt = Math.max(
    Number(conversationRow?.latest ?? 0),
    Number(workoutRow?.latest ?? 0),
    Number(profileRow?.updated_at ?? 0),
  ) || null;

  return historyJson({
    account: identity.user,
    storage: {
      provider: "Cloudflare D1",
      synced: true,
      conversations: Number(conversationRow?.count ?? 0),
      messages: Number(messageRow?.count ?? 0),
      workouts: Number(workoutRow?.count ?? 0),
      profileSaved: Boolean(profileRow),
      latestActivityAt,
    },
  }, identity, {
    headers: { "Cache-Control": "no-store" },
  });
}
