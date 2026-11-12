/**
 * NLPulse — request waterfall.
 *
 * A developer-tools style timeline. Unlike the strict accounting used for the
 * percentage breakdown, this view shows the *true* spans, including the ones
 * that overlap: streaming and rendering genuinely happen while the model is
 * still generating. Overlapping rows are marked so nobody reads the chart as
 * a simple sum.
 *
 * A playhead tracks the animation, so during a run you can see the waterfall
 * being drawn rather than only its final state.
 */

import { memo, useMemo } from 'react'
import { useAppStore } from '../../state/appStore'
import { useClockStore } from '../../state/clockStore'
import { buildWaterfall, formatMs } from '../../simulation/metrics'
import { InfoTip } from '../ui/Tooltip'

/** Choose round tick values that fit the axis without crowding it. */
function buildTicks(totalMs: number): number[] {
  if (totalMs <= 0) return [0]
  const targetCount = 6
  const rawStep = totalMs / targetCount
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rawStep) ?? magnitude * 10

  const ticks: number[] = []
  for (let value = 0; value <= totalMs; value += step) ticks.push(value)
  return ticks
}

const Playhead = memo(function Playhead({ totalMs }: { totalMs: number }) {
  const virtualMs = useClockStore((clock) => clock.virtualMs)
  const status = useClockStore((clock) => clock.status)
  if (totalMs <= 0 || status === 'idle') return null

  const percent = Math.min(100, (virtualMs / totalMs) * 100)
  return (
    <div
      className="pointer-events-none absolute inset-y-0 z-20 w-px bg-sky-300"
      style={{ left: `${percent}%`, boxShadow: '0 0 8px 1px rgba(56,189,248,0.7)' }}
      aria-hidden
    />
  )
})

export function Waterfall() {
  const result = useAppStore((state) => state.result)
  const selectStage = useAppStore((state) => state.selectStage)
  const selectedStage = useAppStore((state) => state.selectedStage)

  const spans = useMemo(() => (result ? buildWaterfall(result) : []), [result])
  const ticks = useMemo(() => buildTicks(result?.totalMs ?? 0), [result?.totalMs])

  if (!result) {
    return (
      <p className="px-4 py-6 text-center text-[0.82rem] text-slate-600">
        Run a simulation to draw the waterfall.
      </p>
    )
  }

  const total = result.totalMs
  const ttftPercent = (result.ttftMs / total) * 100
  // Below roughly a fifth of the width there is no room for the caption inside
  // the band, so it sits to the right of the marker line instead.
  const ttftLabelOutside = ttftPercent < 22

  return (
    <div className="flex h-full flex-col px-4 py-3">
      {/* Axis */}
      <div className="relative mb-1 ml-[132px] h-4 border-b border-slate-700/50">
        {ticks.map((tick) => (
          <span
            key={tick}
            className="tnum absolute -translate-x-1/2 text-[0.6rem] text-slate-500"
            style={{ left: `${(tick / total) * 100}%` }}
          >
            {tick >= 1000 ? `${(tick / 1000).toFixed(1)}s` : `${Math.round(tick)}ms`}
          </span>
        ))}
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto pr-1 scrollbar-none">
        {/* TTFT marker spanning the whole chart. */}
        <div className="pointer-events-none absolute inset-y-0 left-[132px] right-0 z-10">
          <div
            className="absolute inset-y-0 border-r border-dashed border-amber-400/70"
            style={{ left: 0, width: `${ttftPercent}%` }}
          >
            <span
              className={`absolute -top-0.5 whitespace-nowrap rounded bg-amber-500/20 px-1 text-[0.58rem] font-bold uppercase tracking-wider text-amber-300 ${
                ttftLabelOutside ? 'left-full ml-1' : 'right-1'
              }`}
            >
              first token
            </span>
          </div>
          <Playhead totalMs={total} />
        </div>

        <div className="space-y-[3px]">
          {spans.map((span) => {
            const left = (span.startMs / total) * 100
            // A 2 ms stage inside a 6 s run is a fraction of a pixel wide. Keep a
            // visible sliver so the row reads as "tiny" rather than as "missing".
            const width = (span.durationMs / total) * 100
            const selected = selectedStage === span.id

            return (
              <button
                key={`${span.id}-${span.startMs}`}
                type="button"
                onClick={() => selectStage(selected ? null : span.id)}
                className={`group flex w-full items-center gap-2 rounded px-1 py-[3px] text-left transition-colors ${
                  selected ? 'bg-slate-700/40' : 'hover:bg-slate-800/50'
                }`}
              >
                <span className="flex w-[124px] shrink-0 items-center gap-1.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-sm"
                    style={{ background: span.color }}
                    aria-hidden
                  />
                  <span className="truncate text-[0.72rem] text-slate-300">
                    {span.label}
                  </span>
                  {span.overlapped && (
                    <InfoTip
                      label={
                        <span className="cursor-help text-[0.6rem] text-slate-600">⇄</span>
                      }
                    >
                      This span overlaps the one above it — streaming and rendering
                      happen while generation is still running.
                    </InfoTip>
                  )}
                </span>

                <span className="relative h-3.5 flex-1 rounded bg-slate-800/40">
                  <span
                    className="absolute inset-y-0 rounded transition-all"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      minWidth: 3,
                      background: span.color,
                      opacity: span.overlapped ? 0.55 : 0.92,
                    }}
                  />
                </span>

                <span className="tnum w-[68px] shrink-0 text-right text-[0.68rem] text-slate-400">
                  {formatMs(span.durationMs)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <p className="mt-2 shrink-0 text-[0.64rem] leading-snug text-slate-600">
        Faded bars run concurrently with the bar above. The dashed line marks the
        moment the first token reaches the screen — everything to its left is
        time the user spent looking at nothing.
      </p>
    </div>
  )
}
