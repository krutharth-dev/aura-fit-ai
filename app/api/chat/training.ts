export function trainingAnswer(message: string) {
  const text = message.toLowerCase();

  if (/plateau|stuck|not (?:getting|making).*(?:strong|progress)|progress.*stopped/.test(text)) {
    return "Training plateau checklist\n\n1. VERIFY — Compare at least 3–4 weeks of logged sets, reps, load and effort; one difficult session is not a plateau.\n2. RECOVER — Keep the target lift at 1–3 reps in reserve, reduce unnecessary failure work, and check sleep and food intake.\n3. PROGRESS — Use a rep range such as 3 × 6–8. Add reps until all sets reach 8 with stable form, then add the smallest practical load.\n4. ADJUST — If progress is genuinely stalled, deload for one week or change only one variable: slightly less fatigue, a compatible variation, or 1–2 additional weekly sets.\n\nTell me the exercise, recent working sets, weekly frequency and where the rep fails, and I can narrow this down.\n\nEVIDENCE — ACSM resistance-training guidance: https://acsm.org/resistance-training-guidelines-update-2026/";
  }

  if (/(?:run|running|cardio|cycling|swim|conditioning).*(?:leg|strength|lift)|(?:leg|strength|lift).*(?:run|running|cardio|cycling|swim|conditioning)/.test(text)) {
    return "Combining cardio and strength\n\nKeep the sessions that matter most when you are freshest. Put hard intervals away from heavy lower-body training—ideally on another day, or separated by at least several hours. Easy zone-2 work can usually follow lifting or sit on a recovery day.\n\nA practical week: lower strength, easy cardio, upper strength, rest, lower strength, intervals, rest. Start with 2 strength sessions and 2 cardio sessions, then add work only while performance and recovery stay stable. If both happen on one day, lift first when strength or muscle is the priority; do cardio first when endurance performance is the priority.\n\nEVIDENCE — WHO physical-activity guidelines: https://www.who.int/publications/i/item/9789240015128";
  }

  if (/warm.?up|mobility|flexibility|range of motion/.test(text)) {
    return "Workout preparation\n\nUse 5–10 minutes: raise temperature with easy movement, practise the joints and ranges needed today, then perform 2–4 progressively heavier warm-up sets of the first main exercise. Choose mobility drills that improve the position you actually need; long generic routines are optional, not mandatory.\n\nWarm-ups should improve readiness without creating fatigue. Persistent restriction, sharp pain or loss of function needs assessment rather than increasingly aggressive stretching.";
  }

  if (/substitut|alternative|replace|instead of|no (?:machine|barbell|dumbbell|equipment)|hotel|travel/.test(text)) {
    return "Exercise substitution rule\n\nMatch the movement pattern and training purpose, then choose an option you can load and perform comfortably. Examples: squat → goblet squat, split squat or tempo squat; bench press → dumbbell press, floor press or push-up; deadlift → Romanian deadlift, hip thrust or single-leg hinge; pulldown → assisted pull-up, band pulldown or dumbbell pullover; cable row → dumbbell row, chest-supported row or stable table row.\n\nKeep a similar rep range and effort, but do not force identical weight. Tell me what you need to replace, your available equipment and the reason, and I’ll give the closest options.";
  }

  if (/calisthenic|bodyweight|push.?up|pull.?up/.test(text)) {
    return "Calisthenics progression\n\nChoose one push, pull, squat or lunge, hinge or bridge, and trunk exercise. Train each for 2–4 sets, mostly 6–15 controlled reps with 1–3 reps in reserve, 2–3 times per week. Make an exercise harder only after you reach the top of the range with consistent control: incline push-up → floor push-up → feet-elevated push-up; assisted pull-up → pull-up → slower or weighted pull-up; squat → split squat → assisted single-leg squat.\n\nFor a complete routine, tell me your current push-up and pull-up ability, days per week, session time, equipment and any limitations.";
  }

  if (/volume|sets per|frequency|how often|reps|rep range|rpe|rir|failure/.test(text)) {
    return "Training dose guide\n\nStart with roughly 6–10 challenging weekly sets per major muscle group, spread across 2 or more sessions when practical. Most sets can finish with 1–3 good reps in reserve. Use about 5–8 reps for heavier strength-focused work, 6–15 for most muscle-building work, and higher reps when the exercise remains stable and comfortable.\n\nAdd volume only when technique, performance and recovery are stable; reduce it if performance falls across sessions, soreness persists or joints become irritated. Your experience, exercise selection and proximity to failure matter more than chasing one universal set target.";
  }

  return "I can answer open-ended workout questions about exercise selection, gym or home training, strength, muscle gain, fat-loss training, cardio, calisthenics, mobility, progression, plateaus and substitutions.\n\nFor a complete personalised workout plan, include your goal, experience, days per week, session length, available equipment and injuries or limitations. For a specific question, name the exercise or training problem and what you have tried so far.";
}
