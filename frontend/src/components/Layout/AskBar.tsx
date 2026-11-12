/**
 * NLPulse — the ask bar.
 *
 * The entry point to the whole application: type a question, press Send, and
 * watch the pipeline carry it to a real model and back.
 *
 * When a local Ollama model is available the run is MEASURED end to end. When
 * it is not, the same box falls back to the educational simulator and says so,
 * so a demo never dead-ends because a service is down.
 */

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '../../state/appStore'
import { Button } from '../ui/primitives'

/** Questions that show the pipeline off well, for when nobody volunteers one. */
const SUGGESTIONS = [
  'What is Natural Language Processing?',
  'Explain tokenization in one paragraph.',
  'Why do language models generate text one token at a time?',
  'What is the difference between latency and throughput?',
]

export function AskBar() {
  const question = useAppStore((state) => state.question)
  const setQuestion = useAppStore((state) => state.setQuestion)
  const ask = useAppStore((state) => state.ask)
  const asking = useAppStore((state) => state.asking)
  const askError = useAppStore((state) => state.askError)
  const ollama = useAppStore((state) => state.ollama)
  const ollamaModel = useAppStore((state) => state.ollamaModel)
  const setOllamaModel = useAppStore((state) => state.setOllamaModel)
  const refreshOllama = useAppStore((state) => state.refreshOllama)
  const maxTokens = useAppStore((state) => state.input.outputTokens)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Look for a local model once on mount.
  useEffect(() => {
    void refreshOllama()
  }, [refreshOllama])

  const live = Boolean(ollama?.available && ollamaModel)

  const submit = () => {
    if (!asking) void ask()
  }

  return (
    <section className="panel px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor="nlpulse-question"
          className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-400"
        >
          Ask the model
        </label>

        {/* Live / simulated status, stated up front rather than in a footnote. */}
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] ${
            live
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-emerald-400' : 'bg-amber-400'}`}
            aria-hidden
          />
          {live ? 'live model · measured' : 'no model · simulated'}
        </span>

        {live && (
          <>
            <select
              value={ollamaModel}
              onChange={(event) => setOllamaModel(event.target.value)}
              aria-label="Model"
              className="rounded-lg border border-slate-600/70 bg-slate-800/70 px-2 py-1 text-[0.76rem] text-slate-200"
            >
              {ollama?.models.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.name}
                  {model.parameterSize ? ` · ${model.parameterSize}` : ''}
                </option>
              ))}
            </select>
            <span className="text-[0.66rem] text-slate-500">
              Ollama {ollama?.version} · switch models and watch TTFT move
            </span>
          </>
        )}

        {!live && (
          <button
            type="button"
            onClick={() => void refreshOllama()}
            className="text-[0.7rem] text-sky-300 underline-offset-2 hover:underline"
          >
            retry connection
          </button>
        )}
      </div>

      <div className="mt-2 flex items-stretch gap-2">
        <textarea
          id="nlpulse-question"
          ref={inputRef}
          rows={1}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            // Enter sends; Shift+Enter makes a new line.
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              submit()
            }
          }}
          placeholder="Ask anything…"
          className="min-h-[44px] flex-1 resize-y rounded-xl border border-slate-600/70 bg-slate-900/70 px-3.5 py-2.5 text-[1rem] leading-snug text-slate-100 placeholder:text-slate-600 focus:border-sky-400/70 focus:outline-none"
        />

        <Button
          variant="primary"
          onClick={submit}
          disabled={asking || question.trim().length === 0}
          className="shrink-0 px-6 text-[0.9rem] font-bold uppercase tracking-[0.1em]"
        >
          {asking ? (
            <span className="flex items-center gap-2">
              <motion.span
                className="inline-block h-2 w-2 rounded-full bg-sky-300"
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 0.9, repeat: Infinity }}
                aria-hidden
              />
              Asking…
            </span>
          ) : (
            'Send →'
          )}
        </Button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[0.66rem] text-slate-600">Try:</span>
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => {
              setQuestion(suggestion)
              inputRef.current?.focus()
            }}
            disabled={asking}
            className="rounded-md border border-slate-700/60 px-2 py-0.5 text-[0.68rem] text-slate-400 transition-colors hover:border-sky-400/60 hover:text-sky-200 disabled:opacity-40"
          >
            {suggestion}
          </button>
        ))}
        <span className="ml-auto text-[0.66rem] text-slate-600">
          capped at {maxTokens} output tokens — change it in Experiment controls
        </span>
      </div>

      {askError && (
        <p className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-[0.74rem] text-amber-200">
          {askError}
        </p>
      )}

      {!live && ollama && !ollama.available && (
        <p className="mt-2 text-[0.68rem] leading-snug text-slate-500">
          No local model found. Install{' '}
          <a
            href="https://ollama.com"
            target="_blank"
            rel="noreferrer"
            className="text-sky-400 underline-offset-2 hover:underline"
          >
            Ollama
          </a>{' '}
          and run <code className="rounded bg-slate-800/70 px-1">ollama pull llama3</code>{' '}
          to get measured runs. Everything else works without it — Send will
          show a simulated run instead.
        </p>
      )}
    </section>
  )
}
