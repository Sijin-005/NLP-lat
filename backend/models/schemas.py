"""Request and response models for the NLPulse backend.

Naming discipline matters here. A browser-to-backend round trip is NOT
"network latency": it includes request serialisation, the HTTP stack, server
scheduling, handler execution and response parsing. Field names below say what
each number actually is.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class EchoRequest(BaseModel):
    """A measurement request sent by the browser."""

    # Echoed back untouched so the client can pair the response with its own timer.
    client_sent_at_ms: float = Field(
        ..., description="Client clock reading when the request was sent (ms)."
    )
    payload_tokens: int = Field(
        0, ge=0, le=100_000, description="Notional prompt size, used to size the payload."
    )
    server_work_ms: float = Field(
        0.0,
        ge=0.0,
        le=5_000.0,
        description="Artificial server-side work, so the client can see it appear in the breakdown.",
    )


class EchoResponse(BaseModel):
    """Timings observed by the server for a single request."""

    client_sent_at_ms: float
    # All server timings are relative durations, not wall-clock instants: the
    # two machines are the same here, but in general their clocks are not
    # comparable, so we never ask the client to subtract one from the other.
    server_receive_to_handler_ms: float = Field(
        ..., description="Time between the handler starting and the body being parsed."
    )
    server_processing_ms: float = Field(
        ..., description="Total time the handler spent before responding."
    )
    server_work_ms: float = Field(..., description="Of which, the artificial work requested.")
    response_bytes: int
    payload: str = Field(..., description="Filler sized from payload_tokens.")


class StreamChunk(BaseModel):
    """One chunk of a measured stream."""

    index: int
    text: str
    server_elapsed_ms: float


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    version: str
    # The frontend shows this so a presenter can confirm at a glance that the
    # simulation does not depend on the backend being up.
    simulation_requires_backend: bool = False


class ProviderStatus(BaseModel):
    """Whether an optional external model API has been configured."""

    configured: bool
    provider: str | None = None
    model: str | None = None
    note: str
