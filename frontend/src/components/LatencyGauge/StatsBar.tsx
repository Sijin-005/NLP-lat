/**
 * NLPulse — the headline statistics bar.
 *
 * The five numbers a presenter points at most often. Each carries a provenance
 * badge, and the values animate up as the run plays so the audience watches
 * them accumulate rather than seeing a final figure appear from nowhere.
 */

import { memo } from 'react'
import { useAppStore } from '../../state/appStore'
import { useClockStore } from '../../state/clockStore'
import { classifyPerception, formatMs } from '../../simulation/metrics'
import { Term } from '../ui/Tooltip'
import { ProvenanceBadge } from '../ui/primitives'

function Stat({
  label,
  value,
  sub,
  accent = 'text-slate-100',
  termKey,
  large = false,
}: {
  label: React.ReactNode
  value: string
  sub?: React.ReactNode
  accent?: string
  termKey?: Parameters<typeof Term>[0]['k']
  large?: boolean
}) {
  return (
    <div className="min-w-0 flex-1 px-3 py-2">
      <div className="truncate text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {termKey ? <Term k={termKey}>{label}</Term> : label}
      </div>
      <div
        className={`tnum mt-0.5 font-bold leading-none ${accent} ${
          large ? 'text-3xl' : 'text-2xl'
        }`}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-1 truncate text-[0.64rem] leading-snug text-slate-500">{sub}</div>
      )}
    </div>
  )
}

/**
 * TTFT counts up live: it climbs with the clock until the first token lands,
 * then freezes at its final value. That makes the silent period visible.
 */
const LiveTtft = memo(function LiveTtft() {
  const result = useAppStore((state) => state.result)
  const bands = useAppStore((state) => state.perceptionBands)
  const virtualMs = useClockStore((clock) => clock.virtualMs)
  const reached = useClockStore((clock) => clock.firstTokenReached)
  const idle = useClockStore((clock) => clock.status === 'idle')

  if (!result) return <Stat label="TTFT" value="—" termKey="ttft" large />

  const band = classifyPerception(result.ttftMs, bands)

  /*
   * Before a run starts we show the value this configuration *will* produce,
   * so moving a slider updates the headline immediately. Once the clock is
   * moving we show elapsed time instead, which makes the silent wait visible,
   * and we freeze on the real figure the moment the first token lands.
   */
  const shown = idle || reached ? result.ttftMs : virtualMs

  return (
    <Stat
      label="TTFT"
      termKey="ttft"
      large
      value={formatMs(shown)}
      accent={reached ? 'text-amber-300' : idle ? 'text-amber-300/60' : 'text-slate-400'}
      sub={
        reached ? (
          <span style={{ color: band.color }}>{band.label}</span>
        ) : idle ? (
          'projected — press Run'
        ) : (
          'waiting for the first token…'
        )
      }
    />
  )
})

const LiveTotal = memo(function LiveTotal() {
  const result = useAppStore((state) => state.result)
  const virtualMs = useClockStore((clock) => clock.virtualMs)
  const done = useClockStore((clock) => clock.status === 'done')
  const idle = useClockStore((clock) => clock.status === 'idle')

  if (!result) return <Stat label="Total latency" value="—" large />

  return (
    <Stat
      label="Total latency"
      termKey="latency"
      large
      value={formatMs(done || idle ? result.totalMs : virtualMs)}
      accent={done ? 'text-sky-300' : idle ? 'text-sky-300/60' : 'text-slate-400'}
      sub={
        done
          ? 'complete response on screen'
          : idle
            ? 'projected — press Run'
            : 'accumulating…'
      }
    />
  )
})

export function StatsBar() {
  const result = useAppStore((state) => state.result)

  return (
    <div className="panel flex flex-wrap items-stretch divide-x divide-slate-700/40">
      <LiveTtft />
      <LiveTotal />
      <Stat
        label="Tokens / sec"
        termKey="tokensPerSecond"
        value={result ? result.tokensPerSecond.toFixed(1) : '—'}
        accent="text-emerald-300"
        sub={
          result
            ? `${result.interTokenMs.toFixed(1)} ms between tokens`
            : 'generation rate during decode'
        }
      />
      <Stat
        label="Prompt tokens"
        termKey="token"
        value={result ? result.promptTokens.toLocaleString() : '—'}
        accent="text-violet-300"
        sub="read before anything is written"
      />
      <Stat
        label="Output tokens"
        value={result ? result.outputTokens.toLocaleString() : '—'}
        accent="text-pink-300"
        sub="produced one at a time"
      />
      <div className="flex flex-col items-start justify-center gap-1 px-3 py-2">
        <ProvenanceBadge provenance={result?.provenance ?? 'SIMULATED'} />
        {result?.modelName && (
          <span className="max-w-[150px] truncate text-[0.62rem] text-slate-500">
            {result.modelName}
          </span>
        )}
      </div>
    </div>
  )
}
