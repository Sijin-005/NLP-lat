/**
 * NLPulse — Seminar Mode.
 *
 * A full-screen guided presentation driven by data/seminarScript.ts. It runs
 * the real simulator, so every number the room sees is produced live by the
 * same engine the rest of the application uses.
 *
 * Navigation: Space or → for the next step, ← for the previous one, Esc to
 * leave. The keyboard handler dispatches window events so all the step logic
 * can stay in this one component.
 */

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '../../state/appStore'
import { useClockStore } from '../../state/clockStore'
import { SEMINAR_STEPS } from '../../data/seminarScript'
import { PipelineView } from '../Pipeline/PipelineView'
import { TokenVisualizer } from '../TokenVisualizer/TokenVisualizer'
import { ModelVisualizer } from '../ModelVisualizer/ModelVisualizer'
import { TtftExplainer } from '../LatencyGauge/TtftExplainer'
import { Breakdown } from '../Charts/Breakdown'
import { Waterfall } from '../Waterfall/Waterfall'
import { ResultsSummary } from '../LatencyGauge/ResultsSummary'
import { formatMs } from '../../simulation/metrics'
import { Button } from '../ui/primitives'

/* ------------------------------------------------------------------ */
/* Closing slide                                                       */
/* ------------------------------------------------------------------ */

const CLOSING_CHAIN = ['HUMAN', 'NETWORK', 'NLP / AI SYSTEM', 'TOKENS', 'RESPONSE', 'HUMAN']

function ClosingSlide() {
  const setQuizOpen = useAppStore((state) => state.setQuizOpen)

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2">
        {CLOSING_CHAIN.map((label, index) => (
          <motion.div
            key={`${label}-${index}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.22, duration: 0.4 }}
            className="flex items-center gap-2"
          >
            <span className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm font-bold uppercase tracking-[0.14em] text-sky-200 sm:text-lg">
              {label}
            </span>
            {index < CLOSING_CHAIN.length - 1 && (
              <span className="text-xl text-slate-600" aria-hidden>
                →
              </span>
            )}
          </motion.div>
        ))}
      </div>

      <motion.h2
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.4, duration: 0.5 }}
        className="text-balance max-w-3xl text-3xl font-black leading-tight text-white sm:text-5xl"
      >
        Fast AI is not just a fast model.
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        className="max-w-2xl text-lg text-slate-400 sm:text-2xl"
      >
        Responsive NLP systems depend on the complete pipeline.
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.3 }}
        className="max-w-2xl text-base italic text-sky-300/90 sm:text-xl"
      >
        “Understanding latency means understanding the journey of information.”
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.8 }}
      >
        <Button variant="primary" onClick={() => setQuizOpen(true)} className="px-6 py-3 text-base">
          📝 Run the quiz with the room
        </Button>
      </motion.div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Stage area                                                          */
/* ------------------------------------------------------------------ */

function StageArea({ focus }: { focus: string }) {
  switch (focus) {
    case 'tokens':
      return (
        <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="panel min-h-0 p-4">
            <TokenVisualizer />
          </div>
          <div className="panel min-h-0 p-4">
            <ModelVisualizer />
          </div>
        </div>
      )
    case 'model':
      return (
        <div className="grid h-full gap-4 lg:grid-cols-2">
          <div className="panel min-h-0 p-4">
            <ModelVisualizer />
          </div>
          <div className="panel min-h-0 overflow-auto">
            <PipelineWrapper />
          </div>
        </div>
      )
    case 'ttft':
      return (
        <div className="grid h-full gap-4 lg:grid-cols-2">
          <div className="panel min-h-0 overflow-auto">
            <TtftExplainer />
          </div>
          <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4">
            <div className="panel overflow-auto">
              <PipelineWrapper />
            </div>
            {/* The screen the user is actually staring at while they wait. */}
            <div className="panel min-h-0 p-4">
              <TokenVisualizer />
            </div>
          </div>
        </div>
      )
    case 'breakdown':
      return (
        <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="panel min-h-0">
            <Breakdown />
          </div>
          <div className="panel min-h-0 overflow-auto">
            <ResultsSummary />
          </div>
        </div>
      )
    case 'waterfall':
      return (
        <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="panel min-h-0">
            <Waterfall />
          </div>
          <div className="panel min-h-0 overflow-auto">
            <ResultsSummary />
          </div>
        </div>
      )
    case 'compare':
      return (
        <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="panel min-h-0">
            <Waterfall />
          </div>
          <div className="panel min-h-0">
            <Breakdown />
          </div>
        </div>
      )
    case 'closing':
      return <ClosingSlide />
    default:
      return (
        <div className="panel h-full overflow-auto">
          <PipelineWrapper />
        </div>
      )
  }
}

function PipelineWrapper() {
  return (
    <div className="p-4">
      <PipelineView />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Seminar                                                             */
/* ------------------------------------------------------------------ */

export function SeminarMode() {
  const step = useAppStore((state) => state.seminarStep)
  const setStep = useAppStore((state) => state.setSeminarStep)
  const closeSeminar = useAppStore((state) => state.closeSeminar)
  const presenterNotes = useAppStore((state) => state.presenterNotes)
  const toggleNotes = useAppStore((state) => state.togglePresenterNotes)
  const patchInput = useAppStore((state) => state.patchInput)
  const run = useAppStore((state) => state.run)
  const result = useAppStore((state) => state.result)

  /** Result recorded before an experiment button, so we can show the delta. */
  const [before, setBefore] = useState<{ ttftMs: number; totalMs: number } | null>(null)
  const [actionTaken, setActionTaken] = useState(false)

  const current = SEMINAR_STEPS[Math.min(step, SEMINAR_STEPS.length - 1)]

  /** Apply everything a step needs: config, a run, and any freeze point. */
  const enterStep = useCallback(
    (index: number) => {
      const target = SEMINAR_STEPS[index]
      if (!target) return

      setActionTaken(false)
      setBefore(null)

      if (target.config) patchInput(target.config)

      // Let the store settle before computing, so the new config is in place.
      queueMicrotask(() => {
        const clock = useClockStore.getState()
        const app = useAppStore.getState()

        if (target.config || target.play || target.jumpToEnd) {
          app.run()
        }

        const fresh = useAppStore.getState().result
        if (!fresh) return

        if (target.jumpToEnd) {
          clock.complete()
          return
        }

        if (target.freezeAt === 'firstToken') {
          clock.reset()
          clock.setPauseAt(fresh.ttftMs)
          clock.play()
          return
        }

        if (target.play) {
          clock.reset()
          clock.play()
        }
      })
    },
    [patchInput],
  )

  const go = useCallback(
    (delta: number) => {
      const next = Math.min(Math.max(step + delta, 0), SEMINAR_STEPS.length - 1)
      if (next === step) return
      setStep(next)
      enterStep(next)
    },
    [step, setStep, enterStep],
  )

  // Enter the first step when the seminar opens.
  useEffect(() => {
    enterStep(0)
    // Intentionally runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keyboard navigation is dispatched from the global shortcut handler.
  useEffect(() => {
    const next = () => go(1)
    const prev = () => go(-1)
    window.addEventListener('nlpulse:seminar-next', next)
    window.addEventListener('nlpulse:seminar-prev', prev)
    return () => {
      window.removeEventListener('nlpulse:seminar-next', next)
      window.removeEventListener('nlpulse:seminar-prev', prev)
    }
  }, [go])

  /** Run the step's experiment and keep the previous figures for comparison. */
  const runAction = () => {
    if (!current.action || !result) return
    setBefore({ ttftMs: result.ttftMs, totalMs: result.totalMs })
    patchInput(current.action.config)
    queueMicrotask(() => {
      run()
      useClockStore.getState().complete()
      setActionTaken(true)
    })
  }

  const progress = ((step + 1) / SEMINAR_STEPS.length) * 100

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#05070d]">
      {/* Progress */}
      <div className="h-1 w-full bg-slate-800">
        <motion.div
          className="h-full bg-sky-400"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Top bar */}
      <div className="flex shrink-0 items-center gap-3 px-5 py-2">
        <span className="rounded-md bg-sky-500/15 px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-sky-300">
          🎓 Seminar
        </span>
        <span className="tnum text-[0.72rem] text-slate-500">
          Step {step + 1} of {SEMINAR_STEPS.length}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <Button onClick={toggleNotes} title="Toggle presenter notes (N)">
            {presenterNotes ? '🙈 Hide notes' : '👁 Presenter notes'}
          </Button>
          <Button onClick={() => go(-1)} disabled={step === 0}>
            ← Back
          </Button>
          <Button
            variant="primary"
            onClick={() => go(1)}
            disabled={step === SEMINAR_STEPS.length - 1}
          >
            Next (Space) →
          </Button>
          <Button variant="ghost" onClick={closeSeminar} title="Leave Seminar Mode (Esc)">
            ✕ Exit
          </Button>
        </div>
      </div>

      {/* Narration */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="shrink-0 px-5 pb-2"
        >
          <h2 className="text-balance text-2xl font-black leading-tight text-white xl:text-4xl">
            {current.title}
          </h2>
          <p className="text-balance mt-1.5 max-w-5xl text-[0.95rem] leading-relaxed text-slate-300 xl:text-lg">
            {current.narration}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Stage */}
      <div className="min-h-0 flex-1 px-5 pb-2">
        <StageArea focus={current.focus} />
      </div>

      {/* Experiment button and result delta */}
      {current.action && (
        <div className="shrink-0 px-5 pb-2">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-2.5">
            <Button
              variant="primary"
              onClick={runAction}
              disabled={actionTaken}
              className="shrink-0 px-4 py-2 text-[0.88rem]"
            >
              {current.action.label}
            </Button>

            {!actionTaken ? (
              <p className="text-[0.82rem] text-slate-400">
                Press it and watch the breakdown redraw.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                {before && result && (
                  <>
                    <Delta label="TTFT" from={before.ttftMs} to={result.ttftMs} />
                    <Delta label="Total" from={before.totalMs} to={result.totalMs} />
                  </>
                )}
                <p className="text-[0.82rem] text-amber-200">{current.action.expect}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Presenter notes */}
      <AnimatePresence>
        {presenterNotes && current.note && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="shrink-0 overflow-hidden border-t border-slate-700/50 bg-[#0b1020]"
          >
            <div className="flex gap-3 px-5 py-2.5">
              <span className="shrink-0 rounded bg-violet-500/20 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-violet-300">
                Presenter note
              </span>
              <p className="text-[0.82rem] leading-relaxed text-slate-400">
                {current.note}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Before/after readout for a seminar experiment. */
function Delta({ label, from, to }: { label: string; from: number; to: number }) {
  const worse = to > from
  const factor = from > 0 ? to / from : 1
  return (
    <span className="flex items-baseline gap-1.5 text-[0.82rem]">
      <span className="text-slate-500">{label}</span>
      <span className="tnum text-slate-400 line-through">{formatMs(from)}</span>
      <span className="text-slate-600">→</span>
      <span className={`tnum font-bold ${worse ? 'text-rose-300' : 'text-emerald-300'}`}>
        {formatMs(to)}
      </span>
      <span className={`text-[0.72rem] ${worse ? 'text-rose-400/80' : 'text-emerald-400/80'}`}>
        ({worse ? '×' : '÷'}
        {(worse ? factor : 1 / factor).toFixed(1)})
      </span>
    </span>
  )
}
