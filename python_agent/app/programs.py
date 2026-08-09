from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class Profile:
    goal: str
    experience: str
    days: int
    minutes: int
    equipment: str


SPLITS = {
    2: ["FULL BODY A", "FULL BODY B"],
    3: ["FULL BODY A", "FULL BODY B", "FULL BODY C"],
    4: ["UPPER A", "LOWER A", "UPPER B", "LOWER B"],
    5: ["PUSH", "PULL", "LEGS", "UPPER", "LOWER"],
    6: ["PUSH A", "PULL A", "LEGS A", "PUSH B", "PULL B", "LEGS B"],
}

GYM = ["Back squat", "Bench press", "Chest-supported row", "Romanian deadlift", "Lat pulldown", "Cable crunch"]
HOME = ["Goblet squat", "Dumbbell floor press", "One-arm dumbbell row", "Dumbbell Romanian deadlift", "Reverse lunge", "Dead bug"]
BODYWEIGHT = ["Tempo squat", "Push-up", "Table row or towel row", "Single-leg hip hinge", "Reverse lunge", "Dead bug"]


def _profile(message: str) -> tuple[Profile | None, list[str], bool]:
    text = message.lower()
    goal = "muscle" if re.search(r"muscle|hypertrophy|gain", text) else "strength" if re.search(r"strength|power", text) else "fat-loss" if re.search(r"fat.?loss|lose weight", text) else "fitness" if re.search(r"fitness|endurance|health", text) else ""
    experience = "beginner" if re.search(r"beginner|novice|new to", text) else "intermediate" if "intermediate" in text else "advanced" if "advanced" in text else ""
    digit = re.search(r"\b([2-6])\s*(?:-| )?days?\b", text)
    words = {"two": 2, "three": 3, "four": 4, "five": 5, "six": 6}
    word_day = next((value for word, value in words.items() if re.search(fr"\b{word}[- ]day", text)), 0)
    days = int(digit.group(1)) if digit else word_day
    minute_match = re.search(r"\b(\d{2,3})\s*(?:-| )?(?:minutes?|mins?)\b", text)
    minutes = int(minute_match.group(1)) if minute_match else 0
    equipment = "bodyweight" if re.search(r"bodyweight|no equipment", text) else "home" if re.search(r"home|dumbbell", text) else "gym" if re.search(r"full gym|gym access|barbell|machine", text) else ""
    limitations = bool(re.search(r"\bnone\b|pain[- ]free|no (?:pain|injur(?:y|ies)|limitations?|restrictions?)|pain|injur|limitation|restriction|recent surgery|pregnan", text))
    missing = [label for condition, label in [
        (goal, "main goal"), (experience, "experience level"), (days, "2–6 training days"),
        (20 <= minutes <= 180, "20–180 minutes per session"), (equipment, "available equipment"),
        (limitations, "pain, injuries or limitations (say 'none' if applicable)"),
    ] if not condition]
    reported = bool(re.search(r"pain|injur|limitation|restriction|recent surgery|pregnan", text)) and not bool(re.search(r"pain[- ]free|no (?:pain|injur(?:y|ies)|limitations?|restrictions?)", text))
    return (Profile(goal, experience, days, minutes, equipment) if not missing and not reported else None, missing, reported)


def build_program(message: str) -> str:
    profile, missing, reported = _profile(message)
    if missing:
        return f"I can personalise that, but I still need: {', '.join(missing)}.\n\nExample: 'Muscle gain, intermediate, 4 days, 60 minutes, full gym, no limitations.'"
    if reported:
        return "I won't guess how to program around a reported injury, pain, pregnancy, recent surgery or other limitation. Use restrictions supplied by an appropriate clinician or qualified in-person coach, then send those exact restrictions."
    assert profile is not None
    exercises = GYM if profile.equipment == "gym" else HOME if profile.equipment == "home" else BODYWEIGHT
    limit = 4 if profile.minutes < 45 else 5 if profile.minutes < 70 else 6
    prescription = "4 × 4–6" if profile.goal == "strength" and profile.experience != "beginner" else "3 × 6–10" if profile.goal in {"strength", "muscle"} else "3 × 8–12"
    sessions = []
    for index, title in enumerate(SPLITS[profile.days], start=1):
        rotated = exercises[(index - 1) % len(exercises):] + exercises[:(index - 1) % len(exercises)]
        lines = [f"{number}. {exercise} — {prescription}" for number, exercise in enumerate(rotated[:limit], start=1)]
        sessions.append(f"DAY {index} — {title}\n" + "\n".join(lines))
    label = "MUSCLE-BUILDING" if profile.goal == "muscle" else profile.goal.upper()
    return f"YOUR {profile.days}-DAY {label} PLAN\n\nPROFILE — {profile.experience} · {profile.minutes} minutes · {profile.equipment} · no limitations reported\n\n" + "\n\n".join(sessions) + "\n\nEFFORT — Keep most working sets around 2 reps in reserve.\n\nPROGRESSION — Add reps first; then add the smallest practical load after all sets reach the top of the range with stable technique."
