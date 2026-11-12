"""Optional external model provider.

NLPulse never requires an external API. The seminar runs entirely on the
simulator plus local measurements. This router exists so that *if* someone
configures a provider later, the same Real Test screen can also report genuine
TTFT and tokens-per-second from a real model.

Configuration is read from environment variables only. No keys are ever stored
in the repository, logged, or returned to the browser.

    NLPULSE_PROVIDER_BASE_URL   e.g. http://localhost:11434/v1
    NLPULSE_PROVIDER_API_KEY    optional bearer token
    NLPULSE_PROVIDER_MODEL      model name to request

Any OpenAI-compatible chat-completions endpoint will work, including local
servers, which keeps the offline promise intact.
"""

from __future__ import annotations

import json
import os
import time

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from models.schemas import ProviderStatus

router = APIRouter(prefix="/provider", tags=["provider"])


def _config() -> dict[str, str | None]:
    return {
        "base_url": os.environ.get("NLPULSE_PROVIDER_BASE_URL"),
        "api_key": os.environ.get("NLPULSE_PROVIDER_API_KEY"),
        "model": os.environ.get("NLPULSE_PROVIDER_MODEL"),
    }


@router.get("/status", response_model=ProviderStatus)
async def status() -> ProviderStatus:
    """Report whether a real model endpoint is available.

    The frontend calls this on load and simply hides the real-model panel when
    nothing is configured, so an unconfigured install shows no broken buttons.
    """
    config = _config()
    configured = bool(config["base_url"] and config["model"])

    return ProviderStatus(
        configured=configured,
        # The base URL is not returned: it can contain internal hostnames.
        provider=None if not configured else "openai-compatible",
        model=config["model"] if configured else None,
        note=(
            "A real model endpoint is configured. Values from it are MEASURED."
            if configured
            else "No external model configured. This is expected — the simulation "
            "and the local measurements do not need one."
        ),
    )


class CompletionRequest(BaseModel):
    prompt: str = Field(..., max_length=20_000)
    max_tokens: int = Field(128, ge=1, le=2048)


@router.post("/complete")
async def complete(request: CompletionRequest) -> StreamingResponse:
    """Stream from a configured external model, timing the real chunk arrivals."""
    config = _config()
    if not (config["base_url"] and config["model"]):
        raise HTTPException(
            status_code=501,
            detail=(
                "No external model is configured. Set NLPULSE_PROVIDER_BASE_URL and "
                "NLPULSE_PROVIDER_MODEL to enable this endpoint. The seminar does "
                "not require it."
            ),
        )

    try:
        import httpx
    except ImportError as exc:  # pragma: no cover - only hit in trimmed installs
        raise HTTPException(
            status_code=501,
            detail="httpx is not installed, so the optional provider bridge is unavailable.",
        ) from exc

    headers = {"Content-Type": "application/json"}
    if config["api_key"]:
        headers["Authorization"] = f"Bearer {config['api_key']}"

    body = {
        "model": config["model"],
        "messages": [{"role": "user", "content": request.prompt}],
        "max_tokens": request.max_tokens,
        "stream": True,
    }

    async def generate():
        started = time.perf_counter()
        first_chunk_at: float | None = None
        tokens = 0

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    f"{config['base_url'].rstrip('/')}/chat/completions",
                    json=body,
                    headers=headers,
                ) as upstream:
                    if upstream.status_code >= 400:
                        detail = (await upstream.aread()).decode("utf-8", "replace")[:400]
                        yield json.dumps({"error": f"Upstream {upstream.status_code}: {detail}"}) + "\n"
                        return

                    async for line in upstream.aiter_lines():
                        if not line.startswith("data:"):
                            continue
                        data = line[5:].strip()
                        if data == "[DONE]":
                            break

                        try:
                            parsed = json.loads(data)
                        except json.JSONDecodeError:
                            continue

                        delta = (
                            parsed.get("choices", [{}])[0].get("delta", {}).get("content")
                        )
                        if not delta:
                            continue

                        now = time.perf_counter()
                        if first_chunk_at is None:
                            first_chunk_at = now
                        tokens += 1

                        yield json.dumps(
                            {
                                "index": tokens - 1,
                                "text": delta,
                                "server_elapsed_ms": round((now - started) * 1000, 3),
                            }
                        ) + "\n"

        except Exception as exc:  # noqa: BLE001 - surfaced to the UI, not swallowed
            yield json.dumps({"error": f"{type(exc).__name__}: {exc}"}) + "\n"
            return

        total_ms = (time.perf_counter() - started) * 1000
        ttft_ms = (first_chunk_at - started) * 1000 if first_chunk_at else None

        yield json.dumps(
            {
                "index": -1,
                "done": True,
                "server_ttft_ms": round(ttft_ms, 3) if ttft_ms is not None else None,
                "server_total_ms": round(total_ms, 3),
                # Chunks are not necessarily one token each; the UI says so.
                "chunks": tokens,
            }
        ) + "\n"

    return StreamingResponse(generate(), media_type="application/x-ndjson")
