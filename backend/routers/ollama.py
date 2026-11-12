"""Routes for running a real request against a local Ollama model.

Everything here is MEASURED. The HTTP layer lives in this file; the actual
Ollama conversation and timing live in services/ollama.py.
"""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from services import ollama

router = APIRouter(prefix="/ollama", tags=["ollama"])


class OllamaStatus(BaseModel):
    available: bool
    version: str | None = None
    models: list[dict] = Field(default_factory=list)
    error: str | None = None


class ChatRequest(BaseModel):
    model: str = Field(..., min_length=1, max_length=200)
    prompt: str = Field(..., min_length=1, max_length=20_000)
    max_tokens: int = Field(200, ge=1, le=4096)


@router.get("/status", response_model=OllamaStatus)
async def status() -> OllamaStatus:
    """Report whether Ollama is running locally, and which models it has.

    A missing Ollama is a supported state, not an error: the app falls back to
    the simulator and says so.
    """
    return OllamaStatus(**await ollama.probe())


@router.post("/chat")
async def chat(request: ChatRequest) -> StreamingResponse:
    """Stream a real model response, with both our timings and Ollama's."""
    return StreamingResponse(
        ollama.stream_chat(request.model, request.prompt, request.max_tokens),
        media_type="application/x-ndjson",
        headers={
            # Buffering anywhere in the chain would destroy the timings.
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
        },
    )
