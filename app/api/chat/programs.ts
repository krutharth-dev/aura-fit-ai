type Goal = "muscle" | "strength" | "fitness" | "fat-loss";
type Experience = "beginner" | "intermediate" | "advanced";
type Equipment = "gym" | "home" | "bodyweight";

type Profile = {
  goal: Goal;
  experience: Experience;
  days: number;
  minutes: number;
  equipment: Equipment;
};

type Session = { title: string; patterns: string[] };

const SCHEDULES: Record<number, Session[]> = {
  2: [
    { title: "FULL BODY A", patterns: ["squat", "horizontal push", "horizontal pull", "hinge", "core", "calves"] },
    { title: "FULL BODY B", patterns: ["hinge", "vertical push", "vertical pull", "single-leg", "arms", "core"] },
  ],
  3: [
    { title: "FULL BODY A", patterns: ["squat", "horizontal push", "horizontal pull", "hinge", "lateral raise", "core"] },
    { title: "FULL BODY B", patterns: ["hinge", "vertical push", "vertical pull", "single-leg", "arms", "calves"] },
    { title: "FULL BODY C", patterns: ["squat", "incline push", "horizontal pull", "leg curl", "lateral raise", "core"] },
  ],
  4: [
    { title: "UPPER A", patterns: ["horizontal push", "horizontal pull", "incline push", "vertical pull", "lateral raise", "triceps"] },
    { title: "LOWER A", patterns: ["squat", "hinge", "single-leg", "leg curl", "calves", "core"] },
    { title: "UPPER B", patterns: ["vertical push", "vertical pull", "horizontal pull", "horizontal push", "rear delts", "biceps"] },
    { title: "LOWER B", patterns: ["hinge", "squat", "single-leg", "leg curl", "calves", "core"] },
  ],
  5: [
    { title: "PUSH", patterns: ["horizontal push", "incline push", "vertical push", "lateral raise", "triceps", "core"] },
    { title: "PULL", patterns: ["vertical pull", "horizontal pull", "hinge", "rear delts", "biceps", "core"] },
    { title: "LEGS", patterns: ["squat", "hinge", "single-leg", "leg curl", "calves", "core"] },
    { title: "UPPER", patterns: ["vertical push", "horizontal pull", "incline push", "vertical pull", "lateral raise", "arms"] },
    { title: "LOWER", patterns: ["hinge", "squat", "single-leg", "leg curl", "calves", "core"] },
  ],
  6: [
    { title: "PUSH A", patterns: ["horizontal push", "incline push", "vertical push", "lateral raise", "triceps", "core"] },
    { title: "PULL A", patterns: ["vertical pull", "horizontal pull", "hinge", "rear delts", "biceps", "core"] },
    { title: "LEGS A", patterns: ["squat", "hinge", "single-leg", "leg curl", "calves", "core"] },
    { title: "PUSH B", patterns: ["vertical push", "incline push", "horizontal push", "lateral raise", "triceps", "core"] },
    { title: "PULL B", patterns: ["horizontal pull", "vertical pull", "hinge", "rear delts", "biceps", "core"] },
    { title: "LEGS B", patterns: ["hinge", "squat", "single-leg", "leg curl", "calves", "core"] },
  ],
};

const MOVEMENTS: Record<Equipment, Record<string, string>> = {
  gym: {
    squat: "Back squat", hinge: "Romanian deadlift", "single-leg": "Bulgarian split squat",
    "leg curl": "Seated leg curl", "horizontal push": "Bench press", "incline push": "Incline dumbbell press",
    "vertical push": "Dumbbell shoulder press", "horizontal pull": "Chest-supported row", "vertical pull": "Lat pulldown",
    "lateral raise": "Cable lateral raise", "rear delts": "Reverse cable fly", biceps: "Cable curl",
    triceps: "Cable pressdown", arms: "Cable curl + pressdown", calves: "Standing calf raise",
    core: "Cable crunch",
  },
  home: {
    squat: "Goblet squat", hinge: "Dumbbell Romanian deadlift", "single-leg": "Rear-foot-elevated split squat",
    "leg curl": "Slider leg curl", "horizontal push": "Dumbbell floor press", "incline push": "Feet-elevated push-up",
    "vertical push": "Dumbbell shoulder press", "horizontal pull": "One-arm dumbbell row", "vertical pull": "Dumbbell pullover",
    "lateral raise": "Dumbbell lateral raise", "rear delts": "Bent-over reverse fly", biceps: "Dumbbell curl",
    triceps: "Overhead dumbbell extension", arms: "Hammer curl + overhead extension", calves: "Single-leg calf raise",
    core: "Dead bug",
  },
  bodyweight: {
    squat: "Tempo squat", hinge: "Single-leg hip hinge", "single-leg": "Reverse lunge",
    "leg curl": "Slider leg curl", "horizontal push": "Push-up", "incline push": "Feet-elevated push-up",
    "vertical push": "Pike push-up", "horizontal pull": "Table row or towel row", "vertical pull": "Assisted pull-up",
    "lateral raise": "Wall slide", "rear delts": "Prone reverse fly", biceps: "Towel curl isometric",
    triceps: "Close-grip push-up", arms: "Towel curl + close-grip push-up", calves: "Single-leg calf raise",
    core: "Dead bug",
  },
};

function parseProfile(message: string): { profile?: Profile; missing?: string[]; limited?: boolean } {
  const text = message.toLowerCase();
  const goal: Goal | undefined = /muscle|hypertrophy|gain/.test(text) ? "muscle"
    : /strength|power/.test(text) ? "strength"
      : /fat.?loss|lose weight/.test(text) ? "fat-loss"
        : /fitness|endurance|health/.test(text) ? "fitness" : undefined;
  const experience: Experience | undefined = /beginner|novice|new to/.test(text) ? "beginner"
    : /intermediate/.test(text) ? "intermediate"
      : /advanced/.test(text) ? "advanced" : undefined;
  const wordDays: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6 };
  const dayMatch = text.match(/\b([2-6])\s*(?:-| )?days?\b/);
  const wordDay = Object.entries(wordDays).find(([word]) => new RegExp(`\\b${word}[- ]day`).test(text))?.[1];
  const days = Number(dayMatch?.[1] ?? wordDay ?? 0);
  const minutes = Number(text.match(/\b(\d{2,3})\s*(?:-| )?(?:minutes?|mins?)\b/)?.[1] ?? 0);
  const equipment: Equipment | undefined = /bodyweight|no equipment/.test(text) ? "bodyweight"
    : /home|dumbbell/.test(text) ? "home"
      : /full gym|gym access|barbell|machine/.test(text) ? "gym" : undefined;
  const limitationSpecified = /\bnone\b|pain[- ]free|no (?:pain|injur(?:y|ies)|limitations?|restrictions?)|pain|injur|limitation|restriction|recent surgery|pregnan/.test(text);
  const reportsLimitation = /pain|injur|limitation|restriction|recent surgery|pregnan/.test(text)
    && !/pain[- ]free|no (?:pain|injur(?:y|ies)|limitations?|restrictions?)/.test(text);
  const missing = [
    !goal && "main goal",
    !experience && "experience level",
    !days && "2–6 training days",
    !(minutes >= 20 && minutes <= 180) && "20–180 minutes per session",
    !equipment && "available equipment",
    !limitationSpecified && "pain, injuries or limitations (say “none” if applicable)",
  ].filter((value): value is string => Boolean(value));
  if (missing.length) return { missing };
  if (reportsLimitation) return { limited: true };
  return { profile: { goal: goal!, experience: experience!, days, minutes, equipment: equipment! } };
}

function prescription(profile: Profile, pattern: string) {
  const compound = /squat|hinge|push|pull|single-leg/.test(pattern);
  if (profile.goal === "strength" && compound) return profile.experience === "beginner" ? "3 × 5–8" : "4 × 4–6";
  if (profile.goal === "muscle") return compound ? "3 × 6–10" : "3 × 10–15";
  return compound ? "3 × 8–12" : "2–3 × 12–15";
}

function goalLabel(goal: Goal) {
  return goal === "muscle" ? "MUSCLE-BUILDING" : goal === "fat-loss" ? "FAT-LOSS SUPPORT" : goal.toUpperCase();
}

export function programAnswer(message: string) {
  const parsed = parseProfile(message);
  if (parsed.missing) {
    return `I can personalise that, but I still need: ${parsed.missing.join(", ")}.\n\nSend everything in one line, for example: “Muscle gain, intermediate, 4 days, 60 minutes, full gym, no limitations.”`;
  }
  if (parsed.limited) {
    return "I won’t guess how to program around a reported injury, pain, pregnancy, recent surgery or other limitation. Please use restrictions provided by an appropriate clinician or qualified in-person coach, then send those exact restrictions and I can help structure a compatible plan.";
  }
  const profile = parsed.profile!;
  const exerciseLimit = profile.minutes < 45 ? 4 : profile.minutes < 70 ? 5 : 6;
  const days = SCHEDULES[profile.days].map((session, dayIndex) => {
    const exercises = session.patterns.slice(0, exerciseLimit).map((pattern, index) =>
      `${index + 1}. ${MOVEMENTS[profile.equipment][pattern]} — ${prescription(profile, pattern)}`,
    );
    return `DAY ${dayIndex + 1} — ${session.title}\n${exercises.join("\n")}`;
  });
  const recovery = profile.days >= 5
    ? "Place at least one rest day after every 2–3 consecutive sessions."
    : "Keep at least one recovery day between repeated full-body or lower-body sessions.";
  return `YOUR ${profile.days}-DAY ${goalLabel(profile.goal)} PLAN\n\nPROFILE — ${profile.experience} · ${profile.minutes} minutes · ${profile.equipment} · no limitations reported\n\n${days.join("\n\n")}\n\nEFFORT — Keep most working sets around 2 reps in reserve. ${recovery}\n\nPROGRESSION — Add reps within the range first. When every set reaches the top with stable technique, add the smallest practical load.`;
}

export function programTrace(message: string) {
  const parsed = parseProfile(message);
  if (parsed.missing) return ["Selected program route", `Requested ${parsed.missing.length} missing profile detail(s)`];
  if (parsed.limited) return ["Selected program route", "Detected a reported limitation", "Stopped before unsafe plan generation"];
  return ["Selected program route", `Validated ${parsed.profile!.days} sessions`, `Applied ${parsed.profile!.equipment} equipment constraints`, `Fitted exercises to ${parsed.profile!.minutes} minutes`];
}
