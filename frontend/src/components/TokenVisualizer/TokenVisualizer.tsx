/**
 * NLPulse — token visualiser.
 *
 * Shows text becoming tokens, tokens entering the model, and tokens coming back
 * out one at a time. The point is that students *see* the discreteness and the
 * sequence rather than reading about it.
 *
 * The token boundaries drawn here are illustrative (see tokenizer.ts) and are
 * labelled as such wherever they appear.
 */

import { memo, useEffect, useMemo, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '../../state/appStore'
import { useClockStore } from '../../state/clockStore'
import { tokenizeIllustrative } from '../../simulation/tokenizer'
import { STAGES } from '../../simulation/simulationConfig'
import { buildPromptText } from '../../simulation/responseText'
import { formatMs } from '../../simulation/metrics'
import { Term } from '../ui/Tooltip'

/** How many prompt-token chips we draw before collapsing into a count. */
const MAX_PROMPT_CHIPS = 26

/** Index of a stage on the pipeline timeline, looked up rather than hard-coded. */
const indexOf = (id: string) => STAGES.findIndex((stage) => stage.id === id)
const TOKENIZATION_INDEX = indexOf('tokenization')
const PREFILL_INDEX = indexOf('prefill')

/* ------------------------------------------------------------------ */
/* Prompt side                                                         */
/* ------------------------------------------------------------------ */

const PromptTokens = memo(function PromptTokens() {
  const promptTokens = useAppStore((state) => state.result?.promptTokens ?? 0)
  // On a measured run this is the question the user actually asked.
  const promptText = useAppStore((state) => state.result?.promptText ?? null)
  const measured = useAppStore((state) => state.result?.provenance === 'MEASURED')

  // Only the visible chips need real text, so we never tokenize 10,000 tokens.
  const chips = useMemo(() => {
    const sample = promptText ?? buildPromptText(Math.min(promptTokens, MAX_PROMPT_CHIPS))
    return tokenizeIllustrative(sample).slice(0, MAX_PROMPT_CHIPS)
  }, [promptTokens, promptText])

  // Tokenization has happened once the clock passes that stage.
  const split = useClockStore((clock) => clock.activeStageIndex >= TOKENIZATION_INDEX)
  const inModel = useClockStore((clock) => clock.activeStageIndex >= PREFILL_INDEX)
  // Prefill is running *right now* — used to drive the intake animation, which
  // must stop once the model has finished reading rather than looping forever.
  const prefilling = useClockStore((clock) => clock.activeStageIndex === PREFILL_INDEX)

  const hidden = Math.max(0, promptTokens - chips.length)

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="panel-title">Prompt</span>
        <span className="text-[0.64rem] text-slate-500">
          {split ? (
            <>
              <span className="tnum text-violet-300">{promptTokens.toLocaleString()}</span>{' '}
              <Term k="token">tokens</Term>
            </>
          ) : (
            'raw text'
          )}
        </span>
      </div>

      {!split ? (
        <motion.p
          layout
          className="rounded-lg border border-slate-700/50 bg-slate-900/40 px-3 py-2 text-[0.92rem] leading-snug text-slate-200"
        >
          “{promptText ?? 'What is Natural Language Processing?'}”
        </motion.p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {chips.map((token, index) => (
            <motion.span
              key={token.index}
              initial={{ opacity: 0, scale: 0.6, y: -6 }}
              animate={
                inModel
                  ? // Drawn into the model: each chip sinks towards the intake
                    // below, staggered left to right so the prompt is visibly
                    // consumed in order rather than fading out all at once.
                    { opacity: 0.3, scale: 0.86, y: 8 }
                  : { opacity: 1, scale: 1, y: 0 }
              }
              transition={{
                delay: Math.min(index * (inModel ? 0.02 : 0.012), inModel ? 0.6 : 0.35),
                duration: inModel ? 0.4 : 0.22,
              }}
              className="rounded-md border border-violet-400/40 bg-violet-500/10 px-1.5 py-0.5 font-mono text-[0.72rem] text-violet-200"
            >
              {token.display}
            </motion.span>
          ))}
          {hidden > 0 && (
            <span className="rounded-md border border-slate-600/50 bg-slate-800/50 px-1.5 py-0.5 font-mono text-[0.72rem] text-slate-400">
              +{hidden.toLocaleString()} more
            </span>
          )}
        </div>
      )}

      {/* Prompt tokens travelling into the model during prefill. */}
      <AnimatePresence>
        {inModel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {/* Falling tokens: the literal "moving toward the model" step. */}
            <div className="relative h-5" aria-hidden>
              {prefilling &&
                [0, 1, 2, 3, 4].map((dot) => (
                  <motion.span
                    key={dot}
                    className="absolute h-1.5 w-1.5 rounded-full bg-violet-300"
                    style={{
                      left: `${12 + dot * 18}%`,
                      boxShadow: '0 0 6px 1px rgba(167,139,250,0.7)',
                    }}
                    initial={{ top: -2, opacity: 0 }}
                    animate={{ top: 20, opacity: [0, 1, 1, 0] }}
                    transition={{
                      duration: 0.75,
                      delay: dot * 0.12,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  />
                ))}
            </div>

            {/* The model intake. */}
            <div className="relative overflow-hidden rounded-lg border border-pink-400/40 bg-pink-500/5 px-2.5 py-1.5">
              <div className="flex items-center gap-2">
                <motion.span
                  className="text-sm"
                  animate={prefilling ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                  transition={{ duration: 0.9, repeat: prefilling ? Infinity : 0 }}
                  aria-hidden
                >
                  🧠
                </motion.span>
                {/*
                 * The completed wording has to stay true for the rest of the
                 * run: once generation starts, "nothing has been written yet"
                 * would be false, so the finished state only states what
                 * prefill cost — which remains accurate throughout.
                 */}
                <span className="text-[0.7rem] leading-snug text-pink-200">
                  {prefilling ? 'Prefill — the model is reading ' : 'Prefill done — read '}
                  <span className="tnum font-semibold">
                    {promptTokens.toLocaleString()}
                  </span>{' '}
                  prompt tokens
                  {prefilling ? '…' : ' before the first word could be produced.'}
                </span>
              </div>

              {/* Sweep showing the prompt being consumed. */}
              {prefilling && (
                <motion.span
                  className="pointer-events-none absolute inset-y-0 w-16"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent, rgba(236,72,153,0.22), transparent)',
                  }}
                  initial={{ left: '-18%' }}
                  animate={{ left: '104%' }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                  aria-hidden
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {split && (
        <p className="mt-1.5 text-[0.64rem] leading-snug text-slate-600">
          {measured ? (
            <>
              The <span className="text-slate-500">count</span> above is real — the
              model&rsquo;s own tokenizer reported it. The chip boundaries drawn
              here are still illustrative.
            </>
          ) : (
            <>
              Illustrative token boundaries — a real vocabulary would split this
              text differently.
            </>
          )}{' '}
          <span className="text-slate-500">␣</span> marks a leading space.
        </p>
      )}
    </div>
  )
})

/* ------------------------------------------------------------------ */
/* Output side                                                         */
/* ------------------------------------------------------------------ */

const OutputTokens = memo(function OutputTokens() {
  const tokens = useAppStore((state) => state.result?.tokens ?? [])
  const streaming = useAppStore((state) => state.result?.input.streaming ?? true)
  const ttftMs = useAppStore((state) => state.result?.ttftMs ?? 0)
  const visible = useClockStore((clock) => clock.visibleTokens)
  const firstTokenReached = useClockStore((clock) => clock.firstTokenReached)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Keep the newest token in view as the response grows.
  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [visible])

  const shown = tokens.slice(0, visible)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="panel-title">Generated response</span>
        <span className="tnum text-[0.64rem] text-slate-500">
          <span className={visible > 0 ? 'text-emerald-300' : 'text-slate-600'}>
            {visible.toLocaleString()}
          </span>
          {' / '}
          {tokens.length.toLocaleString()}
        </span>
      </div>

      <div
        ref={scrollRef}
        className="min-h-[86px] flex-1 overflow-y-auto rounded-lg border border-slate-700/50 bg-slate-900/40 px-3 py-2 scrollbar-none"
      >
        {visible === 0 ? (
          <p className="text-[0.8rem] italic leading-snug text-slate-600">
            {streaming
              ? 'Nothing yet — every stage so far has happened with a blank screen.'
              : 'Streaming is off, so nothing will appear until the entire response is finished.'}
          </p>
        ) : (
          <p className="text-[0.92rem] leading-relaxed text-slate-100">
            {shown.map((token, index) => (
              <span
                key={token.index}
                className={
                  index === 0
                    ? 'rounded bg-amber-400/25 text-amber-100 ring-1 ring-amber-300/50'
                    : index >= visible - 3
                      ? 'text-white'
                      : undefined
                }
                style={
                  index >= visible - 6
                    ? { animation: 'tokenIn 260ms ease-out both' }
                    : undefined
                }
              >
                {token.text}
              </span>
            ))}
            {visible < tokens.length && (
              <motion.span
                className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] bg-sky-300 align-middle"
                animate={{ opacity: [1, 0.15, 1] }}
                transition={{ duration: 0.9, repeat: Infinity }}
              />
            )}
          </p>
        )}
      </div>

      {/* The moment the silence ends, called out explicitly. */}
      <div
        className={`mt-1.5 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors ${
          firstTokenReached
            ? 'border-amber-400/50 bg-amber-500/10'
            : 'border-slate-700/40 bg-slate-900/30'
        }`}
      >
        <span className="text-sm" aria-hidden>
          ⚡
        </span>
        <span className="text-[0.7rem] uppercase tracking-[0.12em] text-slate-400">
          <Term k="ttft">First token</Term>
        </span>
        <span
          className={`tnum ml-auto text-sm font-bold ${
            firstTokenReached ? 'text-amber-200' : 'text-slate-600'
          }`}
        >
          {firstTokenReached ? formatMs(ttftMs) : 'waiting…'}
        </span>
      </div>
    </div>
  )
})

/* ------------------------------------------------------------------ */

export function TokenVisualizer() {
  const hasResult = useAppStore((state) => state.result !== null)

  if (!hasResult) {
    return (
      <p className="px-1 py-6 text-center text-[0.82rem] text-slate-600">
        Run a simulation to watch text become tokens.
      </p>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PromptTokens />
      <OutputTokens />
    </div>
  )
}
