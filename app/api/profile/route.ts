import {
  deleteFitnessProfile,
  historyDatabase,
  historyIdentity,
  historyJson,
  loadFitnessProfile,
  saveFitnessProfile,
} from "../../../db/history";
import { validateFitnessProfile } from "../../../lib/fitness-profile";

const MAX_PROFILE_BYTES = 8_000;

function accountRequired(identity: Awaited<ReturnType<typeof historyIdentity>>) {
  return historyJson({ error: "Sign in to access a saved fitness profile" }, identity, { status: 401 });
}

export async function GET(request: Request) {
  const identity = await historyIdentity(request);
  if (identity.authType !== "account") return accountRequired(identity);
  const db = await historyDatabase();
  if (!db) return historyJson({ error: "Profile storage is unavailable" }, identity, { status: 503 });
  return historyJson({ profile: await loadFitnessProfile(db, identity.ownerId), scope: identity.authType }, identity);
}

export async function PUT(request: Request) {
  const identity = await historyIdentity(request);
  if (identity.authType !== "account") return accountRequired(identity);
  let body: unknown;
  const rawBody = await request.text();
  if (rawBody.length > MAX_PROFILE_BYTES) return historyJson({ error: "Profile request is too large" }, identity, { status: 413 });
  try {
    body = JSON.parse(rawBody);
  } catch {
    return historyJson({ error: "Request must contain valid JSON" }, identity, { status: 400 });
  }
  const validated = validateFitnessProfile(body);
  if (!validated.profile) return historyJson({ error: validated.error ?? "Invalid profile" }, identity, { status: 400 });
  const db = await historyDatabase();
  if (!db) return historyJson({ error: "Profile storage is unavailable" }, identity, { status: 503 });
  return historyJson({ profile: await saveFitnessProfile(db, identity.ownerId, validated.profile), scope: identity.authType }, identity);
}

export async function DELETE(request: Request) {
  const identity = await historyIdentity(request);
  if (identity.authType !== "account") return accountRequired(identity);
  const db = await historyDatabase();
  if (!db) return historyJson({ error: "Profile storage is unavailable" }, identity, { status: 503 });
  await deleteFitnessProfile(db, identity.ownerId);
  return historyJson({ deleted: true }, identity);
}
