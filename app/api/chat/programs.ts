import {
  cardioPreferenceLabels,
  priorityMuscleLabels,
  priorityMuscleOptions,
  trainingStyleLabels,
  workoutSplitLabels,
  type CardioPreference,
  type FitnessProfile,
  type PriorityMuscle,
  type TrainingStyle,
  type WorkoutSplit,
} from "../../../lib/fitness-profile";

type Goal = "muscle" | "strength" | "fitness" | "fat-loss";
type Experience = "beginner" | "intermediate" | "advanced";
type Equipment = "gym" | "home" | "bodyweight";

type Profile = {
  goal: Goal;
  experience: Experience;
  days: number;
  minutes: number;
  equipment: Equipment;
  splitPreference: WorkoutSplit;
  trainingStyle: TrainingStyle;
  priorityMuscles: PriorityMuscle[];
  cardioPreference: CardioPreference;
  limitations: string;
  preferredExercises: string;
  dislikedExercises: string;
};

type Session = { title: string; patterns: string[] };

const AUTO_SCHEDULES: Record<number, Session[]> = {
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
    { title: "PULL", patterns: ["vertical pull", "horizontal pull", "back isolation", "rear delts", "biceps", "forearms"] },
    { title: "LEGS", patterns: ["squat", "hinge", "single-leg", "leg curl", "calves", "core"] },
    { title: "UPPER", patterns: ["vertical push", "horizontal pull", "incline push", "vertical pull", "lateral raise", "arms"] },
    { title: "LOWER", patterns: ["hinge", "squat", "single-leg", "leg curl", "calves", "core"] },
  ],
  6: [
    { title: "PUSH A", patterns: ["horizontal push", "incline push", "vertical push", "lateral raise", "triceps", "chest isolation"] },
    { title: "PULL A", patterns: ["vertical pull", "horizontal pull", "back isolation", "rear delts", "biceps", "forearms"] },
    { title: "LEGS A", patterns: ["squat", "hinge", "single-leg", "leg curl", "calves", "core"] },
    { title: "PUSH B", patterns: ["vertical push", "incline push", "horizontal push", "lateral raise", "triceps", "chest isolation"] },
    { title: "PULL B", patterns: ["horizontal pull", "vertical pull", "back isolation", "rear delts", "biceps", "forearms"] },
    { title: "LEGS B", patterns: ["hinge", "squat", "single-leg", "leg curl", "calves", "core"] },
  ],
};

const MOVEMENT_OPTIONS: Record<Equipment, Record<string, string[]>> = {
  gym: {
    squat: ["Back squat", "Hack squat", "Leg press"],
    hinge: ["Romanian deadlift", "45-degree back extension", "Hip thrust"],
    "single-leg": ["Bulgarian split squat", "Walking lunge", "Step-up"],
    "leg curl": ["Seated leg curl", "Lying leg curl"],
    "horizontal push": ["Bench press", "Machine chest press", "Dumbbell bench press"],
    "incline push": ["Incline dumbbell press", "Incline machine press", "Incline barbell press"],
    "chest isolation": ["Cable fly", "Pec-deck fly", "Low-to-high cable fly"],
    "vertical push": ["Dumbbell shoulder press", "Machine shoulder press", "Landmine press"],
    "horizontal pull": ["Chest-supported row", "Seated cable row", "Machine row"],
    "vertical pull": ["Lat pulldown", "Pull-up or assisted pull-up", "Neutral-grip pulldown"],
    "back isolation": ["Straight-arm pulldown", "Cable pullover", "Machine high row"],
    "lateral raise": ["Cable lateral raise", "Dumbbell lateral raise", "Machine lateral raise"],
    "rear delts": ["Reverse cable fly", "Reverse pec-deck", "Face pull"],
    biceps: ["Cable curl", "EZ-bar curl", "Incline dumbbell curl"],
    triceps: ["Cable pressdown", "Overhead cable extension", "Machine dip"],
    arms: ["EZ-bar curl + cable pressdown", "Hammer curl + overhead cable extension"],
    forearms: ["Reverse EZ-bar curl", "Wrist roller", "Farmer carry"],
    calves: ["Standing calf raise", "Seated calf raise", "Leg-press calf raise"],
    core: ["Cable crunch", "Hanging knee raise", "Ab wheel rollout"],
  },
  home: {
    squat: ["Goblet squat", "Heel-elevated goblet squat", "Dumbbell sumo squat"],
    hinge: ["Dumbbell Romanian deadlift", "Dumbbell hip thrust", "Single-leg Romanian deadlift"],
    "single-leg": ["Rear-foot-elevated split squat", "Reverse lunge", "Step-up"],
    "leg curl": ["Slider leg curl", "Glute-bridge walkout"],
    "horizontal push": ["Dumbbell floor press", "Push-up", "Dumbbell squeeze press"],
    "incline push": ["Feet-elevated push-up", "Incline dumbbell press if bench available"],
    "chest isolation": ["Dumbbell floor fly", "Dumbbell squeeze press"],
    "vertical push": ["Dumbbell shoulder press", "Arnold press", "Pike push-up"],
    "horizontal pull": ["One-arm dumbbell row", "Bent-over dumbbell row", "Gorilla row"],
    "vertical pull": ["Dumbbell pullover", "Band pulldown if available"],
    "back isolation": ["Dumbbell pullover", "Rear-delt dumbbell fly"],
    "lateral raise": ["Dumbbell lateral raise", "Lean-away lateral raise"],
    "rear delts": ["Bent-over reverse fly", "Prone reverse fly"],
    biceps: ["Dumbbell curl", "Incline dumbbell curl", "Hammer curl"],
    triceps: ["Overhead dumbbell extension", "Close-grip push-up", "Dumbbell floor skull crusher"],
    arms: ["Hammer curl + overhead extension", "Dumbbell curl + close-grip push-up"],
    forearms: ["Dumbbell reverse curl", "Dumbbell wrist curl", "Suitcase carry"],
    calves: ["Single-leg calf raise", "Dumbbell standing calf raise", "Bent-knee calf raise"],
    core: ["Dead bug", "Reverse crunch", "Suitcase march"],
  },
  bodyweight: {
    squat: ["Tempo squat", "Heel-elevated squat", "Cyclist squat"],
    hinge: ["Single-leg hip hinge", "Glute bridge", "Long-lever glute bridge"],
    "single-leg": ["Reverse lunge", "Split squat", "Step-up"],
    "leg curl": ["Slider leg curl", "Hamstring walkout"],
    "horizontal push": ["Push-up", "Paused push-up", "Close-grip push-up"],
    "incline push": ["Feet-elevated push-up", "Slow-eccentric push-up"],
    "chest isolation": ["Wide push-up", "Push-up squeeze hold"],
    "vertical push": ["Pike push-up", "Elevated pike push-up", "Wall-assisted handstand press progression"],
    "horizontal pull": ["Table row or towel row", "Self-resisted row"],
    "vertical pull": ["Assisted pull-up", "Towel pulldown isometric"],
    "back isolation": ["Prone swimmer", "Reverse snow angel"],
    "lateral raise": ["Wall slide", "Prone Y raise"],
    "rear delts": ["Prone reverse fly", "Prone T raise"],
    biceps: ["Towel curl isometric", "Self-resisted curl"],
    triceps: ["Close-grip push-up", "Bodyweight triceps extension"],
    arms: ["Self-resisted curl + close-grip push-up"],
    forearms: ["Towel wring", "Self-resisted wrist curl", "Forearm squeeze hold"],
    calves: ["Single-leg calf raise", "Bent-knee calf raise", "Tiptoe walk"],
    core: ["Dead bug", "Reverse crunch", "Side plank"],
  },
};

function isNoLimitationText(value: string) {
  return /^(?:none|nil|n\/a|no (?:pain|injur(?:y|ies)|limitations?|restrictions?))\.?$/i.test(value.trim());
}

function requiresMedicalClearance(value: string) {
  return /pregnan|recent surgery|post[- ]?op|fracture|dislocat|non[- ]?weight bearing|no weight bearing|doctor.*(?:avoid|restriction|not train)|chest pain|faint|severe.*breath|new.*(?:numb|weak)|major acute injur/i.test(value);
}

function requestedSplit(text: string): WorkoutSplit | null {
  if (/push\s*[\/-]?\s*pull\s*[\/-]?\s*legs|\bppl\b/.test(text)) return "push_pull_legs";
  if (/upper\s*[\/-]?\s*lower/.test(text)) return "upper_lower";
  if (/full[ -]?body/.test(text)) return "full_body";
  if (/bro[ -]?split|one muscle (?:per|a) day|body[ -]?part split/.test(text)) return "bro_split";
  if (/auto|you choose|best split|choose (?:for|it)/.test(text)) return "auto";
  return null;
}

function requestedStyle(text: string, savedProfile?: FitnessProfile | null): TrainingStyle {
  if (/hypertrophy|bodybuild|size/.test(text)) return "hypertrophy";
  if (/strength focused|powerlifting|pure strength/.test(text)) return "strength";
  if (/athletic|performance|explosive/.test(text)) return "athletic";
  if (/mixed|strength.*size|size.*strength/.test(text)) return "mixed";
  return savedProfile?.trainingStyle ?? "hypertrophy";
}

function requestedPriorities(text: string, savedProfile?: FitnessProfile | null): PriorityMuscle[] {
  if (!/priorit|priority|focus|lagging|bring up|bigger|grow/.test(text)) return savedProfile?.priorityMuscles ?? [];
  const aliases: Record<PriorityMuscle, RegExp> = {
    arms: /\barms?\b|biceps?.*triceps?|triceps?.*biceps?/,
    shoulders: /shoulders?|delts?/,
    chest: /chest|pecs?/,
    back: /\bback\b|lats?/,
    quads: /quads?|quadriceps/,
    hamstrings: /hamstrings?|hams?/,
    glutes: /glutes?|gluteus/,
    calves: /calves|calf/,
    forearms: /forearms?|grip/,
    core: /\bcore\b|abs?|abdominals?/,
  };
  const found = priorityMuscleOptions.filter((muscle) => aliases[muscle].test(text));
  return found.length ? found : savedProfile?.priorityMuscles ?? [];
}

function parseProfile(message: string, savedProfile?: FitnessProfile | null): { profile?: Profile; missing?: string[]; limited?: boolean } {
  const text = message.toLowerCase();
  const goal: Goal | undefined = /muscle|hypertrophy|gain|bodybuild/.test(text) ? "muscle"
    : /strength|powerlift/.test(text) ? "strength"
      : /fat.?loss|lose weight|cutting/.test(text) ? "fat-loss"
        : /fitness|endurance|health/.test(text) ? "fitness"
          : savedProfile ? ({ muscle_gain: "muscle", fat_loss: "fat-loss", strength: "strength", general_fitness: "fitness" } as const)[savedProfile.goal] : undefined;
  const experience: Experience | undefined = /beginner|novice|new to/.test(text) ? "beginner"
    : /intermediate/.test(text) ? "intermediate"
      : /advanced/.test(text) ? "advanced" : savedProfile?.experience;
  const wordDays: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6 };
  const dayMatch = text.match(/\b([2-6])\s*(?:-| )?days?\b/);
  const wordDay = Object.entries(wordDays).find(([word]) => new RegExp(`\\b${word}[- ]day`).test(text))?.[1];
  const days = Number(dayMatch?.[1] ?? wordDay ?? savedProfile?.daysPerWeek ?? 0);
  const minutes = Number(text.match(/\b(\d{2,3})\s*(?:-| )?(?:minutes?|mins?)\b/)?.[1] ?? savedProfile?.sessionMinutes ?? 0);
  const equipment: Equipment | undefined = /bodyweight|no equipment/.test(text) ? "bodyweight"
    : /home|dumbbell/.test(text) ? "home"
      : /full gym|gym access|barbell|machine/.test(text) ? "gym"
        : savedProfile ? ({ full_gym: "gym", home_dumbbells: "home", bodyweight: "bodyweight" } as const)[savedProfile.equipment] : undefined;
  const limitationPattern = /\bnone\b|pain[- ]free|no (?:pain|injur(?:y|ies)|limitations?|restrictions?)|pain|injur|limitation|restriction|recent surgery|pregnan/;
  const explicitLimitation = limitationPattern.test(text);
  const limitationSpecified = explicitLimitation || Boolean(savedProfile);
  const explicitNoLimitation = /\bnone\b|pain[- ]free|no (?:pain|injur(?:y|ies)|limitations?|restrictions?)/.test(text);
  const currentLimitationText = explicitLimitation && !explicitNoLimitation ? message : "";
  const rawSavedLimitationText = savedProfile?.limitations?.trim() ?? "";
  const savedLimitationText = isNoLimitationText(rawSavedLimitationText) ? "" : rawSavedLimitationText;
  const reportsHighRiskLimitation = requiresMedicalClearance(currentLimitationText)
    || (!explicitNoLimitation && requiresMedicalClearance(savedLimitationText));
  const missing = [
    !goal && "main goal",
    !experience && "experience level",
    !days && "2–6 training days",
    !(minutes >= 20 && minutes <= 180) && "20–180 minutes per session",
    !equipment && "available equipment",
    !limitationSpecified && "pain, injuries or limitations (say “none” if applicable)",
  ].filter((value): value is string => Boolean(value));
  if (missing.length) return { missing };
  if (reportsHighRiskLimitation) return { limited: true };

  return { profile: {
    goal: goal!,
    experience: experience!,
    days,
    minutes,
    equipment: equipment!,
    splitPreference: requestedSplit(text) ?? savedProfile?.splitPreference ?? "auto",
    trainingStyle: requestedStyle(text, savedProfile),
    priorityMuscles: requestedPriorities(text, savedProfile),
    cardioPreference: savedProfile?.cardioPreference ?? "none",
    limitations: explicitNoLimitation
      ? ""
      : savedLimitationText || (currentLimitationText ? "Current request mentions pain, injury or a training limitation" : ""),
    preferredExercises: savedProfile?.preferredExercises ?? "",
    dislikedExercises: savedProfile?.dislikedExercises ?? "",
  } };
}

function cloneSchedule(sessions: Session[]) {
  return sessions.map((session) => ({ title: session.title, patterns: [...session.patterns] }));
}

function splitSchedule(split: WorkoutSplit, days: number): { sessions: Session[]; note?: string; appliedSplit: WorkoutSplit } {
  if (split === "auto") return { sessions: cloneSchedule(AUTO_SCHEDULES[days]), appliedSplit: "auto" };

  if (split === "full_body") {
    const templates: Session[] = [
      { title: "FULL BODY A", patterns: ["squat", "horizontal push", "horizontal pull", "hinge", "lateral raise", "core"] },
      { title: "FULL BODY B", patterns: ["hinge", "vertical push", "vertical pull", "single-leg", "arms", "calves"] },
      { title: "FULL BODY C", patterns: ["squat", "incline push", "horizontal pull", "leg curl", "rear delts", "core"] },
    ];
    return { sessions: Array.from({ length: days }, (_, index) => ({ ...templates[index % templates.length], patterns: [...templates[index % templates.length].patterns] })), appliedSplit: split };
  }

  if (split === "upper_lower") {
    const templates: Session[] = [
      { title: "UPPER A", patterns: ["horizontal push", "horizontal pull", "incline push", "vertical pull", "lateral raise", "triceps"] },
      { title: "LOWER A", patterns: ["squat", "hinge", "single-leg", "leg curl", "calves", "core"] },
      { title: "UPPER B", patterns: ["vertical push", "vertical pull", "horizontal pull", "chest isolation", "rear delts", "biceps"] },
      { title: "LOWER B", patterns: ["hinge", "squat", "single-leg", "leg curl", "calves", "core"] },
    ];
    return { sessions: Array.from({ length: days }, (_, index) => ({ ...templates[index % templates.length], patterns: [...templates[index % templates.length].patterns] })), appliedSplit: split };
  }

  if (split === "push_pull_legs") {
    if (days < 3) {
      return {
        sessions: cloneSchedule(AUTO_SCHEDULES[days]),
        note: "PPL does not cover the whole body well in only 2 days, so I used the better-fitting 2-day full-body structure.",
        appliedSplit: "auto",
      };
    }
    const ppl: Session[] = [
      { title: "PUSH", patterns: ["horizontal push", "incline push", "vertical push", "lateral raise", "triceps", "chest isolation"] },
      { title: "PULL", patterns: ["vertical pull", "horizontal pull", "back isolation", "rear delts", "biceps", "forearms"] },
      { title: "LEGS", patterns: ["squat", "hinge", "single-leg", "leg curl", "calves", "core"] },
    ];
    if (days === 4) return { sessions: [...cloneSchedule(ppl), { title: "UPPER / PRIORITY", patterns: ["horizontal push", "horizontal pull", "vertical pull", "lateral raise", "arms", "core"] }], appliedSplit: split };
    if (days === 5) return { sessions: [...cloneSchedule(ppl), ...cloneSchedule(AUTO_SCHEDULES[5].slice(3))], appliedSplit: split };
    return { sessions: [...cloneSchedule(ppl), ...cloneSchedule(ppl).map((session) => ({ ...session, title: `${session.title} B` }))].map((session, index) => ({ ...session, title: index < 3 ? `${session.title} A` : session.title })), appliedSplit: split };
  }

  if (days < 4) {
    return {
      sessions: cloneSchedule(AUTO_SCHEDULES[days]),
      note: "A one-muscle-per-day bro split is inefficient with fewer than 4 training days, so I used a higher-frequency structure instead.",
      appliedSplit: "auto",
    };
  }
  const bro: Record<number, Session[]> = {
    4: [
      { title: "CHEST + TRICEPS", patterns: ["horizontal push", "incline push", "chest isolation", "triceps", "lateral raise", "core"] },
      { title: "BACK + BICEPS", patterns: ["vertical pull", "horizontal pull", "back isolation", "biceps", "rear delts", "forearms"] },
      { title: "LEGS", patterns: ["squat", "hinge", "single-leg", "leg curl", "calves", "core"] },
      { title: "SHOULDERS + ARMS", patterns: ["vertical push", "lateral raise", "rear delts", "biceps", "triceps", "forearms"] },
    ],
    5: [
      { title: "CHEST", patterns: ["horizontal push", "incline push", "chest isolation", "triceps", "lateral raise", "core"] },
      { title: "BACK", patterns: ["vertical pull", "horizontal pull", "back isolation", "rear delts", "biceps", "forearms"] },
      { title: "LEGS", patterns: ["squat", "hinge", "single-leg", "leg curl", "calves", "core"] },
      { title: "SHOULDERS", patterns: ["vertical push", "lateral raise", "rear delts", "triceps", "core", "calves"] },
      { title: "ARMS", patterns: ["biceps", "triceps", "forearms", "biceps", "triceps", "core"] },
    ],
    6: [
      { title: "CHEST", patterns: ["horizontal push", "incline push", "chest isolation", "triceps", "lateral raise", "core"] },
      { title: "BACK", patterns: ["vertical pull", "horizontal pull", "back isolation", "rear delts", "biceps", "forearms"] },
      { title: "QUADS + CALVES", patterns: ["squat", "single-leg", "squat", "calves", "core", "calves"] },
      { title: "SHOULDERS", patterns: ["vertical push", "lateral raise", "rear delts", "triceps", "lateral raise", "core"] },
      { title: "ARMS + FOREARMS", patterns: ["biceps", "triceps", "forearms", "biceps", "triceps", "forearms"] },
      { title: "HAMSTRINGS + GLUTES", patterns: ["hinge", "leg curl", "single-leg", "hinge", "calves", "core"] },
    ],
  };
  return { sessions: cloneSchedule(bro[days]), appliedSplit: split };
}

function priorityPatterns(muscle: PriorityMuscle) {
  return ({
    arms: ["biceps", "triceps"],
    shoulders: ["lateral raise", "rear delts"],
    chest: ["incline push", "chest isolation"],
    back: ["vertical pull", "back isolation"],
    quads: ["squat", "single-leg"],
    hamstrings: ["hinge", "leg curl"],
    glutes: ["hinge", "single-leg"],
    calves: ["calves"],
    forearms: ["forearms"],
    core: ["core"],
  } satisfies Record<PriorityMuscle, string[]>)[muscle];
}

function applyPriorities(sessions: Session[], priorities: PriorityMuscle[]) {
  if (!priorities.length) return sessions;
  const copy = cloneSchedule(sessions);
  priorities.slice(0, 3).forEach((priority, priorityIndex) => {
    const patterns = priorityPatterns(priority);
    for (let exposure = 0; exposure < Math.min(2, copy.length); exposure += 1) {
      const index = (priorityIndex * 2 + exposure) % copy.length;
      const pattern = patterns[exposure % patterns.length];
      if (!copy[index].patterns.includes(pattern)) copy[index].patterns.push(pattern);
    }
  });
  return copy;
}

function cleanExerciseList(value: string) {
  return value.toLowerCase().split(/[,;|]/).map((item) => item.trim()).filter(Boolean);
}

function movementForPattern(equipment: Equipment, pattern: string, preferred: string[], disliked: string[], occurrence = 0) {
  const options = MOVEMENT_OPTIONS[equipment][pattern] ?? [pattern];
  const allowed = options.filter((movement) => !disliked.some((item) => movement.toLowerCase().includes(item)));
  const candidates = allowed.length ? allowed : options;
  const preferredMovement = candidates.find((movement) => preferred.some((item) => movement.toLowerCase().includes(item)));
  return preferredMovement ?? candidates[occurrence % candidates.length];
}

function patternIsPriority(pattern: string, priorities: PriorityMuscle[]) {
  return priorities.some((priority) => priorityPatterns(priority).includes(pattern));
}

function prescription(profile: Profile, pattern: string) {
  const compound = /squat|hinge|push|pull|single-leg/.test(pattern);
  if (profile.trainingStyle === "strength" && compound) return profile.experience === "beginner" ? "3 × 5–8" : "4 × 3–6";
  if (profile.trainingStyle === "hypertrophy") return compound ? "3 × 6–10" : "3 × 10–15";
  if (profile.trainingStyle === "athletic") return compound ? "3 × 4–8" : "2–3 × 8–15";
  if (profile.goal === "strength" && compound) return "3–4 × 4–8";
  if (profile.goal === "muscle") return compound ? "3 × 6–10" : "3 × 10–15";
  return compound ? "3 × 6–12" : "2–3 × 10–15";
}

function cardioPlan(preference: CardioPreference) {
  if (preference === "none") return "No planned cardio saved.";
  if (preference === "light") return "Add 2–4 easy 20–30 minute walks or zone-2 sessions across the week.";
  if (preference === "moderate") return "Add 2 cardio sessions of about 25–40 minutes, preferably away from your hardest leg sessions.";
  return "Add 1 interval/conditioning session plus 1–2 easier aerobic sessions; keep the hardest conditioning away from your heaviest lower-body day.";
}

function goalLabel(goal: Goal) {
  return goal === "muscle" ? "MUSCLE-BUILDING" : goal === "fat-loss" ? "FAT-LOSS SUPPORT" : goal.toUpperCase();
}

function isGenericPlanBuilderPrompt(message: string) {
  return /^(?:help me )?(?:build|make|create|design)(?: me)? (?:a |my )?(?:workout|training) plan[.!?]*$/i.test(message.trim())
    || /^i want (?:a |to build a )?(?:workout|training) plan[.!?]*$/i.test(message.trim());
}

export function programAnswer(message: string, savedProfile?: FitnessProfile | null) {
  const splitFromMessage = requestedSplit(message.toLowerCase());
  if (isGenericPlanBuilderPrompt(message) && !splitFromMessage) {
    return "Let’s build it properly. Which workout split do you want?\n\nAUTO — I choose the best split for your schedule and goal.\nPUSH / PULL / LEGS — Classic PPL.\nUPPER / LOWER — Alternate upper and lower days.\nFULL BODY — Whole body each session.\nBRO SPLIT / ONE MUSCLE PER DAY — More body-part-focused days.\n\nPick one and I’ll use your saved goal, schedule, equipment and muscle priorities.";
  }

  const parsed = parseProfile(message, savedProfile);
  if (parsed.missing) {
    return `I can personalise that, but I still need: ${parsed.missing.join(", ")}.\n\nSend everything in one line, for example: “Muscle gain, intermediate, 4 days, 60 minutes, full gym, no limitations.”`;
  }
  if (parsed.limited) {
    return "I won’t guess how to program around a high-risk restriction such as recent surgery, fracture/dislocation, pregnancy requiring individual clearance or a non-weight-bearing restriction. Send the restrictions given by your clinician and I can structure the rest of the program around them.";
  }

  const profile = parsed.profile!;
  const built = splitSchedule(profile.splitPreference, profile.days);
  const sessions = applyPriorities(built.sessions, profile.priorityMuscles);
  const exerciseLimit = profile.minutes < 40 ? 4 : profile.minutes < 60 ? 5 : profile.minutes < 85 ? 6 : 7;
  const preferred = cleanExerciseList(profile.preferredExercises);
  const disliked = cleanExerciseList(profile.dislikedExercises);

  const days = sessions.map((session, dayIndex) => {
    const occurrences = new Map<string, number>();
    const selected = session.patterns.map((pattern) => {
      const occurrence = occurrences.get(pattern) ?? 0;
      occurrences.set(pattern, occurrence + 1);
      return {
        pattern,
        movement: movementForPattern(profile.equipment, pattern, preferred, disliked, occurrence),
      };
    });
    selected.sort((a, b) => Number(patternIsPriority(b.pattern, profile.priorityMuscles)) - Number(patternIsPriority(a.pattern, profile.priorityMuscles)));
    const exercises = selected.slice(0, exerciseLimit).map(({ pattern, movement }, index) =>
      `${index + 1}. ${movement} — ${prescription(profile, pattern)}${patternIsPriority(pattern, profile.priorityMuscles) ? "  ★ priority" : ""}`,
    );
    return `DAY ${dayIndex + 1} — ${session.title}\n${exercises.join("\n")}`;
  });

  const recovery = profile.days >= 5
    ? "Keep at least one full recovery day each week and avoid stacking every hard lower-body session together."
    : "Space repeated hard muscle-group sessions with recovery where practical.";
  const priorityLine = profile.priorityMuscles.length
    ? `\nPRIORITY MUSCLES — ${profile.priorityMuscles.map((item) => priorityMuscleLabels[item]).join(", ")}. Priority work is marked ★.`
    : "";
  const preferenceLine = profile.preferredExercises ? `\nLIKES — ${profile.preferredExercises}` : "";
  const dislikeLine = profile.dislikedExercises ? `\nAVOID / DISLIKE — ${profile.dislikedExercises}` : "";
  const limitationLine = profile.limitations
    ? `\nLIMITATIONS — ${profile.limitations}. Skip anything that conflicts with clinician restrictions or produces sharp/worsening pain.`
    : "\nLIMITATIONS — None reported.";
  const splitNote = built.note ? `\nSPLIT NOTE — ${built.note}` : "";

  return `YOUR ${profile.days}-DAY ${goalLabel(profile.goal)} PLAN\n\nPROFILE — ${profile.experience} · ${profile.minutes} min · ${profile.equipment}\nSPLIT — ${workoutSplitLabels[built.appliedSplit]}\nSTYLE — ${trainingStyleLabels[profile.trainingStyle]}${priorityLine}${preferenceLine}${dislikeLine}${limitationLine}${splitNote}\n\n${days.join("\n\n")}\n\nEFFORT — Keep most working sets around 1–3 reps in reserve. ${recovery}\n\nPROGRESSION — Add reps within the range first. When every set reaches the top with stable technique, add the smallest practical load.\n\nCARDIO — ${cardioPreferenceLabels[profile.cardioPreference]}. ${cardioPlan(profile.cardioPreference)}`;
}

export function programTrace(message: string, savedProfile?: FitnessProfile | null) {
  if (isGenericPlanBuilderPrompt(message) && !requestedSplit(message.toLowerCase())) {
    return ["Selected guided program builder", "Requested workout split preference"];
  }
  const parsed = parseProfile(message, savedProfile);
  if (parsed.missing) return ["Selected program route", `Requested ${parsed.missing.length} missing profile detail(s)`];
  if (parsed.limited) return ["Selected program route", "Detected a high-risk training restriction", "Stopped before unsafe plan generation"];
  return [
    "Selected program route",
    ...(savedProfile ? ["Applied saved fitness profile"] : []),
    `Applied ${workoutSplitLabels[parsed.profile!.splitPreference]}`,
    `Applied ${trainingStyleLabels[parsed.profile!.trainingStyle]} style`,
    `Validated ${parsed.profile!.days} sessions`,
    `Applied ${parsed.profile!.equipment} equipment constraints`,
    ...(parsed.profile!.priorityMuscles.length ? [`Prioritised ${parsed.profile!.priorityMuscles.join(", ")}`] : []),
    `Fitted exercises to ${parsed.profile!.minutes} minutes`,
  ];
}
