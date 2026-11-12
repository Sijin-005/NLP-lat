/**
 * NLPulse — the main pipeline visualisation.
 *
 * Renders the full journey from a human pressing Send to the same human
 * reading an answer, and animates a request travelling through it.
 *
 * Render-cost note: every node subscribes to the 60 fps clock, but only through
 * selectors that return a *primitive*. A node re-renders when its own displayed
 * number changes and not otherwise, so a frame typically touches one node.
 */

import { memo } from 'react'
import { motion } from 'framer-motion'
import { useClockStore } from '../../state/clockStore'
import { useAppStore } from '../../state/appStore'
import { STAGES } from '../../simulation/simulationConfig'
import { formatMs } from '../../simulation/metrics'
import type { StageDescriptor, StageId } from '../../simulation/types'

/** The pipeline is drawn as two rows: the trip out, and the trip home. */
const OUTBOUND: StageId[] = [
  'inputCapture',
  'requestCreation',
  'networkUpload',
  'serverIngress',
  'queue',
  'tokenization',
  'prefill',
]
const INBOUND: StageId[] = [
  'firstTokenCompute',
  'generation',
  'streaming',
  'returnNetwork',
  'rendering',
]

const STAGE_INDEX: Record<StageId, number> = Object.fromEntries(
  STAGES.map((stage, index) => [stage.id, index]),
) as Record<StageId, number>

/* ------------------------------------------------------------------ */
/* A single pipeline node                                              */
/* ------------------------------------------------------------------ */

interface NodeProps {
  stage: StageDescriptor
  compact: boolean
}

const PipelineNode = memo(function PipelineNode({ stage, compact }: NodeProps) {
  const index = STAGE_INDEX[stage.id]
  const selectStage = useAppStore((state) => state.selectStage)
  const selected = useAppStore((state) => state.selectedStage === stage.id)

  // Primitive selectors only — see the render-cost note at the top of the file.
  const state = useClockStore((clock) => {
    if (clock.activeStageIndex < 0) return 'idle'
    if (clock.activeStageIndex === index) return 'active'
    return clock.activeStageIndex > index ? 'done' : 'pending'
  })

  // Subscribe to this stage's timing so the node updates when a new run loads.
  const timing = useAppStore((app) =>
    app.result?.stages.find((item) => item.id === stage.id) ?? null,
  )

  /** Milliseconds elapsed inside this stage so far, for the counting readout. */
  const elapsed = useClockStore((clock) => {
    if (!timing) return -1
    if (clock.virtualMs < timing.startMs) return -1
    return Math.min(timing.ms, clock.virtualMs - timing.startMs)
  })

  const isFirstToken = stage.id === 'firstTokenCompute'
  const active = state === 'active'
  const done = state === 'done'

  return (
    <button
      type="button"
      onClick={() => selectStage(selected ? null : stage.id)}
      aria-label={`${stage.label}. ${stage.what}`}
      aria-pressed={selected}
      className="group relative flex shrink-0 flex-col items-center focus-visible:outline-none"
      style={{ width: compact ? 72 : 84 }}
    >
      <motion.div
        animate={{
          scale: active ? 1.09 : 1,
          borderColor: active ? stage.color : selected ? '#475569' : 'rgba(30,39,64,1)',
        }}
        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
        className="relative flex w-full flex-col items-center rounded-xl border bg-[#0d1220] px-1.5 py-2"
        style={{
          boxShadow: active
            ? `0 0 0 1px ${stage.color}, 0 0 26px -4px ${stage.color}`
            : undefined,
        }}
      >
        {/* Colour key strip, so node / waterfall / chart always agree. */}
        <span
          className="absolute inset-x-3 top-0 h-[2px] rounded-full transition-opacity"
          style={{ background: stage.color, opacity: done || active ? 1 : 0.28 }}
        />

        <span
          className={compact ? 'text-lg leading-none' : 'text-xl leading-none'}
          aria-hidden
        >
          {stage.icon}
        </span>

        <span
          className={`mt-1 text-center font-semibold leading-tight ${
            compact ? 'text-[0.6rem]' : 'text-[0.68rem]'
          } ${active ? 'text-white' : done ? 'text-slate-300' : 'text-slate-500'}`}
        >
          {stage.label}
        </span>

        {/* The stage's own contribution, counting up while it is active. */}
        <span
          className={`tnum mt-0.5 text-[0.66rem] font-bold ${
            elapsed < 0 ? 'text-slate-700' : 'text-sky-300'
          }`}
        >
          {elapsed < 0 ? '—' : formatMs(elapsed)}
        </span>

        {/* First-token flash: the moment the silence ends. */}
        {isFirstToken && active && (
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-xl"
            style={{ background: stage.color }}
            initial={{ opacity: 0.85 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 0.25 }}
          />
        )}
      </motion.div>
    </button>
  )
})

/* ------------------------------------------------------------------ */
/* Connector between two nodes, with a travelling packet               */
/* ------------------------------------------------------------------ */

const Connector = memo(function Connector({ intoStage }: { intoStage: StageId | 'human' }) {
  // A connector is "live" while the request is moving into the node it feeds,
  // and stays lit once the request has gone past.
  const live = useClockStore((clock) =>
    intoStage === 'human'
      ? clock.status === 'running' && clock.activeStageIndex === STAGES.length - 1
      : clock.activeStageIndex === STAGE_INDEX[intoStage],
  )
  const passed = useClockStore((clock) =>
    intoStage === 'human'
      ? clock.status === 'done'
      : clock.activeStageIndex >= STAGE_INDEX[intoStage],
  )

  return (
    <div className="relative mx-px h-0.5 w-3.5 shrink-0 self-start" style={{ marginTop: 34 }}>
      <div
        className="absolute inset-0 rounded-full transition-colors"
        style={{ background: passed ? '#38bdf8' : '#1e2740' }}
      />
      {live && (
        <motion.span
          className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-sky-300"
          style={{ boxShadow: '0 0 10px 2px rgba(56,189,248,0.8)' }}
          initial={{ left: '-10%' }}
          animate={{ left: '100%' }}
          transition={{ duration: 0.75, repeat: Infinity, ease: 'linear' }}
        />
      )}
    </div>
  )
})

/* ------------------------------------------------------------------ */
/* Human endpoints                                                     */
/* ------------------------------------------------------------------ */

function HumanNode({
  caption,
  sub,
  lit,
  compact,
}: {
  caption: string
  sub: string
  lit: boolean
  compact: boolean
}) {
  return (
    <div
      className="flex shrink-0 flex-col items-center"
      style={{ width: compact ? 72 : 84 }}
    >
      <motion.div
        animate={{ scale: lit ? 1.06 : 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className={`flex w-full flex-col items-center rounded-xl border px-1.5 py-2 ${
          lit
            ? 'border-emerald-400/70 bg-emerald-500/10'
            : 'border-slate-700/60 bg-[#0d1220]'
        }`}
      >
        <span className={compact ? 'text-lg leading-none' : 'text-xl leading-none'} aria-hidden>
          👤
        </span>
        <span
          className={`mt-1 text-center font-semibold leading-tight ${
            compact ? 'text-[0.6rem]' : 'text-[0.68rem]'
          } ${lit ? 'text-emerald-200' : 'text-slate-400'}`}
        >
          {caption}
        </span>
        <span className="mt-0.5 text-center text-[0.6rem] leading-tight text-slate-600">
          {sub}
        </span>
      </motion.div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Row                                                                 */
/* ------------------------------------------------------------------ */

function Row({
  ids,
  compact,
  lead,
  tail,
}: {
  ids: StageId[]
  compact: boolean
  lead?: React.ReactNode
  tail?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-center gap-y-3">
      {lead}
      {ids.map((id, position) => {
        const stage = STAGES.find((item) => item.id === id)
        if (!stage) return null
        return (
          <div key={id} className="flex items-start">
            {(position > 0 || lead) && <Connector intoStage={id} />}
            <PipelineNode stage={stage} compact={compact} />
          </div>
        )
      })}
      {tail}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* The elapsed-time readout (the only 60 fps text in the pipeline)     */
/* ------------------------------------------------------------------ */

function ElapsedClock({ large }: { large: boolean }) {
  const virtualMs = useClockStore((clock) => clock.virtualMs)
  const status = useClockStore((clock) => clock.status)
  const firstToken = useClockStore((clock) => clock.firstTokenReached)
  const measured = useAppStore((state) => state.result?.provenance === 'MEASURED')

  return (
    <div className="flex items-baseline gap-3">
      <span
        className={`tnum font-bold tabular-nums ${large ? 'text-5xl' : 'text-3xl'} ${
          firstToken ? 'text-emerald-300' : 'text-sky-300'
        }`}
      >
        {formatMs(virtualMs)}
      </span>
      <span className="text-[0.7rem] uppercase tracking-[0.14em] text-slate-500">
        {status === 'running'
          ? 'elapsed'
          : status === 'done'
            ? measured
              ? 'total (measured)'
              : 'total (simulated)'
            : status === 'paused'
              ? 'paused'
              : 'ready'}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* The pipeline                                                        */
/* ------------------------------------------------------------------ */

export function PipelineView({ compact = false }: { compact?: boolean }) {
  const result = useAppStore((state) => state.result)
  const humanSees = useClockStore((clock) => clock.status === 'done')
  const started = useClockStore((clock) => clock.virtualMs > 0)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <ElapsedClock large={!compact} />
        {result && (
          <div className="flex items-center gap-4 text-[0.72rem] text-slate-500">
            <span>
              <span className="text-slate-400">Prompt</span>{' '}
              <span className="tnum text-slate-200">
                {result.promptTokens.toLocaleString()}
              </span>{' '}
              tokens
            </span>
            <span>
              <span className="text-slate-400">Output</span>{' '}
              <span className="tnum text-slate-200">
                {result.outputTokens.toLocaleString()}
              </span>{' '}
              tokens
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 overflow-x-auto pb-1 scrollbar-none">
        <Row
          ids={OUTBOUND}
          compact={compact}
          lead={
            <HumanNode
              caption="Human"
              sub="presses Send"
              lit={!started}
              compact={compact}
            />
          }
        />

        {/* The turn: the request is now inside the model. */}
        <div className="flex items-center justify-center gap-3 py-0.5">
          <span className="h-px w-16 bg-gradient-to-r from-transparent to-slate-600" />
          <span className="text-[0.62rem] uppercase tracking-[0.2em] text-slate-600">
            the model begins to answer
          </span>
          <span className="h-px w-16 bg-gradient-to-l from-transparent to-slate-600" />
        </div>

        <Row
          ids={INBOUND}
          compact={compact}
          tail={
            <div className="flex items-start">
              <Connector intoStage="human" />
              <HumanNode
                caption="Human sees it"
                sub="response on screen"
                lit={humanSees}
                compact={compact}
              />
            </div>
          }
        />
      </div>
    </div>
  )
}
