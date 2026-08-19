import {
  bodyPartWorkoutAnswer,
  commonGymAnswer,
  isBodyPartWorkoutTurn,
  type ChatHistoryItem,
} from "./workouts";
import { programAnswer as deterministicProgramAnswer, programTrace } from "./programs";
import { healthAnswer, isUrgentHealthQuestion, nutritionAnswer } from "./wellness";
import { trainingAnswer } from "./training";
import {
  consumeRateLimit,
  historyDatabase,
  historyIdentity,
  historyJson,
  loadFitnessProfile,
  rateLimitKey,
  recordOperationalError,
  recordUsageEvent,
  saveExchange,
} from "../../../db/history";
import { fitnessProfileContext, type FitnessProfile } from "../../../lib/fitness-profile";

type ChatRequest = { message?: unknown; history?: unknown; thread_id?: unknown; conversation_id?: unknown };
type CoachPayload = { answer: string; route: string; source: string; trace?: string[] };

const MAX_REQUEST_BYTES = 48_000;
const MAX_MESSAGE_LENGTH = 2_000;
const MAX_HISTORY_LENGTH = 10;
const MAX_HISTORY_ITEM_LENGTH = 4_000;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 30;
const MAX_LOCAL_BUCKETS = 500;
const requestBuckets = new Map<string, { count: number; resetAt: number }>();

const FITNESS_CONTEXT = `
AURA FIT is an educational AI fitness and wellness coach. It helps users build gym programs,
understand exercise technique, plan progression, estimate training numbers,
think through recovery, use evidence-aware sports nutrition and understand health questions related to training. A good plan considers goal, experience level, available
days, session duration, equipment and injuries or limitations.

General programming principles:
- Beginners usually benefit from practising major movement patterns 2–3 times per week.
- Most working sets should stop with roughly 1–3 good repetitions in reserve.
- Progress by adding a repetition first, then a small amount of load after all sets reach the top of the range with stable technique.
- Include squat/knee-dominant, hinge, push, pull and trunk work across the week.
- Warm-up sets prepare the exact movement; they should not create fatigue.
- Sleep, adequate nutrition and sensible weekly volume support recovery.

Safety boundaries:
- Do not diagnose injuries, prescribe rehabilitation or encourage training through sharp, severe or worsening pain.
- Chest pain, fainting, severe breathing difficulty, new weakness/numbness or a major acute injury needs prompt medical assessment.
- For pregnancy, significant medical conditions, recent surgery or persistent pain, advise professional clearance and individual care.
- Nutrition guidance may be personalised to goals and stated preferences, but never invent medical dietary restrictions or replace an accredited dietitian.
- Explain health and injury topics, warning signs and next steps without claiming a diagnosis, prescribing medication or creating post-operative rehabilitation.
`;

const SYSTEM_PROMPT = `You are AURA FIT, a concise, supportive AI training coach.
Give practical, structured fitness guidance without pretending to diagnose or
replace a qualified clinician or in-person coach. For a personalised program,
use the user's goal, experience, days per week, session length, equipment and
limitations; ask for missing essentials before claiming a plan is personalised.
Prefer exercise tables expressed as clear lines with sets, reps and effort.
Explain technique with setup, execution, common error and regression. Never
encourage training through sharp or worsening pain.\n\n${FITNESS_CONTEXT}`;

function chooseRoute(message: string) {
  const text = message.toLowerCase();
  if (/diet|nutrition|protein|calorie|macro|meal|food|hydration|electrolyte|supplement|creatine|caffeine|vitamin|weight loss|fat loss|bulk/.test(text)) return "nutrition";
  if (/1\s*rm|one.rep.max|calculate|estimate|max from|\d+\s*(?:kg|lb|lbs)?\s*(?:x|for)\s*\d+|plate math|percentage/.test(text)) return "calculator";
  if (/plan|program|routine|split|workout schedule|days? (?:a|per) week|muscle building|hypertrophy program|strength program/.test(text)) return "program";
  if (/symptom|medical|health|diagnos|doctor|physio|fracture|sprain|strain|tendon|ligament|joint|swelling|injur|pain/.test(text)) return "health";
  if (/sore|soreness|recover|recovery|rest day|sleep|fatigue|deload|ache/.test(text)) return "recovery";
  if (/workout|training|gym|cardio|running|cycling|conditioning|calisthenic|bodyweight|mobility|warm.?up|flexibility|plateau|stuck|progress|volume|frequency|sets|reps|rpe|rir|failure|substitut|alternative|replace|hotel|travel/.test(text)) return "training";
  if (/form|technique|how (?:do|to)|exercise|squat|bench|deadlift|row|pulldown|press|curl|lunge|hinge|pull.?up/.test(text)) return "exercise";
  return "general";
}

function safeCalculate(message: string) {
  const candidate = message.match(/[\d\s()+\-*/.]+/g)?.sort((a, b) => b.length - a.length)[0]?.trim();
  if (!candidate || !/^[\d\s()+\-*/.]+$/.test(candidate)) return null;
  try {
    const tokens = candidate.match(/\d+(?:\.\d+)?|[()+\-*/]/g) ?? [];
    if (tokens.join("") !== candidate.replace(/\s/g, "")) return null;
    let position = 0;

    function factor(): number {
      const token = tokens[position++];
      if (token === "+") return factor();
      if (token === "-") return -factor();
      if (token === "(") {
        const value = expression();
        if (tokens[position++] !== ")") throw new Error("Missing parenthesis");
        return value;
      }
      const value = Number(token);
      if (!Number.isFinite(value)) throw new Error("Invalid number");
      return value;
    }

    function term(): number {
      let value = factor();
      while (tokens[position] === "*" || tokens[position] === "/") {
        const operator = tokens[position++];
        const right = factor();
        value = operator === "*" ? value * right : value / right;
      }
      return value;
    }

    function expression(): number {
      let value = term();
      while (tokens[position] === "+" || tokens[position] === "-") {
        const operator = tokens[position++];
        const right = term();
        value = operator === "+" ? value + right : value - right;
      }
      return value;
    }

    const result = expression();
    if (position !== tokens.length) return null;
    return Number.isFinite(result) ? `${candidate} = ${Number(result.toFixed(2))}` : null;
  } catch {
    return null;
  }
}

function trainingCalculation(message: string) {
  const oneRm = message.match(/(\d+(?:\.\d+)?)\s*(kg|lb|lbs)?\s*(?:x|for)\s*(\d+)\s*(?:reps?)?/i);
  if (oneRm) {
    const weight = Number(oneRm[1]);
    const unit = oneRm[2]?.toLowerCase() ?? "kg";
    const reps = Number(oneRm[3]);
    if (reps >= 1 && reps <= 12 && weight > 0) {
      const epley = weight * (1 + reps / 30);
      const brzycki = weight * (36 / (37 - reps));
      const estimate = Math.round((epley + brzycki) / 2);
      return `Estimated 1RM: about ${estimate} ${unit}\n\nBased on ${weight} ${unit} × ${reps} reps using the average of two common prediction formulas. Treat this as a programming estimate—not a reason to attempt a true max without appropriate experience and safety setup.`;
    }
  }
  const arithmetic = safeCalculate(message);
  return arithmetic ? `Training calculation:\n\n${arithmetic}` : null;
}

function exerciseAnswer(message: string) {
  const text = message.toLowerCase();
  if (text.includes("squat")) {
    return "Squat form checklist\n\nSETUP — Feet around shoulder width, whole foot planted, brace your trunk before descending.\n\nDESCENT — Let knees and hips bend together. Keep knees tracking in the same direction as your toes and maintain pressure through heel, big toe and little toe.\n\nASCENT — Drive the floor away and keep chest and hips rising together. Use the deepest range you can control without pain or losing position.\n\nCOMMON ERRORS — Heels lifting, knees collapsing inward, relaxing at the bottom, or adding load faster than control improves.\n\nREGRESSION — Try a goblet squat to a comfortable target. If you have sharp or worsening pain, stop and get it assessed rather than forcing the movement.";
  }
  if (text.includes("bench")) {
    return "Bench press form checklist\n\nSETUP — Eyes under the bar, shoulder blades gently back and down, feet planted, wrists stacked over forearms.\n\nREP — Lower under control toward the lower chest, keep elbows in a comfortable diagonal rather than flared straight out, then press up and slightly back.\n\nCOMMON ERRORS — Loose upper back, bouncing the bar, wrists folded back or using a load that changes the bar path.\n\nSAFETY — Use safeties or a competent spotter for challenging sets. Stop if the movement produces sharp shoulder or chest pain.";
  }
  if (text.includes("deadlift")) {
    return "Deadlift form checklist\n\nSETUP — Mid-foot under the bar, hinge to grip it, bring shins close, brace, and pull the slack from the bar before lifting.\n\nREP — Push the floor away while keeping the bar close. Finish tall without leaning back, then hinge to return the bar.\n\nCOMMON ERRORS — Jerking from a loose start, letting the bar drift forward, turning the lift into a squat, or chasing load after position breaks down.\n\nREGRESSION — Practise a kettlebell deadlift or raised-block deadlift while learning the hinge.";
  }
  return "For a useful form check, tell me the exact exercise and what feels difficult. I’ll break it into setup, movement cues, common errors and an easier regression. A video-reviewed in-person coach is still best when technique or pain cannot be judged from text.";
}

function recoveryAnswer(message: string) {
  const text = message.toLowerCase();
  if (/chest pain|faint|severe.*breath|new.*numb|new.*weak|major.*injur/.test(text)) {
    return "Stop training and contact your local emergency service now. Chest pain, fainting during exercise, severe breathing difficulty, new weakness or numbness, or a major acute injury should not be managed through an AI workout plan. Do not drive yourself if you may be seriously unwell.";
  }
  if (/sharp|worsening|swelling|cannot bear|can.t bear/.test(text)) {
    return "Do not train through sharp or worsening pain, major swelling, instability, or inability to bear weight. Pause the aggravating exercise and arrange an assessment with an appropriate healthcare professional. I can help modify training after serious causes have been excluded, but I can’t diagnose the injury here.";
  }
  return "Normal muscle soreness is usually diffuse, tender and improves as you warm up; injury-type pain is more likely sharp, localised, worsening or associated with swelling, weakness or altered movement.\n\nFor today: assess whether your warm-up restores normal movement and performance. If soreness is mild, train with reduced load or choose another muscle group. If performance is clearly reduced, take another recovery day. Prioritise sleep, adequate food and hydration, and avoid adding extra volume until recovery is consistent.";
}

function demoAnswer(message: string, route: string, profile?: FitnessProfile | null) {
  if (route === "calculator") {
    return trainingCalculation(message) ?? "For a 1RM estimate, use a format like “100 kg × 5 reps”. I can also handle ordinary arithmetic such as “20 * 2.5”.";
  }
  if (route === "program") return deterministicProgramAnswer(message, profile);
  if (route === "exercise") return exerciseAnswer(message);
  if (route === "recovery") return recoveryAnswer(message);
  if (route === "nutrition") return nutritionAnswer(message);
  if (route === "health") return healthAnswer(message);
  if (route === "training") return trainingAnswer(message);
  return profile
    ? `Your saved fitness profile is active, so I’ll automatically use your ${profile.daysPerWeek}-day schedule, ${profile.sessionMinutes}-minute sessions, equipment and training preferences. Ask me to build a program, plan today’s workout, explain an exercise, calculate training numbers or review recovery.`
    : "I can help you build a complete program, understand an exercise, plan progression, estimate a 1RM, or think through recovery. For the best starting point, tell me your goal, experience, training days, session length, equipment and any limitations.";
}

function responseTrace(route: string, finalStep: string) {
  return ["Assessed training request", `Selected ${route} route`, finalStep];
}

function sanitizeHistory(value: unknown): ChatHistoryItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is ChatHistoryItem => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as { role?: unknown; content?: unknown };
      return (candidate.role === "user" || candidate.role === "assistant")
        && typeof candidate.content === "string" && candidate.content.trim().length > 0;
    })
    .map((item) => ({ role: item.role, content: item.content.slice(0, MAX_HISTORY_ITEM_LENGTH) }))
    .slice(-MAX_HISTORY_LENGTH);
}

function requestThreadId(value: unknown) {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{8,100}$/.test(value)
    ? value : `aura-${crypto.randomUUID()}`;
}

function localRateLimit(client: string, now: number) {
  if (requestBuckets.size >= MAX_LOCAL_BUCKETS) {
    for (const [key, bucket] of requestBuckets) if (bucket.resetAt <= now) requestBuckets.delete(key);
    while (requestBuckets.size >= MAX_LOCAL_BUCKETS) {
      const oldest = requestBuckets.keys().next().value as string | undefined;
      if (!oldest) break;
      requestBuckets.delete(oldest);
    }
  }
  const current = requestBuckets.get(client);
  if (!current || current.resetAt <= now) {
    requestBuckets.delete(client);
    requestBuckets.set(client, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { limited: false, retryAfterSeconds: 60 };
  }
  current.count += 1;
  return { limited: current.count > RATE_LIMIT, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1_000)) };
}

async function rateLimitState(request: Request) {
  const now = Date.now();
  const client = request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  try {
    const db = await historyDatabase();
    if (db) return await consumeRateLimit(db, await rateLimitKey(client), RATE_LIMIT, RATE_WINDOW_MS);
  } catch {
    // A bounded per-isolate fallback preserves availability if D1 is unavailable.
  }
  return localRateLimit(client, now);
}

function isSafetyCritical(message: string) {
  return isUrgentHealthQuestion(message) || /sharp|worsening|major swelling|cannot bear|can.t bear/i.test(message);
}

async function boundedFetch(input: string, init: RequestInit, timeoutMs = 12_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  let requestIdentity: Awaited<ReturnType<typeof historyIdentity>> | null = null;
  try {
    const rateLimit = await rateLimitState(request);
    if (rateLimit.limited) {
      return Response.json({ error: "Too many requests. Please wait a minute and try again." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } });
    }
    const rawBody = await request.text();
    if (rawBody.length > MAX_REQUEST_BYTES) return Response.json({ error: "Request is too large" }, { status: 413 });
    let body: ChatRequest;
    try {
      body = JSON.parse(rawBody) as ChatRequest;
    } catch {
      return Response.json({ error: "Request must contain valid JSON" }, { status: 400 });
    }
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) return Response.json({ error: "Message is required" }, { status: 400 });
    if (message.length > MAX_MESSAGE_LENGTH) {
      return Response.json({ error: `Message must be ${MAX_MESSAGE_LENGTH.toLocaleString("en-US")} characters or fewer` }, { status: 400 });
    }

    const suppliedHistory = sanitizeHistory(body.history);
    const lastHistoryItem = suppliedHistory.at(-1);
    const history = lastHistoryItem?.role === "user" && lastHistoryItem.content.trim() === message
      ? suppliedHistory
      : [...suppliedHistory, { role: "user" as const, content: message }].slice(-MAX_HISTORY_LENGTH);
    const threadId = requestThreadId(body.thread_id);
    const conversationId = typeof body.conversation_id === "string" ? body.conversation_id : null;
    if (conversationId && !/^chat_[a-f0-9-]{36}$/.test(conversationId)) {
      return Response.json({ error: "Invalid conversation" }, { status: 400 });
    }
    const identity = await historyIdentity(request);
    requestIdentity = identity;
    if (conversationId && identity.authType !== "account") {
      return historyJson({ error: "Sign in to save and access conversation history" }, identity, { status: 401 });
    }
    const persistenceDb = conversationId ? await historyDatabase() : null;
    if (conversationId && !persistenceDb) {
      return historyJson({ error: "Conversation storage is unavailable" }, identity, { status: 503 });
    }
    const savedProfile = conversationId && persistenceDb
      ? await loadFitnessProfile(persistenceDb, identity.ownerId)
      : null;
    const savedProfileContext = savedProfile ? fitnessProfileContext(savedProfile) : null;
    const profileAwareMessage = savedProfileContext
      ? `${message}\n\nSaved fitness profile (apply unless the user explicitly overrides a field):\n${savedProfileContext}`
      : message;
    const respond = async (payload: CoachPayload) => {
      const eventDb = persistenceDb ?? await historyDatabase().catch(() => null);
      if (eventDb) {
        await recordUsageEvent(eventDb, {
          eventName: "chat_response",
          route: payload.route,
          authType: identity.authType,
          statusCode: 200,
          durationMs: Date.now() - startedAt,
        }).catch(() => undefined);
      }
      if (!conversationId || !persistenceDb) return historyJson(payload, identity);
      let persisted = false;
      try {
        persisted = await saveExchange(persistenceDb, identity.ownerId, conversationId, message, {
          content: payload.answer, route: payload.route, source: payload.source, trace: payload.trace,
        });
      } catch {
        persisted = false;
        await recordOperationalError(persistenceDb, {
          area: "persistence",
          code: "save_exchange_failed",
          route: payload.route,
          authType: identity.authType,
        }).catch(() => undefined);
      }
      return historyJson({ ...payload, persisted }, identity);
    };

    if (isSafetyCritical(message)) {
      return respond({ answer: healthAnswer(message), route: "recovery", source: "AURA FIT safety guardrail", trace: responseTrace("recovery", "Applied the safety escalation policy") });
    }

    const bodyPartAnswer = isBodyPartWorkoutTurn(message, history)
      ? bodyPartWorkoutAnswer(message, history, savedProfile)
      : null;
    if (bodyPartAnswer) {
      return respond({
        answer: bodyPartAnswer,
        route: "program",
        source: "AURA FIT body-part workout engine · Session memory",
        trace: ["Assessed training request", "Matched guided body-part workout flow", "Read this conversation’s recent turns", ...(savedProfile ? ["Applied saved fitness profile"] : []), "Advanced the workout one step"],
      });
    }

    const gymAnswer = commonGymAnswer(message);
    if (gymAnswer) {
      return respond({
        answer: gymAnswer,
        route: "general",
        source: "AURA FIT gym fundamentals library",
        trace: responseTrace("general", "Matched verified gym fundamentals"),
      });
    }

    const route = chooseRoute(message);
    const agentBackendUrl = process.env.AGENT_BACKEND_URL;
    const apiKey = process.env.GROQ_API_KEY;

    if (route === "calculator") {
      const answer = trainingCalculation(message);
      if (answer) return respond({ answer, route, source: "Deterministic training calculator", trace: responseTrace(route, "Executed repeatable training calculation") });
    }

    if (agentBackendUrl) {
      try {
        const agentResponse = await boundedFetch(`${agentBackendUrl.replace(/\/$/, "")}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: profileAwareMessage,
            history,
            thread_id: threadId,
          }),
        });
        if (agentResponse.ok) return respond(await agentResponse.json() as CoachPayload);
        const eventDb = persistenceDb ?? await historyDatabase().catch(() => null);
        if (eventDb) await recordOperationalError(eventDb, {
          area: "python_backend", code: "upstream_http_error", route, authType: identity.authType,
        }).catch(() => undefined);
      } catch {
        const eventDb = persistenceDb ?? await historyDatabase().catch(() => null);
        if (eventDb) await recordOperationalError(eventDb, {
          area: "python_backend", code: "upstream_unavailable", route, authType: identity.authType,
        }).catch(() => undefined);
      }
    }

    if (!apiKey) {
      return respond({
        answer: demoAnswer(message, route, savedProfile),
        route,
        source: route === "exercise" ? "Local exercise library · Demo-safe mode" : "AURA FIT coach engine · Demo-safe mode",
        trace: route === "program" ? ["Assessed training request", ...programTrace(message, savedProfile), "Returned deterministic demo-safe plan"] : ["Assessed training request", ...(savedProfile ? ["Applied saved fitness profile"] : []), `Selected ${route} route`, "Used deterministic demo-safe coaching"],
      });
    }

    const localProgram = route === "program" ? deterministicProgramAnswer(message, savedProfile) : null;
    if (localProgram && (/^I can personalise/.test(localProgram) || /^I won’t guess/.test(localProgram))) {
      return respond({ answer: localProgram, route, source: "AURA FIT program profile guard", trace: ["Assessed training request", ...programTrace(message, savedProfile)] });
    }

    let response: Response;
    try {
      response = await boundedFetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct",
          temperature: 0.3,
          max_completion_tokens: 1000,
          messages: [{ role: "system", content: `${route === "program" && localProgram ? `${SYSTEM_PROMPT}\n\nUse this validated scaffold exactly; do not change its day count, equipment or session length:\n${localProgram}` : SYSTEM_PROMPT}${savedProfileContext ? `\n\nThe user has saved this fitness profile. Apply it unless their current message explicitly overrides a field:\n${savedProfileContext}` : ""}` }, ...history],
        }),
      });
    } catch {
      const eventDb = persistenceDb ?? await historyDatabase().catch(() => null);
      if (eventDb) await recordOperationalError(eventDb, {
        area: "groq", code: "upstream_unavailable", route, authType: identity.authType,
      }).catch(() => undefined);
      return respond({ answer: demoAnswer(message, route, savedProfile), route, source: "AURA FIT coach engine · API fallback", trace: responseTrace(route, "Used local fallback after upstream error") });
    }

    if (!response.ok) {
      const eventDb = persistenceDb ?? await historyDatabase().catch(() => null);
      if (eventDb) await recordOperationalError(eventDb, {
        area: "groq", code: `upstream_http_${response.status}`, route, authType: identity.authType,
      }).catch(() => undefined);
      return respond({ answer: demoAnswer(message, route, savedProfile), route, source: "AURA FIT coach engine · API fallback", trace: responseTrace(route, "Used local fallback after upstream error") });
    }
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return respond({
      answer: data.choices?.[0]?.message?.content ?? demoAnswer(message, route, savedProfile),
      route,
      source: route === "exercise" ? "Groq · Exercise context" : route === "nutrition" ? "Groq · Sports nutrition route" : route === "health" ? "Groq · Health education route" : "Groq · Fitness coach route",
      trace: responseTrace(route, "Generated a live grounded response"),
    });
  } catch {
    const identity = requestIdentity ?? await historyIdentity(request).catch(() => null);
    const db = await historyDatabase().catch(() => null);
    if (identity && db) await recordOperationalError(db, {
      area: "chat_route", code: "unhandled_request_error", authType: identity.authType,
    }).catch(() => undefined);
    return Response.json({ error: "Unable to process this request" }, { status: 500 });
  }
}
