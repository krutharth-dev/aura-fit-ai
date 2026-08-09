from __future__ import annotations

import re
from typing import TypedDict


class Exercise(TypedDict):
    name: str
    prescription: str


NUMBER_WORDS = {
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
}

BODY_PART_ALIASES = [
    (r"\b(?:full[ -]?body|whole body|total body)\b", "full body"),
    (r"\b(?:shoulders?|delts?)\b", "shoulders"),
    (r"\b(?:hamstrings?|hams?)\b", "hamstrings"),
    (r"\b(?:quadriceps|quads?)\b", "quads"),
    (r"\b(?:glutes?|gluteus|booty)\b", "glutes"),
    (r"\b(?:triceps?|tris?)\b", "triceps"),
    (r"\b(?:biceps?|bis?)\b", "biceps"),
    (r"\b(?:forearms?|grip)\b", "forearms"),
    (r"\b(?:calves|calf)\b", "calves"),
    (r"\b(?:core|abs?|abdominals?)\b", "core"),
    (r"\b(?:chest|pecs?|pectorals?)\b", "chest"),
    (r"\b(?:upper back|lats?|back)\b", "back"),
    (r"\b(?:arms?)\b", "arms"),
    (r"\b(?:legs?|lower body)\b", "legs"),
]


def _exercise(name: str, prescription: str) -> Exercise:
    return {"name": name, "prescription": prescription}


WORKOUTS: dict[str, list[Exercise]] = {
    "back": [
        _exercise("Pull-up or assisted pull-up", "3 × 6–10"),
        _exercise("Lat pulldown", "3 × 8–12"),
        _exercise("Chest-supported row", "3 × 8–12"),
        _exercise("One-arm dumbbell row", "3 × 8–12/side"),
        _exercise("Seated cable row", "3 × 10–15"),
        _exercise("Straight-arm pulldown", "2 × 12–15"),
        _exercise("Machine high row", "3 × 8–12"),
        _exercise("Reverse fly", "2 × 12–20"),
        _exercise("Barbell row", "3 × 6–10"),
        _exercise("Cable pullover", "2 × 12–15"),
    ],
    "chest": [
        _exercise("Barbell bench press", "3 × 5–8"),
        _exercise("Incline dumbbell press", "3 × 8–12"),
        _exercise("Machine chest press", "3 × 8–12"),
        _exercise("Cable fly", "2 × 12–15"),
        _exercise("Push-up", "3 × 8–15"),
        _exercise("Decline press", "3 × 8–12"),
        _exercise("Pec-deck fly", "2 × 12–15"),
        _exercise("Dumbbell squeeze press", "2 × 10–15"),
        _exercise("Low-to-high cable fly", "2 × 12–15"),
        _exercise("Landmine press", "3 × 8–12/side"),
    ],
    "shoulders": [
        _exercise("Seated dumbbell shoulder press", "3 × 6–10"),
        _exercise("Cable lateral raise", "3 × 12–20"),
        _exercise("Machine shoulder press", "3 × 8–12"),
        _exercise("Reverse pec-deck", "3 × 12–20"),
        _exercise("Single-arm landmine press", "3 × 8–12/side"),
        _exercise("Dumbbell lateral raise", "3 × 12–20"),
        _exercise("Cable rear-delt fly", "2 × 12–20"),
        _exercise("Arnold press", "2 × 8–12"),
        _exercise("Face pull", "2 × 12–20"),
        _exercise("Lean-away lateral raise", "2 × 12–15/side"),
    ],
    "quads": [
        _exercise("Front squat", "3 × 5–8"),
        _exercise("Hack squat", "3 × 8–12"),
        _exercise("Leg press", "3 × 10–15"),
        _exercise("Bulgarian split squat", "3 × 8–12/leg"),
        _exercise("Leg extension", "3 × 12–15"),
        _exercise("Heel-elevated goblet squat", "3 × 10–15"),
        _exercise("Walking lunge", "2 × 10–12/leg"),
        _exercise("Step-up", "3 × 8–12/leg"),
        _exercise("Reverse Nordic curl", "2 × 8–12"),
        _exercise("Cyclist squat", "2 × 12–15"),
    ],
    "hamstrings": [
        _exercise("Romanian deadlift", "3 × 6–10"),
        _exercise("Seated leg curl", "3 × 10–15"),
        _exercise("Lying leg curl", "3 × 10–15"),
        _exercise("Single-leg Romanian deadlift", "3 × 8–12/leg"),
        _exercise("Good morning", "3 × 8–12"),
        _exercise("Nordic curl regression", "3 × 5–8"),
        _exercise("Cable pull-through", "3 × 10–15"),
        _exercise("Stability-ball leg curl", "3 × 10–15"),
        _exercise("45-degree back extension", "3 × 10–15"),
        _exercise("Slider leg curl", "2 × 8–12"),
    ],
    "glutes": [
        _exercise("Barbell hip thrust", "3 × 6–10"),
        _exercise("Romanian deadlift", "3 × 8–12"),
        _exercise("Bulgarian split squat", "3 × 8–12/leg"),
        _exercise("Cable kickback", "3 × 12–15/leg"),
        _exercise("Step-up", "3 × 8–12/leg"),
        _exercise("Reverse lunge", "3 × 8–12/leg"),
        _exercise("45-degree back extension", "3 × 10–15"),
        _exercise("Hip abduction machine", "3 × 12–20"),
        _exercise("Frog pump", "2 × 15–25"),
        _exercise("Single-leg hip thrust", "3 × 10–15/leg"),
    ],
    "biceps": [
        _exercise("EZ-bar curl", "3 × 8–12"),
        _exercise("Incline dumbbell curl", "3 × 10–15"),
        _exercise("Cable curl", "3 × 10–15"),
        _exercise("Hammer curl", "3 × 8–12"),
        _exercise("Preacher curl", "3 × 10–15"),
        _exercise("Bayesian cable curl", "2 × 12–15/side"),
        _exercise("Spider curl", "2 × 10–15"),
        _exercise("Reverse curl", "2 × 10–15"),
        _exercise("Concentration curl", "2 × 10–15/side"),
        _exercise("Machine curl", "3 × 10–15"),
    ],
    "triceps": [
        _exercise("Cable pressdown", "3 × 10–15"),
        _exercise("Overhead cable extension", "3 × 10–15"),
        _exercise("Close-grip bench press", "3 × 6–10"),
        _exercise("Dumbbell skull crusher", "3 × 8–12"),
        _exercise("Assisted dip", "3 × 6–10"),
        _exercise("Cross-body cable extension", "2 × 12–15/side"),
        _exercise("Single-arm pressdown", "2 × 12–15/side"),
        _exercise("Diamond push-up", "3 × 8–15"),
        _exercise("Machine dip", "3 × 8–12"),
        _exercise("JM press", "2 × 8–12"),
    ],
    "core": [
        _exercise("Cable crunch", "3 × 10–15"),
        _exercise("Hanging knee raise", "3 × 8–15"),
        _exercise("Ab wheel rollout", "3 × 6–12"),
        _exercise("Pallof press", "3 × 10–12/side"),
        _exercise("Side plank", "3 × 20–40 sec/side"),
        _exercise("Dead bug", "3 × 8–12/side"),
        _exercise("Reverse crunch", "3 × 10–15"),
        _exercise("Suitcase carry", "3 × 20–40 m/side"),
        _exercise("Plank", "3 × 25–45 sec"),
        _exercise("Bird dog", "3 × 8–12/side"),
    ],
    "calves": [
        _exercise("Standing calf raise", "4 × 8–12"),
        _exercise("Seated calf raise", "4 × 10–15"),
        _exercise("Leg-press calf raise", "3 × 10–15"),
        _exercise("Single-leg calf raise", "3 × 10–15/leg"),
        _exercise("Smith-machine calf raise", "3 × 8–12"),
        _exercise("Donkey calf raise", "3 × 12–20"),
        _exercise("Bent-knee calf raise", "3 × 12–20"),
        _exercise("Tibialis raise", "3 × 15–25"),
        _exercise("Farmer walk on toes", "3 × 20–30 m"),
        _exercise("Bodyweight calf pulse", "2 × 20–30"),
    ],
    "forearms": [
        _exercise("Farmer carry", "3 × 25–40 m"),
        _exercise("Reverse curl", "3 × 10–15"),
        _exercise("Hammer curl", "3 × 8–12"),
        _exercise("Wrist curl", "2 × 12–20"),
        _exercise("Reverse wrist curl", "2 × 12–20"),
        _exercise("Plate pinch hold", "3 × 20–40 sec"),
        _exercise("Dead hang", "3 × 20–45 sec"),
        _exercise("Towel cable row", "3 × 10–15"),
        _exercise("Suitcase carry", "3 × 25–40 m/side"),
        _exercise("Wrist roller", "2 × 1–2 rounds"),
    ],
}

WORKOUTS["arms"] = [item for pair in zip(WORKOUTS["biceps"], WORKOUTS["triceps"]) for item in pair]
WORKOUTS["legs"] = [
    WORKOUTS["quads"][0], WORKOUTS["hamstrings"][0], WORKOUTS["quads"][2],
    WORKOUTS["glutes"][2], WORKOUTS["hamstrings"][1], WORKOUTS["quads"][4],
    WORKOUTS["glutes"][0], WORKOUTS["calves"][0], WORKOUTS["quads"][6], WORKOUTS["hamstrings"][5],
]
WORKOUTS["full body"] = [
    _exercise("Goblet squat", "3 × 8–12"),
    _exercise("Dumbbell Romanian deadlift", "3 × 8–12"),
    _exercise("Push-up or machine press", "3 × 8–12"),
    _exercise("Lat pulldown", "3 × 8–12"),
    _exercise("Dumbbell shoulder press", "2 × 8–12"),
    _exercise("Split squat", "2 × 8–12/leg"),
    _exercise("Seated cable row", "2 × 10–15"),
    _exercise("Pallof press", "3 × 10–12/side"),
    _exercise("Farmer carry", "3 × 25–40 m"),
    _exercise("Standing calf raise", "3 × 10–15"),
]


def extract_body_part(text: str) -> str | None:
    for pattern, body_part in BODY_PART_ALIASES:
        if re.search(pattern, text, re.I):
            return body_part
    return None


def extract_exercise_count(text: str) -> int | None:
    match = re.search(r"\b(10|[1-9])\b", text)
    if match:
        return int(match.group(1))
    for word, number in NUMBER_WORDS.items():
        if re.search(rf"\b{word}\b", text, re.I):
            return number
    return None


def _prior_history(history: list[dict[str, str]], question: str) -> list[dict[str, str]]:
    if history and history[-1].get("role") == "user" and history[-1].get("content", "").strip().lower() == question.strip().lower():
        return history[:-1]
    return history


def _recent_body_part(history: list[dict[str, str]]) -> str | None:
    for item in reversed(history):
        if item.get("role") == "user":
            body_part = extract_body_part(item.get("content", ""))
            if body_part:
                return body_part
    return None


def _asked_to_choose_body_part(history: list[dict[str, str]]) -> bool:
    return any(
        item.get("role") == "assistant"
        and re.search(r"which [^?]{0,50}(?:would you like to|do you want to) train", item.get("content", ""), re.I)
        for item in history[-3:]
    )


def _starts_body_part_workout(question: str) -> bool:
    return bool(
        re.search(r"\b(?:train|training|workout for)\b[^.!?]{0,30}\b(?:a|some|any|one) (?:muscle group|body part|area)\b", question, re.I)
        or re.search(r"\b(?:body part|muscle group) workout\b", question, re.I)
    )


def is_body_part_workout_turn(question: str, history: list[dict[str, str]] | None = None) -> bool:
    earlier = _prior_history(history or [], question)
    body_part = extract_body_part(question)
    asks_for_workout = bool(re.search(r"\b(?:workout|train|training|session|routine|exercises?|variations?|movements?|today)\b", question, re.I))
    form_question = bool(re.search(r"\b(?:form|technique|how (?:do|to)|pain|injury)\b", question, re.I))
    if _starts_body_part_workout(question):
        return True
    if body_part and asks_for_workout and not form_question:
        return True
    if body_part and _asked_to_choose_body_part(earlier):
        return True
    count = extract_exercise_count(question)
    asked_for_count = any(
        item.get("role") == "assistant"
        and re.search(r"how many (?:exercise )?(?:variations|exercises|movements)|choose between 3 and 8 exercises", item.get("content", ""), re.I)
        for item in earlier[-3:]
    )
    return bool(count and asked_for_count and _recent_body_part(earlier))


def body_part_workout_answer(question: str, history: list[dict[str, str]] | None = None) -> str | None:
    earlier = _prior_history(history or [], question)
    body_part = extract_body_part(question) or _recent_body_part(earlier)
    if not body_part:
        if not _starts_body_part_workout(question):
            return None
        return (
            "Which body part or muscle group would you like to train today? For example: chest, back, shoulders, "
            "biceps, triceps, arms, quads, hamstrings, glutes, legs, calves, core, forearms, or full body."
        )
    count = extract_exercise_count(question)
    if not count:
        return f"Great—{body_part} day. How many exercises would you like in this session? Choose a number from 3 to 8 (for example, ‘six’)."
    if count < 3 or count > 8:
        return "Choose between 3 and 8 exercises so the session stays practical."
    exercises = WORKOUTS[body_part][:count]
    lines = [f"{index}. {exercise['name']} — {exercise['prescription']}" for index, exercise in enumerate(exercises, 1)]
    return (
        f"{body_part.upper()} WORKOUT — {count} EXERCISES\n\n" + "\n\n".join(lines)
        + "\n\nRest 2–3 minutes after the first heavy compound movement and 60–90 seconds after the remaining work. "
        "Keep about 2 good reps in reserve and stop any movement that causes sharp or worsening pain."
    )


def common_gym_answer(question: str) -> str | None:
    text = question.lower()
    if re.search(r"rest (?:between|in between) sets|how long.*rest|rest time", text):
        return "Rest about 2–4 minutes after heavy compound lifts, 90–150 seconds for moderate hypertrophy work, and 45–90 seconds for small isolation exercises. Use enough rest to repeat the target reps with stable form."
    if re.search(r"warm.?up|warming up", text):
        return "Use 5–8 minutes of easy movement if helpful, then take 2–4 progressively heavier ramp-up sets for the first lift. Begin working sets before the warm-up creates fatigue."
    if re.search(r"sets? and reps?|how many reps?|rep range", text):
        return "A practical start is 3–5 sets of 3–6 reps for strength, 3–4 sets of 6–12 for muscle-building compounds, and 2–4 sets of 10–20 for isolation work. Keep roughly 2–3 good reps in reserve while learning."
    if re.search(r"progressive overload|how.*progress|increase (?:weight|load)", text):
        return "Use double progression: build reps within a chosen range with clean technique, then add the smallest practical load after every set reaches the top of the range."
    if re.search(r"train(?:ing)? to failure|every set.*failure|go to failure", text):
        return "You do not need to take every set to failure. Keep most compound sets around 1–3 reps in reserve; occasional failure on a safe isolation exercise is optional, not required."
    if re.search(r"exercise order|which exercise first|order.*exercises", text):
        return "Use this order: warm-up, priority lift, other compound movements, isolation work, then core or conditioning. Put the exercise most important to your goal early."
    if re.search(r"how often|times? (?:a|per) week|training frequency|train.*each muscle", text):
        return "Most people can train each major muscle about twice per week. Beginners often do well with three full-body days; upper/lower and push-pull-legs are useful alternatives when weekly volume increases."
    if re.search(r"cardio.*(?:before|after)|(?:before|after).*cardio", text):
        return "If lifting performance is the priority, lift first and do moderate cardio afterward or separately. If endurance is the priority, cardio can come first."
    if re.search(r"substitute|alternative|replace.*exercise|no (?:machine|barbell|dumbbell)", text):
        return "Choose substitutions by movement pattern: replace a squat with another knee-dominant movement, a deadlift with another hinge, and a press or pull with the same direction of movement."
    return None


SUPPORTED_BODY_PARTS = tuple(WORKOUTS)
