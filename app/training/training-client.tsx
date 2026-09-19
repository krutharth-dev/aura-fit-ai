"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { validateWorkout, type WorkoutEntry, type WorkoutInput } from "../../lib/workout-journal";

function localDate(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function emptyWorkout(): WorkoutInput { return { title: "", date: localDate(), minutes: 45, notes: "", exercises: [{ name: "", sets: 3, reps: 10, weight: 0 }] }; }
const volume = (entry: WorkoutEntry) => entry.exercises.reduce((sum, e) => sum + e.sets * e.reps * e.weight, 0);
export default function TrainingClient({ signedIn, name, signInPath }: { signedIn: boolean; name: string; signInPath: string }) {
  const [entries, setEntries] = useState<WorkoutEntry[]>([]);
  const [loading, setLoading] = useState(signedIn);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<WorkoutInput>(emptyWorkout);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  async function loadEntries() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/workouts");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load workouts");
      setEntries(data.entries);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load workouts"); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    if (!signedIn) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/workouts", { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load workouts");
        if (!controller.signal.aborted) setEntries(data.entries);
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Could not load workouts"); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [signedIn]);
  async function save(event: FormEvent) {
    event.preventDefault(); setError(""); setNotice("");
    const result = validateWorkout(draft);
    if (!result.entry) { setError(result.error ?? "Check your workout"); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/workouts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(result.entry) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save workout");
      setEntries(current => [data.entry, ...current].sort((a, b) => b.date.localeCompare(a.date)));
      setDraft(emptyWorkout()); setFormOpen(false); setNotice("Workout saved. Keep showing up.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save workout"); }
    finally { setSaving(false); }
  }
  async function remove(id: string) {
    setDeleting(id); setError("");
    try {
      const response = await fetch(`/api/workouts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not delete workout. Please try again.");
      setEntries(current => current.filter(e => e.id !== id)); setConfirmDelete(null); setNotice("Workout deleted.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not delete workout"); }
    finally { setDeleting(null); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), workouts: entries }, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "aura-fit-workouts.json"; a.click(); URL.revokeObjectURL(url);
  }
  const today = localDate();
  const days = Array.from({ length: 7 }, (_, i) => { const day = new Date(); day.setDate(day.getDate() - 6 + i); return { date: localDate(day), label: day.toLocaleDateString("en", { weekday: "short" }) }; });
  const weekEntries = entries.filter(e => e.date >= days[0].date && e.date <= today);
  const filtered = entries.filter(e => `${e.title} ${e.exercises.map(x => x.name).join(" ")}`.toLowerCase().includes(search.toLowerCase()));
  return <main className="training-shell">
    <header className="training-header"><Link className="training-brand" href="/">AURA<span>FIT</span></Link><nav aria-label="Workspace"><Link href="/">AI coach</Link><Link href="/training" aria-current="page">Training journal</Link></nav><span className="training-account">{signedIn ? <Link href="/account">{name.split(" ")[0]}</Link> : <a href={signInPath}>Sign in</a>}</span></header>
    <div className="training-content">
      <section className="training-intro"><div><p className="eyebrow">YOUR TRAINING, IN FOCUS</p><h1>Make the work count.</h1><p>Log your sessions. See your consistency. Build on last time.</p></div>{signedIn && <button className="primary-action" onClick={() => { setFormOpen(!formOpen); setError(""); }}>{formOpen ? "Close editor" : "+ Log a workout"}</button>}</section>
      {!signedIn ? <section className="journal-guest"><span className="journal-number">01 / START HERE</span><h2>Your next session is the beginning.</h2><p>Keep exercises, sets, reps and weights in one place. Sign in to save your journal privately and access it across devices.</p><a className="primary-action" href={signInPath}>Sign in to start your journal</a><Link href="/">Or try the AI coach →</Link></section> : <>
        {error && <div className="journal-alert" role="alert">{error} {!formOpen && <button onClick={() => void loadEntries()}>Retry loading</button>}</div>}
        {notice && <p className="journal-notice" role="status">{notice}</p>}
        {formOpen && <form className="workout-form" onSubmit={save}><div className="section-heading"><h2>Log your session</h2><span>All weights in kg</span></div><div className="workout-fields"><label>Session name<input required maxLength={100} placeholder="e.g. Upper body · push" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label><label>Date<input required type="date" max={today} value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} /></label><label>Minutes<input required type="number" min={1} max={600} value={draft.minutes} onChange={e => setDraft({ ...draft, minutes: Number(e.target.value) })} /></label></div>
          <div className="exercise-rows">{draft.exercises.map((exercise, i) => <fieldset className="exercise-row" key={i}><legend>Exercise {i + 1}</legend>{(["name", "sets", "reps", "weight"] as const).map(field => <label key={field}>{field === "name" ? "Exercise" : field === "weight" ? "Weight (kg)" : field}<input aria-label={`${field} for exercise ${i + 1}`} required type={field === "name" ? "text" : "number"} maxLength={field === "name" ? 100 : undefined} min={field === "weight" ? 0 : 1} max={field === "sets" ? 30 : field === "reps" ? 200 : field === "weight" ? 1000 : undefined} step={field === "weight" ? "0.25" : undefined} value={exercise[field]} onChange={e => setDraft({ ...draft, exercises: draft.exercises.map((x, index) => index === i ? { ...x, [field]: field === "name" ? e.target.value : Number(e.target.value) } : x) })} /></label>)}<button type="button" disabled={draft.exercises.length === 1} onClick={() => setDraft({ ...draft, exercises: draft.exercises.filter((_, index) => index !== i) })} aria-label={`Remove exercise ${i + 1}`}>×</button></fieldset>)}</div>
          <button className="secondary-action" type="button" disabled={draft.exercises.length >= 20} onClick={() => setDraft({ ...draft, exercises: [...draft.exercises, { name: "", sets: 3, reps: 10, weight: 0 }] })}>+ Add exercise</button><label className="workout-notes">Session notes <span>Optional · use 0 kg for unweighted exercises</span><textarea maxLength={1000} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} placeholder="How did the session feel?" /></label><div className="form-actions"><button className="secondary-action" type="button" disabled={saving} onClick={() => setFormOpen(false)}>Cancel</button><button className="primary-action" disabled={saving}>{saving ? "Saving…" : "Save workout"}</button></div>
        </form>}
        <section className="journal-stats" aria-label="Last seven days"><article><span>Sessions · last 7 days</span><strong>{loading ? "—" : weekEntries.length}</strong><small>Every session is a step forward</small></article><article><span>Training time · last 7 days</span><strong>{loading ? "—" : weekEntries.reduce((s, e) => s + e.minutes, 0)}<em>min</em></strong><small>Time you made for yourself</small></article><article><span>Volume · last 7 days</span><strong>{loading ? "—" : Math.round(weekEntries.reduce((s, e) => s + volume(e), 0)).toLocaleString()}<em>kg</em></strong><small>Sets × reps × logged weight</small></article></section>
        <section className="consistency-panel"><div><p className="eyebrow">KEEP YOUR RHYTHM</p><h2>The last seven days</h2></div><div className="consistency-days">{days.map(day => { const count = entries.filter(e => e.date === day.date).length; return <div key={day.date} className={count ? "trained" : ""}><span>{day.label}</span><strong title={`${day.date}: ${count} sessions`}>{count || "—"}</strong><small>{day.date.slice(8)}</small></div>; })}</div></section>
        <section className="journal-history"><div className="section-heading"><div><p className="eyebrow">THE WORK YOU PUT IN</p><h2>Session history</h2></div><button className="secondary-action" onClick={download} disabled={!entries.length || loading}>Export journal</button></div><input className="journal-search" aria-label="Search workouts" placeholder="Search sessions or exercises…" value={search} onChange={e => setSearch(e.target.value)} />
          {loading ? <p role="status" className="journal-empty">Loading your journal…</p> : !filtered.length ? <div className="journal-empty"><h3>{search ? "No matching sessions" : "A fresh start."}</h3><p>{search ? "Try a different exercise or session name." : "Your completed workouts will appear here. Log your first session to get started."}</p></div> : filtered.map(entry => <details className="workout-card" key={entry.id}><summary><span className="workout-date">{new Date(`${entry.date}T12:00:00`).toLocaleDateString("en", { day: "numeric", month: "short" })}</span><span><strong>{entry.title}</strong><small>{entry.exercises.length} exercises · {entry.minutes} min · {Math.round(volume(entry)).toLocaleString()} kg volume</small></span><span className="expand-sign">+</span></summary><div className="workout-detail"><div className="workout-table-wrap"><table><thead><tr><th>Exercise</th><th>Sets</th><th>Reps</th><th>Weight</th></tr></thead><tbody>{entry.exercises.map((e, i) => <tr key={i}><td>{e.name}</td><td>{e.sets}</td><td>{e.reps}</td><td>{e.weight} kg</td></tr>)}</tbody></table></div>{entry.notes && <p>{entry.notes}</p>}{confirmDelete === entry.id ? <div className="delete-confirm"><span>Delete this session permanently?</span><button disabled={deleting === entry.id} onClick={() => void remove(entry.id)}>{deleting === entry.id ? "Deleting…" : "Delete"}</button><button onClick={() => setConfirmDelete(null)}>Keep session</button></div> : <button className="delete-workout" onClick={() => setConfirmDelete(entry.id)}>Delete session</button>}</div></details>)}
        </section>
      </>}
      <footer className="training-footer"><span>AURA FIT · Built for your next rep.</span><div><Link href="/">AI coach</Link><Link href="/privacy">Privacy</Link><a href="https://github.com/krutharth-dev/aura-fit-ai" target="_blank" rel="noreferrer">Source code ↗</a></div></footer>
    </div>
  </main>;
}
