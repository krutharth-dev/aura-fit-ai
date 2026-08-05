from __future__ import annotations

import hashlib
import json
import math
import re
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "data" / "fitness_knowledge.json"
CHROMA_PATH = ROOT / ".chroma"
EMBEDDING_SIZE = 128


def _tokens(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


def hash_embedding(text: str) -> list[float]:
    """Create a small deterministic embedding with no model download required."""
    vector = [0.0] * EMBEDDING_SIZE
    for token in _tokens(text):
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:4], "big") % EMBEDDING_SIZE
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vector[index] += sign
    magnitude = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [value / magnitude for value in vector]


class FitnessKnowledge:
    def __init__(self) -> None:
        self.documents: list[dict[str, Any]] = json.loads(DATA_FILE.read_text(encoding="utf-8"))
        self.collection = None
        self.engine = "keyword fallback"
        try:
            import chromadb

            client = chromadb.PersistentClient(path=str(CHROMA_PATH))
            self.collection = client.get_or_create_collection(
                name="aura_fit_fitness_knowledge_v1",
                metadata={"description": "AURA FIT exercise and programming knowledge"},
            )
            if self.collection.count() == 0:
                self.collection.add(
                    ids=[item["id"] for item in self.documents],
                    documents=[item["content"] for item in self.documents],
                    metadatas=[{"title": item["title"], "source": item["source"]} for item in self.documents],
                    embeddings=[hash_embedding(item["content"]) for item in self.documents],
                )
            self.engine = "ChromaDB persistent vector search"
        except Exception:
            self.collection = None

    def search(self, query: str, limit: int = 3) -> list[dict[str, str]]:
        if self.collection is not None:
            result = self.collection.query(
                query_embeddings=[hash_embedding(query)],
                n_results=min(limit, len(self.documents)),
                include=["documents", "metadatas", "distances"],
            )
            rows: list[dict[str, str]] = []
            for document, metadata in zip(result["documents"][0], result["metadatas"][0]):
                rows.append({
                    "title": str(metadata.get("title", "Training knowledge")),
                    "source": str(metadata.get("source", "Local knowledge base")),
                    "content": str(document),
                })
            return rows

        query_terms = set(_tokens(query))
        scored = []
        for item in self.documents:
            score = len(query_terms.intersection(_tokens(item["title"] + " " + item["content"])))
            scored.append((score, item))
        scored.sort(key=lambda row: row[0], reverse=True)
        return [item for _, item in scored[:limit]]
