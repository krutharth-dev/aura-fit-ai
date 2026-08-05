from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any


class GroqLLM:
    def __init__(self) -> None:
        self.api_key = os.getenv("GROQ_API_KEY", "").strip()
        self.model = os.getenv("GROQ_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")

    @property
    def available(self) -> bool:
        return bool(self.api_key)

    def complete(self, system: str, question: str, history: list[dict[str, str]] | None = None) -> str | None:
        if not self.api_key:
            return None

        messages: list[dict[str, Any]] = [{"role": "system", "content": system}]
        messages.extend((history or [])[-8:])
        messages.append({"role": "user", "content": question})
        payload = json.dumps({
            "model": self.model,
            "messages": messages,
            "temperature": 0.3,
            "max_completion_tokens": 700,
        }).encode("utf-8")
        request = urllib.request.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=payload,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=25) as response:
                data = json.loads(response.read().decode("utf-8"))
                return str(data["choices"][0]["message"]["content"])
        except (urllib.error.URLError, KeyError, IndexError, json.JSONDecodeError):
            return None
