/**
 * NLPulse — "Why is my AI slow?"
 *
 * The headline experiment. It starts from a deliberately bad configuration
 * where no single change rescues it, then lets the presenter remove one cause
 * at a time and watch the breakdown redraw.
 *
 * The lesson is the one students most need: there is rarely one universal
 * cause of latency, and the right fix depends entirely on which stage dominates.
 */

import { useEffect, useState } from 'react'
import { useAppStore } from '../../state/appStore'
import { WHY_SLOW_OPTIMISATIONS } from '../../data/presets'
import { formatMs, formatPercent } from '../../simulation/metrics'
import { STAGE_BY_ID } from '../../simulation/simulationConfig'
import { Button } from '../ui/primitives'

export function WhySlowPanel() {
  const result = useAppStore((state) => state.result)
  const applied = useAppStore((state) => state.whySlowApplied)
  const applyStep = useAppStore((state) => state.applyWhySlowStep)
  const resetWhySlow = useAppStore((state) => state.resetWhySlow)

  /** The very first (worst) measurement, kept as the reference point. */
  const [baseline, setBaseline] = useState<{ ttftMs: number; totalMs: number } | null>(null)

  useEffect(() => {
    if (result && applied.length === 0) {
      setBaseline({ ttftMs: result.ttftMs, totalMs: result.totalMs })
    }
  }, [result, applied.length])

  if (!result) return null

  const dominant = STAGE_BY_ID[result.dominantStage]
  const improvement =
    baseline && baseline.totalMs > 0 ? 1 - result.totalMs / baseline.totalMs : 0
  const allApplied = applied.length === WHY_SLOW_OPTIMISATIONS.length

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[0.82rem] font-bold uppercase tracking-[0.1em] text-amber-300">
          ❓ Why is my AI slow?
        </h3>
        <Button onClick={resetWhySlow}>↺ Back to the bad configuration</Button>
      </div>

      {/* Where we are now */}
      <div className="grid grid-cols-3 gap-2">
        <Figure label="TTFT now" value={formatMs(result.ttftMs)} color="text-amber-300" />
        <Figure label="Total now" value={formatMs(result.totalMs)} color="text-sky-300" />
        <Figure
          label="Improvement"
          value={improvement > 0.005 ? `−${Math.round(improvement * 100)}%` : '—'}
          color="text-emerald-300"
        />
      </div>

      {baseline && (
        <p className="text-[0.72rem] text-slate-500">
          Started at{' '}
          <span className="tnum text-slate-400">{formatMs(baseline.totalMs)}</span> total
          with a TTFT of{' '}
          <span className="tnum text-slate-400">{formatMs(baseline.ttftMs)}</span>.
        </p>
      )}

      {/* The current worst offender — changes as fixes are applied. */}
      <div
        className="rounded-lg border p-2.5"
        style={{ borderColor: `${dominant.color}66`, background: `${dominant.color}12` }}
      >
        <div className="text-[0.62rem] uppercase tracking-[0.12em] text-slate-400">
          Right now, the biggest cost is
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[0.95rem] font-bold" style={{ color: dominant.color }}>
            {dominant.icon} {dominant.label}
          </span>
          <span className="tnum ml-auto text-[0.8rem] text-slate-300">
            {formatPercent(result.shares[result.dominantStage] ?? 0)}
          </span>
        </div>
      </div>

      {/* Fix them one at a time */}
      <div className="space-y-1.5">
        <div className="panel-title">Remove one cause at a time</div>
        {WHY_SLOW_OPTIMISATIONS.map((optimisation, index) => {
          const done = applied.includes(optimisation.id)
          return (
            <div
              key={optimisation.id}
              className={`rounded-lg border p-2.5 transition-colors ${
                done
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : 'border-slate-700/50 bg-slate-900/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[0.68rem] font-bold ${
                    done ? 'bg-emerald-400 text-slate-950' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {done ? '✓' : index + 1}
                </span>
                <span className="flex-1 text-[0.8rem] font-medium text-slate-200">
                  {optimisation.label}
                </span>
                <Button
                  variant={done ? 'ghost' : 'primary'}
                  disabled={done}
                  onClick={() => applyStep(optimisation.id)}
                >
                  {done ? 'applied' : 'Apply'}
                </Button>
              </div>
              {done && (
                <p className="mt-1.5 pl-7 text-[0.72rem] leading-snug text-slate-400">
                  {optimisation.explain}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {allApplied && (
        <div className="rounded-lg border border-sky-500/40 bg-sky-500/5 p-3">
          <p className="text-[0.8rem] leading-relaxed text-slate-300">
            Five changes, five different stages. No single one of them would have
            been enough on its own, and the one that mattered most — moving off
            the CPU — would have done nothing at all if the problem had been
            queueing instead. That is the point: measure the breakdown first, then
            choose the fix.
          </p>
        </div>
      )}
    </div>
  )
}

function Figure({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 px-2.5 py-1.5">
      <div className="truncate text-[0.6rem] uppercase tracking-[0.1em] text-slate-500">
        {label}
      </div>
      <div className={`tnum text-base font-bold ${color}`}>{value}</div>
    </div>
  )
}
