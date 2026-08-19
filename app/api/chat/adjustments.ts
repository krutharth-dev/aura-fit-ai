import type { ChatHistoryItem } from "./workouts";

const REPLACEMENTS: Record<string, string> = {
  "back squat": "Goblet squat",
  "bench press": "Dumbbell floor press",
  "romanian deadlift": "Hip thrust",
  deadlift: "Dumbbell Romanian deadlift",
  "lat pulldown": "Assisted pull-up",
  "chest-supported row": "One-arm dumbbell row",
};

function recentPlan(history: ChatHistoryItem[]) {
  return [...history].reverse().find((item) => item.role === "assistant" && /^YOUR \d-DAY/m.test(item.content))?.content ?? null;
}

export function isPlanAdjustment(message: string, history: ChatHistoryItem[]) {
  return Boolean(recentPlan(history)) && /\b(?:adjust|change|modify|update|make (?:it|this|that)|replace|remove|swap|add (?:running|cardio|conditioning)|beginner[- ]friendly|shorter|longer)\b/i.test(message);
}

export function adjustPlanAnswer(message: string, history: ChatHistoryItem[]) {
  const original = recentPlan(history);
  if (!original) return null;
  const text = message.toLowerCase();
  let plan = original;
  const changes: string[] = [];
  const minutes = Number(text.match(/\b(20|25|30|35|40|45|50|60|75|90|120)\s*(?:minutes?|mins?)\b/)?.[1] ?? 0);
  if (minutes) {
    plan = plan.replace(/PROFILE — ([^·]+) · \d+ minutes/, `PROFILE — $1 · ${minutes} minutes`);
    if (minutes <= 35) plan = plan.split("\n\n").map((block) => /^DAY \d/.test(block) ? block.split("\n").slice(0, 5).join("\n") : block).join("\n\n");
    changes.push(`fitted sessions to ${minutes} minutes`);
  }
  const explicitSwap = text.match(/(?:replace|swap)\s+(.+?)\s+(?:with|for)\s+(.+?)(?:,|\.| and |$)/i);
  if (explicitSwap) {
    const from = explicitSwap[1].trim();
    const to = explicitSwap[2].trim();
    plan = plan.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), to);
    changes.push(`replaced ${from} with ${to}`);
  } else {
    const requested = Object.keys(REPLACEMENTS).find((exercise) => text.includes(exercise) && /replace|remove|swap|instead/.test(text));
    if (requested) {
      plan = plan.replace(new RegExp(requested, "gi"), REPLACEMENTS[requested]);
      changes.push(`replaced ${requested} with ${REPLACEMENTS[requested]}`);
    }
  }
  if (/beginner[- ]friendly|make (?:it|this|that).*beginner|easier/.test(text)) {
    plan = plan.replace(/\b4 × 4–6\b/g, "3 × 5–8").replace(/\b3 × 6–10\b/g, "2–3 × 8–12");
    plan = plan.replace(/EFFORT —[^\n]*/, "EFFORT — Keep every working set around 3 reps in reserve while learning the movements.");
    changes.push("reduced fatigue and increased technique margin for a beginner");
  }
  if (/add (?:running|cardio|conditioning)|run(?:ning)? twice|2 (?:runs|cardio)/.test(text)) {
    plan += "\n\nCONDITIONING — Add two sessions: one 20–30 minute easy conversational-pace session after an upper-body day, and one separate short interval or steady session away from heavy lower-body training. Begin conservatively and keep it only while strength performance and recovery remain stable.";
    changes.push("added two compatible conditioning sessions");
  }
  if (!changes.length) return "I found your latest saved plan. Tell me the exact change—for example, “make it 30 minutes,” “replace Romanian deadlifts with hip thrusts,” “make it beginner-friendly,” or “add running twice weekly.”";
  return `UPDATED PLAN\n\nCHANGES — ${changes.join("; ")}\n\n${plan}`;
}
