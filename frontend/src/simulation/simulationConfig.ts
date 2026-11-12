/**
 * NLPulse — simulation coefficients.
 *
 * ============================ PLEASE READ ============================
 * Every number in this file is an EDUCATIONAL SIMULATION PARAMETER.
 *
 * These are order-of-magnitude teaching values chosen so that the *relative*
 * behaviour of the pipeline is correct and instructive: a bigger model costs
 * more than a smaller one, a CPU is much slower than an accelerator, prefill
 * scales with prompt length, decode scales with output length, and so on.
 *
 * They are NOT measurements of any specific model, provider, GPU or network,
 * and they must never be presented as such. Real systems vary by orders of
 * magnitude depending on model architecture, quantisation, batch composition,
 * kernel implementation, context length, interconnect and much else.
 *
 * Anything derived from this file is labelled SIMULATED in the UI.
 * =====================================================================
 */

import type {
  HardwareId,
  ModelSizeId,
  NetworkPresetId,
  ServerLoadId,
  StageDescriptor,
  StageId,
} from './types'

/* ------------------------------------------------------------------ */
/* Network presets                                                     */
/* ------------------------------------------------------------------ */

export interface NetworkPreset {
  id: NetworkPresetId
  label: string
  description: string
  /** One-way latency, ms. A round trip is roughly twice this. */
  oneWayMs: number
  /** Random spread applied to each traversal, ms (disabled in deterministic mode). */
  jitterMs: number
  /** Usable throughput for the request/response bodies, in megabits per second. */
  bandwidthMbps: number
  /** Fixed cost of establishing or reusing the connection (TLS, HTTP setup), ms. */
  connectionOverheadMs: number
}

export const NETWORK_PRESETS: Record<
  Exclude<NetworkPresetId, 'custom'>,
  NetworkPreset
> = {
  veryFast: {
    id: 'veryFast',
    label: 'Very Fast',
    description: 'Same-region datacentre link, or fibre very close to the provider.',
    oneWayMs: 6,
    jitterMs: 2,
    bandwidthMbps: 500,
    connectionOverheadMs: 4,
  },
  fast: {
    id: 'fast',
    label: 'Fast',
    description: 'Good broadband with the provider in the same country.',
    oneWayMs: 18,
    jitterMs: 5,
    bandwidthMbps: 120,
    connectionOverheadMs: 8,
  },
  average: {
    id: 'average',
    label: 'Average',
    description: 'A typical home or campus connection to a distant region.',
    oneWayMs: 45,
    jitterMs: 12,
    bandwidthMbps: 40,
    connectionOverheadMs: 15,
  },
  slow: {
    id: 'slow',
    label: 'Slow',
    description: 'Congested Wi-Fi, mobile data, or an intercontinental path.',
    oneWayMs: 110,
    jitterMs: 35,
    bandwidthMbps: 8,
    connectionOverheadMs: 35,
  },
  verySlow: {
    id: 'verySlow',
    label: 'Very Slow',
    description: 'Weak mobile signal, a satellite hop, or heavy packet loss.',
    oneWayMs: 260,
    jitterMs: 90,
    bandwidthMbps: 1.5,
    connectionOverheadMs: 80,
  },
}

/** Applied when the model runs on the same machine as the user. */
export const LOCAL_DEPLOYMENT = {
  /** Loopback transport cost in place of a network hop, ms. */
  oneWayMs: 0.4,
  jitterMs: 0.2,
  bandwidthMbps: 4000,
  connectionOverheadMs: 0.5,
  /**
   * Local inference runs on whatever hardware the laptop has, and without a
   * shared fleet in front of it there is no meaningful request queue.
   */
  queueMultiplier: 0.05,
}

/* ------------------------------------------------------------------ */
/* Model presets                                                       */
/* ------------------------------------------------------------------ */

export interface ModelPreset {
  id: ModelSizeId
  label: string
  description: string
  /**
   * Cost of pushing ONE prompt token through the forward pass during prefill,
   * on the reference accelerator, in ms. Prefill is highly parallel, so this
   * per-token cost is far lower than the per-token decode cost.
   */
  prefillMsPerToken: number
  /**
   * Cost of producing ONE output token during decode, on the reference
   * accelerator, in ms. Decode is sequential and memory-bandwidth bound,
   * which is why it dominates long responses.
   */
  decodeMsPerToken: number
  /** Fixed per-request model overhead (sampler setup, cache allocation), ms. */
  fixedOverheadMs: number
  /** Relative weight for the queue model: bigger models hold a slot for longer. */
  queueWeight: number
}

export const MODEL_PRESETS: Record<ModelSizeId, ModelPreset> = {
  small: {
    id: 'small',
    label: 'Small',
    description: 'A compact model. Cheap per token and quick to respond.',
    prefillMsPerToken: 0.012,
    decodeMsPerToken: 4.5,
    fixedOverheadMs: 6,
    queueWeight: 0.6,
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    description: 'A mid-sized model. The common general-purpose trade-off.',
    prefillMsPerToken: 0.03,
    decodeMsPerToken: 9,
    fixedOverheadMs: 10,
    queueWeight: 1,
  },
  large: {
    id: 'large',
    label: 'Large',
    description: 'A large model. Stronger output, more computation per token.',
    prefillMsPerToken: 0.075,
    decodeMsPerToken: 19,
    fixedOverheadMs: 18,
    queueWeight: 1.7,
  },
  veryLarge: {
    id: 'veryLarge',
    label: 'Very Large',
    description: 'A frontier-scale model, often split across several devices.',
    prefillMsPerToken: 0.16,
    decodeMsPerToken: 34,
    fixedOverheadMs: 30,
    queueWeight: 2.6,
  },
}

/* ------------------------------------------------------------------ */
/* Hardware presets                                                    */
/* ------------------------------------------------------------------ */

export interface HardwarePreset {
  id: HardwareId
  label: string
  description: string
  /**
   * Multiplier applied to model compute costs. 1.0 is the reference
   * data-centre accelerator that the model presets are expressed in.
   */
  computeFactor: number
  /** Multiplier on how long the request occupies a server slot (feeds the queue). */
  occupancyFactor: number
}

export const HARDWARE_PRESETS: Record<HardwareId, HardwarePreset> = {
  cpu: {
    id: 'cpu',
    label: 'CPU',
    description: 'A general-purpose processor. It runs anything, but decode is slow.',
    computeFactor: 18,
    occupancyFactor: 3.2,
  },
  consumerGpu: {
    id: 'consumerGpu',
    label: 'Consumer GPU',
    description: 'A desktop graphics card. A large step up from CPU decode.',
    computeFactor: 3.2,
    occupancyFactor: 1.6,
  },
  highEndGpu: {
    id: 'highEndGpu',
    label: 'High-End GPU',
    description: 'A workstation or server card with far more memory bandwidth.',
    computeFactor: 1.35,
    occupancyFactor: 1.1,
  },
  accelerator: {
    id: 'accelerator',
    label: 'Data Center Accelerator',
    description: 'Purpose-built inference hardware — the reference point here.',
    computeFactor: 1,
    occupancyFactor: 1,
  },
}

/* ------------------------------------------------------------------ */
/* Server load presets                                                 */
/* ------------------------------------------------------------------ */

export interface ServerLoadPreset {
  id: ServerLoadId
  label: string
  description: string
  /**
   * Utilisation of the serving fleet, from 0 to just under 1. Queueing theory
   * tells us waiting time grows non-linearly as utilisation approaches 1,
   * which is exactly the lesson this control exists to teach.
   */
  utilisation: number
}

export const SERVER_LOAD_PRESETS: Record<ServerLoadId, ServerLoadPreset> = {
  empty: {
    id: 'empty',
    label: 'Empty',
    description: 'Your request is served the moment it arrives.',
    utilisation: 0,
  },
  low: {
    id: 'low',
    label: 'Low',
    description: 'A few other requests are in flight.',
    utilisation: 0.3,
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    description: 'Busy, but the fleet is keeping up.',
    utilisation: 0.65,
  },
  high: {
    id: 'high',
    label: 'High',
    description: 'Near capacity. Waiting starts to dominate.',
    utilisation: 0.88,
  },
  overloaded: {
    id: 'overloaded',
    label: 'Overloaded',
    description: 'Demand exceeds capacity and the queue backs up badly.',
    utilisation: 0.97,
  },
}

/* ------------------------------------------------------------------ */
/* Stage-level coefficients                                            */
/* ------------------------------------------------------------------ */

export const COEFFICIENTS = {
  /** Time for the browser to read the input and build an event object, ms. */
  inputCaptureMs: 2.5,
  /** Serialising the request body and calling fetch(), ms. */
  requestCreationMs: 3.5,
  /** Average bytes of JSON payload per prompt token (UTF-8 text plus overhead). */
  bytesPerToken: 4.2,
  /** Fixed request envelope: headers, auth, JSON scaffolding, in bytes. */
  requestOverheadBytes: 900,
  /** Server-side parse, validate and route, ms. */
  serverIngressMs: 4,

  /**
   * Base queue wait, ms. The queue model multiplies this by
   * utilisation / (1 - utilisation) — the standard shape of a queueing delay
   * curve — and then by how long this particular request occupies a slot.
   */
  queueBaseMs: 26,
  /** Ceiling so an overloaded preset cannot produce an absurd number, ms. */
  queueCeilingMs: 40000,

  /** Tokeniser cost per prompt token, ms. Tokenisation is cheap. */
  tokenizerMsPerToken: 0.0016,
  /** Fixed tokeniser setup, ms. */
  tokenizerFixedMs: 0.8,

  /**
   * Decode slows down as the KV cache grows, because each new token attends
   * over everything before it. Modelled as a gentle linear growth term.
   */
  contextGrowthPer1kTokens: 0.055,

  /** The first decode step costs a little more than steady-state decode. */
  firstTokenPremium: 1.35,

  /** Share of prompt prefill avoided on a cache hit (prefix / KV cache reuse). */
  cacheHitRatio: 0.82,
  /** Cost of looking the prefix up in the cache, ms. */
  cacheLookupMs: 2.5,

  /**
   * Continuous batching raises throughput by sharing the device between
   * requests, which relieves the queue. The cost is a short wait for the batch
   * window plus slightly slower per-token decode because the device is shared.
   */
  batchQueueRelief: 0.42,
  batchWindowMs: 12,
  batchDecodePenalty: 1.12,
  /** How many concurrent requests the batching simulation assumes. */
  batchSize: 8,

  /** Per-chunk framing and flush cost on the server when streaming, ms. */
  streamChunkOverheadMs: 0.35,
  /** Browser cost to append and paint one streamed token, ms. */
  renderPerTokenMs: 0.55,
  /** Fixed browser render and layout cost for the response container, ms. */
  renderFixedMs: 9,
  /** Relative render cost when the whole response lands at once (no streaming). */
  renderBulkFactor: 0.35,

  /** Per-token variability during decode, as a fraction of the mean gap. */
  interTokenJitterFraction: 0.22,
} as const

/* ------------------------------------------------------------------ */
/* Slider bounds                                                       */
/* ------------------------------------------------------------------ */

export const LIMITS = {
  promptTokens: { min: 10, max: 10000, step: 10 },
  outputTokens: { min: 10, max: 1000, step: 10 },
  customNetworkMs: { min: 0, max: 500, step: 1 },
} as const

/* ------------------------------------------------------------------ */
/* Stage metadata — the single source of truth for labels and colours  */
/* ------------------------------------------------------------------ */

export const STAGES: StageDescriptor[] = [
  {
    id: 'inputCapture',
    label: 'Input Capture',
    icon: '⌨',
    side: 'client',
    color: '#64748b',
    what: 'The browser reads what you typed and hands it to the application code.',
    why: 'Event handling, state updates and reading text out of the DOM all take a little time.',
    fix: 'There is very little to gain here — this is already sub-millisecond territory.',
  },
  {
    id: 'requestCreation',
    label: 'Request Creation',
    icon: '📦',
    side: 'client',
    color: '#6366f1',
    what: 'Your text is packed into a request body along with headers and settings.',
    why: 'Building and serialising JSON costs CPU time in the browser.',
    fix: 'Keep payloads lean and avoid resending conversation history you do not need.',
  },
  {
    id: 'networkUpload',
    label: 'Network Upload',
    icon: '🌐',
    side: 'network',
    color: '#0ea5e9',
    what: 'The request travels from your machine to the provider.',
    why: 'Distance, routing hops, congestion and connection setup all add delay, and a large prompt takes time to push through the link.',
    fix: 'Use a nearer region, reuse connections, and send fewer bytes.',
  },
  {
    id: 'serverIngress',
    label: 'Server Arrival',
    icon: '🖥',
    side: 'server',
    color: '#14b8a6',
    what: 'The server receives, validates and routes your request.',
    why: 'Parsing, authentication and routing are real work, even when they are fast.',
    fix: 'Mostly a fixed cost. It matters more at very high request rates.',
  },
  {
    id: 'queue',
    label: 'Queue / Scheduler',
    icon: '⏳',
    side: 'server',
    color: '#f59e0b',
    what: 'Your request waits for a free slot on the inference hardware.',
    why: 'Accelerators are shared. When many requests arrive at once yours waits its turn, and the wait grows sharply as the fleet approaches full utilisation.',
    fix: 'More capacity, better scheduling, continuous batching, or simply less load.',
  },
  {
    id: 'tokenization',
    label: 'Tokenization',
    icon: '🔤',
    side: 'server',
    color: '#a78bfa',
    what: 'Your text is converted into the token IDs the model actually consumes.',
    why: 'Every character has to be scanned and matched against the vocabulary.',
    fix: 'Rarely the bottleneck, but it does scale with prompt length.',
  },
  {
    id: 'prefill',
    label: 'Prompt Prefill',
    icon: '📚',
    side: 'server',
    color: '#ec4899',
    what: 'The model reads the whole prompt and builds its internal state before writing anything.',
    why: 'Every prompt token must pass through every layer. The work is parallel, so it is fast per token — but a long prompt means a great many tokens.',
    fix: 'Shorten the prompt, or reuse a cached prefix when the same context repeats.',
  },
  {
    id: 'firstTokenCompute',
    label: 'First Token',
    icon: '⚡',
    side: 'server',
    color: '#facc15',
    what: 'The model runs one more forward pass and samples the very first output token.',
    why: 'This step ends the silent period. Everything before it happened with nothing on screen.',
    fix: 'Faster hardware and smaller models shorten it, but it is usually small next to prefill and queueing.',
  },
  {
    id: 'generation',
    label: 'Generation',
    icon: '🔁',
    side: 'server',
    color: '#22c55e',
    what: 'The model produces the remaining tokens, one forward pass at a time.',
    why: 'Autoregressive decoding is sequential: each token depends on the ones before it, so the cost scales with how much output you asked for.',
    fix: 'Ask for shorter output, or use a faster-decoding model or better hardware.',
  },
  {
    id: 'streaming',
    label: 'Token Streaming',
    icon: '📡',
    side: 'network',
    color: '#38bdf8',
    what: 'Tokens are pushed to your browser as they are produced instead of all at the end.',
    why: 'Each chunk carries framing overhead, but streaming lets you start reading long before the response is finished.',
    fix: 'Streaming does not make generation faster. It makes the wait feel far shorter.',
  },
  {
    id: 'returnNetwork',
    label: 'Return Path',
    icon: '🌐',
    side: 'network',
    color: '#0284c7',
    what: 'The response data travels back from the provider to your machine.',
    why: 'The same distance and routing costs apply on the way home.',
    fix: 'Same as the upload: closer regions and fewer bytes.',
  },
  {
    id: 'rendering',
    label: 'Browser Rendering',
    icon: '🖌',
    side: 'client',
    color: '#94a3b8',
    what: 'The browser turns the received text into pixels you can read.',
    why: 'Layout, styling and painting cost time, and re-rendering on every streamed token adds up.',
    fix: 'Batch DOM updates and avoid re-rendering the whole transcript for each token.',
  },
]

export const STAGE_BY_ID: Record<StageId, StageDescriptor> = Object.fromEntries(
  STAGES.map((s) => [s.id, s]),
) as Record<StageId, StageDescriptor>

/** Stages that must complete before the first token can possibly be visible. */
export const PRE_FIRST_TOKEN_STAGES: StageId[] = [
  'inputCapture',
  'requestCreation',
  'networkUpload',
  'serverIngress',
  'queue',
  'tokenization',
  'prefill',
  'firstTokenCompute',
]
