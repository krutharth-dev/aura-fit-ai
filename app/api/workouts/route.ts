import { historyDatabase, historyIdentity, historyJson } from "../../../db/history";
import { validateWorkout } from "../../../lib/workout-journal";

export async function GET(request: Request) {
  const identity = await historyIdentity(request);
  if (identity.authType !== "account") return historyJson({ error: "Sign in to open your journal" }, identity, { status: 401 });
  const db = await historyDatabase();
  if (!db) return historyJson({ error: "Journal storage is unavailable" }, identity, { status: 503 });
  const { results } = await db.prepare("SELECT * FROM workout_entries WHERE owner_id = ? ORDER BY date DESC, created_at DESC").bind(identity.ownerId).all();
  return historyJson({ entries: results.map(row => ({ id: row.id, date: row.date, title: row.title, minutes: row.minutes, notes: row.notes, exercises: JSON.parse(String(row.exercises_json)) })) }, identity);
}

export async function POST(request: Request) {
  const identity = await historyIdentity(request);
  if (identity.authType !== "account") return historyJson({ error: "Sign in to save a workout" }, identity, { status: 401 });
  const raw = await request.text();
  if (raw.length > 16000) return historyJson({ error: "Workout is too large" }, identity, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return historyJson({ error: "Invalid JSON" }, identity, { status: 400 }); }
  const result = validateWorkout(body);
  if (!result.entry) return historyJson({ error: result.error }, identity, { status: 400 });
  const db = await historyDatabase();
  if (!db) return historyJson({ error: "Journal storage is unavailable" }, identity, { status: 503 });
  const entry = { ...result.entry, id: crypto.randomUUID() };
  await db.prepare("INSERT INTO workout_entries (id, owner_id, date, title, minutes, exercises_json, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(entry.id, identity.ownerId, entry.date, entry.title, entry.minutes, JSON.stringify(entry.exercises), entry.notes, Date.now()).run();
  return historyJson({ entry }, identity, { status: 201 });
}

export async function DELETE(request: Request) {
  const identity = await historyIdentity(request);
  if (identity.authType !== "account") return historyJson({ error: "Sign in to delete a workout" }, identity, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id || id.length > 100) return historyJson({ error: "A valid workout ID is required" }, identity, { status: 400 });
  const db = await historyDatabase();
  if (!db) return historyJson({ error: "Journal storage is unavailable" }, identity, { status: 503 });
  await db.prepare("DELETE FROM workout_entries WHERE id = ? AND owner_id = ?").bind(id, identity.ownerId).run();
  return historyJson({ deleted: true }, identity);
}
