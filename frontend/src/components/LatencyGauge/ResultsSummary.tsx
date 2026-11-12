/**
 * NLPulse — final results summary.
 *
 * Appears once a run finishes and answers the closing question of every
 * experiment: where did the time actually go?
 */

import { motion } from 'framer-motion'
import { useAppStore } from '../../state/appStore'
import { useClockStore } from '../../state/clockStore'
import { formatMs, formatPercent, rankedStages } from '../../simulation/metrics'
import { STAGE_BY_ID } from '../../simulation/simulationConfig'
import { ProvenanceBadge } from '../ui/primitives'
import { Term } from '../ui/Tooltip'

export function ResultsSummary() {
  const result = useAppStore((state) => state.result)
  const done = useClockStore((clock) => clock.status === 'done')

  if (!result) return null

  const ranked = rankedStages(result)
  const dominant = STAGE_BY_ID[result.dominantStage]
  const dominantShare = result.shares[result.dominantStage] ?? 0
  const top = ranked.slice(0, 4)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex h-full flex-col gap-3 px-4 py-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3
          className={`text-[0.82rem] font-bold uppercase tracking-[0.12em] ${
            done ? 'text-emerald-300' : 'text-slate-500'
          }`}
        >
          {done ? '✓ Request complete' : 'Projected result'}
        </h3>
        <ProvenanceBadge provenance={result.provenance} />
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
        <Figure
          label={<Term k="ttft">TTFT</Term>}
          value={formatMs(result.ttftMs)}
          color="text-amber-300"
        />
        <Figure
          label="Total completion"
          value={formatMs(result.totalMs)}
          color="text-sky-300"
        />
        <Figure
          label={<Term k="tokensPerSecond">Generation rate</Term>}
          value={`${result.tokensPerSecond.toFixed(1)} tok/s`}
          color="text-emerald-300"
        />
        <Figure
          label={<Term k="interTokenLatency">Inter-token</Term>}
          value={`${result.interTokenMs.toFixed(1)} ms`}
          color="text-emerald-300"
        />
        <Figure
          label="Prompt tokens"
          value={result.promptTokens.toLocaleString()}
          color="text-violet-300"
        />
        <Figure
          label="Output tokens"
          value={result.outputTokens.toLocaleString()}
          color="text-pink-300"
        />
      </dl>

      <div
        className="rounded-lg border p-3"
        style={{
          borderColor: `${dominant.color}66`,
          background: `${dominant.color}12`,
        }}
      >
        <div className="text-[0.62rem] uppercase tracking-[0.12em] text-slate-400">
          {result.provenance === 'MEASURED'
            ? 'Largest measured contributor'
            : 'Largest simulated contributor'}
        </div>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="text-base font-bold" style={{ color: dominant.color }}>
            {dominant.icon} {dominant.label}
          </span>
          <span className="tnum ml-auto text-[0.82rem] font-semibold text-slate-200">
            {formatPercent(dominantShare)}
          </span>
        </div>
        <p className="mt-1 text-[0.72rem] leading-snug text-slate-400">
          {dominant.fix}
        </p>
      </div>

      <div className="min-h-0 flex-1">
        <div className="mb-1.5 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-slate-400">
          Where did the time go?
        </div>
        <ul className="space-y-1">
          {top.map((stage) => (
            <li key={stage.id} className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-sm"
                style={{ background: stage.color }}
                aria-hidden
              />
              <span className="flex-1 truncate text-[0.76rem] text-slate-300">
                {stage.label}
              </span>
              <span className="tnum text-[0.74rem] text-slate-400">
                {formatMs(stage.ms)}
              </span>
              <span className="tnum w-11 text-right text-[0.72rem] font-semibold text-slate-300">
                {formatPercent(stage.share)}
              </span>
            </li>
          ))}
          {ranked.length > top.length && (
            <li className="flex items-center gap-2 border-t border-slate-800 pt-1">
              <span className="h-2 w-2 shrink-0 rounded-sm bg-slate-700" aria-hidden />
              <span className="flex-1 text-[0.76rem] text-slate-500">
                everything else ({ranked.length - top.length} stages)
              </span>
              <span className="tnum text-[0.74rem] text-slate-500">
                {formatMs(
                  ranked.slice(top.length).reduce((sum, stage) => sum + stage.ms, 0),
                )}
              </span>
              <span className="tnum w-11 text-right text-[0.72rem] text-slate-500">
                {formatPercent(
                  ranked.slice(top.length).reduce((sum, stage) => sum + stage.share, 0),
                )}
              </span>
            </li>
          )}
        </ul>
      </div>
    </motion.div>
  )
}

function Figure({
  label,
  value,
  color,
}: {
  label: React.ReactNode
  value: string
  color: string
}) {
  return (
    <div>
      <dt className="truncate text-[0.62rem] uppercase tracking-[0.1em] text-slate-500">
        {label}
      </dt>
      <dd className={`tnum text-lg font-bold leading-tight ${color}`}>{value}</dd>
    </div>
  )
}
