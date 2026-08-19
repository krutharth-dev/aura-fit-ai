from __future__ import annotations

import sys
import re
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.graph import AuraFitAgent, estimate_one_rep_max, safe_math
from app.programs import build_program
from app.workouts import SUPPORTED_BODY_PARTS


class AuraFitAgentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.agent = AuraFitAgent()

    def test_route_selection(self) -> None:
        self.assertEqual(self.agent.choose_route("Build me a 4-day workout plan"), "program")
        self.assertEqual(self.agent.choose_route("Explain squat form"), "exercise")
        self.assertEqual(self.agent.choose_route("My legs are still sore"), "recovery")
        self.assertEqual(self.agent.choose_route("Estimate 100 kg x 5"), "calculator")
        self.assertEqual(self.agent.choose_route("How much protein should I eat?"), "nutrition")
        self.assertEqual(self.agent.choose_route("Could this ankle pain be an injury?"), "health")

    def test_training_calculators(self) -> None:
        self.assertEqual(safe_math("(20 * 2.5) + 10"), 60)
        self.assertEqual(estimate_one_rep_max(100, 5), 115)
        with self.assertRaises(ValueError):
            safe_math("__import__('os').system('echo unsafe')")

    def test_program_requires_profile_details(self) -> None:
        result = self.agent.invoke("Make me a workout plan", thread_id="test-profile")
        self.assertEqual(result["route"], "program")
        self.assertIn("goal", result["answer"].lower())
        self.assertIn("equipment", result["answer"].lower())

    def test_program_honours_requested_day_count(self) -> None:
        for days in range(2, 7):
            answer = build_program(f"Create a {days}-day muscle plan for an intermediate lifter, 60 minutes, full gym, no limitations")
            self.assertEqual(len(re.findall(r"(?m)^DAY \d+ —", answer)), days)

    def test_program_respects_home_equipment_and_limitations(self) -> None:
        home = build_program("Create a 3-day fitness plan for a beginner, 35 minutes, dumbbells at home, no injuries")
        unsafe = build_program("Create a 4-day muscle plan for an intermediate lifter, 60 minutes, full gym, after recent surgery")
        self.assertIn("Goblet squat", home)
        self.assertNotIn("Back squat", home)
        self.assertIn("won't guess", unsafe)

    def test_offline_exercise_answer(self) -> None:
        result = self.agent.invoke("Explain squat form", thread_id="test-form")
        self.assertEqual(result["route"], "exercise")
        self.assertIn("squat", result["answer"].lower())
        self.assertTrue(result["source"])

    def test_safety_guard(self) -> None:
        result = self.agent.invoke("I fainted and have chest pain during training", thread_id="test-safety")
        self.assertEqual(result["route"], "recovery")
        self.assertIn("emergency", result["answer"].lower())
        mixed = self.agent.invoke("I have chest pain, but how long should I rest between sets?", thread_id="test-safety-mixed")
        self.assertEqual(mixed["route"], "recovery")

    def test_broad_health_and_nutrition_routes_are_bounded(self) -> None:
        nutrition = self.agent.invoke("How much protein should I eat?", thread_id="test-nutrition")
        health = self.agent.invoke("Could this ankle pain be an injury?", thread_id="test-health")
        self.assertEqual(nutrition["route"], "nutrition")
        self.assertIn("1.6", nutrition["answer"])
        self.assertEqual(health["route"], "health")
        self.assertIn("cannot diagnose", health["answer"].lower())

    def test_body_part_workout_is_guided_without_a_default_muscle(self) -> None:
        request = "I want to train a body part today"
        first = self.agent.invoke(request, thread_id="test-body-part-question")
        self.assertEqual(first["route"], "program")
        self.assertIn("which body part", first["answer"].lower())

        body_part_history = [
            {"role": "user", "content": request},
            {"role": "assistant", "content": first["answer"]},
            {"role": "user", "content": "chest"},
        ]
        second = self.agent.invoke("chest", history=body_part_history, thread_id="test-body-part-count-question")
        self.assertEqual(second["route"], "program")
        self.assertIn("how many exercises", second["answer"].lower())

        count_history = body_part_history + [
            {"role": "assistant", "content": second["answer"]},
            {"role": "user", "content": "five"},
        ]
        third = self.agent.invoke("five", history=count_history, thread_id="test-body-part-answer")
        self.assertEqual(third["route"], "program")
        self.assertIn("CHEST WORKOUT — 5 EXERCISES", third["answer"])
        self.assertNotIn("BACK WORKOUT", third["answer"])
        self.assertEqual(len(re.findall(r"(?m)^\d+\.", third["answer"])), 5)

        for invalid_count in ("two", "nine"):
            invalid_history = body_part_history + [
                {"role": "assistant", "content": second["answer"]},
                {"role": "user", "content": invalid_count},
            ]
            invalid = self.agent.invoke(invalid_count, history=invalid_history, thread_id=f"test-body-part-{invalid_count}")
            self.assertIn("between 3 and 8 exercises", invalid["answer"])

        retry_history = body_part_history + [
            {"role": "assistant", "content": second["answer"]},
            {"role": "user", "content": "two"},
            {"role": "assistant", "content": "Choose between 3 and 8 exercises so the session stays practical."},
            {"role": "user", "content": "nine"},
            {"role": "assistant", "content": "Choose between 3 and 8 exercises so the session stays practical."},
            {"role": "user", "content": "five"},
        ]
        recovered = self.agent.invoke("five", history=retry_history, thread_id="test-body-part-recovered")
        self.assertIn("CHEST WORKOUT — 5 EXERCISES", recovered["answer"])

    def test_every_supported_body_part_generates_requested_count(self) -> None:
        for body_part in SUPPORTED_BODY_PARTS:
            with self.subTest(body_part=body_part):
                result = self.agent.invoke(
                    f"Give me 3 {body_part} exercises",
                    thread_id=f"test-{body_part.replace(' ', '-')}",
                )
                self.assertEqual(result["route"], "program")
                self.assertEqual(len(re.findall(r"(?m)^\d+\.", result["answer"])), 3)

    def test_common_gym_question_works_offline(self) -> None:
        result = self.agent.invoke("How long should I rest between sets?", thread_id="test-rest")
        self.assertEqual(result["route"], "general")
        self.assertIn("2–4 minutes", result["answer"])


if __name__ == "__main__":
    unittest.main()
