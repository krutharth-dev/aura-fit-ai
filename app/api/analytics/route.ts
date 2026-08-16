import {
  historyDatabase,
  historyIdentity,
  recordOperationalError,
  recordUsageEvent,
} from "../../../db/history";

const ALLOWED_EVENTS = new Set(["page_view", "client_error"]);

export async function POST(request: Request) {
  const identity = await historyIdentity(request);
  let body: { event?: unknown };
  try {
    body = await request.json() as { event?: unknown };
  } catch {
    return Response.json({ error: "Request must contain valid JSON" }, { status: 400 });
  }
  const event = typeof body.event === "string" ? body.event : "";
  if (!ALLOWED_EVENTS.has(event)) return Response.json({ error: "Unsupported analytics event" }, { status: 400 });
  const db = await historyDatabase().catch(() => null);
  if (db) {
    if (event === "client_error") {
      await recordOperationalError(db, {
        area: "client", code: "render_error", route: "application", authType: identity.authType,
      }).catch(() => undefined);
    } else {
      await recordUsageEvent(db, {
        eventName: event, route: "application", authType: identity.authType, statusCode: 202,
      }).catch(() => undefined);
    }
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
