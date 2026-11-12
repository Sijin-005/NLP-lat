/**
 * NLPulse — real-world NLP examples.
 *
 * Five recognisable products, each broken into its stages. Clicking one plays a
 * short stage-by-stage reveal so the audience sees the shape of the pipeline
 * rather than reading a table of numbers.
 *
 * The per-stage durations are illustrative simulated values (see
 * educationalContent.ts) and are labelled as such.
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { REAL_WORLD_EXAMPLES } from '../../data/educationalContent'
import { formatMs } from '../../simulation/metrics'
import { ProvenanceBadge } from '../ui/primitives'

export function RealWorldExamples() {
  const [activeId, setActiveId] = useState(REAL_WORLD_EXAMPLES[0].id)
  const [revealed, setRevealed] = useState(0)

  const example =
    REAL_WORLD_EXAMPLES.find((item) => item.id === activeId) ?? REAL_WORLD_EXAMPLES[0]
  const total = example.stages.reduce((sum, stage) => sum + stage.ms, 0)

  // Reveal the stages one at a time whenever a new example is selected.
  useEffect(() => {
    setRevealed(0)
    const timer = window.setInterval(() => {
      setRevealed((count) => {
        if (count >= example.stages.length) {
          window.clearInterval(timer)
          return count
        }
        return count + 1
      })
    }, 320)
    return () => window.clearInterval(timer)
  }, [example])

  return (
    <div className="px-4 py-3">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {REAL_WORLD_EXAMPLES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveId(item.id)}
            aria-pressed={item.id === activeId}
            className={`rounded-lg border px-3 py-1.5 text-[0.78rem] font-semibold transition-colors ${
              item.id === activeId
                ? 'border-sky-400/70 bg-sky-500/15 text-sky-200'
                : 'border-slate-700/60 bg-slate-900/40 text-slate-400 hover:border-slate-500 hover:text-slate-200'
            }`}
          >
            <span aria-hidden>{item.icon}</span> {item.title}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[0.84rem] text-slate-300">{example.scenario}</p>
            <ProvenanceBadge provenance="SIMULATED" />
          </div>

          <div className="space-y-1.5">
            {example.stages.map((stage, index) => {
              const visible = index < revealed
              const share = total > 0 ? stage.ms / total : 0
              return (
                <motion.div
                  key={stage.label}
                  initial={false}
                  animate={{ opacity: visible ? 1 : 0.2, x: visible ? 0 : -8 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center gap-2"
                >
                  <span className="w-[170px] shrink-0 truncate text-[0.76rem] text-slate-300">
                    {stage.label}
                  </span>
                  <span className="relative h-3 flex-1 overflow-hidden rounded bg-slate-800/50">
                    <motion.span
                      className="absolute inset-y-0 left-0 rounded bg-sky-500/70"
                      initial={{ width: 0 }}
                      animate={{ width: visible ? `${Math.max(2, share * 100)}%` : 0 }}
                      transition={{ duration: 0.3 }}
                    />
                  </span>
                  <span className="tnum w-[62px] shrink-0 text-right text-[0.72rem] text-slate-400">
                    {formatMs(stage.ms)}
                  </span>
                </motion.div>
              )
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-slate-700/50 pt-2">
            <span className="text-[0.7rem] uppercase tracking-[0.12em] text-slate-500">
              End to end
            </span>
            <span className="tnum text-base font-bold text-sky-300">
              {formatMs(total)}
            </span>
          </div>

          {/* Per-stage notes, so each bar is explained rather than just drawn. */}
          <ul className="mt-2 space-y-1">
            {example.stages.slice(0, revealed).map((stage) => (
              <li key={stage.label} className="text-[0.7rem] leading-snug text-slate-500">
                <span className="font-semibold text-slate-400">{stage.label}:</span>{' '}
                {stage.note}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <div
            className={`rounded-lg border p-3 ${
              example.generative
                ? 'border-pink-500/40 bg-pink-500/5'
                : 'border-sky-500/40 bg-sky-500/5'
            }`}
          >
            <div className="text-[0.62rem] uppercase tracking-[0.12em] text-slate-400">
              Output produced
            </div>
            <div
              className={`text-sm font-bold ${
                example.generative ? 'text-pink-300' : 'text-sky-300'
              }`}
            >
              {example.generative ? 'Token by token' : 'In a single pass'}
            </div>
            <p className="mt-1 text-[0.72rem] leading-snug text-slate-400">
              {example.generative
                ? 'Sequential decoding, so output length drives the cost.'
                : 'No generation loop — TTFT and tokens per second do not apply here.'}
            </p>
          </div>

          <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3">
            <div className="mb-1 text-[0.62rem] uppercase tracking-[0.12em] text-slate-500">
              What this teaches
            </div>
            <p className="text-[0.76rem] leading-relaxed text-slate-300">
              {example.lesson}
            </p>
          </div>

          <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3">
            <div className="mb-1 text-[0.62rem] uppercase tracking-[0.12em] text-slate-500">
              What the user expects
            </div>
            <p className="text-[0.76rem] leading-relaxed text-slate-400">
              {example.expectation}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
