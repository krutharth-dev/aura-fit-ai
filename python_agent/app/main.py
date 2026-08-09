from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .graph import AuraFitAgent


PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env.local")
load_dotenv(PROJECT_ROOT / ".env")
agent: AuraFitAgent | None = None


@asynccontextmanager
async def lifespan(_: FastAPI):
    global agent
    agent = AuraFitAgent()
    yield


app = FastAPI(
    title="AURA FIT Agent API",
    description="LangGraph + ChromaDB backend for the AURA FIT AI Training Coach",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:4173",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=8000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    history: list[Message] = Field(default_factory=list, max_length=20)
    thread_id: str = Field(default="default-session", min_length=8, max_length=100, pattern=r"^[A-Za-z0-9_-]+$")


class ChatResponse(BaseModel):
    answer: str
    route: str
    source: str
    trace: list[str]


@app.get("/health")
def health() -> dict[str, object]:
    if agent is None:
        return {"status": "starting"}
    return {
        "status": "ready",
        "mode": "live-groq" if agent.llm.available else "demo-safe",
        "langgraph": agent.uses_langgraph,
        "knowledge_engine": agent.knowledge.engine,
    }


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    if agent is None:
        raise HTTPException(status_code=503, detail="Agent is starting")
    state = agent.invoke(
        request.message,
        [message.model_dump() for message in request.history],
        request.thread_id,
    )
    return ChatResponse(
        answer=state["answer"],
        route=state["route"],
        source=state["source"],
        trace=state.get("trace", []),
    )
