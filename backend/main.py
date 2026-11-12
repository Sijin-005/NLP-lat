"""NLPulse backend.

A small FastAPI service whose only job is to make REAL measurements possible:
a real HTTP round trip, a real streamed response, real server-side timings.

Important: the educational simulation runs entirely in the browser. If this
service is not running, the whole seminar still works — the Real Test screen
simply reports that the backend is unavailable. That is deliberate: nothing in
the presentation should be able to fail because a process did not start.

Run with:
    uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from models.schemas import HealthResponse
from routers import measure, ollama, provider

VERSION = "1.0.0"

app = FastAPI(
    title="NLPulse Measurement API",
    version=VERSION,
    description=(
        "Real timing measurements for the NLPulse latency visualiser. "
        "The educational simulation does not depend on this service."
    ),
)

# The Vite dev server proxies /api, so same-origin requests are the normal path.
# CORS is opened only for local development origins, in case the frontend is
# served from somewhere else during a demo.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def stamp_arrival(request: Request, call_next):
    """Record when the request reached the application.

    Handlers compare against this to report how much time went on framework
    parsing versus their own work, rather than attributing all of it to
    "processing".
    """
    request.state.arrived_at = time.perf_counter()
    response = await call_next(request)
    # Exposed so the browser can read it without a preflight surprise.
    response.headers["X-NLPulse-Server-Ms"] = str(
        round((time.perf_counter() - request.state.arrived_at) * 1000, 3)
    )
    return response


@app.get("/api/health", response_model=HealthResponse, tags=["health"])
async def health() -> HealthResponse:
    """Liveness check used by the frontend to show backend status."""
    return HealthResponse(
        status="ok",
        service="nlpulse-backend",
        version=VERSION,
        simulation_requires_backend=False,
    )


app.include_router(measure.router, prefix="/api")
app.include_router(ollama.router, prefix="/api")
app.include_router(provider.router, prefix="/api")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
