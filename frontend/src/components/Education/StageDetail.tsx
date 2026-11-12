/**
 * NLPulse — the explanation panel.
 *
 * Follows whatever the presenter is pointing at: a stage clicked in the
 * pipeline or the waterfall, otherwise the stage currently running, otherwise
 * the biggest contributor to the last run. It always has something useful to
 * say, which matters when it is on a projector all session.
 */

import { useAppStore } from '../../state/appStore'
import { useClockStore } from '../../state/clockStore'
import { STAGE_BY_ID } from '../../simulation/simulationConfig'
import { formatMs, formatPercent } from '../../simulation/metrics'
import { Button } from '../ui/primitives'
import type { StageProvenance } from '../../simulation/types'

/**
 * A real provider does not expose every stage. This chip says exactly what
 * kind of number the reader is looking at, so a derived figure is never
 * mistaken for a measured one.
 */
const PROVENANCE_CHIP: Record<
  StageProvenance,
  { label: string; className: string; note: string }
> = {
  MEASURED: {
    label: 'measured',
    className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    note: 'A real clock produced this figure.',
  },
  DERIVED: {
    label: 'derived',
    className: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
    note: 'Calculated from measured figures, not timed directly.',
  },
  NOT_REPORTED: {
    label: 'not reported',
    className: 'border-slate-600/60 bg-slate-800/50 text-slate-400',
    note: 'This provider does not break this stage out, so there is no number to show.',
  },
  SIMULATED: {
    label: 'simulated',
    className: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    note: 'Produced by the educational model, not measured.',
  },
}

export function StageDetail() {
  const result = useAppStore((state) => state.result)
  const selectedStage = useAppStore((state) => state.selectedStage)
  const selectStage = useAppStore((state) => state.selectStage)
  const activeStageId = useClockStore((clock) => clock.activeStageId)
  const running = useClockStore((clock) => clock.status === 'running')

  // Priority: an explicit click, then the live stage, then the worst offender.
  const stageId = selectedStage ?? (running ? activeStageId : null) ?? result?.dominantStage

  if (!result || !stageId) {
    return (
      <div className="px-4 py-6 text-center text-[0.8rem] text-slate-600">
        Click any stage in the pipeline to see what happens there and why it
        takes time.
      </div>
    )
  }

  const descriptor = STAGE_BY_ID[stageId]
  const timing = result.stages.find((stage) => stage.id === stageId)
  const share = result.shares[stageId] ?? 0
  const isDominant = stageId === result.dominantStage
  const chip =
    PROVENANCE_CHIP[timing?.provenance ?? (result.provenance === 'MEASURED' ? 'MEASURED' : 'SIMULATED')]
  const notReported = timing?.provenance === 'NOT_REPORTED'

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      <div className="flex items-start gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg"
          style={{ background: `${descriptor.color}22`, border: `1px solid ${descriptor.color}66` }}
          aria-hidden
        >
          {descriptor.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[0.95rem] font-bold leading-tight text-white">
            {descriptor.label}
          </h3>
          <p className="text-[0.66rem] uppercase tracking-[0.1em] text-slate-500">
            {descriptor.side === 'client'
              ? 'happens in your browser'
              : descriptor.side === 'network'
                ? 'happens on the wire'
                : 'happens on the server'}
          </p>
        </div>
        {selectedStage && (
          <Button variant="ghost" onClick={() => selectStage(null)} title="Stop pinning this stage">
            ✕
          </Button>
        )}
      </div>

      {timing && (
        <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 px-3 py-2">
          <div className="flex items-baseline gap-3">
            <span className="tnum text-2xl font-bold" style={{ color: descriptor.color }}>
              {notReported ? '—' : formatMs(timing.ms)}
            </span>
            {!notReported && (
              <span className="tnum text-[0.78rem] text-slate-400">
                {formatPercent(share)} of total
              </span>
            )}
            {isDominant && !notReported && (
              <span className="ml-auto rounded-md border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-amber-300">
                largest
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <span
              className={`rounded border px-1.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.1em] ${chip.className}`}
            >
              {chip.label}
            </span>
            <span className="text-[0.66rem] leading-snug text-slate-500">{chip.note}</span>
          </div>
        </div>
      )}

      {/* A measured run may redefine what a stage means; prefer its wording. */}
      <Section title="What happened?" body={timing?.what ?? descriptor.what} />
      <Section title="Why did this take time?" body={timing?.why ?? descriptor.why} />
      <Section
        title="What could reduce this delay?"
        body={timing?.fix ?? descriptor.fix}
        accent
      />

      {timing && (
        <div className="rounded-lg border border-slate-700/40 bg-slate-900/30 px-3 py-2">
          <div className="mb-0.5 text-[0.62rem] uppercase tracking-[0.12em] text-slate-500">
            How this run produced that number
          </div>
          <p className="text-[0.72rem] leading-snug text-slate-400">{timing.detail}</p>
        </div>
      )}

      {/* What this provider could not tell us. */}
      {result.measurementNotes && result.measurementNotes.length > 0 && (
        <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 px-3 py-2">
          <div className="mb-1 text-[0.62rem] uppercase tracking-[0.12em] text-sky-400/80">
            What this run could not measure
          </div>
          <ul className="space-y-1">
            {result.measurementNotes.map((note) => (
              <li key={note} className="text-[0.7rem] leading-snug text-slate-400">
                • {note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function Section({
  title,
  body,
  accent = false,
}: {
  title: string
  body: string
  accent?: boolean
}) {
  return (
    <div>
      <h4
        className={`mb-0.5 text-[0.68rem] font-bold uppercase tracking-[0.1em] ${
          accent ? 'text-emerald-400/90' : 'text-slate-500'
        }`}
      >
        {title}
      </h4>
      <p className="text-[0.8rem] leading-relaxed text-slate-300">{body}</p>
    </div>
  )
}
