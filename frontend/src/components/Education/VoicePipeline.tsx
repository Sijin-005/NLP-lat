/**
 * NLPulse — voice pipeline demo.
 *
 * Speech in, speech out. The point of this view is that the language model is
 * one stage among several: speech recognition, endpointing and speech synthesis
 * each add delay that text chat never pays.
 *
 * Stage durations are illustrative simulated values. The "NLP / LLM response"
 * stage can borrow the live figure from the main simulator so a presenter can
 * show how changing the model moves the conversational round trip.
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '../../state/appStore'
import { VOICE_PIPELINE } from '../../data/educationalContent'
import { formatMs } from '../../simulation/metrics'
import { Button, ProvenanceBadge, Toggle } from '../ui/primitives'

export function VoicePipeline() {
  const result = useAppStore((state) => state.result)
  const [useLiveModel, setUseLiveModel] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [reached, setReached] = useState(0)

  // Substitute the live simulated model time for the illustrative default.
  const stages = VOICE_PIPELINE.map((stage) =>
    stage.id === 'llm' && useLiveModel && result
      ? { ...stage, ms: result.totalMs, note: `${stage.note} Currently using the live simulation result.` }
      : stage,
  )
  const total = stages.reduce((sum, stage) => sum + stage.ms, 0)

  useEffect(() => {
    if (!playing) return
    if (reached >= stages.length) {
      setPlaying(false)
      return
    }
    const timer = window.setTimeout(() => setReached((count) => count + 1), 460)
    return () => window.clearTimeout(timer)
  }, [playing, reached, stages.length])

  const play = () => {
    setReached(0)
    setPlaying(true)
  }

  // Time until the user hears the first sound of the reply.
  const untilAudio = total

  return (
    <div className="flex h-full flex-col gap-3 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={play}>
            🎤 Play voice round trip
          </Button>
          <Button onClick={() => { setPlaying(false); setReached(0) }}>↺ Reset</Button>
        </div>
        <ProvenanceBadge provenance="SIMULATED" />
      </div>

      <div className="max-w-sm">
        <Toggle
          label="Use the live simulated model time"
          checked={useLiveModel}
          onChange={setUseLiveModel}
          hint="Swap the illustrative model stage for whatever the main simulator currently produces."
        />
      </div>

      <ol className="space-y-1.5">
        {stages.map((stage, index) => {
          const active = index === reached - 1 && playing
          const done = index < reached
          const share = total > 0 ? stage.ms / total : 0
          return (
            <li key={stage.id}>
              <div
                className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 transition-colors ${
                  active
                    ? 'border-sky-400/70 bg-sky-500/10'
                    : done
                      ? 'border-slate-600/50 bg-slate-900/50'
                      : 'border-slate-800/60 bg-slate-900/20'
                }`}
              >
                <motion.span
                  className="text-base"
                  animate={active ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                  transition={{ duration: 0.5 }}
                  aria-hidden
                >
                  {stage.icon}
                </motion.span>

                <span
                  className={`w-[190px] shrink-0 text-[0.8rem] font-semibold ${
                    done ? 'text-slate-200' : 'text-slate-500'
                  }`}
                >
                  {stage.label}
                </span>

                <span className="relative hidden h-2.5 flex-1 overflow-hidden rounded-full bg-slate-800/60 sm:block">
                  <motion.span
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ background: stage.color }}
                    initial={{ width: 0 }}
                    animate={{ width: done ? `${Math.max(1.5, share * 100)}%` : 0 }}
                    transition={{ duration: 0.35 }}
                  />
                </span>

                <span
                  className={`tnum w-[64px] shrink-0 text-right text-[0.74rem] ${
                    done ? 'text-sky-300' : 'text-slate-700'
                  }`}
                >
                  {stage.ms === 0 ? '—' : formatMs(stage.ms)}
                </span>
              </div>

              {active && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="overflow-hidden px-2.5 pt-1 text-[0.7rem] leading-snug text-slate-400"
                >
                  {stage.note}
                </motion.p>
              )}
            </li>
          )
        })}
      </ol>

      <div className="mt-auto grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-sky-500/40 bg-sky-500/5 p-3">
          <div className="text-[0.62rem] uppercase tracking-[0.12em] text-sky-400/80">
            You stop speaking → you hear a reply
          </div>
          <div className="tnum text-2xl font-bold text-sky-300">
            {formatMs(untilAudio)}
          </div>
        </div>
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="text-[0.76rem] leading-relaxed text-slate-300">
            Making the language model twice as fast does not halve this number.
            Endpointing, recognition and synthesis are still there, and in a
            conversation a silence of this length is far more noticeable than the
            same delay would be in a chat window.
          </p>
        </div>
      </div>
    </div>
  )
}
