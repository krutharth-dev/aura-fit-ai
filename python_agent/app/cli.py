from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env.local")
load_dotenv(PROJECT_ROOT / ".env")

from .graph import AuraFitAgent


def main() -> None:
    agent = AuraFitAgent()
    print("AURA FIT CLI · type 'exit' to stop")
    print(f"Graph: {'LangGraph' if agent.uses_langgraph else 'built-in fallback'} | Knowledge: {agent.knowledge.engine}\n")
    while True:
        question = input("You > ").strip()
        if question.lower() in {"exit", "quit"}:
            break
        if not question:
            continue
        result = agent.invoke(question, thread_id="cli")
        print(f"\nAURA FIT [{result['route']}] > {result['answer']}")
        print(f"Source: {result['source']}\n")


if __name__ == "__main__":
    main()
