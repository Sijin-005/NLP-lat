/**
 * NLPulse — projector mode.
 *
 * Strips the dashboard down to what reads from the back of a lecture theatre:
 * very large numbers, high contrast, a big pipeline, and almost no chrome.
 * Everything is driven by keyboard shortcuts so the presenter never has to
 * hunt for a small button while facing the room.
 */

import { memo } from 'react'
import { useAppStore } from '../../state/appStore'
import { describeScale, useClockStore } from '../../state/clockStore'
import { PipelineView } from '../Pipeline/PipelineView'
import { formatMs, formatPercent } from '../../simulation/metrics'
import { STAGE_BY_ID } from '../../simulation/simulationConfig'
import { SHORTCUTS } from '../../hooks/useKeyboard'
import { Button, ProvenanceBadge } from '../ui/primitives'

/** Giant elapsed counter — the number the room watches. */
const BigClock = memo(function BigClock() {
  const virtualMs = useClockStore((clock) => clock.virtualMs)
  const status = useClockStore((clock) => clock.status)
  const firstToken = useClockStore((clock) => clock.firstTokenReached)

  return (
    <div className="flex flex-col items-center">
      <span
        className={`tnum text-7xl font-black leading-none 2xl:text-8xl ${
          firstToken ? 'text-emerald-300' : 'text-sky-300'
        }`}
      >
        {formatMs(virtualMs)}
      </span>
      <span className="mt-1 text-sm uppercase tracking-[0.3em] text-slate-500">
        {status === 'running'
          ? 'elapsed'
          : status === 'done'
            ? 'total'
            : status === 'paused'
              ? 'paused'
              : 'ready'}
      </span>
    </div>
  )
})

const BigTtft = memo(function BigTtft() {
  const ttftMs = useAppStore((state) => state.result?.ttftMs ?? 0)
  const reached = useClockStore((clock) => clock.firstTokenReached)

  return (
    <div className="flex flex-col items-center">
      <span
        className={`tnum text-7xl font-black leading-none 2xl:text-8xl ${
          reached ? 'text-amber-300' : 'text-slate-700'
        }`}
      >
        {reached ? formatMs(ttftMs) : '—'}
      </span>
      <span className="mt-1 text-sm uppercase tracking-[0.3em] text-slate-500">
        time to first token
      </span>
    </div>
  )
})

/** Live token stream at a size that reads from a distance. */
const BigTokens = memo(function BigTokens() {
  const tokens = useAppStore((state) => state.result?.tokens ?? [])
  const visible = useClockStore((clock) => clock.visibleTokens)
  const text = tokens.slice(0, visible).map((token) => token.text).join('')

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-[0.24em] text-slate-500">
          Generated response
        </span>
        <span className="tnum text-sm text-slate-400">
          {visible.toLocaleString()} / {tokens.length.toLocaleString()} tokens
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-700/50 bg-slate-900/50 px-5 py-3 scrollbar-none">
        {visible === 0 ? (
          <p className="text-xl italic text-slate-600">
            Nothing on screen yet — every stage so far has been invisible to the user.
          </p>
        ) : (
          <p className="text-2xl leading-relaxed text-slate-100 2xl:text-3xl">{text}</p>
        )}
      </div>
    </div>
  )
})

export function ProjectorMode() {
  const setProjector = useAppStore((state) => state.setProjector)
  const openSeminar = useAppStore((state) => state.openSeminar)
  const run = useAppStore((state) => state.run)
  const result = useAppStore((state) => state.result)
  const scale = useClockStore((clock) => clock.scale)
  const status = useClockStore((clock) => clock.status)
  const toggle = useClockStore((clock) => clock.toggle)

  const dominant = result ? STAGE_BY_ID[result.dominantStage] : null

  return (
    <div className="flex h-screen flex-col bg-black p-5">
      {/* Minimal header */}
      <div className="flex shrink-0 items-center gap-4 pb-3">
        <h1 className="text-2xl font-black tracking-tight text-white">
          NL<span className="text-sky-400">Pulse</span>
        </h1>
        <span className="text-xs uppercase tracking-[0.3em] text-slate-600">
          Inside AI Response Time
        </span>
        <ProvenanceBadge provenance={result?.provenance ?? 'SIMULATED'} />
        <span className="text-xs text-slate-600">playback {describeScale(scale)}</span>

        <div className="ml-auto flex gap-1.5">
          <Button variant="primary" onClick={run} title="Run (S)">
            ▶ Run
          </Button>
          <Button onClick={toggle} title="Pause / resume (P)">
            {status === 'running' ? '⏸' : '▶'}
          </Button>
          <Button onClick={openSeminar} title="Seminar Mode (G)">
            🎓
          </Button>
          <Button onClick={() => setProjector(false)} title="Leave projector mode (Esc)">
            ✕
          </Button>
        </div>
      </div>

      {/* The two numbers that matter */}
      <div className="flex shrink-0 items-center justify-center gap-16 rounded-2xl border border-slate-800 bg-[#080c16] py-5">
        <BigTtft />
        <div className="h-20 w-px bg-slate-800" />
        <BigClock />
        {result && (
          <>
            <div className="h-20 w-px bg-slate-800" />
            <div className="flex flex-col items-center">
              <span className="tnum text-5xl font-black leading-none text-emerald-300 2xl:text-6xl">
                {result.tokensPerSecond.toFixed(0)}
              </span>
              <span className="mt-1 text-sm uppercase tracking-[0.3em] text-slate-500">
                tokens / sec
              </span>
            </div>
          </>
        )}
      </div>

      {/* Pipeline */}
      <div className="my-3 shrink-0 rounded-2xl border border-slate-800 bg-[#080c16] p-4">
        <PipelineView />
      </div>

      {/* Output and the headline finding */}
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
        <BigTokens />

        <div className="flex flex-col gap-3">
          {dominant && result && (
            <div
              className="rounded-xl border p-4"
              style={{
                borderColor: `${dominant.color}66`,
                background: `${dominant.color}14`,
              }}
            >
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                Biggest contributor
              </div>
              <div
                className="mt-1 text-2xl font-black 2xl:text-3xl"
                style={{ color: dominant.color }}
              >
                {dominant.icon} {dominant.label}
              </div>
              <div className="tnum mt-1 text-xl text-slate-200">
                {formatMs(result.stages.find((s) => s.id === result.dominantStage)?.ms ?? 0)}
                <span className="ml-2 text-slate-500">
                  {formatPercent(result.shares[result.dominantStage] ?? 0)}
                </span>
              </div>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-800 bg-[#080c16] p-4 scrollbar-none">
            <div className="mb-2 text-xs uppercase tracking-[0.24em] text-slate-500">
              Keyboard
            </div>
            <ul className="space-y-1.5">
              {SHORTCUTS.map((shortcut) => (
                <li key={shortcut.keys} className="flex items-baseline gap-3">
                  <kbd className="shrink-0 rounded border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono text-xs text-slate-300">
                    {shortcut.keys}
                  </kbd>
                  <span className="text-sm leading-snug text-slate-500">
                    {shortcut.action}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
