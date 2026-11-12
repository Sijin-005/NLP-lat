/**
 * NLPulse — derived metrics and views over a SimulationResult.
 *
 * The engine produces a strict, non-overlapping accounting of the wall clock.
 * This module derives the alternative *views* the UI needs: a waterfall that
 * shows real overlapping spans, the grouped contributions to TTFT, and
 * comparison diffs.
 */

import { PRE_FIRST_TOKEN_STAGES, STAGE_BY_ID } from './simulationConfig'
import type { SimulationResult, StageId } from './types'

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

/** Format a duration for display, switching to seconds once it gets long. */
export function formatMs(ms: number): string {
  if (!Number.isFinite(ms)) return '—'
  if (ms >= 10000) return `${(ms / 1000).toFixed(1)} s`
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`
  if (ms >= 100) return `${Math.round(ms)} ms`
  if (ms >= 10) return `${ms.toFixed(1)} ms`
  return `${ms.toFixed(2)} ms`
}

/** Format a duration as milliseconds only, for axis ticks and tables. */
export function formatMsExact(ms: number): string {
  return `${Math.round(ms).toLocaleString()} ms`
}

export function formatPercent(fraction: number): string {
  if (!Number.isFinite(fraction)) return '—'
  if (fraction > 0 && fraction < 0.001) return '<0.1%'
  return `${(fraction * 100).toFixed(1)}%`
}

/* ------------------------------------------------------------------ */
/* Waterfall                                                           */
/* ------------------------------------------------------------------ */

export interface WaterfallSpan {
  id: StageId
  label: string
  color: string
  startMs: number
  endMs: number
  durationMs: number
  /**
   * True when this span runs concurrently with another one. Streaming and
   * rendering genuinely overlap generation; the strict accounting in the
   * engine separates them so percentages add up, but the waterfall shows the
   * real, overlapping picture.
   */
  overlapped: boolean
}

/**
 * Build the waterfall view. Stages up to the first token are strictly
 * sequential. After that, generation, streaming and rendering overlap, so we
 * place them on their true spans rather than stacking them end to end.
 */
export function buildWaterfall(result: SimulationResult): WaterfallSpan[] {
  const byId = new Map(result.stages.map((stage) => [stage.id, stage]))
  const spans: WaterfallSpan[] = []

  const push = (id: StageId, startMs: number, endMs: number, overlapped = false) => {
    const descriptor = STAGE_BY_ID[id]
    spans.push({
      id,
      label: descriptor.label,
      color: descriptor.color,
      startMs,
      endMs,
      durationMs: Math.max(0, endMs - startMs),
      overlapped,
    })
  }

  // Sequential spine: the engine already laid these out in causal order.
  for (const id of PRE_FIRST_TOKEN_STAGES) {
    const stage = byId.get(id)
    if (stage) push(id, stage.startMs, stage.endMs)
  }

  const firstTokenStage = byId.get('firstTokenCompute')
  const decodeStart = firstTokenStage ? firstTokenStage.endMs : 0
  const generation = byId.get('generation')
  const generationEnd = decodeStart + (generation?.ms ?? 0)

  push('generation', decodeStart, generationEnd)

  if (result.input.streaming) {
    // Chunks leave the server and paint in the browser while decoding continues.
    push('returnNetwork', decodeStart, Math.min(result.totalMs, result.ttftMs), true)
    push('streaming', decodeStart, result.totalMs, true)
    push('rendering', result.ttftMs, result.totalMs, true)
  } else {
    // Nothing moves until decoding has finished.
    const returnStage = byId.get('returnNetwork')
    const renderStage = byId.get('rendering')
    const returnEnd = generationEnd + (returnStage?.ms ?? 0)
    push('returnNetwork', generationEnd, returnEnd)
    push('rendering', returnEnd, returnEnd + (renderStage?.ms ?? 0))
  }

  return spans
}

/* ------------------------------------------------------------------ */
/* TTFT breakdown                                                      */
/* ------------------------------------------------------------------ */

export interface TtftContribution {
  id: StageId
  label: string
  color: string
  ms: number
  share: number
}

/**
 * The stages that stand between pressing Send and seeing the first token.
 * With streaming on this stops at the first token's paint; with streaming off
 * the whole response is in the way, so every stage contributes.
 */
export function buildTtftBreakdown(result: SimulationResult): TtftContribution[] {
  const byId = new Map(result.stages.map((stage) => [stage.id, stage]))
  const ids: StageId[] = result.input.streaming
    ? [...PRE_FIRST_TOKEN_STAGES, 'returnNetwork', 'rendering']
    : result.stages.map((stage) => stage.id)

  const raw = ids.map((id) => {
    const descriptor = STAGE_BY_ID[id]
    let ms = byId.get(id)?.ms ?? 0

    // With streaming on, only the first traversal and first paint count
    // towards TTFT, not the whole streamed tail.
    if (result.input.streaming && id === 'rendering') {
      ms = ms / Math.max(1, result.outputTokens)
    }

    return { id, label: descriptor.label, color: descriptor.color, ms }
  })

  const total = raw.reduce((sum, item) => sum + item.ms, 0)
  return raw.map((item) => ({ ...item, share: total > 0 ? item.ms / total : 0 }))
}

/* ------------------------------------------------------------------ */
/* Human perception                                                    */
/* ------------------------------------------------------------------ */

export interface PerceptionBand {
  id: string
  label: string
  /** Upper bound in ms; the last band uses Infinity. */
  maxMs: number
  color: string
  note: string
}

/**
 * Conceptual perception bands.
 *
 * These are adjustable demonstration defaults, not universal thresholds. What
 * counts as "fast enough" depends entirely on the interaction: an autocomplete
 * that takes 400 ms feels broken, while a translation that takes 400 ms feels
 * instant. The Perception panel lets the presenter move these live to make
 * exactly that point.
 */
export const DEFAULT_PERCEPTION_BANDS: PerceptionBand[] = [
  {
    id: 'immediate',
    label: 'Immediate-feeling',
    maxMs: 150,
    color: '#22c55e',
    note: 'The response feels like a direct consequence of the action.',
  },
  {
    id: 'noticeable',
    label: 'Noticeable',
    maxMs: 500,
    color: '#84cc16',
    note: 'A delay is perceptible, but the flow of interaction survives.',
  },
  {
    id: 'waiting',
    label: 'Waiting',
    maxMs: 2000,
    color: '#f59e0b',
    note: 'The user is aware of waiting and their attention starts to drift.',
  },
  {
    id: 'disruptive',
    label: 'Disruptive',
    maxMs: Number.POSITIVE_INFINITY,
    color: '#ef4444',
    note: 'Long enough that the user may switch context or abandon the task.',
  },
]

export function classifyPerception(
  ms: number,
  bands: PerceptionBand[] = DEFAULT_PERCEPTION_BANDS,
): PerceptionBand {
  return bands.find((band) => ms <= band.maxMs) ?? bands[bands.length - 1]
}

/* ------------------------------------------------------------------ */
/* Comparison                                                          */
/* ------------------------------------------------------------------ */

export interface ComparisonRow {
  key: string
  label: string
  a: number
  b: number
  unit: 'ms' | 'tps'
  /** Difference b - a. */
  delta: number
  /** Relative difference, or null when A is zero. */
  ratio: number | null
  hint: string
}

/**
 * Compare two runs. We report the differences and leave the judgement to the
 * viewer: a configuration with lower latency may cost far more to run, and a
 * configuration with higher throughput may feel worse to a single user.
 */
export function compareRuns(a: SimulationResult, b: SimulationResult): ComparisonRow[] {
  const stageMs = (result: SimulationResult, id: StageId) =>
    result.stages.find((stage) => stage.id === id)?.ms ?? 0

  const rows: Array<Omit<ComparisonRow, 'delta' | 'ratio'>> = [
    { key: 'ttft', label: 'Time to first token', a: a.ttftMs, b: b.ttftMs, unit: 'ms', hint: 'How long the user stares at nothing.' },
    { key: 'total', label: 'Total completion time', a: a.totalMs, b: b.totalMs, unit: 'ms', hint: 'Until the complete response is on screen.' },
    { key: 'tps', label: 'Generation rate', a: a.tokensPerSecond, b: b.tokensPerSecond, unit: 'tps', hint: 'Tokens per second during decode.' },
    { key: 'queue', label: 'Queue time', a: stageMs(a, 'queue'), b: stageMs(b, 'queue'), unit: 'ms', hint: 'Waiting for a free slot.' },
    { key: 'network', label: 'Network (up + return)', a: stageMs(a, 'networkUpload') + stageMs(a, 'returnNetwork'), b: stageMs(b, 'networkUpload') + stageMs(b, 'returnNetwork'), unit: 'ms', hint: 'Both directions of travel.' },
    { key: 'prefill', label: 'Prefill time', a: stageMs(a, 'prefill'), b: stageMs(b, 'prefill'), unit: 'ms', hint: 'Reading the prompt before writing.' },
    { key: 'generation', label: 'Generation time', a: stageMs(a, 'generation'), b: stageMs(b, 'generation'), unit: 'ms', hint: 'Producing tokens after the first.' },
  ]

  return rows.map((row) => ({
    ...row,
    delta: row.b - row.a,
    ratio: row.a === 0 ? null : row.b / row.a,
  }))
}

/* ------------------------------------------------------------------ */
/* Summary helpers                                                     */
/* ------------------------------------------------------------------ */

/** Stages ordered by contribution, largest first. */
export function rankedStages(result: SimulationResult) {
  return [...result.stages]
    .filter((stage) => stage.ms > 0)
    .sort((left, right) => right.ms - left.ms)
    .map((stage) => ({
      ...stage,
      label: STAGE_BY_ID[stage.id].label,
      color: STAGE_BY_ID[stage.id].color,
      share: result.shares[stage.id],
    }))
}
