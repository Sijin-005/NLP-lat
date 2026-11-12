"""Bridge to a locally running Ollama instance.

This is what turns NLPulse from a pure simulator into something that can also
show a REAL request to a REAL model — while staying entirely offline, because
Ollama runs on this machine.

Why Ollama specifically: it reports its own internal timings, which almost no
hosted provider does. From one response we get

    prompt_eval_duration   how long the model spent reading the prompt (prefill)
    eval_duration          how long it spent generating (decode)
    prompt_eval_count      prompt tokens, counted by the model's real tokenizer
    eval_count             output tokens actually produced
    load_duration          time spent loading the model into memory

which is precisely the stage breakdown the application teaches. Durations come
back in NANOSECONDS and are converted to milliseconds here, once, so no caller
has to remember.

Honesty rule: stages Ollama does not report separately (tokenization, queueing)
are reported as absent rather than invented. The frontend renders them as
"not reported by this provider", which is itself a useful lesson.
"""

from __future__ import annotations

import json
import time
from typing import Any, AsyncIterator

import httpx

# Ollama's default local endpoint. Loopback only — nothing leaves the machine.
OLLAMA_BASE_URL = "http://127.0.0.1:11434"

# Ollama reports every duration in nanoseconds.
NS_PER_MS = 1_000_000


def _ms(nanoseconds: Any) -> float | None:
    """Convert an Ollama nanosecond duration to milliseconds, if present."""
    if nanoseconds is None:
        return None
    try:
        return round(float(nanoseconds) / NS_PER_MS, 3)
    except (TypeError, ValueError):
        return None


async def probe(timeout: float = 2.5) -> dict[str, Any]:
    """Check whether Ollama is reachable and list the installed models.

    Never raises: a missing Ollama is an expected, supported state, not an error.
    """
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            tags = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            tags.raise_for_status()
            payload = tags.json()

            version = None
            try:
                version_response = await client.get(f"{OLLAMA_BASE_URL}/api/version")
                version = version_response.json().get("version")
            except Exception:
                # Version is cosmetic; a failure here must not hide the models.
                pass

        models = [
            {
                "name": model.get("name"),
                "parameterSize": model.get("details", {}).get("parameter_size"),
                "family": model.get("details", {}).get("family"),
                "contextLength": model.get("details", {}).get("context_length"),
                "sizeBytes": model.get("size"),
            }
            for model in payload.get("models", [])
        ]
        # Smallest first: the fastest model makes the best default for a live demo.
        models.sort(key=lambda m: m.get("sizeBytes") or 0)

        return {"available": True, "version": version, "models": models, "error": None}

    except Exception as exc:  # noqa: BLE001 - reported to the UI, never swallowed
        return {
            "available": False,
            "version": None,
            "models": [],
            "error": f"{type(exc).__name__}: {exc}",
        }


async def stream_chat(
    model: str,
    prompt: str,
    max_tokens: int,
) -> AsyncIterator[str]:
    """Stream a real completion, emitting newline-delimited JSON.

    Two clocks are running at once and both are reported:

      * ours    - when the backend actually received each chunk
      * Ollama's - what the model says it spent on prefill and decode

    The frontend uses ours for the transport stages and Ollama's for the model
    stages, and labels each accordingly.
    """
    started = time.perf_counter()
    first_chunk_at: float | None = None
    index = 0

    body = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "stream": True,
        "options": {"num_predict": max_tokens},
    }

    try:
        # Generous timeout: a large model on a cold start can take a while to
        # load, and that wait is itself one of the things being measured.
        async with httpx.AsyncClient(timeout=httpx.Timeout(600.0, connect=10.0)) as client:
            upstream_requested_at = time.perf_counter()

            async with client.stream(
                "POST", f"{OLLAMA_BASE_URL}/api/chat", json=body
            ) as response:
                if response.status_code >= 400:
                    detail = (await response.aread()).decode("utf-8", "replace")[:400]
                    yield json.dumps(
                        {"error": f"Ollama returned {response.status_code}: {detail}"}
                    ) + "\n"
                    return

                async for line in response.aiter_lines():
                    if not line.strip():
                        continue

                    try:
                        chunk = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    if chunk.get("error"):
                        yield json.dumps({"error": str(chunk["error"])}) + "\n"
                        return

                    now = time.perf_counter()
                    text = chunk.get("message", {}).get("content", "")

                    # The final chunk carries the metrics and no text.
                    if chunk.get("done"):
                        yield json.dumps(
                            {
                                "done": True,
                                "doneReason": chunk.get("done_reason"),
                                "serverTotalMs": round((now - started) * 1000, 3),
                                "serverTtfcMs": (
                                    round((first_chunk_at - started) * 1000, 3)
                                    if first_chunk_at is not None
                                    else None
                                ),
                                "backendBeforeUpstreamMs": round(
                                    (upstream_requested_at - started) * 1000, 3
                                ),
                                "chunksReceived": index,
                                # Ollama's own view, converted to milliseconds.
                                "metrics": {
                                    "totalMs": _ms(chunk.get("total_duration")),
                                    "loadMs": _ms(chunk.get("load_duration")),
                                    "promptEvalMs": _ms(chunk.get("prompt_eval_duration")),
                                    "evalMs": _ms(chunk.get("eval_duration")),
                                    "promptTokens": chunk.get("prompt_eval_count"),
                                    "cachedPromptTokens": chunk.get("prompt_eval_cached_count"),
                                    "outputTokens": chunk.get("eval_count"),
                                },
                            }
                        ) + "\n"
                        return

                    if not text:
                        continue

                    if first_chunk_at is None:
                        first_chunk_at = now

                    yield json.dumps(
                        {
                            "index": index,
                            "text": text,
                            "serverElapsedMs": round((now - started) * 1000, 3),
                        }
                    ) + "\n"
                    index += 1

    except Exception as exc:  # noqa: BLE001 - surfaced to the UI
        yield json.dumps({"error": f"{type(exc).__name__}: {exc}"}) + "\n"
