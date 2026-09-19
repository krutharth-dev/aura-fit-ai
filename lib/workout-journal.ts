export type ExerciseEntry = { name: string; sets: number; reps: number; weight: number };
export type WorkoutInput = { title: string; date: string; minutes: number; notes: string; exercises: ExerciseEntry[] };
export type WorkoutEntry = WorkoutInput & { id: string };
export function validateWorkout(value: unknown): { entry?: WorkoutInput; error?: string } {
  if (!value || typeof value !== "object") return { error: "Enter a workout" };
  const v = value as Record<string, unknown>;
  if (typeof v.title !== "string" || !v.title.trim() || v.title.length > 100) return { error: "Use a workout name of 1–100 characters" };
  if (typeof v.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v.date) || !Number.isFinite(Date.parse(v.date)) || new Date(v.date).toISOString().slice(0, 10) !== v.date) return { error: "Choose a valid date" };
  if (!Number.isInteger(v.minutes) || Number(v.minutes) < 1 || Number(v.minutes) > 600) return { error: "Duration must be 1–600 minutes" };
  if (typeof v.notes !== "string" || v.notes.length > 1000) return { error: "Notes must be under 1,000 characters" };
  if (!Array.isArray(v.exercises) || v.exercises.length < 1 || v.exercises.length > 20) return { error: "Add 1–20 exercises" };
  for (const e of v.exercises) {
    if (!e || typeof e.name !== "string" || !e.name.trim() || e.name.length > 100 || !Number.isInteger(e.sets) || e.sets < 1 || e.sets > 30 || !Number.isInteger(e.reps) || e.reps < 1 || e.reps > 200 || typeof e.weight !== "number" || !Number.isFinite(e.weight) || e.weight < 0 || e.weight > 1000) return { error: "Check exercise names, sets (1–30), reps (1–200) and weight (0–1,000 kg)" };
  }
  return { entry: { title: v.title.trim(), date: v.date, minutes: Number(v.minutes), notes: v.notes.trim(), exercises: v.exercises.map(e => ({ name: e.name.trim(), sets: e.sets, reps: e.reps, weight: e.weight })) } };
}
