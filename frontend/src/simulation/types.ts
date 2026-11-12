/**
 * NLPulse — shared simulation types.
 *
 * Everything produced by the simulation engine is SIMULATED. Values that come
 * from an actual measurement (browser timers, backend timers) live in the
 * separate `MeasuredResult` shapes used by Real Test mode, and are never merged
 * into these structures.
 */

export type Provenance = 'SIMULATED' | 'MEASURED'

/**
 * Where a single stage's number came from.
 *
 * Real providers do not expose every stage separately, so a measured run has
 * gaps. We mark them rather than filling them in:
 *
 *  MEASURED      a real clock produced this figure
 *  DERIVED       computed from other measured figures (e.g. a per-token mean)
 *  NOT_REPORTED  this provider does not separate this stage out
 *  SIMULATED     produced by the educational model
 */
export type StageProvenance =
  | 'MEASURED'
  | 'DERIVED'
  | 'NOT_REPORTED'
  | 'SIMULATED'

export type NetworkPresetId =
  | 'veryFast'
  | 'fast'
  | 'average'
  | 'slow'
  | 'verySlow'
  | 'custom'

export type ModelSizeId = 'small' | 'medium' | 'large' | 'veryLarge'

export type HardwareId = 'cpu' | 'consumerGpu' | 'highEndGpu' | 'accelerator'

export type ServerLoadId = 'empty' | 'low' | 'medium' | 'high' | 'overloaded'

export type DeploymentId = 'cloud' | 'local'

/** Every stage the pipeline visualises, in causal order. */
export type StageId =
  | 'inputCapture'
  | 'requestCreation'
  | 'networkUpload'
  | 'serverIngress'
  | 'queue'
  | 'tokenization'
  | 'prefill'
  | 'firstTokenCompute'
  | 'generation'
  | 'streaming'
  | 'returnNetwork'
  | 'rendering'

export interface StageDescriptor {
  id: StageId
  /** Short label used on the pipeline node. */
  label: string
  icon: string
  /** Which side of the journey this stage happens on. */
  side: 'client' | 'network' | 'server'
  /** One-line answer to "what happened here?" */
  what: string
  /** Answer to "why did this take time?" */
  why: string
  /** Answer to "what could reduce this delay?" */
  fix: string
  /** Tailwind colour token used consistently across pipeline, waterfall, charts. */
  color: string
}

/** The user-controlled inputs to a simulation run. */
export interface SimulationInput {
  network: NetworkPresetId
  /** Used only when `network === 'custom'`: one-way latency in ms. */
  customNetworkMs: number
  modelSize: ModelSizeId
  hardware: HardwareId
  serverLoad: ServerLoadId
  deployment: DeploymentId
  promptTokens: number
  outputTokens: number
  streaming: boolean
  cache: boolean
  batching: boolean
  /** When true, jitter is disabled and a run is byte-for-byte reproducible. */
  deterministic: boolean
  /** Seed for the jitter PRNG. Ignored in deterministic mode. */
  seed: number
}

/** A single stage's simulated contribution. */
export interface StageTiming {
  id: StageId
  /** Duration attributed to this stage, in milliseconds. */
  ms: number
  /** Absolute start offset from t=0 (the moment the user hits Send). */
  startMs: number
  /** Absolute end offset from t=0. */
  endMs: number
  /** Human-readable note explaining how this number arose for THIS run. */
  detail: string
  /** Where this particular number came from. Defaults to the run's provenance. */
  provenance?: StageProvenance
  /**
   * Overrides the generic stage description when a real run means something
   * different by this stage. On a local model, for example, "Queue" is model
   * loading rather than waiting behind other users' requests.
   */
  what?: string
  why?: string
  fix?: string
}

/** One generated token with the moment it becomes available to the user. */
export interface GeneratedToken {
  index: number
  text: string
  /** Offset from t=0 at which this token reached the user, in ms. */
  arrivalMs: number
  /** Gap since the previous token reached the user, in ms. */
  gapMs: number
}

export interface SimulationResult {
  provenance: Provenance
  input: SimulationInput
  /** Set on measured runs: which model actually produced the response. */
  modelName?: string
  /** Set on measured runs: the question that was actually asked. */
  promptText?: string
  /** Set on measured runs: anything the provider could not tell us. */
  measurementNotes?: string[]
  stages: StageTiming[]
  /**
   * Time to first token as the USER experiences it: the moment the first
   * generated token is visible. With streaming disabled this equals `totalMs`,
   * because nothing is shown until the whole response arrives.
   */
  ttftMs: number
  /** When the model produced token #1 server-side, regardless of streaming. */
  serverFirstTokenMs: number
  /**
   * Time until the user can see the *complete* response. With streaming off
   * this equals the moment the whole response lands, which is also the moment
   * anything at all becomes visible.
   */
  totalMs: number
  /** Moment the user first sees ANY generated output (differs when streaming is off). */
  firstVisibleOutputMs: number
  /** Wall time spent producing tokens after the first one. */
  generationMs: number
  tokensPerSecond: number
  /** Mean gap between consecutive visible tokens. */
  interTokenMs: number
  promptTokens: number
  outputTokens: number
  tokens: GeneratedToken[]
  /** Stage id with the largest contribution to totalMs. */
  dominantStage: StageId
  /** Stage breakdown as a share of totalMs (0..1). */
  shares: Record<StageId, number>
  /** Throughput figure for the *server*, not for this one request. */
  serverThroughputTokensPerSecond: number
}
