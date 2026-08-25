import { notFound } from "next/navigation";
import Link from "next/link";
import { historyDatabase, loadObservabilitySummary } from "../../db/history";
import { requireAuraFitUser, signOutPath } from "../auth";

export const dynamic = "force-dynamic";

function metric(value: number, suffix = "") {
  return `${new Intl.NumberFormat("en").format(value)}${suffix}`;
}

export default async function AdminPage() {
  const user = await requireAuraFitUser("/admin");
  if (!user.isAdmin) notFound();
  const db = await historyDatabase();
  if (!db) throw new Error("Observability storage is unavailable");
  const summary = await loadObservabilitySummary(db);
  const mode = process.env.GROQ_API_KEY ? "Groq enabled" : "Safe fallback";

  return <main className="admin-shell">
    <header className="admin-header">
      <div><Link href="/" className="admin-brand">AURA FIT</Link><span>OWNER CONSOLE</span></div>
      <div><small>{user.email}</small><a href={signOutPath("/")}>Sign out</a></div>
    </header>
    <section className="admin-hero">
      <p>PRIVACY-SAFE OPERATIONS</p>
      <h1>System health and usage</h1>
      <span>Last seven days · No chat text, email addresses, IP addresses or fitness details are stored in analytics.</span>
    </section>
    <section className="admin-metrics" aria-label="Key metrics">
      <article><span>Page views</span><strong>{metric(summary.totals.pageViews)}</strong><small>Anonymous aggregate events</small></article>
      <article><span>Coach responses</span><strong>{metric(summary.totals.chatResponses)}</strong><small>Across all coaching routes</small></article>
      <article><span>Operational errors</span><strong>{metric(summary.totals.errors)}</strong><small>Sanitised error codes only</small></article>
      <article><span>Average response</span><strong>{metric(summary.totals.averageChatMs, " ms")}</strong><small>Maximum {metric(summary.totals.maxChatMs, " ms")}</small></article>
    </section>
    <section className="admin-grid">
      <article className="admin-panel">
        <div className="admin-panel-title"><div><span>COACH ROUTES</span><h2>Response mix</h2></div><em>{mode}</em></div>
        {summary.routes.length ? <div className="admin-table">{summary.routes.map((item) => <div key={item.route}><strong>{item.route}</strong><span>{metric(item.count)} responses</span></div>)}</div> : <p className="admin-empty">No coach responses recorded yet.</p>}
      </article>
      <article className="admin-panel">
        <div className="admin-panel-title"><div><span>ERROR MONITOR</span><h2>Recent signals</h2></div><em>{summary.totals.errors ? "Review" : "Healthy"}</em></div>
        {summary.errorCodes.length ? <div className="admin-table">{summary.errorCodes.map((item) => <div key={`${item.area}-${item.code}`}><strong>{item.area} · {item.code}</strong><span>{item.count} · last {new Date(item.lastSeenAt).toLocaleString("en")}</span></div>)}</div> : <p className="admin-empty">No operational errors in the last seven days.</p>}
      </article>
    </section>
    <footer className="admin-footer"><Link href="/privacy">Privacy policy</Link><a href="/api/health">Live health check</a><Link href="/">Return to coach</Link></footer>
  </main>;
}
