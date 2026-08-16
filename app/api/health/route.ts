import { historyDatabase } from "../../../db/history";

export async function GET() {
  const storage = Boolean(await historyDatabase().catch(() => null));
  return Response.json({
    ok: storage,
    storage: storage ? "available" : "unavailable",
    coachMode: process.env.GROQ_API_KEY ? "groq" : "safe-fallback",
    checkedAt: new Date().toISOString(),
  }, {
    status: storage ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
