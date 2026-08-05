import {
  bodyPartWorkoutAnswer,
  commonGymAnswer,
  isBodyPartWorkoutTurn,
  type ChatHistoryItem,
} from "./workouts";

const FITNESS_CONTEXT = `
AURA FIT is an educational AI training coach. It helps users build gym programs,
understand exercise technique, plan progression, estimate training numbers and
think through recovery. A good plan considers goal, experience level, available
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
  if (/1\s*rm|one.rep.max|calculate|estimate|max from|\d+\s*(?:kg|lb|lbs)?\s*(?:x|for)\s*\d+|plate math|percentage/.test(text)) return "calculator";
  if (/plan|program|routine|split|workout schedule|days? (?:a|per) week|muscle building|hypertrophy program|strength program/.test(text)) return "program";
  if (/pain|injur|sore|soreness|recover|recovery|rest day|sleep|fatigue|deload|ache|faint|chest pain|breath/.test(text)) return "recovery";
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

function missingPlanDetails(text: string) {
  const hasDays = /[2-6][ -]?days?|twice|three|four|five|six/.test(text);
  const hasGoal = /muscle|hypertrophy|strength|fat loss|fitness|power|endurance/.test(text);
  const hasExperience = /beginner|novice|intermediate|advanced|new to/.test(text);
  const hasEquipment = /gym|home|dumbbell|barbell|machine|bodyweight|equipment/.test(text);
  return !(hasDays && hasGoal && hasExperience && hasEquipment);
}

function programAnswer(message: string) {
  const text = message.toLowerCase();
  if (missingPlanDetails(text)) {
    return "I can build that properly. Send me these six details in one message:\n\n1. Main goal — muscle, strength, fat loss or general fitness\n2. Experience — beginner, intermediate or advanced\n3. Training days per week\n4. Minutes available per session\n5. Equipment — full gym, home gym or bodyweight\n6. Any pain, injuries or exercise limitations\n\nExample: “Muscle gain, intermediate, 4 days, 60 minutes, full gym, no limitations.”";
  }

  const days = Number(text.match(/([2-6])[ -]?days?/)?.[1] ?? (text.includes("four") ? 4 : text.includes("three") ? 3 : 4));
  if (days === 3) {
    return "Your 3-day full-body program\n\nDAY 1 — Squat 3×5–8 · Bench press 3×6–10 · Chest-supported row 3×8–12 · Romanian deadlift 2×8–10 · Cable lateral raise 2×12–20\n\nDAY 2 — Deadlift 2×4–6 · Overhead press 3×6–10 · Lat pulldown 3×8–12 · Split squat 3×8–12/leg · Cable curl + triceps pressdown 2×10–15\n\nDAY 3 — Leg press 3×8–12 · Incline dumbbell press 3×8–12 · Seated cable row 3×8–12 · Leg curl 3×10–15 · Calf raise 3×10–15\n\nStart around 2–3 reps in reserve. When every set reaches the top of its range with clean technique, add the smallest practical load next time.";
  }

  if (days >= 5) {
    return "Your 5-day hypertrophy split\n\nDAY 1 PUSH — Bench press 3×6–8 · Incline dumbbell press 3×8–12 · Cable fly 2×12–15 · Lateral raise 3×12–20 · Triceps pressdown 3×10–15\n\nDAY 2 PULL — Romanian deadlift 3×6–10 · Pull-up/pulldown 3×6–10 · Chest-supported row 3×8–12 · Rear-delt fly 3×12–20 · Curl 3×10–15\n\nDAY 3 LEGS — Squat 3×5–8 · Leg press 3×10–15 · Leg curl 3×10–15 · Calf raise 4×8–15\n\nDAY 4 UPPER — Overhead press 3×6–10 · Cable row 3×8–12 · Incline press 3×8–12 · Pulldown 3×8–12 · Arms 2×10–15 each\n\nDAY 5 LOWER — Deadlift 2×3–5 · Front squat 3×6–10 · Split squat 3×8–12/leg · Leg curl 2×10–15 · Calves 3×10–15\n\nKeep most work at 1–3 reps in reserve and schedule a rest day whenever performance or recovery starts falling.";
  }

  return "Your 4-day upper/lower program\n\nDAY 1 UPPER — Bench press 3×6–8 · Chest-supported row 3×8–12 · Incline dumbbell press 3×8–12 · Lat pulldown 3×8–12 · Lateral raise 3×12–20 · Triceps pressdown 2×10–15\n\nDAY 2 LOWER — Back squat 3×5–8 · Romanian deadlift 3×6–10 · Leg press 3×10–15 · Leg curl 3×10–15 · Calf raise 3×10–15\n\nDAY 3 UPPER — Overhead press 3×6–10 · Pull-up/pulldown 3×6–10 · Cable row 3×8–12 · Machine chest press 3×8–12 · Rear-delt fly 3×12–20 · Curl 2×10–15\n\nDAY 4 LOWER — Deadlift 2×3–5 · Front squat 3×6–10 · Split squat 3×8–12/leg · Leg curl 2×10–15 · Calf raise 3×10–15\n\nUse 5–8 minutes of general warm-up plus 2–4 ramp-up sets for the first lift. Start with 2–3 reps in reserve; add reps within the range, then add a small load.";
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

function demoAnswer(message: string, route: string) {
  if (route === "calculator") {
    return trainingCalculation(message) ?? "For a 1RM estimate, use a format like “100 kg × 5 reps”. I can also handle ordinary arithmetic such as “20 * 2.5”.";
  }
  if (route === "program") return programAnswer(message);
  if (route === "exercise") return exerciseAnswer(message);
  if (route === "recovery") return recoveryAnswer(message);
  return "I can help you build a complete program, understand an exercise, plan progression, estimate a 1RM, or think through recovery. For the best starting point, tell me your goal, experience, training days, session length, equipment and any limitations.";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { message?: string; history?: ChatHistoryItem[] };
    const message = body.message?.trim();
    if (!message) return Response.json({ error: "Message is required" }, { status: 400 });

    const suppliedHistory = (body.history ?? [])
      .filter((item) => item.role === "user" || item.role === "assistant")
      .slice(-8);
    const lastHistoryItem = suppliedHistory.at(-1);
    const history = lastHistoryItem?.role === "user" && lastHistoryItem.content.trim() === message
      ? suppliedHistory
      : [...suppliedHistory, { role: "user" as const, content: message }].slice(-8);

    if (isBodyPartWorkoutTurn(message, history)) {
      return Response.json({
        answer: bodyPartWorkoutAnswer(message, history),
        route: "program",
        source: "AURA FIT body-part workout engine · Session memory",
      });
    }

    const gymAnswer = commonGymAnswer(message);
    if (gymAnswer) {
      return Response.json({
        answer: gymAnswer,
        route: "general",
        source: "AURA FIT gym fundamentals library",
      });
    }

    const route = chooseRoute(message);
    const agentBackendUrl = process.env.AGENT_BACKEND_URL;
    const apiKey = process.env.GROQ_API_KEY;

    if (route === "calculator") {
      const answer = trainingCalculation(message);
      if (answer) return Response.json({ answer, route, source: "Deterministic training calculator" });
    }

    if (agentBackendUrl) {
      try {
        const agentResponse = await fetch(`${agentBackendUrl.replace(/\/$/, "")}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            history,
            thread_id: "aura-fit-web-session",
          }),
        });
        if (agentResponse.ok) return Response.json(await agentResponse.json());
      } catch {
        // Continue to direct Groq or the deterministic demo-safe route.
      }
    }

    if (!apiKey) {
      return Response.json({
        answer: demoAnswer(message, route),
        route,
        source: route === "exercise" ? "Local exercise library · Demo-safe mode" : "AURA FIT coach engine · Demo-safe mode",
      });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0.3,
        max_completion_tokens: 1000,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
      }),
    });

    if (!response.ok) {
      return Response.json({ answer: demoAnswer(message, route), route, source: "AURA FIT coach engine · API fallback" });
    }
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return Response.json({
      answer: data.choices?.[0]?.message?.content ?? demoAnswer(message, route),
      route,
      source: route === "exercise" ? "Groq · Exercise context" : "Groq · Fitness coach route",
    });
  } catch {
    return Response.json({ error: "Unable to process this request" }, { status: 500 });
  }
}
