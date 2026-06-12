import os
import httpx
from typing import Optional
from app.core.config import settings


GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
MODEL = "gemini-1.5-flash"   # Fast + cheap; swap to gemini-1.5-pro for deeper analysis


class AIService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        if not self.api_key:
            raise EnvironmentError(
                "GEMINI_API_KEY is not set. Get one free at https://aistudio.google.com"
            )

    async def summarize_file(
        self,
        content: str,
        file_path: str,
        language: Optional[str] = None,
    ) -> str:
        """
        Ask Gemini to explain what a file does in plain English.
        Returns a 3-sentence summary.
        """
        lang_hint = f" (written in {language})" if language else ""
        prompt = f"""You are a senior developer helping a team understand a large codebase.

Analyze this file: `{file_path}`{lang_hint}

Respond with EXACTLY 3 sentences:
1. What this file's main purpose is.
2. The key functions, classes, or exports it provides.
3. How it fits into the broader system (based on its name and imports if visible).

Keep it concise, jargon-free, and useful for a developer who has never seen this file before.

--- FILE CONTENT ---
{content[:8000]}
"""
        return await self._call_gemini(prompt)

    async def answer_question(
        self,
        content: str,
        file_path: str,
        question: str,
    ) -> str:
        """
        Answer a specific developer question about a file.
        """
        prompt = f"""You are a code expert. A developer is looking at this file:
`{file_path}`

Their question: {question}

Answer clearly and concisely. Reference specific parts of the code when helpful.

--- FILE CONTENT ---
{content[:8000]}
"""
        return await self._call_gemini(prompt)

    async def _call_gemini(self, prompt: str) -> str:
        url = f"{GEMINI_API_BASE}/{MODEL}:generateContent?key={self.api_key}"

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 512,
                "topP": 0.8,
            },
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()

        try:
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
        except (KeyError, IndexError) as e:
            raise ValueError(f"Unexpected Gemini response format: {data}") from e
