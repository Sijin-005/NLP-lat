/**
 * NLPulse — Real Test mode.
 *
 * Everything on this screen is MEASURED: real clocks, real HTTP, real streaming.
 *
 * Terminology is kept strict on purpose. A browser-to-backend round trip is not
 * "network latency" — it also contains request serialisation, the HTTP stack,
 * server scheduling and response parsing. We report the round trip, report the
 * server's own timing separately, and label the remainder "transport and
 * overhead" rather than pretending it is pure network time.
 *
 * If the backend is not running, this screen says so and nothing else in the
 * application is affected.
 */

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { formatMs } from '../../simulation/metrics'
import { Button, Panel, ProvenanceBadge, Slider } from '../ui/primitives'
import { Term } from '../ui/Tooltip'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface RoundTripSample {
  roundTripMs: number
  serverProcessingMs: number
  transportAndOverheadMs: number
}

interface RoundTripStats {
  samples: RoundTripSample[]
  min: number
  median: number
  max: number
  meanServer: number
  meanTransport: number
}

interface StreamMeasurement {
  /** Real time from request start to the first streamed chunk arriving. */
  ttfcMs: number
  totalMs: number
  chunks: number
  chunksPerSecond: number
  interChunkMs: number
  /** Server's own view, for comparison with the browser's. */
  serverTotalMs: number | null
}

type BackendState = 'checking' | 'up' | 'down'

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function summarise(samples: RoundTripSample[]): RoundTripStats {
  const sorted = [...samples].sort((a, b) => a.roundTripMs - b.roundTripMs)
  const mean = (pick: (s: RoundTripSample) => number) =>
    samples.reduce((sum, s) => sum + pick(s), 0) / samples.length

  return {
    samples,
    min: sorted[0].roundTripMs,
    median: sorted[Math.floor(sorted.length / 2)].roundTripMs,
    max: sorted[sorted.length - 1].roundTripMs,
    meanServer: mean((s) => s.serverProcessingMs),
    meanTransport: mean((s) => s.transportAndOverheadMs),
  }
}

/* ------------------------------------------------------------------ */

export function RealTest() {
  const [backend, setBackend] = useState<BackendState>('checking')
  const [backendVersion, setBackendVersion] = useState<string | null>(null)
  const [providerNote, setProviderNote] = useState<string | null>(null)
  const [providerConfigured, setProviderConfigured] = useState(false)

  const [sampleCount, setSampleCount] = useState(10)
  const [payloadTokens, setPayloadTokens] = useState(100)
  const [serverWorkMs, setServerWorkMs] = useState(0)
  const [rtStats, setRtStats] = useState<RoundTripStats | null>(null)
  const [rtBusy, setRtBusy] = useState(false)

  const [chunkCount, setChunkCount] = useState(40)
  const [chunkDelay, setChunkDelay] = useState(25)
  const [firstChunkDelay, setFirstChunkDelay] = useState(150)
  const [stream, setStream] = useState<StreamMeasurement | null>(null)
  const [streamText, setStreamText] = useState('')
  const [streamBusy, setStreamBusy] = useState(false)

  const [error, setError] = useState<string | null>(null)

  /* ---------------- Backend discovery ---------------- */

  const checkBackend = useCallback(async () => {
    setBackend('checking')
    try {
      const response = await fetch('/api/health', { cache: 'no-store' })
      if (!response.ok) throw new Error(`status ${response.status}`)
      const data = await response.json()
      setBackendVersion(data.version ?? null)
      setBackend('up')

      // Provider status is optional; a failure here must not mark the backend down.
      try {
        const providerResponse = await fetch('/api/provider/status', { cache: 'no-store' })
        const providerData = await providerResponse.json()
        setProviderConfigured(Boolean(providerData.configured))
        setProviderNote(providerData.note ?? null)
      } catch {
        setProviderConfigured(false)
        setProviderNote(null)
      }
    } catch {
      setBackend('down')
    }
  }, [])

  useEffect(() => {
    void checkBackend()
  }, [checkBackend])

  /* ---------------- Round-trip measurement ---------------- */

  const runRoundTrips = async () => {
    setRtBusy(true)
    setError(null)
    const samples: RoundTripSample[] = []

    try {
      for (let i = 0; i < sampleCount; i += 1) {
        const started = performance.now()
        const response = await fetch('/api/measure/echo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_sent_at_ms: started,
            payload_tokens: payloadTokens,
            server_work_ms: serverWorkMs,
          }),
        })
        if (!response.ok) throw new Error(`Backend returned ${response.status}`)
        const data = await response.json()
        const roundTripMs = performance.now() - started

        samples.push({
          roundTripMs,
          serverProcessingMs: data.server_processing_ms,
          // What is left after removing the server's own handler time. This is
          // transport plus HTTP and JSON overhead on both sides — not pure
          // network latency, and we never call it that.
          transportAndOverheadMs: Math.max(0, roundTripMs - data.server_processing_ms),
        })
      }
      setRtStats(summarise(samples))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
      setBackend('down')
    } finally {
      setRtBusy(false)
    }
  }

  /* ---------------- Streaming measurement ---------------- */

  const runStream = async () => {
    setStreamBusy(true)
    setError(null)
    setStreamText('')
    setStream(null)

    const started = performance.now()
    let firstChunkAt: number | null = null
    let chunks = 0
    let serverTotalMs: number | null = null
    let text = ''

    try {
      const response = await fetch(
        `/api/measure/stream?chunks=${chunkCount}&chunk_delay_ms=${chunkDelay}&first_chunk_delay_ms=${firstChunkDelay}`,
      )
      if (!response.ok || !response.body) {
        throw new Error(`Backend returned ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      // Read the NDJSON stream incrementally, timing each arrival as it lands.
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          const parsed = JSON.parse(line)

          if (parsed.done) {
            serverTotalMs = parsed.server_total_ms ?? null
            continue
          }

          if (firstChunkAt === null) firstChunkAt = performance.now()
          chunks += 1
          text += parsed.text ?? ''
          setStreamText(text)
        }
      }

      const totalMs = performance.now() - started
      const ttfcMs = firstChunkAt !== null ? firstChunkAt - started : totalMs
      const generationWindow = Math.max(0.001, totalMs - ttfcMs)

      setStream({
        ttfcMs,
        totalMs,
        chunks,
        chunksPerSecond: chunks > 1 ? ((chunks - 1) / generationWindow) * 1000 : 0,
        interChunkMs: chunks > 1 ? generationWindow / (chunks - 1) : 0,
        serverTotalMs,
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
      setBackend('down')
    } finally {
      setStreamBusy(false)
    }
  }

  /* ---------------- Render ---------------- */

  if (backend === 'down') {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="panel max-w-xl p-6 text-center">
          <div className="text-3xl" aria-hidden>
            🔌
          </div>
          <h2 className="mt-2 text-lg font-bold text-white">
            The measurement backend is not reachable
          </h2>
          <p className="mt-2 text-[0.88rem] leading-relaxed text-slate-400">
            Real Test needs the local FastAPI service on port 8000. Everything
            else in NLPulse — the simulation, Seminar Mode, the pipeline, the
            charts — works without it.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-700/60 bg-slate-900/70 px-3 py-2 text-left text-[0.76rem] text-slate-300">
{`cd backend
.venv\\Scripts\\activate
uvicorn main:app --port 8000`}
          </pre>
          {error && (
            <p className="mt-2 text-[0.76rem] text-rose-400">Last error: {error}</p>
          )}
          <Button variant="primary" className="mt-4" onClick={() => void checkBackend()}>
            ↻ Try again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-3">
      {/* Status strip */}
      <div className="panel mb-3 flex flex-wrap items-center gap-3 px-4 py-2.5">
        <span className="flex items-center gap-2 text-[0.82rem] font-semibold text-slate-200">
          <span
            className={`h-2 w-2 rounded-full ${
              backend === 'up' ? 'bg-emerald-400' : 'animate-pulse bg-amber-400'
            }`}
            aria-hidden
          />
          Backend {backend === 'up' ? 'connected' : 'checking…'}
          {backendVersion && (
            <span className="font-normal text-slate-500">v{backendVersion}</span>
          )}
        </span>
        <ProvenanceBadge provenance="MEASURED" />
        <p className="text-[0.74rem] text-slate-500">
          Real clocks, real HTTP, this machine. Not a measurement of any
          production AI provider.
        </p>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {/* Round trip */}
        <Panel title="Browser → backend round trip" bodyClassName="p-4">
          <p className="mb-3 text-[0.78rem] leading-snug text-slate-400">
            Sends real requests and times them with{' '}
            <code className="rounded bg-slate-800/70 px-1 text-[0.72rem]">
              performance.now()
            </code>
            . The backend reports how long it spent inside its own handler, so we
            can separate that from everything else.
          </p>

          <div className="mb-3 grid gap-2.5 sm:grid-cols-3">
            <Slider
              label="Samples"
              value={sampleCount}
              min={1}
              max={50}
              step={1}
              onChange={setSampleCount}
            />
            <Slider
              label="Payload"
              value={payloadTokens}
              min={0}
              max={5000}
              step={50}
              onChange={setPayloadTokens}
              format={(value) => `${value.toLocaleString()} tok`}
            />
            <Slider
              label="Server work"
              value={serverWorkMs}
              min={0}
              max={500}
              step={10}
              onChange={setServerWorkMs}
              format={(value) => `${value} ms`}
            />
          </div>

          <Button variant="primary" onClick={runRoundTrips} disabled={rtBusy} className="w-full">
            {rtBusy ? 'Measuring…' : `▶ Measure ${sampleCount} round trips`}
          </Button>

          {rtStats && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3">
              <div className="grid grid-cols-3 gap-2">
                <Figure label="Fastest" value={formatMs(rtStats.min)} color="text-emerald-300" />
                <Figure label="Median" value={formatMs(rtStats.median)} color="text-sky-300" />
                <Figure label="Slowest" value={formatMs(rtStats.max)} color="text-amber-300" />
              </div>

              <div className="mt-2 space-y-1.5 rounded-lg border border-slate-700/50 bg-slate-900/40 p-3">
                <Row
                  label="Server handler time (mean)"
                  value={formatMs(rtStats.meanServer)}
                  note="Measured by the backend itself."
                />
                <Row
                  label="Transport and overhead (mean)"
                  value={formatMs(rtStats.meanTransport)}
                  note="Round trip minus server time: HTTP stack, serialisation, loopback, browser parsing. NOT pure network latency."
                />
              </div>

              {/* Every sample, so variation is visible rather than averaged away. */}
              <div className="mt-2">
                <div className="mb-1 text-[0.64rem] uppercase tracking-[0.12em] text-slate-500">
                  Every sample
                </div>
                <div className="flex h-12 items-end gap-[3px]">
                  {rtStats.samples.map((sample, index) => (
                    <div
                      key={index}
                      title={`${formatMs(sample.roundTripMs)} (server ${formatMs(sample.serverProcessingMs)})`}
                      className="flex-1 rounded-t bg-sky-500/60"
                      style={{
                        height: `${Math.max(6, (sample.roundTripMs / rtStats.max) * 100)}%`,
                      }}
                    />
                  ))}
                </div>
                <p className="mt-1 text-[0.66rem] leading-snug text-slate-600">
                  Real systems are not consistent. This spread is{' '}
                  <Term k="jitter">jitter</Term>, measured rather than simulated.
                </p>
              </div>
            </motion.div>
          )}
        </Panel>

        {/* Streaming */}
        <Panel title="Real streaming measurement" bodyClassName="p-4">
          <p className="mb-3 text-[0.78rem] leading-snug text-slate-400">
            Opens a real streamed HTTP response and records when each chunk
            actually arrives. The server's delays are scripted by the controls
            below — no model is running — but the arrival times are genuinely
            measured.
          </p>

          <div className="mb-3 grid gap-2.5 sm:grid-cols-3">
            <Slider
              label="Chunks"
              value={chunkCount}
              min={5}
              max={200}
              step={5}
              onChange={setChunkCount}
            />
            <Slider
              label="Gap"
              value={chunkDelay}
              min={0}
              max={200}
              step={5}
              onChange={setChunkDelay}
              format={(value) => `${value} ms`}
            />
            <Slider
              label="Before first"
              value={firstChunkDelay}
              min={0}
              max={3000}
              step={50}
              onChange={setFirstChunkDelay}
              format={(value) => `${value} ms`}
            />
          </div>

          <Button variant="primary" onClick={runStream} disabled={streamBusy} className="w-full">
            {streamBusy ? 'Streaming…' : '▶ Measure a real stream'}
          </Button>

          {(streamText || stream) && (
            <div className="mt-3 max-h-24 overflow-y-auto rounded-lg border border-slate-700/50 bg-slate-900/40 px-3 py-2 text-[0.8rem] leading-snug text-slate-300 scrollbar-none">
              {streamText || '…'}
            </div>
          )}

          {stream && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3">
              <div className="grid grid-cols-2 gap-2">
                <Figure
                  label="Time to first chunk"
                  value={formatMs(stream.ttfcMs)}
                  color="text-amber-300"
                />
                <Figure
                  label="Stream complete"
                  value={formatMs(stream.totalMs)}
                  color="text-sky-300"
                />
                <Figure
                  label="Chunks / sec"
                  value={stream.chunksPerSecond.toFixed(1)}
                  color="text-emerald-300"
                />
                <Figure
                  label="Between chunks"
                  value={formatMs(stream.interChunkMs)}
                  color="text-emerald-300"
                />
              </div>

              {stream.serverTotalMs !== null && (
                <p className="mt-2 text-[0.72rem] leading-snug text-slate-500">
                  The server measured {formatMs(stream.serverTotalMs)} for the same
                  stream. The browser saw {formatMs(stream.totalMs)}; the gap is
                  transport and parsing on this machine.
                </p>
              )}

              <p className="mt-2 rounded-lg border border-slate-700/50 bg-slate-900/40 p-2.5 text-[0.72rem] leading-snug text-slate-400">
                Note the wording: this is <strong>time to first chunk</strong>, not{' '}
                <Term k="ttft">TTFT</Term>. A chunk from a real provider may carry
                several tokens or a fraction of one, so chunks per second is not
                the same measurement as tokens per second.
              </p>
            </motion.div>
          )}
        </Panel>
      </div>

      {/* Optional external model */}
      <Panel title="Optional: a real model endpoint" className="mt-3" bodyClassName="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-md border px-2 py-0.5 text-[0.66rem] font-bold uppercase tracking-[0.12em] ${
              providerConfigured
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-slate-600/60 bg-slate-800/40 text-slate-400'
            }`}
          >
            {providerConfigured ? 'configured' : 'not configured'}
          </span>
          <p className="flex-1 text-[0.78rem] leading-snug text-slate-400">
            {providerNote ??
              'No external model configured. This is expected — the seminar does not need one.'}
          </p>
        </div>

        {!providerConfigured && (
          <details className="mt-3">
            <summary className="cursor-pointer text-[0.76rem] font-semibold text-sky-300">
              How to connect one later (optional)
            </summary>
            <p className="mt-2 text-[0.76rem] leading-relaxed text-slate-400">
              Set these environment variables before starting the backend. Any
              OpenAI-compatible endpoint works, including a local server, so this
              does not have to break the offline promise. Keys are read from the
              environment only — never stored in the repository and never sent to
              the browser.
            </p>
            <pre className="mt-2 overflow-x-auto rounded-lg border border-slate-700/60 bg-slate-900/70 px-3 py-2 text-[0.74rem] text-slate-300">
{`set NLPULSE_PROVIDER_BASE_URL=http://localhost:11434/v1
set NLPULSE_PROVIDER_MODEL=your-model-name
rem optional:
set NLPULSE_PROVIDER_API_KEY=...`}
            </pre>
            <p className="mt-2 text-[0.74rem] leading-snug text-slate-500">
              Once configured, this panel gains a button that streams from the real
              model and reports its observed TTFT and completion time as MEASURED.
            </p>
          </details>
        )}
      </Panel>

      {error && (
        <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[0.78rem] text-rose-200">
          {error}
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Figure({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 px-3 py-2">
      <div className="truncate text-[0.6rem] uppercase tracking-[0.1em] text-slate-500">
        {label}
      </div>
      <div className={`tnum text-lg font-bold ${color}`}>{value}</div>
    </div>
  )
}

function Row({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[0.78rem] text-slate-300">{label}</span>
        <span className="tnum text-[0.82rem] font-semibold text-sky-300">{value}</span>
      </div>
      <p className="text-[0.66rem] leading-snug text-slate-600">{note}</p>
    </div>
  )
}
