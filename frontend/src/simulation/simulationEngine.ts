/**
 * NLPulse — the simulation engine.
 *
 * A pure function from a `SimulationInput` to a `SimulationResult`. No randomness
 * beyond a seeded PRNG, no side effects, no I/O. Given the same input and seed
 * it always returns the same result, and with `deterministic: true` the jitter
 * term is switched off entirely.
 *
 * ACCOUNTING RULE
 * ---------------
 * The stage durations are mutually exclusive slices of the wall clock, so they
 * sum exactly to `totalMs`. That is what makes the breakdown percentages and
 * the waterfall trustworthy. Where real pipelines overlap work — streaming
 * happens *during* generation, not after it — the overlap is handled by
 * attributing only the extra framing cost to the streaming stage, and the
 * waterfall draws the true overlapping spans separately.
 *
 * Every number produced here is SIMULATED. See simulationConfig.ts.
 */

import {
  COEFFICIENTS,
  HARDWARE_PRESETS,
  LOCAL_DEPLOYMENT,
  MODEL_PRESETS,
  NETWORK_PRESETS,
  SERVER_LOAD_PRESETS,
  STAGES,
} from './simulationConfig'
import { buildResponseTokens } from './responseText'
import type {
  GeneratedToken,
  SimulationInput,
  SimulationResult,
  StageId,
  StageTiming,
} from './types'

/* ------------------------------------------------------------------ */
/* Seeded PRNG                                                         */
/* ------------------------------------------------------------------ */

/**
 * mulberry32 — a small, fast, well-distributed PRNG. We use a seeded generator
 * rather than Math.random() so that a run can be reproduced exactly, which
 * matters when demonstrating a comparison live.
 */
function createRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Resolve the effective network characteristics for this run. */
function resolveNetwork(input: SimulationInput) {
  if (input.deployment === 'local') {
    return {
      oneWayMs: LOCAL_DEPLOYMENT.oneWayMs,
      jitterMs: LOCAL_DEPLOYMENT.jitterMs,
      bandwidthMbps: LOCAL_DEPLOYMENT.bandwidthMbps,
      connectionOverheadMs: LOCAL_DEPLOYMENT.connectionOverheadMs,
      label: 'Loopback (local model)',
    }
  }

  if (input.network === 'custom') {
    const ms = input.customNetworkMs
    return {
      oneWayMs: ms,
      // Jitter scales gently with latency: slower paths are also less stable.
      jitterMs: Math.max(1, ms * 0.25),
      // Bandwidth is interpolated so a custom slider still behaves sensibly.
      bandwidthMbps: Math.max(1.5, 400 * Math.exp(-ms / 90)),
      connectionOverheadMs: Math.max(2, ms * 0.3),
      label: `Custom (${ms} ms one-way)`,
    }
  }

  const preset = NETWORK_PRESETS[input.network]
  return {
    oneWayMs: preset.oneWayMs,
    jitterMs: preset.jitterMs,
    bandwidthMbps: preset.bandwidthMbps,
    connectionOverheadMs: preset.connectionOverheadMs,
    label: preset.label,
  }
}

/** Milliseconds needed to push `bytes` through a link of `mbps` megabits/sec. */
function transferMs(bytes: number, mbps: number): number {
  return (bytes * 8) / (mbps * 1_000_000) * 1000
}

function round(value: number, places = 1): number {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

/* ------------------------------------------------------------------ */
/* The engine                                                          */
/* ------------------------------------------------------------------ */

export function runSimulation(input: SimulationInput): SimulationResult {
  const random = createRandom(input.deterministic ? 1 : input.seed)
  /** Symmetric jitter in the range ±amount, or exactly 0 in deterministic mode. */
  const jitter = (amount: number) =>
    input.deterministic ? 0 : (random() * 2 - 1) * amount

  const network = resolveNetwork(input)
  const model = MODEL_PRESETS[input.modelSize]
  const hardware = HARDWARE_PRESETS[input.hardware]
  const load = SERVER_LOAD_PRESETS[input.serverLoad]
  const C = COEFFICIENTS

  const promptTokens = Math.max(1, Math.round(input.promptTokens))
  const outputTokens = Math.max(1, Math.round(input.outputTokens))

  /* ---------------- Client: capture and request ---------------- */

  const inputCaptureMs = C.inputCaptureMs + jitter(0.5)
  const requestCreationMs = C.requestCreationMs + promptTokens * 0.0008 + jitter(0.7)

  /* ---------------- Network: upload ---------------- */

  const requestBytes = promptTokens * C.bytesPerToken + C.requestOverheadBytes
  const uploadTransferMs = transferMs(requestBytes, network.bandwidthMbps)
  const networkUploadMs = Math.max(
    0.1,
    network.oneWayMs + network.connectionOverheadMs + uploadTransferMs + jitter(network.jitterMs),
  )

  /* ---------------- Server: ingress ---------------- */

  const serverIngressMs = Math.max(0.1, C.serverIngressMs + jitter(0.8))

  /* ---------------- Server: queue ---------------- */

  /*
   * Queue wait is modelled on the classic utilisation curve rho / (1 - rho).
   * At rho = 0 there is no wait; as rho approaches 1 the wait grows without
   * bound. That non-linearity is the whole point of the server-load control:
   * going from 65% to 88% busy costs far more than going from 0% to 65%.
   */
  const rho = Math.min(load.utilisation, 0.985)
  const utilisationTerm = rho <= 0 ? 0 : rho / (1 - rho)
  const occupancy = model.queueWeight * hardware.occupancyFactor
  let queueMs = C.queueBaseMs * utilisationTerm * occupancy

  if (input.batching) {
    // Sharing the device between requests drains the queue faster, at the cost
    // of a short wait for the next batch window to open.
    queueMs = queueMs * C.batchQueueRelief + C.batchWindowMs
  }
  if (input.deployment === 'local') {
    queueMs *= LOCAL_DEPLOYMENT.queueMultiplier
  }
  queueMs = Math.min(C.queueCeilingMs, Math.max(0, queueMs + jitter(queueMs * 0.15)))

  /* ---------------- Server: tokenization ---------------- */

  const tokenizationMs = Math.max(
    0.05,
    C.tokenizerFixedMs + promptTokens * C.tokenizerMsPerToken + jitter(0.15),
  )

  /* ---------------- Server: prefill ---------------- */

  /*
   * Caching reuses the model state for a prompt prefix that has been seen
   * before, so most of the prompt does not need re-processing. It does NOT
   * remove model computation altogether: the uncached remainder still runs,
   * and every output token still costs a full decode step.
   */
  const cachedFraction = input.cache ? C.cacheHitRatio : 0
  const prefillTokens = promptTokens * (1 - cachedFraction)
  const prefillComputeMs = prefillTokens * model.prefillMsPerToken * hardware.computeFactor
  const prefillMs = Math.max(
    0.1,
    prefillComputeMs + model.fixedOverheadMs + (input.cache ? C.cacheLookupMs : 0) + jitter(2),
  )

  /* ---------------- Server: decode ---------------- */

  /*
   * Each decode step attends over everything generated so far, so the cost
   * creeps up as the context grows. We use the average context length over the
   * response as a single growth multiplier rather than recomputing per token.
   */
  const averageContextTokens = promptTokens + outputTokens / 2
  const contextGrowth = 1 + (averageContextTokens / 1000) * C.contextGrowthPer1kTokens
  const batchPenalty = input.batching ? C.batchDecodePenalty : 1
  const perTokenDecodeMs =
    model.decodeMsPerToken * hardware.computeFactor * contextGrowth * batchPenalty

  const firstTokenComputeMs = Math.max(
    0.1,
    perTokenDecodeMs * C.firstTokenPremium + jitter(perTokenDecodeMs * 0.1),
  )

  /* Per-token gaps for tokens 2..n, with a little natural variation. */
  const remainingTokens = Math.max(0, outputTokens - 1)
  const tokenGaps: number[] = []
  for (let i = 0; i < remainingTokens; i += 1) {
    const variance = input.deterministic
      ? 0
      : (random() * 2 - 1) * perTokenDecodeMs * C.interTokenJitterFraction
    tokenGaps.push(Math.max(0.05, perTokenDecodeMs + variance))
  }
  const generationMs = tokenGaps.reduce((sum, gap) => sum + gap, 0)

  /* ---------------- Return path, streaming and rendering ---------------- */

  const responseBytes = outputTokens * C.bytesPerToken + 400

  let streamingMs: number
  let returnNetworkMs: number
  let renderingMs: number
  /** Return-trip cost paid before the first token can appear on screen. */
  let firstReturnMs: number
  /** Browser cost to paint the first token. */
  let firstRenderMs: number

  if (input.streaming) {
    // Chunks flow continuously, so the one-way return latency is paid once to
    // fill the pipe; after that, chunks arrive as fast as they are produced.
    firstReturnMs = Math.max(
      0.05,
      network.oneWayMs + transferMs(C.bytesPerToken + 120, network.bandwidthMbps) + jitter(network.jitterMs * 0.5),
    )
    returnNetworkMs = firstReturnMs
    streamingMs = outputTokens * C.streamChunkOverheadMs
    firstRenderMs = C.renderFixedMs + C.renderPerTokenMs
    renderingMs = C.renderFixedMs + outputTokens * C.renderPerTokenMs
  } else {
    // Nothing leaves the server until the last token exists, then the entire
    // body travels at once and the browser paints it in one pass.
    firstReturnMs = 0
    returnNetworkMs = Math.max(
      0.05,
      network.oneWayMs + transferMs(responseBytes, network.bandwidthMbps) + jitter(network.jitterMs * 0.5),
    )
    streamingMs = 0
    renderingMs = C.renderFixedMs + outputTokens * C.renderPerTokenMs * C.renderBulkFactor
    firstRenderMs = renderingMs
  }

  /* ---------------- Assemble the timeline ---------------- */

  const durations: Record<StageId, number> = {
    inputCapture: inputCaptureMs,
    requestCreation: requestCreationMs,
    networkUpload: networkUploadMs,
    serverIngress: serverIngressMs,
    queue: queueMs,
    tokenization: tokenizationMs,
    prefill: prefillMs,
    firstTokenCompute: firstTokenComputeMs,
    generation: generationMs,
    streaming: streamingMs,
    returnNetwork: returnNetworkMs,
    rendering: renderingMs,
  }

  const details: Record<StageId, string> = {
    inputCapture: 'Reading the input field and updating application state.',
    requestCreation: `Serialising a request body of about ${Math.round(requestBytes).toLocaleString()} bytes.`,
    networkUpload: `${round(network.oneWayMs)} ms one-way + ${round(network.connectionOverheadMs)} ms connection setup + ${round(uploadTransferMs)} ms to push ${Math.round(requestBytes).toLocaleString()} bytes over ${network.bandwidthMbps} Mbps.`,
    serverIngress: 'Parsing, validating and routing the request.',
    queue: rho <= 0
      ? 'The fleet is idle, so there is nothing to wait for.'
      : `Fleet at ${Math.round(rho * 100)}% utilisation gives a wait factor of ${round(utilisationTerm, 2)}×, scaled by this request occupying a slot for ${round(occupancy, 2)}× as long as the reference.${input.batching ? ' Batching relieves most of it.' : ''}`,
    tokenization: `${promptTokens.toLocaleString()} prompt tokens at ${COEFFICIENTS.tokenizerMsPerToken} ms each.`,
    prefill: input.cache
      ? `Cache covers ${Math.round(cachedFraction * 100)}% of the prompt, so only ~${Math.round(prefillTokens).toLocaleString()} of ${promptTokens.toLocaleString()} tokens are processed.`
      : `${promptTokens.toLocaleString()} tokens × ${model.prefillMsPerToken} ms × ${hardware.computeFactor}× hardware factor.`,
    firstTokenCompute: `One decode step (${round(perTokenDecodeMs)} ms) plus a ${COEFFICIENTS.firstTokenPremium}× first-step premium.`,
    generation: `${remainingTokens.toLocaleString()} further tokens at about ${round(perTokenDecodeMs)} ms each.`,
    streaming: input.streaming
      ? `${outputTokens.toLocaleString()} chunks × ${COEFFICIENTS.streamChunkOverheadMs} ms of framing overhead.`
      : 'Streaming is off, so there are no intermediate chunks.',
    returnNetwork: input.streaming
      ? `One-way return latency paid once to fill the stream: ${round(network.oneWayMs)} ms.`
      : `${round(network.oneWayMs)} ms one-way + ${round(transferMs(responseBytes, network.bandwidthMbps))} ms to transfer the whole ${Math.round(responseBytes).toLocaleString()}-byte response.`,
    rendering: input.streaming
      ? `Repainting on each of ${outputTokens.toLocaleString()} streamed tokens.`
      : 'A single layout and paint pass for the complete response.',
  }

  const stages: StageTiming[] = []
  let cursor = 0
  for (const descriptor of STAGES) {
    const ms = Math.max(0, durations[descriptor.id])
    stages.push({
      id: descriptor.id,
      ms: round(ms, 2),
      startMs: round(cursor, 2),
      endMs: round(cursor + ms, 2),
      detail: details[descriptor.id],
    })
    cursor += ms
  }

  const totalMs = cursor

  /* ---------------- Derived metrics ---------------- */

  /*
   * Server-side first token: everything from the send button up to the moment
   * the model has sampled token #1. This is what a provider means by TTFT.
   */
  const serverFirstTokenMs =
    inputCaptureMs +
    requestCreationMs +
    networkUploadMs +
    serverIngressMs +
    queueMs +
    tokenizationMs +
    prefillMs +
    firstTokenComputeMs

  /*
   * User-observed TTFT. With streaming on, the token still has to travel back
   * and be painted. With streaming off there is no such thing as an early
   * token for the user: nothing appears until the whole response lands.
   */
  const ttftMs = input.streaming
    ? serverFirstTokenMs + firstReturnMs + firstRenderMs
    : totalMs
  const firstVisibleOutputMs = ttftMs

  /* ---------------- Token arrival schedule ---------------- */

  const tokenTexts = buildResponseTokens(outputTokens)
  const tokens: GeneratedToken[] = []

  if (input.streaming) {
    let arrival = ttftMs
    const perTokenStreamOverhead = C.streamChunkOverheadMs + C.renderPerTokenMs
    tokens.push({ index: 0, text: tokenTexts[0], arrivalMs: round(arrival, 2), gapMs: 0 })
    for (let i = 0; i < tokenGaps.length; i += 1) {
      const gap = tokenGaps[i] + perTokenStreamOverhead
      arrival += gap
      tokens.push({
        index: i + 1,
        text: tokenTexts[i + 1],
        arrivalMs: round(arrival, 2),
        gapMs: round(gap, 2),
      })
    }
  } else {
    // Everything appears during the single bulk render pass at the very end.
    const paintStart = totalMs - renderingMs
    const perToken = renderingMs / outputTokens
    for (let i = 0; i < outputTokens; i += 1) {
      tokens.push({
        index: i,
        text: tokenTexts[i],
        arrivalMs: round(paintStart + perToken * (i + 1), 2),
        gapMs: i === 0 ? 0 : round(perToken, 2),
      })
    }
  }

  /*
   * Generation rate. We measure it over the decode window — from the start of
   * the first decode step to the last — because that is the part of the
   * pipeline actually producing tokens. Queue and prefill are excluded, which
   * is why tokens/sec alone never tells you how responsive a system feels.
   */
  const decodeWindowMs = firstTokenComputeMs + generationMs
  const tokensPerSecond = decodeWindowMs > 0 ? (outputTokens / decodeWindowMs) * 1000 : 0
  const interTokenMs = remainingTokens > 0 ? generationMs / remainingTokens : 0

  /* Shares of the total wall clock. These sum to 1 by construction. */
  const shares = {} as Record<StageId, number>
  for (const stage of stages) {
    shares[stage.id] = totalMs > 0 ? stage.ms / totalMs : 0
  }

  const dominantStage = stages.reduce((biggest, stage) =>
    stage.ms > biggest.ms ? stage : biggest,
  ).id

  /*
   * Throughput is a property of the SERVER, not of one request. With batching
   * on, several requests share the device, so the fleet emits many more tokens
   * per second even though each individual request decodes slightly slower.
   */
  const concurrency = input.batching ? C.batchSize : 1
  const serverThroughputTokensPerSecond = tokensPerSecond * concurrency

  return {
    provenance: 'SIMULATED',
    input,
    stages,
    ttftMs: round(ttftMs, 1),
    serverFirstTokenMs: round(serverFirstTokenMs, 1),
    totalMs: round(totalMs, 1),
    firstVisibleOutputMs: round(firstVisibleOutputMs, 1),
    generationMs: round(generationMs, 1),
    tokensPerSecond: round(tokensPerSecond, 1),
    interTokenMs: round(interTokenMs, 1),
    promptTokens,
    outputTokens,
    tokens,
    dominantStage,
    shares,
    serverThroughputTokensPerSecond: round(serverThroughputTokensPerSecond, 1),
  }
}

/** A sensible starting configuration for the app. */
export const DEFAULT_INPUT: SimulationInput = {
  network: 'average',
  customNetworkMs: 45,
  modelSize: 'medium',
  hardware: 'accelerator',
  serverLoad: 'low',
  deployment: 'cloud',
  promptTokens: 120,
  outputTokens: 80,
  streaming: true,
  cache: false,
  batching: true,
  deterministic: false,
  seed: 20260917,
}
