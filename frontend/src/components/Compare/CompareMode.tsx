/**
 * NLPulse — side-by-side comparison.
 *
 * Runs two configurations through the same engine and lays the results next to
 * each other. Both scenarios use deterministic mode so the difference you see
 * is caused by the configuration and not by jitter.
 *
 * Deliberately does not declare a winner. A configuration with lower latency
 * may cost far more to operate, and one with higher throughput may feel worse
 * to every individual user.
 */

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '../../state/appStore'
import {
  HARDWARE_PRESETS,
  LIMITS,
  MODEL_PRESETS,
  NETWORK_PRESETS,
  SERVER_LOAD_PRESETS,
  STAGE_BY_ID,
} from '../../simulation/simulationConfig'
import { compareRuns, formatMs, rankedStages } from '../../simulation/metrics'
import type {
  HardwareId,
  ModelSizeId,
  NetworkPresetId,
  ServerLoadId,
  SimulationInput,
  SimulationResult,
} from '../../simulation/types'
import { Button, ProvenanceBadge, Segmented, Slider, Toggle } from '../ui/primitives'

/* ------------------------------------------------------------------ */
/* Compact per-scenario controls                                       */
/* ------------------------------------------------------------------ */

function ScenarioControls({
  which,
  input,
  accent,
}: {
  which: 'A' | 'B'
  input: SimulationInput
  accent: string
}) {
  const patchScenario = useAppStore((state) => state.patchScenario)
  const change = (patch: Partial<SimulationInput>) => patchScenario(which, patch)

  return (
    <div className="space-y-2.5">
      <Segmented<NetworkPresetId>
        label="Network"
        value={input.network}
        onChange={(network) => change({ network })}
        columns={3}
        options={Object.values(NETWORK_PRESETS).map((preset) => ({
          value: preset.id,
          label: preset.label,
          hint: preset.description,
        }))}
      />
      <Segmented<ModelSizeId>
        label="Model"
        value={input.modelSize}
        onChange={(modelSize) => change({ modelSize })}
        columns={4}
        options={Object.values(MODEL_PRESETS).map((preset) => ({
          value: preset.id,
          label: preset.label,
          hint: preset.description,
        }))}
      />
      <Segmented<HardwareId>
        label="Hardware"
        value={input.hardware}
        onChange={(hardware) => change({ hardware })}
        columns={2}
        options={Object.values(HARDWARE_PRESETS).map((preset) => ({
          value: preset.id,
          label: preset.label,
          hint: preset.description,
        }))}
      />
      <Segmented<ServerLoadId>
        label="Server load"
        value={input.serverLoad}
        onChange={(serverLoad) => change({ serverLoad })}
        columns={5}
        options={Object.values(SERVER_LOAD_PRESETS).map((preset) => ({
          value: preset.id,
          label: preset.label,
          hint: preset.description,
        }))}
      />
      <Slider
        label="Prompt"
        value={input.promptTokens}
        min={LIMITS.promptTokens.min}
        max={LIMITS.promptTokens.max}
        step={LIMITS.promptTokens.step}
        onChange={(promptTokens) => change({ promptTokens })}
        format={(value) => `${value.toLocaleString()} tok`}
      />
      <Slider
        label="Output"
        value={input.outputTokens}
        min={LIMITS.outputTokens.min}
        max={LIMITS.outputTokens.max}
        step={LIMITS.outputTokens.step}
        onChange={(outputTokens) => change({ outputTokens })}
        format={(value) => `${value.toLocaleString()} tok`}
      />
      <div className="rounded-lg border border-slate-700/40 bg-slate-900/30 px-2.5 py-1">
        <Toggle
          label="Streaming"
          checked={input.streaming}
          onChange={(streaming) => change({ streaming })}
        />
        <Toggle
          label="Batching"
          checked={input.batching}
          onChange={(batching) => change({ batching })}
        />
        <Toggle
          label="Cache"
          checked={input.cache}
          onChange={(cache) => change({ cache })}
        />
      </div>
      <div className="h-1 w-full rounded-full" style={{ background: accent }} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Proportional stage bar for one scenario                             */
/* ------------------------------------------------------------------ */

function ScenarioBar({
  result,
  scaleMax,
}: {
  result: SimulationResult
  scaleMax: number
}) {
  const stages = rankedStages(result)
  const widthPercent = (result.totalMs / scaleMax) * 100

  return (
    <div>
      {/* Both scenarios share one horizontal scale, so the bars are comparable. */}
      <div className="h-6 w-full rounded-lg bg-slate-900/50">
        <div className="flex h-full overflow-hidden rounded-lg" style={{ width: `${widthPercent}%` }}>
          {result.stages
            .filter((stage) => stage.ms > 0)
            .map((stage) => (
              <div
                key={stage.id}
                title={`${STAGE_BY_ID[stage.id].label}: ${formatMs(stage.ms)}`}
                style={{
                  width: `${(stage.ms / result.totalMs) * 100}%`,
                  background: STAGE_BY_ID[stage.id].color,
                }}
              />
            ))}
        </div>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5">
        {stages.slice(0, 4).map((stage) => (
          <span key={stage.id} className="flex items-center gap-1 text-[0.64rem] text-slate-500">
            <span
              className="h-1.5 w-1.5 rounded-sm"
              style={{ background: stage.color }}
              aria-hidden
            />
            {stage.label} {formatMs(stage.ms)}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

export function CompareMode() {
  const setCompareOpen = useAppStore((state) => state.setCompareOpen)
  const scenarioA = useAppStore((state) => state.scenarioA)
  const scenarioB = useAppStore((state) => state.scenarioB)
  const resultA = useAppStore((state) => state.resultA)
  const resultB = useAppStore((state) => state.resultB)

  const rows = useMemo(
    () => (resultA && resultB ? compareRuns(resultA, resultB) : []),
    [resultA, resultB],
  )
  const scaleMax = Math.max(resultA?.totalMs ?? 1, resultB?.totalMs ?? 1)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#05070d]">
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-700/50 px-5 py-2.5">
        <h2 className="text-base font-bold text-white">⚖ Compare two configurations</h2>
        <ProvenanceBadge provenance="SIMULATED" />
        <span className="text-[0.72rem] text-slate-500">
          Both runs use deterministic mode, so every difference below comes from the
          settings rather than from run-to-run variation.
        </span>
        <Button
          variant="ghost"
          className="ml-auto"
          onClick={() => setCompareOpen(false)}
          title="Close (Esc or C)"
        >
          ✕ Close
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* Scenario A */}
          <section className="panel p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-md bg-sky-500/20 px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-sky-300">
                Scenario A
              </span>
              {resultA && (
                <span className="tnum ml-auto text-lg font-bold text-sky-300">
                  {formatMs(resultA.totalMs)}
                </span>
              )}
            </div>
            {resultA && <ScenarioBar result={resultA} scaleMax={scaleMax} />}
            <div className="mt-3">
              <ScenarioControls which="A" input={scenarioA} accent="#38bdf8" />
            </div>
          </section>

          {/* Scenario B */}
          <section className="panel p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-emerald-300">
                Scenario B
              </span>
              {resultB && (
                <span className="tnum ml-auto text-lg font-bold text-emerald-300">
                  {formatMs(resultB.totalMs)}
                </span>
              )}
            </div>
            {resultB && <ScenarioBar result={resultB} scaleMax={scaleMax} />}
            <div className="mt-3">
              <ScenarioControls which="B" input={scenarioB} accent="#22c55e" />
            </div>
          </section>
        </div>

        {/* The comparison table */}
        <section className="panel mt-4 p-4">
          <h3 className="panel-title mb-3">Differences</h3>
          <div className="space-y-1.5">
            {rows.map((row) => {
              const max = Math.max(row.a, row.b, 0.0001)
              return (
                <div
                  key={row.key}
                  className="grid grid-cols-[minmax(120px,1.1fr)_minmax(0,2fr)_minmax(0,2fr)_minmax(90px,0.8fr)] items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-800/40"
                >
                  <div>
                    <div className="text-[0.78rem] font-medium text-slate-200">
                      {row.label}
                    </div>
                    <div className="text-[0.64rem] text-slate-600">{row.hint}</div>
                  </div>

                  <BarCell value={row.a} max={max} unit={row.unit} color="#38bdf8" align="right" />
                  <BarCell value={row.b} max={max} unit={row.unit} color="#22c55e" align="left" />

                  <div className="text-right">
                    {row.ratio !== null && Number.isFinite(row.ratio) ? (
                      /*
                       * Coloured by WHICH scenario is larger, using that
                       * scenario's own accent — not by "better" and "worse".
                       * A larger number is not automatically a bad one: higher
                       * throughput is larger and desirable, lower latency is
                       * smaller and desirable. The reader decides.
                       */
                      <span
                        className="tnum text-[0.78rem] font-semibold"
                        style={{
                          color:
                            Math.abs(row.ratio - 1) < 0.02
                              ? '#64748b'
                              : row.ratio > 1
                                ? '#22c55e'
                                : '#38bdf8',
                        }}
                      >
                        {Math.abs(row.ratio - 1) < 0.02
                          ? 'about the same'
                          : row.ratio > 1
                            ? `B is ${row.ratio.toFixed(1)}× A`
                            : `A is ${(1 / row.ratio).toFixed(1)}× B`}
                      </span>
                    ) : (
                      <span className="text-[0.72rem] text-slate-600">—</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <p className="mt-3 text-[0.72rem] leading-snug text-slate-500">
            Neither column is declared better. A configuration that answers faster
            may be far more expensive to run, and one that maximises throughput
            can feel worse to every individual user. Which differences matter is a
            product decision, not a property of these numbers.
          </p>
        </section>
      </div>
    </div>
  )
}

/** One side of a mirrored bar pair. */
function BarCell({
  value,
  max,
  unit,
  color,
  align,
}: {
  value: number
  max: number
  unit: 'ms' | 'tps'
  color: string
  align: 'left' | 'right'
}) {
  const percent = Math.max(1, (value / max) * 100)
  const text = unit === 'ms' ? formatMs(value) : `${value.toFixed(1)} tok/s`

  return (
    <div className={`flex items-center gap-2 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
      <span className="tnum w-[68px] shrink-0 text-[0.74rem] text-slate-300"
        style={{ textAlign: align === 'right' ? 'left' : 'right' }}
      >
        {text}
      </span>
      <div className={`flex h-2.5 flex-1 ${align === 'right' ? 'justify-start' : 'justify-start'}`}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  )
}
