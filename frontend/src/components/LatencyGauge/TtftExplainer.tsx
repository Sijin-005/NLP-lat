/**
 * NLPulse — the TTFT explainer.
 *
 * A dedicated visual for the single most important number in the application:
 * how long the user stares at nothing. It shows which stages stack up before
 * the first token, then contrasts that with total completion time so the two
 * are never conflated.
 */

import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '../../state/appStore'
import { useClockStore } from '../../state/clockStore'
import {
  buildTtftBreakdown,
  classifyPerception,
  formatMs,
  formatPercent,
} from '../../simulation/metrics'
import { Term } from '../ui/Tooltip'
import { ProvenanceBadge } from '../ui/primitives'

/** The stopwatch: runs with the clock, freezes when the first token lands. */
const Stopwatch = memo(function Stopwatch() {
  const ttftMs = useAppStore((state) => state.result?.ttftMs ?? 0)
  const virtualMs = useClockStore((clock) => clock.virtualMs)
  const reached = useClockStore((clock) => clock.firstTokenReached)
  const status = useClockStore((clock) => clock.status)

  const shown = reached ? ttftMs : virtualMs
  const progress = ttftMs > 0 ? Math.min(1, shown / ttftMs) : 0

  return (
    <div className="flex items-center gap-4">
      {/* Circular progress towards the first token. */}
      <div className="relative h-20 w-20 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#1e2740" strokeWidth="9" />
          <motion.circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke={reached ? '#facc15' : '#38bdf8'}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 42}
            animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - progress) }}
            transition={{ duration: 0.12, ease: 'linear' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xl" aria-hidden>
          {reached ? '⚡' : '⏱'}
        </span>
      </div>

      <div className="min-w-0">
        <div className="text-[0.64rem] uppercase tracking-[0.16em] text-slate-500">
          <Term k="ttft">Time to first token</Term>
        </div>
        <div
          className={`tnum text-4xl font-black leading-tight ${
            reached ? 'text-amber-300' : 'text-slate-400'
          }`}
        >
          {formatMs(shown)}
        </div>
        <div className="text-[0.7rem] text-slate-500">
          {status === 'idle'
            ? 'press Run to start the clock'
            : reached
              ? 'the first token is on screen'
              : 'still nothing on screen…'}
        </div>
      </div>
    </div>
  )
})

export function TtftExplainer() {
  const result = useAppStore((state) => state.result)
  const bands = useAppStore((state) => state.perceptionBands)
  const contributions = useMemo(
    () => (result ? buildTtftBreakdown(result) : []),
    [result],
  )

  if (!result) {
    return (
      <p className="px-4 py-6 text-center text-[0.82rem] text-slate-600">
        Run a simulation to measure the wait before the first token.
      </p>
    )
  }

  const band = classifyPerception(result.ttftMs, bands)
  const streaming = result.input.streaming
  const tail = result.totalMs - result.ttftMs

  return (
    <div className="flex h-full flex-col gap-3 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <Stopwatch />
        <ProvenanceBadge provenance={result.provenance} />
      </div>

      {/* What stacked up before the first token. */}
      <div>
        <div className="mb-1.5 text-[0.66rem] uppercase tracking-[0.14em] text-slate-500">
          What the user waited through
        </div>
        <div className="space-y-[3px]">
          {contributions
            .filter((item) => item.ms > 0)
            .map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <span className="w-[112px] shrink-0 truncate text-[0.7rem] text-slate-400">
                  {item.label}
                </span>
                <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-slate-800/60">
                  <motion.span
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ background: item.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(1, item.share * 100)}%` }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                  />
                </span>
                <span className="tnum w-[62px] shrink-0 text-right text-[0.68rem] text-slate-400">
                  {formatMs(item.ms)}
                </span>
                <span className="tnum w-[42px] shrink-0 text-right text-[0.64rem] text-slate-600">
                  {formatPercent(item.share)}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* TTFT is not total time — the distinction, stated plainly. */}
      <div className="mt-auto grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-2.5">
          <div className="text-[0.62rem] uppercase tracking-[0.12em] text-amber-400/80">
            Wait before output
          </div>
          <div className="tnum text-lg font-bold text-amber-300">
            {formatMs(result.ttftMs)}
          </div>
          <div className="text-[0.66rem]" style={{ color: band.color }}>
            {band.label}
          </div>
        </div>
        <div className="rounded-lg border border-sky-500/40 bg-sky-500/5 p-2.5">
          <div className="text-[0.62rem] uppercase tracking-[0.12em] text-sky-400/80">
            Then, to finish
          </div>
          <div className="tnum text-lg font-bold text-sky-300">+{formatMs(tail)}</div>
          <div className="text-[0.66rem] text-slate-500">
            total {formatMs(result.totalMs)}
          </div>
        </div>
      </div>

      <p className="text-[0.68rem] leading-snug text-slate-500">
        {streaming ? (
          <>
            With <Term k="streaming">streaming</Term> on, the user starts reading
            after {formatMs(result.ttftMs)} and the rest arrives while they read.
            The model reached its first token at{' '}
            {formatMs(result.serverFirstTokenMs)} server-side; the difference is
            the return trip and the first paint.
          </>
        ) : (
          <>
            With <Term k="streaming">streaming</Term> off there is no early token
            for the user: the screen stays empty for the whole{' '}
            {formatMs(result.totalMs)}, even though the model produced its first
            token at {formatMs(result.serverFirstTokenMs)}. Same computation,
            very different experience.
          </>
        )}
      </p>
    </div>
  )
}
