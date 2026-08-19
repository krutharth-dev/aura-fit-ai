from __future__ import annotations

import ast
import operator
import re
from typing import Any, Literal, TypedDict

from .knowledge import FitnessKnowledge
from .llm import GroqLLM
from .programs import build_program
from .workouts import body_part_workout_answer, common_gym_answer, is_body_part_workout_turn


class AgentState(TypedDict, total=False):
    question: str
    history: list[dict[str, str]]
    route: str
    context: str
    answer: str
    source: str
    trace: list[str]


OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.Mod: operator.mod,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}


def safe_math(expression: str) -> float | int:
    def evaluate(node: ast.AST) -> float | int:
        if isinstance(node, ast.Expression):
            return evaluate(node.body)
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            return node.value
        if isinstance(node, ast.BinOp) and type(node.op) in OPERATORS:
            return OPERATORS[type(node.op)](evaluate(node.left), evaluate(node.right))
        if isinstance(node, ast.UnaryOp) and type(node.op) in OPERATORS:
            return OPERATORS[type(node.op)](evaluate(node.operand))
        raise ValueError("Unsupported calculation")

    if len(expression) > 100:
        raise ValueError("Expression is too long")
    return evaluate(ast.parse(expression, mode="eval"))


def estimate_one_rep_max(weight: float, reps: int) -> int:
    if weight <= 0 or reps < 1 or reps > 12:
        raise ValueError("Use a positive weight and 1–12 reps")
    epley = weight * (1 + reps / 30)
    brzycki = weight * (36 / (37 - reps))
    return round((epley + brzycki) / 2)


class AuraFitAgent:
    def __init__(self) -> None:
        self.knowledge = FitnessKnowledge()
        self.llm = GroqLLM()
        self.graph = self._build_graph()
        self.uses_langgraph = self.graph is not None

    def _build_graph(self) -> Any | None:
        try:
            from langgraph.checkpoint.memory import MemorySaver
            from langgraph.graph import END, START, StateGraph

            builder = StateGraph(AgentState)
            builder.add_node("router", self._router_node)
            builder.add_node("program", self._program_node)
            builder.add_node("exercise", self._exercise_node)
            builder.add_node("recovery", self._recovery_node)
            builder.add_node("calculator", self._calculator_node)
            builder.add_node("nutrition", self._nutrition_node)
            builder.add_node("health", self._health_node)
            builder.add_node("general", self._general_node)
            builder.add_edge(START, "router")
            builder.add_conditional_edges(
                "router",
                lambda state: state["route"],
                {
                    "program": "program",
                    "exercise": "exercise",
                    "recovery": "recovery",
                    "calculator": "calculator",
                    "nutrition": "nutrition",
                    "health": "health",
                    "general": "general",
                },
            )
            for node in ("program", "exercise", "recovery", "calculator", "nutrition", "health", "general"):
                builder.add_edge(node, END)
            return builder.compile(checkpointer=MemorySaver())
        except ImportError:
            return None

    @staticmethod
    def choose_route(question: str) -> Literal["program", "exercise", "recovery", "calculator", "nutrition", "health", "general"]:
        text = question.lower()
        if re.search(r"chest pain|faint|severe.*breath|new.*numb|new.*weak|major.*injur|sharp|worsening|swelling|cannot bear|can.t bear", text):
            return "recovery"
        if re.search(r"1\s*rm|one.rep.max|calculate|estimate|max from|\d+\s*(?:kg|lb|lbs)?\s*(?:x|for)\s*\d+|plate math|percentage", text):
            return "calculator"
        if re.search(r"diet|nutrition|protein|calorie|macro|meal|food|hydration|electrolyte|supplement|creatine|caffeine|vitamin|weight loss|fat loss|bulk", text):
            return "nutrition"
        if re.search(r"symptom|medical|health|diagnos|doctor|physio|fracture|sprain|strain|tendon|ligament|joint|swelling|injur|pain", text):
            return "health"
        if re.search(r"plan|program|routine|split|workout schedule|days? (?:a|per) week|muscle building|hypertrophy program|strength program", text):
            return "program"
        if re.search(r"pain|injur|sore|soreness|recover|recovery|rest day|sleep|fatigue|deload|ache|faint|chest pain|breath", text):
            return "recovery"
        if is_body_part_workout_turn(question):
            return "program"
        if common_gym_answer(question):
            return "general"
        if re.search(r"form|technique|how (?:do|to)|exercise|squat|bench|deadlift|row|pulldown|press|curl|lunge|hinge|pull.?up", text):
            return "exercise"
        return "general"

    def _router_node(self, state: AgentState) -> AgentState:
        if re.search(r"chest pain|faint|severe.*breath|new.*numb|new.*weak|major.*injur|sharp|worsening|swelling|cannot bear|can.t bear", state["question"], re.I):
            route = "recovery"
        elif is_body_part_workout_turn(state["question"], state.get("history")):
            route = "program"
        else:
            route = self.choose_route(state["question"])
        return {"route": route, "trace": ["Assessed training request", f"Selected {route} route"]}

    def _context_for(self, question: str, limit: int = 3) -> tuple[str, str]:
        results = self.knowledge.search(question, limit=limit)
        context = "\n\n".join(f"{item['title']}: {item['content']}" for item in results)
        return context, f"{self.knowledge.engine} · {len(results)} matches"

    def _program_node(self, state: AgentState) -> AgentState:
        body_part_answer = body_part_workout_answer(state["question"], state.get("history"))
        if is_body_part_workout_turn(state["question"], state.get("history")) and body_part_answer:
            return {
                "answer": body_part_answer,
                "source": "AURA FIT body-part workout engine · Session memory",
                "trace": state.get("trace", []) + ["Matched guided body-part workout flow", "Advanced the workout one step"],
            }

        context, source = self._context_for(state["question"])
        scaffold = build_program(state["question"])
        if scaffold.startswith("YOUR ") and self.llm.available:
            system = (
                "You are AURA FIT. Improve the clarity of the validated program scaffold without changing its day "
                "count, equipment constraints, session length, exercises or safety boundaries. CONTEXT:\n" + context
                + "\n\nVALIDATED SCAFFOLD:\n" + scaffold
            )
            answer = self.llm.complete(system, state["question"], state.get("history")) or scaffold
        else:
            answer = scaffold
        return {
            "answer": answer,
            "source": source,
            "context": context,
            "trace": state.get("trace", []) + ["Validated training profile", "Built constraint-safe program scaffold"],
        }

    def _exercise_node(self, state: AgentState) -> AgentState:
        context, source = self._context_for(state["question"])
        system = (
            "You are AURA FIT. Explain exercise technique in four parts: setup, execution, common errors, and "
            "an easier regression. Be concise. Do not claim to evaluate form you cannot see, and advise stopping "
            "for sharp or worsening pain. CONTEXT:\n" + context
        )
        answer = self.llm.complete(system, state["question"], state.get("history"))
        if not answer:
            answer = "I found this in the exercise library:\n\n" + "\n\n".join(
                f"• {item['title']}: {item['content']}" for item in self.knowledge.search(state["question"], limit=2)
            )
        return {
            "answer": answer,
            "source": source,
            "context": context,
            "trace": state.get("trace", []) + ["Retrieved exercise guidance", "Generated form checklist"],
        }

    def _recovery_node(self, state: AgentState) -> AgentState:
        text = state["question"].lower()
        if re.search(r"chest pain|faint|severe.*breath|new.*numb|new.*weak|major.*injur", text):
            answer = (
                "Stop training and contact your local emergency service now. Chest pain, fainting during exercise, "
                "severe breathing difficulty, new weakness or numbness, or a major acute injury should not be managed "
                "through an AI workout plan. Do not drive yourself if you may be seriously unwell."
            )
            source = "Fitness safety guard"
        elif re.search(r"sharp|worsening|swelling|cannot bear|can.t bear", text):
            answer = (
                "Do not train through sharp or worsening pain, major swelling, instability, or inability to bear weight. "
                "Pause the aggravating exercise and arrange assessment with an appropriate healthcare professional. "
                "I can help modify training after serious causes are excluded, but I cannot diagnose the injury here."
            )
            source = "Fitness safety guard"
        else:
            context, source = self._context_for(state["question"])
            system = (
                "You are AURA FIT. Give conservative educational recovery guidance using the context. Do not diagnose. "
                "Differentiate ordinary soreness from warning signs and advise professional assessment when needed. CONTEXT:\n" + context
            )
            answer = self.llm.complete(system, state["question"], state.get("history")) or (
                "Normal soreness is usually diffuse, tender and improves as you warm up; concerning pain is more likely "
                "sharp, localised, worsening or associated with swelling, weakness or altered movement. If a warm-up "
                "restores normal movement and performance, use a lighter session or train another area. If performance "
                "is clearly reduced, take another recovery day."
            )
        return {
            "answer": answer,
            "source": source,
            "trace": state.get("trace", []) + ["Applied recovery safety screen", "Generated recovery response"],
        }

    def _calculator_node(self, state: AgentState) -> AgentState:
        match = re.search(r"(\d+(?:\.\d+)?)\s*(kg|lb|lbs)?\s*(?:x|for)\s*(\d+)", state["question"], re.I)
        if match:
            weight, unit, reps = float(match.group(1)), (match.group(2) or "kg").lower(), int(match.group(3))
            try:
                estimate = estimate_one_rep_max(weight, reps)
                answer = (
                    f"Estimated 1RM: about {estimate} {unit}\n\nBased on {weight:g} {unit} × {reps} reps using the "
                    "average of two common prediction formulas. Use it for programming, not as a reason to attempt an unsafe true max."
                )
            except ValueError as error:
                answer = str(error)
        else:
            candidates = re.findall(r"[\d\s()+\-*/.%]+", state["question"])
            expression = max(candidates, key=len).strip().replace("%", "/100") if candidates else ""
            try:
                result = safe_math(expression)
                answer = f"Training calculation:\n\n{expression} = {result}"
            except (ValueError, SyntaxError, ZeroDivisionError):
                answer = "For a 1RM estimate, use a format like “100 kg × 5 reps”."
        return {
            "answer": answer,
            "source": "Deterministic training calculator",
            "trace": state.get("trace", []) + ["Executed training calculator"],
        }

    def _nutrition_node(self, state: AgentState) -> AgentState:
        context, source = self._context_for(state["question"])
        system = (
            "You are AURA FIT's sports-nutrition educator. Give practical, goal-aware food and supplement guidance. "
            "Do not prescribe a medical diet, support disordered eating, or override restrictions from a doctor or "
            "accredited dietitian. Ask for relevant preferences and restrictions before calling advice personalised. CONTEXT:\n" + context
        )
        answer = self.llm.complete(system, state["question"], state.get("history")) or (
            "Build meals around a protein source, carbohydrate suited to training demand, vegetables or fruit, and "
            "dietary fat. Adjust portions gradually using performance, recovery, hunger and body-weight trend. For a "
            "healthy resistance-training adult, a common general protein range is about 1.6–2.2 g/kg/day. Medical "
            "conditions, pregnancy, medicines, allergies or an eating-disorder history require individual professional advice."
        )
        return {
            "answer": answer,
            "source": source if not self.llm.available else "Groq sports nutrition route",
            "trace": state.get("trace", []) + ["Applied nutrition safety boundaries", "Generated sports nutrition guidance"],
        }

    def _health_node(self, state: AgentState) -> AgentState:
        context, source = self._context_for(state["question"])
        system = (
            "You are AURA FIT's health-education route. Explain possibilities, warning signs and next steps without "
            "diagnosing, prescribing medicines or claiming to examine the user. Prioritise urgent escalation and recommend "
            "appropriate professional assessment when needed. CONTEXT:\n" + context
        )
        answer = self.llm.complete(system, state["question"], state.get("history")) or (
            "I can explain common possibilities and warning signs, but I cannot diagnose an injury from chat. Pause the "
            "aggravating activity and seek assessment for deformity, inability to bear weight, major swelling, loss of "
            "function, worsening pain, fever, numbness or weakness. Tell me what happened, where it hurts, when it began "
            "and how function has changed for more specific educational guidance."
        )
        return {
            "answer": answer,
            "source": source if not self.llm.available else "Groq health education route",
            "trace": state.get("trace", []) + ["Applied health safety screen", "Generated non-diagnostic guidance"],
        }

    def _general_node(self, state: AgentState) -> AgentState:
        gym_answer = common_gym_answer(state["question"])
        if gym_answer:
            return {
                "answer": gym_answer,
                "source": "AURA FIT gym fundamentals library",
                "trace": state.get("trace", []) + ["Matched common gym question", "Returned verified fundamentals"],
            }

        context, source = self._context_for(state["question"])
        system = (
            "You are AURA FIT, a concise and supportive educational AI training coach. Give useful fitness guidance "
            "without diagnosing or replacing an in-person professional. CONTEXT:\n" + context
        )
        answer = self.llm.complete(system, state["question"], state.get("history"))
        if not answer:
            answer = (
                "I can build a complete program, explain an exercise, plan progression, estimate a 1RM, or help you "
                "think through recovery. Tell me your goal, experience, training days, session length, equipment and limitations."
            )
        return {
            "answer": answer,
            "source": source if not self.llm.available else "Groq fitness coach route",
            "trace": state.get("trace", []) + ["Generated coaching response"],
        }

    def invoke(self, question: str, history: list[dict[str, str]] | None = None, thread_id: str = "default") -> AgentState:
        initial: AgentState = {"question": question, "history": history or [], "trace": []}
        if self.graph is not None:
            return self.graph.invoke(initial, {"configurable": {"thread_id": thread_id}})
        state = {**initial, **self._router_node(initial)}
        nodes = {
            "program": self._program_node,
            "exercise": self._exercise_node,
            "recovery": self._recovery_node,
            "calculator": self._calculator_node,
            "nutrition": self._nutrition_node,
            "health": self._health_node,
            "general": self._general_node,
        }
        return {**state, **nodes[state["route"]](state)}
