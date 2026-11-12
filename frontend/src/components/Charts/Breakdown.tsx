/**
 * NLPulse — latency breakdown.
 *
 * Three views of the same numbers: a stacked bar that shows proportion at a
 * glance, a ranked bar chart for reading values, and a hover explanation that
 * answers "what happened / why did it take time / what would reduce it".
 *
 * These use the engine's strict accounting, where stage durations sum exactly
 * to the total — so the percentages are real percentages.
 */

import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAppStore } from '../../state/appStore'
import { formatMs, formatPercent, rankedStages } from '../../simulation/metrics'
import { STAGE_BY_ID } from '../../simulation/simulationConfig'
import type { StageId } from '../../simulation/types'
import { ProvenanceBadge } from '../ui/primitives'

/**
 * Recharts hands mouse callbacks a loosely typed payload, so narrow it back to
 * a StageId here rather than casting at each call site.
 */
function toStageId(data: unknown): StageId | null {
  const id = (data as { id?: unknown } | undefined)?.id
  return typeof id === 'string' ? (id as StageId) : null
}

/* ------------------------------------------------------------------ */
/* Stacked proportion bar                                              */
/* ------------------------------------------------------------------ */

function StackedBar({
  stages,
  onHover,
  active,
}: {
  stages: ReturnType<typeof rankedStages>
  onHover: (id: StageId | null) => void
  active: StageId | null
}) {
  return (
    <div className="flex h-7 w-full overflow-hidden rounded-lg border border-slate-700/50">
      {stages.map((stage) => (
        <button
          key={stage.id}
          type="button"
          title={`${STAGE_BY_ID[stage.id].label}: ${formatMs(stage.ms)} (${formatPercent(stage.share)})`}
          aria-label={`${STAGE_BY_ID[stage.id].label}, ${formatMs(stage.ms)}`}
          onMouseEnter={() => onHover(stage.id)}
          onMouseLeave={() => onHover(null)}
          onFocus={() => onHover(stage.id)}
          onClick={() => onHover(stage.id)}
          className="relative h-full min-w-[2px] transition-all"
          style={{
            width: `${stage.share * 100}%`,
            background: stage.color,
            opacity: active === null || active === stage.id ? 1 : 0.35,
          }}
        >
          {stage.share > 0.11 && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[0.62rem] font-bold text-black/75">
              {Math.round(stage.share * 100)}%
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */

export function Breakdown() {
  const result = useAppStore((state) => state.result)
  const selectStage = useAppStore((state) => state.selectStage)
  const [hovered, setHovered] = useState<StageId | null>(null)

  const stages = useMemo(() => (result ? rankedStages(result) : []), [result])
  const chartData = useMemo(
    () =>
      stages.map((stage) => ({
        name: STAGE_BY_ID[stage.id].label,
        id: stage.id,
        ms: stage.ms,
        color: stage.color,
        share: stage.share,
      })),
    [stages],
  )

  if (!result) {
    return (
      <p className="px-4 py-6 text-center text-[0.82rem] text-slate-600">
        Run a simulation to see where the time went.
      </p>
    )
  }

  const focused = hovered ?? result.dominantStage
  const descriptor = STAGE_BY_ID[focused]
  const focusedStage = stages.find((stage) => stage.id === focused)

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-[0.66rem] uppercase tracking-[0.14em] text-slate-500">
            Total
          </span>
          <span className="tnum text-2xl font-bold text-sky-300">
            {formatMs(result.totalMs)}
          </span>
        </div>
        <ProvenanceBadge provenance={result.provenance} />
      </div>

      <StackedBar stages={stages} onHover={setHovered} active={hovered} />

      <div className="min-h-[150px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 56, bottom: 0, left: 0 }}
            barCategoryGap={3}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={118}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
            />
            <RechartsTooltip
              cursor={{ fill: 'rgba(148,163,184,0.08)' }}
              contentStyle={{
                background: '#0b1020',
                border: '1px solid #1e2740',
                borderRadius: 10,
                fontSize: 12,
              }}
              labelStyle={{ color: '#e2e8f0', fontWeight: 600 }}
              formatter={(value, _name, entry) => {
                const share = (entry?.payload as { share?: number })?.share ?? 0
                return [
                  `${formatMs(Number(value))}  (${formatPercent(share)})`,
                  'Contribution',
                ]
              }}
            />
            <Bar
              dataKey="ms"
              radius={[0, 4, 4, 0]}
              onMouseEnter={(data) => setHovered(toStageId(data))}
              onMouseLeave={() => setHovered(null)}
              onClick={(data) => selectStage(toStageId(data))}
              label={{
                position: 'right',
                fill: '#64748b',
                fontSize: 10,
                formatter: (value: unknown) => formatMs(Number(value)),
              }}
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.id}
                  fill={entry.color}
                  opacity={hovered === null || hovered === entry.id ? 1 : 0.35}
                  cursor="pointer"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Hover explanation: what / why / how to reduce it. */}
      <div className="shrink-0 rounded-lg border border-slate-700/50 bg-slate-900/40 p-3">
        <div className="mb-1.5 flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ background: descriptor.color }}
            aria-hidden
          />
          <span className="text-[0.82rem] font-bold text-slate-100">
            {descriptor.icon} {descriptor.label}
          </span>
          {focusedStage && (
            <span className="tnum ml-auto text-[0.78rem] font-semibold text-sky-300">
              {formatMs(focusedStage.ms)} · {formatPercent(focusedStage.share)}
            </span>
          )}
        </div>
        <dl className="space-y-1 text-[0.74rem] leading-snug">
          <div>
            <dt className="inline font-semibold text-slate-400">What happened? </dt>
            <dd className="inline text-slate-300">{descriptor.what}</dd>
          </div>
          <div>
            <dt className="inline font-semibold text-slate-400">Why the time? </dt>
            <dd className="inline text-slate-300">{descriptor.why}</dd>
          </div>
          <div>
            <dt className="inline font-semibold text-slate-400">What would reduce it? </dt>
            <dd className="inline text-slate-300">{descriptor.fix}</dd>
          </div>
          {focusedStage && (
            <div className="border-t border-slate-700/50 pt-1.5">
              <dt className="inline font-semibold text-slate-500">This run: </dt>
              <dd className="inline text-slate-400">{focusedStage.detail}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  )
}
