import httpx
from typing import Optional
from app.core.config import settings


GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
LIST_MODELS_URL = "https://generativelanguage.googleapis.com/v1beta/models"
FALLBACK_MODELS = (
    settings.GEMINI_MODEL,
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
)


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
        prompt = f"""You are a code expert. A developer is looking at this file:
`{file_path}`

Their question: {question}

Answer clearly and concisely. Reference specific parts of the code when helpful.

--- FILE CONTENT ---
{content[:8000]}
"""
        return await self._call_gemini(prompt)

    async def _call_gemini(self, prompt: str) -> str:
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 512,
                "topP": 0.8,
            },
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            last_error = None
            for model in self._candidate_models():
                url = f"{GEMINI_API_BASE}/{model}:generateContent?key={self.api_key}"
                resp = await client.post(url, json=payload)
                if resp.status_code == 404:
                    last_error = f"Model not found: {model}"
                    continue
                if resp.status_code in {400, 403}:
                    self._raise_api_error(resp)
                resp.raise_for_status()
                return self._extract_text(resp.json())

            discovered = await self._discover_model(client)
            if discovered:
                url = f"{GEMINI_API_BASE}/{discovered}:generateContent?key={self.api_key}"
                resp = await client.post(url, json=payload)
                if resp.is_success:
                    return self._extract_text(resp.json())
                self._raise_api_error(resp)

        raise ValueError(
            last_error
            or "No compatible Gemini model was available. Set GEMINI_MODEL in backend/.env."
        )

    def _candidate_models(self) -> list[str]:
        seen = set()
        candidates = []
        for model in FALLBACK_MODELS:
            if model and model not in seen:
                candidates.append(model)
                seen.add(model)
        return candidates

    async def _discover_model(self, client: httpx.AsyncClient) -> Optional[str]:
        resp = await client.get(f"{LIST_MODELS_URL}?key={self.api_key}")
        if not resp.is_success:
            return None

        data = resp.json()
        models = data.get("models", [])
        preferred = []
        for model in models:
            name = model.get("name", "")
            methods = model.get("supportedGenerationMethods", [])
            if "generateContent" not in methods:
                continue
            if "flash" in name:
                preferred.append(name.split("/")[-1])

        preferred.sort(key=self._model_rank)
        return preferred[0] if preferred else None

    @staticmethod
    def _model_rank(name: str) -> tuple[int, int, str]:
        if "2.5-flash" in name:
            return (0, 0, name)
        if "2.0-flash" in name:
            return (1, 0, name)
        if "flash-lite" in name:
            return (2, 0, name)
        return (3, 0, name)

    @staticmethod
    def _extract_text(data: dict) -> str:
        try:
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
        except (KeyError, IndexError) as e:
            raise ValueError(f"Unexpected Gemini response format: {data}") from e

    @staticmethod
    def _raise_api_error(resp: httpx.Response) -> None:
        try:
            data = resp.json()
            detail = data.get("error", {}).get("message") or data
        except Exception:
            detail = resp.text
        raise ValueError(f"Gemini API error ({resp.status_code}): {detail}")
