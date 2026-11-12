/**
 * NLPulse — human perception of delay.
 *
 * Deliberately avoids stating universal thresholds as fact. The bands are
 * adjustable demonstration defaults, and the context strip exists to make the
 * real point: the same delay is excellent in one product and unusable in another.
 */

import { useAppStore } from '../../state/appStore'
import { PERCEPTION_CONTEXTS } from '../../data/educationalContent'
import { classifyPerception, formatMs } from '../../simulation/metrics'
import { Slider } from '../ui/primitives'

export function Perception() {
  const result = useAppStore((state) => state.result)
  const bands = useAppStore((state) => state.perceptionBands)
  const setBands = useAppStore((state) => state.setPerceptionBands)

  const finiteBands = bands.filter((band) => Number.isFinite(band.maxMs))
  const scaleMax = Math.max(
    3000,
    (finiteBands.at(-1)?.maxMs ?? 2000) * 1.4,
    result?.ttftMs ?? 0,
  )

  const ttftBand = result ? classifyPerception(result.ttftMs, bands) : null
  const totalBand = result ? classifyPerception(result.totalMs, bands) : null

  /** Move one boundary, keeping the bands in ascending order. */
  const setBoundary = (index: number, value: number) => {
    const next = bands.map((band, i) => {
      if (i !== index) return band
      const lower = i > 0 ? bands[i - 1].maxMs + 10 : 10
      const upper = Number.isFinite(bands[i + 1]?.maxMs)
        ? bands[i + 1].maxMs - 10
        : scaleMax
      return { ...band, maxMs: Math.min(Math.max(value, lower), upper) }
    })
    setBands(next)
  }

  return (
    <div className="grid gap-4 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        {/* The band scale, with this run's markers on it. */}
        <div className="relative mb-6 mt-2">
          <div className="flex h-9 w-full overflow-hidden rounded-lg border border-slate-700/50">
            {bands.map((band, index) => {
              const start = index === 0 ? 0 : bands[index - 1].maxMs
              const end = Number.isFinite(band.maxMs) ? band.maxMs : scaleMax
              const width = ((end - start) / scaleMax) * 100
              return (
                <div
                  key={band.id}
                  className="flex items-center justify-center overflow-hidden"
                  style={{ width: `${width}%`, background: `${band.color}22` }}
                  title={band.note}
                >
                  <span
                    className="truncate px-1 text-[0.66rem] font-semibold"
                    style={{ color: band.color }}
                  >
                    {band.label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Markers for the current run. */}
          {result && (
            <>
              <Marker
                ms={result.ttftMs}
                scaleMax={scaleMax}
                label="TTFT"
                color="#facc15"
                offset={0}
              />
              <Marker
                ms={result.totalMs}
                scaleMax={scaleMax}
                label="Total"
                color="#38bdf8"
                offset={18}
              />
            </>
          )}
        </div>

        {result && ttftBand && totalBand && (
          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-2.5">
              <div className="text-[0.62rem] uppercase tracking-[0.12em] text-slate-500">
                First token feels
              </div>
              <div className="text-base font-bold" style={{ color: ttftBand.color }}>
                {ttftBand.label}
              </div>
              <div className="tnum text-[0.7rem] text-slate-500">
                {formatMs(result.ttftMs)}
              </div>
            </div>
            <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-2.5">
              <div className="text-[0.62rem] uppercase tracking-[0.12em] text-slate-500">
                Complete response feels
              </div>
              <div className="text-base font-bold" style={{ color: totalBand.color }}>
                {totalBand.label}
              </div>
              <div className="tnum text-[0.7rem] text-slate-500">
                {formatMs(result.totalMs)}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2.5">
          {finiteBands.map((band, index) => (
            <Slider
              key={band.id}
              label={`"${band.label}" up to`}
              value={band.maxMs}
              min={50}
              max={Math.round(scaleMax)}
              step={25}
              onChange={(value) => setBoundary(index, value)}
              format={(value) => `${value.toLocaleString()} ms`}
            />
          ))}
        </div>

        <p className="mt-3 text-[0.7rem] leading-snug text-slate-500">
          These boundaries are adjustable demonstration defaults, not measured
          universal thresholds. Move them and the labels above change — which is
          the point. Acceptable latency is a property of the interaction, not a
          number that exists on its own.
        </p>
      </div>

      {/* Context strip */}
      <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3">
        <div className="panel-title mb-2">The same delay, different products</div>
        <ul className="space-y-2">
          {PERCEPTION_CONTEXTS.map((context) => (
            <li key={context.id} className="flex gap-2">
              <span className="mt-0.5 text-sm" aria-hidden>
                {context.icon}
              </span>
              <div className="min-w-0">
                <div className="text-[0.78rem] font-semibold text-slate-200">
                  {context.label}
                </div>
                <p className="text-[0.7rem] leading-snug text-slate-500">
                  {context.note}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Marker({
  ms,
  scaleMax,
  label,
  color,
  offset,
}: {
  ms: number
  scaleMax: number
  label: string
  color: string
  offset: number
}) {
  const percent = Math.min(100, (ms / scaleMax) * 100)
  const flip = percent > 82
  return (
    <div
      className="pointer-events-none absolute"
      style={{ left: `${percent}%`, top: -4 + offset, transform: 'translateX(-1px)' }}
    >
      <div className="h-[46px] w-px" style={{ background: color }} />
      <span
        className="absolute top-0 whitespace-nowrap rounded px-1 text-[0.6rem] font-bold"
        style={{
          color,
          background: '#0b1020',
          [flip ? 'right' : 'left']: 3,
        }}
      >
        {label}
      </span>
    </div>
  )
}
