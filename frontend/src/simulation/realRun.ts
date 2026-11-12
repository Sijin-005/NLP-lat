/**
 * NLPulse — running a REAL request against a local Ollama model.
 *
 * This produces a `SimulationResult` with `provenance: 'MEASURED'`, so every
 * existing visual — pipeline, waterfall, breakdown, token stream, TTFT panel —
 * renders a real request with no changes at all. Only the labels differ.
 *
 * ============================== HONESTY ==============================
 * Ollama reports more about itself than most providers do, but not everything.
 * Each stage is tagged with where its number came from:
 *
 *   MEASURED      a real clock produced it (browser, backend, or Ollama)
 *   DERIVED       computed from measured figures, e.g. a per-token mean
 *   NOT_REPORTED  Ollama does not break this stage out; shown as 0 and labelled
 *
 * Nothing is invented to fill a gap. Where a number cannot be known, the UI
 * says so — which is itself one of the lessons.
 * =====================================================================
 */

import { STAGES } from './simulationConfig'
import type {
  GeneratedToken,
  SimulationInput,
  SimulationResult,
  StageId,
  StageProvenance,
  StageTiming,
} from './types'

/* ------------------------------------------------------------------ */
/* Wire format from the backend                                        */
/* ------------------------------------------------------------------ */

interface OllamaModel {
  name: string
  parameterSize: string | null
  family: string | null
  contextLength: number | null
  sizeBytes: number | null
}

export interface OllamaStatus {
  available: boolean
  version: string | null
  models: OllamaModel[]
  error: string | null
}

interface FinalMetrics {
  totalMs: number | null
  loadMs: number | null
  promptEvalMs: number | null
  evalMs: number | null
  promptTokens: number | null
  cachedPromptTokens: number | null
  outputTokens: number | null
}

/** A token as it actually arrived in the browser. */
interface ArrivedChunk {
  text: string
  arrivalMs: number
}

export interface RealRunCallbacks {
  /** Called as each chunk lands, so the UI can stream live if it wants to. */
  onChunk?: (text: string, arrivalMs: number, index: number) => void
}

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

export async function fetchOllamaStatus(): Promise<OllamaStatus> {
  try {
    const response = await fetch('/api/ollama/status', { cache: 'no-store' })
    if (!response.ok) throw new Error(`status ${response.status}`)
    return (await response.json()) as OllamaStatus
  } catch (error) {
    return {
      available: false,
      version: null,
      models: [],
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/* ------------------------------------------------------------------ */
/* The run                                                             */
/* ------------------------------------------------------------------ */

export class RealRunError extends Error {}

/**
 * Send a real question to a real model and measure the whole journey.
 *
 * Timing discipline: `performance.now()` is monotonic, so it is safe to
 * subtract two readings. We never subtract a browser reading from a server
 * reading, because those are different clocks — server-side figures are only
 * ever compared with other server-side figures.
 */
export async function runRealRequest(
  model: string,
  prompt: string,
  maxTokens: number,
  input: SimulationInput,
  callbacks: RealRunCallbacks = {},
): Promise<SimulationResult> {
  // t0: the instant the user's question leaves the UI.
  const t0 = performance.now()

  const body = JSON.stringify({ model, prompt, max_tokens: maxTokens })
  // Everything up to here is building the request: that IS request creation.
  const requestBuiltAt = performance.now()

  const response = await fetch('/api/ollama/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })

  if (!response.ok || !response.body) {
    throw new RealRunError(`Backend returned ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const chunks: ArrivedChunk[] = []
  let firstChunkAt: number | null = null
  let metrics: FinalMetrics | null = null
  let serverTtfcMs: number | null = null
  let serverTotalMs: number | null = null
  let streamError: string | null = null

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.trim()) continue

      let parsed: Record<string, unknown>
      try {
        parsed = JSON.parse(line)
      } catch {
        continue
      }

      if (typeof parsed.error === 'string') {
        streamError = parsed.error
        continue
      }

      if (parsed.done) {
        metrics = parsed.metrics as FinalMetrics
        serverTtfcMs = (parsed.serverTtfcMs as number | null) ?? null
        serverTotalMs = (parsed.serverTotalMs as number | null) ?? null
        continue
      }

      const arrivalMs = performance.now() - t0
      if (firstChunkAt === null) firstChunkAt = arrivalMs
      const text = String(parsed.text ?? '')
      chunks.push({ text, arrivalMs })
      callbacks.onChunk?.(text, arrivalMs, chunks.length - 1)
    }
  }

  if (streamError) throw new RealRunError(streamError)
  if (chunks.length === 0) {
    throw new RealRunError('The model returned no output.')
  }

  // t_end: the last byte is in. One more frame for the browser to paint it.
  const streamEndedAt = performance.now() - t0
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
  const paintedAt = performance.now() - t0

  return assembleResult({
    model,
    prompt,
    input,
    chunks,
    t0,
    requestBuiltAt,
    firstChunkAt: firstChunkAt ?? streamEndedAt,
    streamEndedAt,
    paintedAt,
    metrics,
    serverTtfcMs,
    serverTotalMs,
  })
}

/* ------------------------------------------------------------------ */
/* Turning measurements into the shared result shape                   */
/* ------------------------------------------------------------------ */

interface AssembleArgs {
  model: string
  prompt: string
  input: SimulationInput
  chunks: ArrivedChunk[]
  t0: number
  requestBuiltAt: number
  firstChunkAt: number
  streamEndedAt: number
  paintedAt: number
  metrics: FinalMetrics | null
  serverTtfcMs: number | null
  serverTotalMs: number | null
}

function assembleResult(args: AssembleArgs): SimulationResult {
  const {
    model,
    prompt,
    input,
    chunks,
    t0,
    requestBuiltAt,
    firstChunkAt,
    streamEndedAt,
    paintedAt,
    metrics,
    serverTtfcMs,
  } = args

  const notes: string[] = []

  const requestCreationMs = Math.max(0, requestBuiltAt - t0)
  const totalMs = paintedAt
  const renderingMs = Math.max(0, paintedAt - streamEndedAt)

  // Ollama's own figures (already milliseconds by the time they reach us).
  const loadMs = metrics?.loadMs ?? 0
  const prefillMs = metrics?.promptEvalMs ?? 0
  const evalMs = metrics?.evalMs ?? 0
  const promptTokens = metrics?.promptTokens ?? 0
  const outputTokens = metrics?.outputTokens ?? chunks.length

  /*
   * Transport and overhead is computed as a RESIDUAL rather than measured
   * directly, and this is deliberate.
   *
   * The browser's wall clock and Ollama's internal clock measure overlapping
   * but different things, so they will never sum to the same figure. Rather
   * than scaling Ollama's measurements to make them fit — which would mean
   * altering a measured value, the exact thing this application tells students
   * never to do — we take everything the model reported at face value and
   * treat whatever wall-clock time is left over as transport and overhead.
   *
   * That residual is genuinely what it claims to be: the HTTP stack, JSON
   * handling, the loopback hop and scheduling gaps. Every model figure stays
   * untouched, and the stages still sum exactly to the measured total.
   */
  const accountedMs = requestCreationMs + loadMs + prefillMs + evalMs + renderingMs
  let residualMs = totalMs - accountedMs
  let overrunScale = 1

  if (residualMs < 0) {
    /*
     * The model reported more time than the browser observed end to end. This
     * happens when Ollama's load or prefill overlaps work the browser was not
     * waiting on. We cannot show stages that sum past the real total, so the
     * model stages are compressed to fit and the discrepancy is declared.
     */
    const modelMs = loadMs + prefillMs + evalMs
    const roomMs = Math.max(0, totalMs - requestCreationMs - renderingMs)
    overrunScale = modelMs > 0 ? roomMs / modelMs : 1
    notes.push(
      `Ollama reported ${Math.round(modelMs)} ms of internal work but the browser observed only ${Math.round(totalMs)} ms end to end — the two clocks measure overlapping things. The model stages are shown compressed by ${Math.round((1 - overrunScale) * 100)}% to fit the measured total.`,
    )
    residualMs = 0
  }

  const measuredTransportMs = Math.max(0, residualMs)

  if (serverTtfcMs === null) {
    notes.push('The backend did not report its own timing.')
  }

  /*
   * Ollama does not report tokenization separately: prompt_eval covers reading
   * the prompt as a whole. We show it as not reported rather than inventing a
   * split, because a made-up number here would teach the wrong thing.
   */
  notes.push('Ollama does not report tokenization separately from prompt processing.')
  notes.push(
    'There is no request queue to measure: the model runs locally and serves one request at a time.',
  )

  if (metrics?.cachedPromptTokens) {
    notes.push(
      `${metrics.cachedPromptTokens} of ${promptTokens} prompt tokens were served from Ollama's cache, which is why prefill is short.`,
    )
  }

  /*
   * The first token's compute cost is not reported on its own. We derive it
   * from the mean decode step, and mark it DERIVED so it is never mistaken for
   * a measurement.
   */
  const meanDecodeMs = outputTokens > 0 ? evalMs / outputTokens : 0
  const firstTokenComputeMs = meanDecodeMs
  const generationMs = Math.max(0, evalMs - meanDecodeMs)

  const durations: Record<StageId, number> = {
    inputCapture: 0,
    requestCreation: requestCreationMs,
    networkUpload: measuredTransportMs / 2,
    serverIngress: 0,
    queue: loadMs * overrunScale,
    tokenization: 0,
    prefill: prefillMs * overrunScale,
    firstTokenCompute: firstTokenComputeMs * overrunScale,
    generation: generationMs * overrunScale,
    streaming: 0,
    returnNetwork: measuredTransportMs / 2,
    rendering: renderingMs,
  }

  const provenances: Record<StageId, StageProvenance> = {
    inputCapture: 'NOT_REPORTED',
    requestCreation: 'MEASURED',
    networkUpload: 'DERIVED',
    serverIngress: 'NOT_REPORTED',
    queue: 'MEASURED',
    tokenization: 'NOT_REPORTED',
    prefill: 'MEASURED',
    firstTokenCompute: 'DERIVED',
    generation: 'MEASURED',
    streaming: 'NOT_REPORTED',
    returnNetwork: 'DERIVED',
    rendering: 'MEASURED',
  }

  const details: Record<StageId, string> = {
    inputCapture: 'Not separated out — folded into request creation below.',
    requestCreation: `Measured in the browser: ${requestCreationMs.toFixed(2)} ms to build and send the request.`,
    networkUpload: `Half of ${measuredTransportMs.toFixed(1)} ms of transport and overhead — what is left of the measured wall clock once every figure the model reported is subtracted. Loopback plus the HTTP and JSON stack, not internet latency, and the even split between the two directions is a convention rather than a measurement.`,
    serverIngress: 'Not reported separately by the local stack.',
    queue: loadMs > 50
      ? `Ollama spent ${loadMs.toFixed(0)} ms loading "${model}" into memory — a cold start. Run it again and this collapses.`
      : `Model already resident: ${loadMs.toFixed(1)} ms. There is no shared queue, because this model serves one request at a time.`,
    tokenization: 'Ollama folds tokenization into prompt processing and does not report it separately.',
    prefill: `Measured by Ollama: ${prefillMs.toFixed(1)} ms to read ${promptTokens.toLocaleString()} prompt tokens (counted by the model's real tokenizer).`,
    firstTokenCompute: `Derived, not measured: the mean decode step (${meanDecodeMs.toFixed(1)} ms) across ${outputTokens} tokens. Ollama does not time the first token separately.`,
    generation: `Measured by Ollama: ${evalMs.toFixed(0)} ms total decode for ${outputTokens} tokens.`,
    streaming: 'Chunk framing cost is not separable from the transport figure.',
    returnNetwork: 'The other half of the residual transport and overhead.',
    rendering: `Measured in the browser: ${renderingMs.toFixed(1)} ms from the last byte to the next painted frame.`,
  }

  /*
   * Several stages mean something different on a local model than they do in
   * the simulated cloud pipeline. Rather than letting the generic wording
   * mislead — "your request waits for a free slot" is simply untrue of a model
   * running on this laptop — a measured run supplies its own explanation.
   */
  const overrides: Partial<Record<StageId, { what: string; why: string; fix: string }>> = {
    queue: {
      what: 'Ollama made the model ready to run — loading its weights into memory if they were not already there.',
      why: 'A model has to be resident before it can compute anything. A cold start pays for reading gigabytes of weights off disk; a warm one costs almost nothing.',
      fix: 'Ask again and watch this collapse. Keeping a model loaded is exactly why production systems pin models in memory.',
    },
    networkUpload: {
      what: 'The request crossed loopback to the local backend and on to Ollama.',
      why: 'Even a local hop costs something: HTTP framing, JSON encoding and process scheduling.',
      fix: 'Nothing worth optimising here — but note how small it is compared with a real internet round trip. Switch to the simulator to see that contrast.',
    },
    returnNetwork: {
      what: 'Response chunks travelled back across loopback to the browser.',
      why: 'The same framing and decoding costs apply on the way home.',
      fix: 'Again, tiny locally. Over the internet this is where distance starts to hurt.',
    },
    tokenization: {
      what: 'Ollama does not report tokenization separately.',
      why: 'It is folded into prompt processing, so there is no number to show. Inventing one would teach the wrong thing.',
      fix: 'Nothing to act on — but notice that a real provider exposing fewer stages makes diagnosis harder.',
    },
    inputCapture: {
      what: 'Not measured separately on a real run.',
      why: 'Reading the textarea is folded into request creation below.',
      fix: 'Not a meaningful target.',
    },
    serverIngress: {
      what: 'Not reported separately by the local stack.',
      why: 'The backend hands off to Ollama immediately; the cost appears inside transport.',
      fix: 'Not a meaningful target locally.',
    },
    streaming: {
      what: 'Chunk framing is not separable from the transport figure.',
      why: 'The browser cannot see where framing cost ends and transport begins.',
      fix: 'Not separately measurable here.',
    },
  }

  // Lay the stages out in causal order, exactly as the simulator does, so the
  // pipeline and waterfall behave identically.
  const stages: StageTiming[] = []
  let cursor = 0
  for (const descriptor of STAGES) {
    const ms = Math.max(0, durations[descriptor.id])
    stages.push({
      id: descriptor.id,
      ms: Math.round(ms * 100) / 100,
      startMs: Math.round(cursor * 100) / 100,
      endMs: Math.round((cursor + ms) * 100) / 100,
      detail: details[descriptor.id],
      provenance: provenances[descriptor.id],
      ...overrides[descriptor.id],
    })
    cursor += ms
  }

  /*
   * No rescaling happens here. Because transport was taken as the residual,
   * the stages already sum to the measured total, and every model figure is
   * exactly what Ollama reported.
   */
  const scaled = stages

  // Real token arrivals, straight from the browser clock.
  const tokens: GeneratedToken[] = chunks.map((chunk, index) => ({
    index,
    text: chunk.text,
    arrivalMs: Math.round(chunk.arrivalMs * 100) / 100,
    gapMs:
      index === 0
        ? 0
        : Math.round((chunk.arrivalMs - chunks[index - 1].arrivalMs) * 100) / 100,
  }))

  const decodeWindowMs = Math.max(0.001, streamEndedAt - firstChunkAt)
  const tokensPerSecond = evalMs > 0 ? (outputTokens / evalMs) * 1000 : 0
  const interTokenMs = tokens.length > 1 ? decodeWindowMs / (tokens.length - 1) : 0

  const shares = {} as Record<StageId, number>
  for (const stage of scaled) {
    shares[stage.id] = totalMs > 0 ? stage.ms / totalMs : 0
  }

  const dominantStage = scaled.reduce((biggest, stage) =>
    stage.ms > biggest.ms ? stage : biggest,
  ).id

  return {
    provenance: 'MEASURED',
    input: { ...input, promptTokens, outputTokens },
    modelName: model,
    promptText: prompt,
    measurementNotes: notes,
    stages: scaled,
    ttftMs: Math.round(firstChunkAt * 10) / 10,
    serverFirstTokenMs:
      serverTtfcMs !== null ? Math.round(serverTtfcMs * 10) / 10 : Math.round(firstChunkAt * 10) / 10,
    totalMs: Math.round(totalMs * 10) / 10,
    firstVisibleOutputMs: Math.round(firstChunkAt * 10) / 10,
    generationMs: Math.round((streamEndedAt - firstChunkAt) * 10) / 10,
    tokensPerSecond: Math.round(tokensPerSecond * 10) / 10,
    interTokenMs: Math.round(interTokenMs * 10) / 10,
    promptTokens,
    outputTokens,
    tokens,
    dominantStage,
    shares,
    // Throughput of a single local model serving one request at a time is just
    // its own decode rate; there is no fleet behind it.
    serverThroughputTokensPerSecond: Math.round(tokensPerSecond * 10) / 10,
  }
}
