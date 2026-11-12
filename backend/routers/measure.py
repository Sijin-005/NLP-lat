"""Real measurement endpoints.

Everything here produces MEASURED values: real timings from real clocks. They
measure this machine and this browser, which is not the same thing as measuring
a production AI provider, and the frontend says so plainly.

The routing lives here; the timing logic lives in services/timing.py.
"""

from __future__ import annotations

import time

from fastapi import APIRouter, Query, Request
from fastapi.responses import StreamingResponse

from models.schemas import EchoRequest, EchoResponse
from services.timing import (
    build_payload,
    measure_handler,
    perform_server_work,
    stream_chunks,
)

router = APIRouter(prefix="/measure", tags=["measure"])


@router.post("/echo", response_model=EchoResponse)
async def echo(request: EchoRequest, raw: Request) -> EchoResponse:
    """Measure server-side handling of a single request.

    The client times the full round trip itself. This endpoint reports how much
    of that time was spent inside the server, so the client can subtract it and
    talk about transport and overhead separately rather than calling the whole
    thing "network latency".
    """
    handler_started = time.perf_counter()

    # The middleware stamps when the request reached the app, so we can separate
    # framework parsing from the handler's own work.
    arrived_at = getattr(raw.state, "arrived_at", handler_started)

    actual_work_ms = await perform_server_work(request.server_work_ms)
    payload = build_payload(request.payload_tokens)
    timing = measure_handler(handler_started, arrived_at, actual_work_ms)

    return EchoResponse(
        client_sent_at_ms=request.client_sent_at_ms,
        server_receive_to_handler_ms=timing.receive_to_handler_ms,
        server_processing_ms=timing.processing_ms,
        server_work_ms=timing.work_ms,
        response_bytes=len(payload),
        payload=payload,
    )


@router.get("/stream")
async def stream(
    chunks: int = Query(40, ge=1, le=500, description="How many chunks to send."),
    chunk_delay_ms: float = Query(
        25.0, ge=0.0, le=1000.0, description="Scripted delay between chunks."
    ),
    first_chunk_delay_ms: float = Query(
        120.0,
        ge=0.0,
        le=10_000.0,
        description="Scripted delay before the first chunk, standing in for queue and prefill.",
    ),
) -> StreamingResponse:
    """Stream chunks with scripted delays so the client can measure real streaming.

    No model is running: the delays are set by the query parameters. What the
    browser measures on the other end is genuinely real, which is exactly the
    point — it lets a student compare a measured arrival time with a simulated
    one using the same streaming mechanics a real provider would use.
    """
    return StreamingResponse(
        stream_chunks(chunks, chunk_delay_ms, first_chunk_delay_ms),
        media_type="application/x-ndjson",
        headers={
            # Without this, a proxy may buffer the whole response and destroy
            # the very thing we are trying to measure.
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
        },
    )
