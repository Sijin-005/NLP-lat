/**
 * NLPulse — model inference visualiser.
 *
 * A deliberately simplified picture of what happens inside the model while the
 * pipeline sits in its prefill / decode stages.
 *
 * This is NOT a rendering of a transformer. It is a diagram of the decode loop:
 * tokens in, embeddings, layers, a probability distribution over the vocabulary,
 * one sampled token, repeat. The simplification is labelled in the UI.
 */

import { memo, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '../../state/appStore'
import { useClockStore } from '../../state/clockStore'
import { STAGES } from '../../simulation/simulationConfig'
import { Term } from '../ui/Tooltip'

const indexOf = (id: string) => STAGES.findIndex((stage) => stage.id === id)
const PREFILL_INDEX = indexOf('prefill')
const GENERATION_INDEX = indexOf('generation')

interface Step {
  id: string
  label: string
  detail: string
  term?: 'embedding' | 'attention' | 'token' | 'transformer'
}

const STEPS: Step[] = [
  { id: 'tokens', label: 'Input Tokens', detail: 'The prompt, plus everything generated so far.', term: 'token' },
  { id: 'embeddings', label: 'Embeddings', detail: 'Each token id becomes a vector the network can compute with.', term: 'embedding' },
  { id: 'layers', label: 'Transformer Layers', detail: 'A stack of identical blocks, each refining the representation.', term: 'transformer' },
  { id: 'attention', label: 'Attention', detail: 'Every position draws on the positions that came before it.', term: 'attention' },
  { id: 'probs', label: 'Probability Distribution', detail: 'A score for every token in the vocabulary.' },
  { id: 'sample', label: 'Next Token', detail: 'One token is chosen and appended to the context.', term: 'token' },
]

/* ------------------------------------------------------------------ */
/* A toy probability distribution, reshuffled on each decode cycle     */
/* ------------------------------------------------------------------ */

const CANDIDATE_WORDS = [
  ' language', ' processing', ' models', ' computers', ' text', ' human',
  ' systems', ' data', ' words', ' meaning', ' tokens', ' analysis',
]

const DistributionBars = memo(function DistributionBars({ cycle }: { cycle: number }) {
  // Deterministic pseudo-shuffle keyed on the cycle number, so the bars move
  // in a stable, repeatable way rather than flickering randomly each frame.
  const bars = useMemo(() => {
    // Walk the candidate list with a stride coprime to its length, so the five
    // words picked are always distinct (and therefore have distinct React keys).
    const stride = 5
    const start = cycle * 3
    const picked = Array.from({ length: 5 }, (_, slot) => {
      const wordIndex = (start + slot * stride) % CANDIDATE_WORDS.length
      const weight = Math.abs(Math.sin(cycle * 1.7 + slot * 2.3)) + 0.05
      return { word: CANDIDATE_WORDS[wordIndex], weight }
    })
    const total = picked.reduce((sum, bar) => sum + bar.weight, 0) || 1
    return picked
      .map((bar) => ({ ...bar, share: bar.weight / total }))
      .sort((a, b) => b.share - a.share)
  }, [cycle])

  return (
    <div className="space-y-1">
      {bars.map((bar, index) => (
        <div key={bar.word} className="flex items-center gap-2">
          <span
            className={`w-20 shrink-0 truncate font-mono text-[0.66rem] ${
              index === 0 ? 'text-amber-200' : 'text-slate-500'
            }`}
          >
            {bar.word.trim()}
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
            <motion.div
              className="h-full rounded-full"
              style={{ background: index === 0 ? '#facc15' : '#475569' }}
              animate={{ width: `${Math.max(4, bar.share * 100)}%` }}
              transition={{ duration: 0.28 }}
            />
          </div>
          <span className="tnum w-9 shrink-0 text-right text-[0.62rem] text-slate-600">
            {(bar.share * 100).toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  )
})

/* ------------------------------------------------------------------ */

export function ModelVisualizer() {
  const hasResult = useAppStore((state) => state.result !== null)
  // The model is "busy" from prefill through the end of generation.
  const busy = useClockStore(
    (clock) =>
      clock.activeStageIndex >= PREFILL_INDEX &&
      clock.activeStageIndex <= GENERATION_INDEX &&
      clock.status === 'running',
  )
  const tokensOut = useClockStore((clock) => clock.visibleTokens)

  // Drive the highlight around the loop while the model is working.
  const [cycle, setCycle] = useState(0)
  useEffect(() => {
    if (!busy) return
    const timer = window.setInterval(() => setCycle((value) => value + 1), 340)
    return () => window.clearInterval(timer)
  }, [busy])

  const activeStep = busy ? cycle % STEPS.length : -1

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="panel-title">Inside the model</span>
        <span
          className={`rounded-md border px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.12em] ${
            busy
              ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-300'
              : 'border-slate-700/60 text-slate-600'
          }`}
        >
          {busy ? 'computing' : 'idle'}
        </span>
      </div>

      <ol className="grid grid-cols-2 gap-1.5">
        {STEPS.map((step, index) => {
          const active = index === activeStep
          return (
            <li key={step.id}>
              <div
                title={step.detail}
                className={`flex h-full flex-col justify-center rounded-lg border px-2 py-1.5 transition-colors ${
                  active
                    ? 'border-emerald-400/60 bg-emerald-500/10'
                    : 'border-slate-700/50 bg-slate-900/40'
                }`}
              >
                <span
                  className={`text-[0.7rem] font-semibold leading-tight ${
                    active ? 'text-emerald-200' : 'text-slate-400'
                  }`}
                >
                  {step.term ? <Term k={step.term}>{step.label}</Term> : step.label}
                </span>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-2.5">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[0.64rem] uppercase tracking-[0.12em] text-slate-500">
            Next-token scores
          </span>
          <span className="tnum text-[0.64rem] text-slate-600">
            step {hasResult ? tokensOut.toLocaleString() : 0}
          </span>
        </div>
        <DistributionBars cycle={cycle} />
      </div>

      <p className="mt-auto text-[0.66rem] leading-snug text-slate-600">
        Simplified diagram of the decode loop, not a rendering of a real network.
        Many generative language models work{' '}
        <Term k="autoregressive">autoregressively</Term> like this — but plenty of
        NLP systems, such as classifiers, produce their answer in a single pass
        with no loop at all.
      </p>
    </div>
  )
}
