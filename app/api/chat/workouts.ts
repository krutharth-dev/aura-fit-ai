export type ChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

type Exercise = {
  name: string;
  prescription: string;
  cue: string;
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

const BODY_PART_ALIASES: Array<[RegExp, string]> = [
  [/\b(?:full[ -]?body|whole body|total body)\b/i, "full body"],
  [/\b(?:shoulders?|delts?)\b/i, "shoulders"],
  [/\b(?:hamstrings?|hams?)\b/i, "hamstrings"],
  [/\b(?:quadriceps|quads?)\b/i, "quads"],
  [/\b(?:glutes?|gluteus|booty)\b/i, "glutes"],
  [/\b(?:triceps?|tris?)\b/i, "triceps"],
  [/\b(?:biceps?|bis?)\b/i, "biceps"],
  [/\b(?:forearms?|grip)\b/i, "forearms"],
  [/\b(?:calves|calf)\b/i, "calves"],
  [/\b(?:core|abs?|abdominals?)\b/i, "core"],
  [/\b(?:chest|pecs?|pectorals?)\b/i, "chest"],
  [/\b(?:upper back|lats?|back)\b/i, "back"],
  [/\b(?:arms?)\b/i, "arms"],
  [/\b(?:legs?|lower body)\b/i, "legs"],
];

const WORKOUT_LIBRARY: Record<string, Exercise[]> = {
  back: [
    { name: "Pull-up or assisted pull-up", prescription: "3 × 6–10", cue: "Lead with the chest and keep the ribs controlled." },
    { name: "Lat pulldown", prescription: "3 × 8–12", cue: "Drive elbows toward your hips without swinging." },
    { name: "Chest-supported row", prescription: "3 × 8–12", cue: "Pause briefly with shoulder blades drawn back." },
    { name: "One-arm dumbbell row", prescription: "3 × 8–12/side", cue: "Keep hips square and pull toward the back pocket." },
    { name: "Seated cable row", prescription: "3 × 10–15", cue: "Stay tall and avoid turning the rep into a body swing." },
    { name: "Straight-arm pulldown", prescription: "2 × 12–15", cue: "Keep arms long and move from the shoulders." },
    { name: "Machine high row", prescription: "3 × 8–12", cue: "Let the shoulder blade reach, then pull smoothly." },
    { name: "Reverse fly", prescription: "2 × 12–20", cue: "Use light control and keep shoulders away from ears." },
    { name: "Barbell row", prescription: "3 × 6–10", cue: "Brace hard and keep the bar close to the body." },
    { name: "Cable pullover", prescription: "2 × 12–15", cue: "Finish with your hands near your thighs, not behind you." },
  ],
  chest: [
    { name: "Barbell bench press", prescription: "3 × 5–8", cue: "Keep upper back set and wrists over forearms." },
    { name: "Incline dumbbell press", prescription: "3 × 8–12", cue: "Lower with control and press up without shrugging." },
    { name: "Machine chest press", prescription: "3 × 8–12", cue: "Set the seat so handles meet the mid-chest." },
    { name: "Cable fly", prescription: "2 × 12–15", cue: "Use a soft elbow and bring the upper arms together." },
    { name: "Push-up", prescription: "3 × 8–15", cue: "Keep a straight body line and reach full control." },
    { name: "Decline press", prescription: "3 × 8–12", cue: "Keep shoulder blades stable throughout the rep." },
    { name: "Pec-deck fly", prescription: "2 × 12–15", cue: "Stop before the shoulders roll forward." },
    { name: "Dumbbell squeeze press", prescription: "2 × 10–15", cue: "Press the dumbbells together through the full rep." },
    { name: "Low-to-high cable fly", prescription: "2 × 12–15", cue: "Sweep upward without overextending the lower back." },
    { name: "Landmine press", prescription: "3 × 8–12/side", cue: "Reach forward at the top while keeping ribs down." },
  ],
  shoulders: [
    { name: "Seated dumbbell shoulder press", prescription: "3 × 6–10", cue: "Press overhead without flaring the ribs." },
    { name: "Cable lateral raise", prescription: "3 × 12–20", cue: "Lead with the elbow and stop around shoulder height." },
    { name: "Machine shoulder press", prescription: "3 × 8–12", cue: "Use a pain-free grip and controlled depth." },
    { name: "Reverse pec-deck", prescription: "3 × 12–20", cue: "Move from the rear delts rather than shrugging." },
    { name: "Single-arm landmine press", prescription: "3 × 8–12/side", cue: "Reach forward and up while staying stacked." },
    { name: "Dumbbell lateral raise", prescription: "3 × 12–20", cue: "Use light weight and avoid momentum." },
    { name: "Cable rear-delt fly", prescription: "2 × 12–20", cue: "Keep arms long and chest still." },
    { name: "Arnold press", prescription: "2 × 8–12", cue: "Rotate smoothly within a comfortable range." },
    { name: "Face pull", prescription: "2 × 12–20", cue: "Pull toward eye level and finish without arching." },
    { name: "Lean-away lateral raise", prescription: "2 × 12–15/side", cue: "Control the stretched bottom position." },
  ],
  legs: [
    { name: "Back squat", prescription: "3 × 5–8", cue: "Brace, keep the whole foot planted, and track the knees." },
    { name: "Romanian deadlift", prescription: "3 × 6–10", cue: "Push hips back and keep the weights close." },
    { name: "Leg press", prescription: "3 × 10–15", cue: "Use controlled depth without the hips rolling up." },
    { name: "Bulgarian split squat", prescription: "3 × 8–12/leg", cue: "Stay balanced and drive through the front foot." },
    { name: "Seated leg curl", prescription: "3 × 10–15", cue: "Keep hips down and pause in the shortened position." },
    { name: "Leg extension", prescription: "2 × 12–15", cue: "Lift smoothly and avoid kicking the stack." },
    { name: "Hip thrust", prescription: "3 × 8–12", cue: "Finish with ribs down and glutes squeezed." },
    { name: "Standing calf raise", prescription: "3 × 10–15", cue: "Pause at the stretch and at the top." },
    { name: "Walking lunge", prescription: "2 × 10–12/leg", cue: "Use a stable step and keep the front foot planted." },
    { name: "Hack squat", prescription: "3 × 8–12", cue: "Control the bottom and drive evenly through both feet." },
  ],
  quads: [
    { name: "Front squat", prescription: "3 × 5–8", cue: "Keep elbows high and sit between the knees." },
    { name: "Hack squat", prescription: "3 × 8–12", cue: "Use a controlled deep range that stays comfortable." },
    { name: "Leg press", prescription: "3 × 10–15", cue: "Place feet where the knees can travel comfortably." },
    { name: "Bulgarian split squat", prescription: "3 × 8–12/leg", cue: "Let the front knee travel while the whole foot stays down." },
    { name: "Leg extension", prescription: "3 × 12–15", cue: "Pause at the top without slamming the stack." },
    { name: "Heel-elevated goblet squat", prescription: "3 × 10–15", cue: "Stay tall and control the bottom position." },
    { name: "Walking lunge", prescription: "2 × 10–12/leg", cue: "Take consistent steps and keep balance." },
    { name: "Step-up", prescription: "3 × 8–12/leg", cue: "Drive through the working leg instead of pushing off." },
    { name: "Reverse Nordic curl", prescription: "2 × 8–12", cue: "Keep hips extended and use a range you control." },
    { name: "Cyclist squat", prescription: "2 × 12–15", cue: "Use light load and steady knee tracking." },
  ],
  hamstrings: [
    { name: "Romanian deadlift", prescription: "3 × 6–10", cue: "Hinge until the hamstrings are loaded without rounding." },
    { name: "Seated leg curl", prescription: "3 × 10–15", cue: "Keep hips planted and control the return." },
    { name: "Lying leg curl", prescription: "3 × 10–15", cue: "Avoid lifting the hips as you curl." },
    { name: "Single-leg Romanian deadlift", prescription: "3 × 8–12/leg", cue: "Keep hips square and reach the free leg back." },
    { name: "Good morning", prescription: "3 × 8–12", cue: "Use a light load and a braced hip hinge." },
    { name: "Nordic curl regression", prescription: "3 × 5–8", cue: "Use assistance and lower only as far as controlled." },
    { name: "Cable pull-through", prescription: "3 × 10–15", cue: "Hinge back, then stand by extending the hips." },
    { name: "Stability-ball leg curl", prescription: "3 × 10–15", cue: "Keep hips lifted while bending the knees." },
    { name: "45-degree back extension", prescription: "3 × 10–15", cue: "Round over the pad slightly and finish with the hips." },
    { name: "Slider leg curl", prescription: "2 × 8–12", cue: "Move slowly and keep the hips from dropping." },
  ],
  glutes: [
    { name: "Barbell hip thrust", prescription: "3 × 6–10", cue: "Finish with ribs down and a strong glute squeeze." },
    { name: "Romanian deadlift", prescription: "3 × 8–12", cue: "Push hips back and keep the load close." },
    { name: "Bulgarian split squat", prescription: "3 × 8–12/leg", cue: "Use a longer stance and controlled torso lean." },
    { name: "Cable kickback", prescription: "3 × 12–15/leg", cue: "Keep the pelvis still and move from the hip." },
    { name: "Step-up", prescription: "3 × 8–12/leg", cue: "Use a suitable box and drive through the working foot." },
    { name: "Reverse lunge", prescription: "3 × 8–12/leg", cue: "Step back far enough to stay stable." },
    { name: "45-degree back extension", prescription: "3 × 10–15", cue: "Finish by squeezing the glutes, not arching the back." },
    { name: "Hip abduction machine", prescription: "3 × 12–20", cue: "Use a controlled range without bouncing." },
    { name: "Frog pump", prescription: "2 × 15–25", cue: "Keep soles together and pause at the top." },
    { name: "Single-leg hip thrust", prescription: "3 × 10–15/leg", cue: "Keep the pelvis level through each rep." },
  ],
  biceps: [
    { name: "EZ-bar curl", prescription: "3 × 8–12", cue: "Keep elbows quiet and avoid leaning back." },
    { name: "Incline dumbbell curl", prescription: "3 × 10–15", cue: "Let the arm extend fully without the shoulder rolling." },
    { name: "Cable curl", prescription: "3 × 10–15", cue: "Keep tension and squeeze without moving the upper arm." },
    { name: "Hammer curl", prescription: "3 × 8–12", cue: "Use a neutral grip and control the lowering phase." },
    { name: "Preacher curl", prescription: "3 × 10–15", cue: "Stop short of any uncomfortable elbow lockout." },
    { name: "Bayesian cable curl", prescription: "2 × 12–15/side", cue: "Keep the arm slightly behind the torso." },
    { name: "Spider curl", prescription: "2 × 10–15", cue: "Keep the chest supported and upper arm still." },
    { name: "Reverse curl", prescription: "2 × 10–15", cue: "Use a light load and straight wrists." },
    { name: "Concentration curl", prescription: "2 × 10–15/side", cue: "Move only at the elbow and pause at the top." },
    { name: "Machine curl", prescription: "3 × 10–15", cue: "Align the elbow with the machine pivot." },
  ],
  triceps: [
    { name: "Cable pressdown", prescription: "3 × 10–15", cue: "Keep elbows pinned and fully control the return." },
    { name: "Overhead cable extension", prescription: "3 × 10–15", cue: "Keep ribs down and point elbows forward." },
    { name: "Close-grip bench press", prescription: "3 × 6–10", cue: "Use a comfortable grip and keep wrists stacked." },
    { name: "Dumbbell skull crusher", prescription: "3 × 8–12", cue: "Let the elbows bend without the upper arms drifting." },
    { name: "Assisted dip", prescription: "3 × 6–10", cue: "Keep shoulders controlled and use pain-free depth." },
    { name: "Cross-body cable extension", prescription: "2 × 12–15/side", cue: "Keep the shoulder still and finish the elbow extension." },
    { name: "Single-arm pressdown", prescription: "2 × 12–15/side", cue: "Stand tall and avoid torso rotation." },
    { name: "Diamond push-up", prescription: "3 × 8–15", cue: "Keep elbows controlled and body in one line." },
    { name: "Machine dip", prescription: "3 × 8–12", cue: "Keep shoulders down and use a smooth tempo." },
    { name: "JM press", prescription: "2 × 8–12", cue: "Learn with a light load and controlled elbow path." },
  ],
  arms: [
    { name: "EZ-bar curl", prescription: "3 × 8–12", cue: "Keep elbows still and torso quiet." },
    { name: "Cable pressdown", prescription: "3 × 10–15", cue: "Extend fully without moving the shoulders." },
    { name: "Incline dumbbell curl", prescription: "3 × 10–15", cue: "Control the stretch at the bottom." },
    { name: "Overhead cable extension", prescription: "3 × 10–15", cue: "Keep ribs down and elbows forward." },
    { name: "Hammer curl", prescription: "3 × 8–12", cue: "Keep wrists neutral throughout." },
    { name: "Close-grip bench press", prescription: "3 × 6–10", cue: "Use a stable upper back and stacked wrists." },
    { name: "Cable curl", prescription: "2 × 12–15", cue: "Keep continuous tension and avoid swinging." },
    { name: "Single-arm pressdown", prescription: "2 × 12–15/side", cue: "Keep the upper arm beside the torso." },
    { name: "Reverse curl", prescription: "2 × 10–15", cue: "Use a light load and straight wrists." },
    { name: "Cross-body triceps extension", prescription: "2 × 12–15/side", cue: "Finish each rep with full control." },
  ],
  core: [
    { name: "Cable crunch", prescription: "3 × 10–15", cue: "Bring ribs toward pelvis without pulling with the arms." },
    { name: "Hanging knee raise", prescription: "3 × 8–15", cue: "Curl the pelvis up and avoid swinging." },
    { name: "Ab wheel rollout", prescription: "3 × 6–12", cue: "Keep ribs down and stop before the lower back arches." },
    { name: "Pallof press", prescription: "3 × 10–12/side", cue: "Resist rotation and breathe behind the brace." },
    { name: "Side plank", prescription: "3 × 20–40 sec/side", cue: "Keep head, ribs, hips and feet in one line." },
    { name: "Dead bug", prescription: "3 × 8–12/side", cue: "Keep the lower back gently supported." },
    { name: "Reverse crunch", prescription: "3 × 10–15", cue: "Lift the pelvis rather than throwing the legs." },
    { name: "Suitcase carry", prescription: "3 × 20–40 m/side", cue: "Walk tall without leaning toward the weight." },
    { name: "Plank", prescription: "3 × 25–45 sec", cue: "Squeeze glutes and keep ribs down." },
    { name: "Bird dog", prescription: "3 × 8–12/side", cue: "Reach long while keeping hips level." },
  ],
  calves: [
    { name: "Standing calf raise", prescription: "4 × 8–12", cue: "Pause in the stretch and at the top." },
    { name: "Seated calf raise", prescription: "4 × 10–15", cue: "Use a slow lowering phase and full comfortable range." },
    { name: "Leg-press calf raise", prescription: "3 × 10–15", cue: "Move only at the ankle and keep knees soft." },
    { name: "Single-leg calf raise", prescription: "3 × 10–15/leg", cue: "Use support for balance, not assistance." },
    { name: "Smith-machine calf raise", prescription: "3 × 8–12", cue: "Keep the bar path stable and avoid bouncing." },
    { name: "Donkey calf raise", prescription: "3 × 12–20", cue: "Control the deepest comfortable stretch." },
    { name: "Bent-knee calf raise", prescription: "3 × 12–20", cue: "Keep the knee angle fixed through the set." },
    { name: "Tibialis raise", prescription: "3 × 15–25", cue: "Lift the toes while keeping heels planted." },
    { name: "Farmer walk on toes", prescription: "3 × 20–30 m", cue: "Use light loads and short controlled steps." },
    { name: "Bodyweight calf pulse", prescription: "2 × 20–30", cue: "Finish only after full-range work, not instead of it." },
  ],
  forearms: [
    { name: "Farmer carry", prescription: "3 × 25–40 m", cue: "Grip hard and walk with tall posture." },
    { name: "Reverse curl", prescription: "3 × 10–15", cue: "Keep wrists straight and elbows quiet." },
    { name: "Hammer curl", prescription: "3 × 8–12", cue: "Use a neutral wrist and controlled lowering." },
    { name: "Wrist curl", prescription: "2 × 12–20", cue: "Use a light load through a comfortable range." },
    { name: "Reverse wrist curl", prescription: "2 × 12–20", cue: "Move only at the wrist without bouncing." },
    { name: "Plate pinch hold", prescription: "3 × 20–40 sec", cue: "Keep fingers long and shoulder relaxed." },
    { name: "Dead hang", prescription: "3 × 20–45 sec", cue: "Use a secure bar and stop before grip fails suddenly." },
    { name: "Towel cable row", prescription: "3 × 10–15", cue: "Crush the towel while rowing with control." },
    { name: "Suitcase carry", prescription: "3 × 25–40 m/side", cue: "Stay upright while maintaining the grip." },
    { name: "Wrist roller", prescription: "2 × 1–2 rounds", cue: "Use small controlled turns rather than momentum." },
  ],
  "full body": [
    { name: "Goblet squat", prescription: "3 × 8–12", cue: "Keep the whole foot planted and torso controlled." },
    { name: "Dumbbell Romanian deadlift", prescription: "3 × 8–12", cue: "Push hips back and keep weights close." },
    { name: "Push-up or machine press", prescription: "3 × 8–12", cue: "Use a range you can control without pain." },
    { name: "Lat pulldown", prescription: "3 × 8–12", cue: "Pull elbows toward the hips without swinging." },
    { name: "Dumbbell shoulder press", prescription: "2 × 8–12", cue: "Press without flaring the ribs." },
    { name: "Split squat", prescription: "2 × 8–12/leg", cue: "Stay balanced over the front foot." },
    { name: "Seated cable row", prescription: "2 × 10–15", cue: "Keep the torso still as the shoulder blades move." },
    { name: "Pallof press", prescription: "3 × 10–12/side", cue: "Resist rotation while breathing normally." },
    { name: "Farmer carry", prescription: "3 × 25–40 m", cue: "Walk tall with a firm grip." },
    { name: "Standing calf raise", prescription: "3 × 10–15", cue: "Pause at both ends of the range." },
  ],
};

export function extractBodyPart(text: string) {
  return BODY_PART_ALIASES.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

export function extractExerciseCount(text: string) {
  const digit = text.match(/\b(10|[1-9])\b/);
  if (digit) return Number(digit[1]);
  const word = Object.keys(NUMBER_WORDS).find((candidate) => new RegExp(`\\b${candidate}\\b`, "i").test(text));
  return word ? NUMBER_WORDS[word] : null;
}

function priorHistory(history: ChatHistoryItem[], currentMessage: string) {
  const last = history.at(-1);
  return last?.role === "user" && last.content.trim().toLowerCase() === currentMessage.trim().toLowerCase()
    ? history.slice(0, -1)
    : history;
}

function mostRecentBodyPart(history: ChatHistoryItem[]) {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (history[index].role !== "user") continue;
    const bodyPart = extractBodyPart(history[index].content);
    if (bodyPart) return bodyPart;
  }
  return null;
}

function asksToChooseBodyPart(history: ChatHistoryItem[]) {
  return history
    .slice(-3)
    .some((item) => item.role === "assistant" && /which [^?]{0,50}(?:would you like to|do you want to) train/i.test(item.content));
}

function startsBodyPartWorkout(message: string) {
  return /\b(?:train|training|workout for)\b[^.!?]{0,30}\b(?:a|some|any|one) (?:muscle group|body part|area)\b/i.test(message)
    || /\b(?:body part|muscle group) workout\b/i.test(message);
}

export function isBodyPartWorkoutTurn(message: string, history: ChatHistoryItem[]) {
  const earlier = priorHistory(history, message);
  const bodyPart = extractBodyPart(message);
  const asksForWorkout = /\b(?:workout|train|training|session|routine|exercises?|variations?|movements?|today)\b/i.test(message);
  const formQuestion = /\b(?:form|technique|how (?:do|to)|pain|injury)\b/i.test(message);
  if (startsBodyPartWorkout(message)) return true;
  if (bodyPart && asksForWorkout && !formQuestion) return true;
  if (bodyPart && asksToChooseBodyPart(earlier)) return true;

  const count = extractExerciseCount(message);
  const assistantAskedForCount = earlier
    .slice(-3)
    .some((item) => item.role === "assistant" && /how many (?:exercise )?(?:variations|exercises|movements)/i.test(item.content));
  return Boolean(count && assistantAskedForCount && mostRecentBodyPart(earlier));
}

export function bodyPartWorkoutAnswer(message: string, history: ChatHistoryItem[]) {
  const earlier = priorHistory(history, message);
  const bodyPart = extractBodyPart(message) ?? mostRecentBodyPart(earlier);
  if (!bodyPart) {
    if (!startsBodyPartWorkout(message)) return null;
    return "Which body part or muscle group would you like to train today? For example: chest, back, shoulders, biceps, triceps, arms, quads, hamstrings, glutes, legs, calves, core, forearms, or full body.";
  }

  const count = extractExerciseCount(message);
  if (!count) {
    return `Great—${bodyPart} day. How many exercises would you like in this session? Choose a number from 3 to 8 (for example, “six”).`;
  }
  if (count < 1 || count > 10) {
    return "Choose between 1 and 10 exercises so the session stays practical.";
  }

  const exercises = WORKOUT_LIBRARY[bodyPart].slice(0, count);
  const lines = exercises.map(
    (exercise, index) => `${index + 1}. ${exercise.name} — ${exercise.prescription}\n   Cue: ${exercise.cue}`,
  );
  return `${bodyPart.toUpperCase()} WORKOUT — ${count} EXERCISES\n\n${lines.join("\n\n")}\n\nRest 2–3 minutes after the first heavy compound movement and 60–90 seconds after the remaining work. Keep about 2 good reps in reserve, use controlled technique, and stop any movement that causes sharp or worsening pain.`;
}

export function commonGymAnswer(message: string) {
  const text = message.toLowerCase();
  if (/rest (?:between|in between) sets|how long.*rest|rest time/.test(text)) {
    return "Rest-period guide\n\n• Heavy compound lifts: about 2–4 minutes\n• Moderate hypertrophy sets: about 90–150 seconds\n• Small isolation exercises: about 45–90 seconds\n\nUse enough rest to repeat the target reps with stable form. Shorter rest is not automatically better; performance and technique matter more.";
  }
  if (/warm.?up|warming up/.test(text)) {
    return "Simple gym warm-up\n\n1. Do 5–8 minutes of easy movement if it helps you feel ready.\n2. Practise the first exercise with a very light load.\n3. Take 2–4 ramp-up sets, adding weight while reducing reps.\n4. Begin working sets before the warm-up creates fatigue.\n\nExample before a 60 kg squat: empty bar × 10, 35 kg × 5, 50 kg × 3, then working sets.";
  }
  if (/sets? and reps?|how many reps?|rep range/.test(text)) {
    return "A practical starting point\n\n• Main strength work: 3–5 sets of 3–6 reps\n• Muscle-building compounds: 3–4 sets of 6–12 reps\n• Isolation work: 2–4 sets of 10–20 reps\n\nMost beginners can start with 2–3 hard working sets per exercise and finish with roughly 2–3 good reps still possible.";
  }
  if (/progressive overload|how.*progress|increase (?:weight|load)/.test(text)) {
    return "Use double progression: choose a rep range, such as 8–12. Keep the same load until every set reaches 12 clean reps with about 1–3 reps in reserve. Then add the smallest practical weight and build the reps again. Progress can also mean better control, range of motion or technique—not only more weight.";
  }
  if (/train(?:ing)? to failure|every set.*failure|go to failure/.test(text)) {
    return "You do not need to take every set to failure. Keep most compound lifts around 1–3 reps in reserve. Reaching failure occasionally on a safe isolation exercise can be reasonable, but frequent failure adds fatigue and can reduce technique and weekly performance.";
  }
  if (/exercise order|which exercise first|order.*exercises/.test(text)) {
    return "Put the most important and technically demanding exercise first, followed by other compound movements, then smaller isolation work. A simple order is: warm-up → priority lift → secondary compound → accessories → core or conditioning. If a weak body part is your priority, move its safe exercise earlier.";
  }
  if (/how often|times? (?:a|per) week|training frequency|train.*each muscle/.test(text)) {
    return "Most people can train each major muscle about twice per week, with at least one recovery day before hard training for the same area. Beginners often do well with three full-body days; intermediate lifters may prefer upper/lower or push-pull-legs. Weekly recoverable volume matters more than the split name.";
  }
  if (/cardio.*(?:before|after)|(?:before|after).*cardio/.test(text)) {
    return "If lifting performance is the priority, lift first and do moderate cardio afterward or in a separate session. If endurance is the priority, cardio can come first. Keep very hard cardio away from demanding leg sessions when possible, and use easy cardio freely when it does not reduce recovery.";
  }
  if (/substitute|alternative|replace.*exercise|no (?:machine|barbell|dumbbell)/.test(text)) {
    return "Choose substitutions by movement pattern, not by exercise name: squat with another knee-dominant movement, deadlift with another hinge, bench with another horizontal press, row with another horizontal pull, and pulldown with another vertical pull. Match the available equipment and use a pain-free range you can control.";
  }
  return null;
}

export const supportedBodyParts = Object.keys(WORKOUT_LIBRARY);
