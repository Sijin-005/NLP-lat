/**
 * NLPulse — the experiment control panel.
 *
 * Every control here changes the simulation in a way the student can predict
 * and then verify. Changing a control recomputes the result immediately (so the
 * charts update) but does not replay the animation; Run Simulation does that.
 */

import { useAppStore } from '../../state/appStore'
import { describeScale, useClockStore } from '../../state/clockStore'
import {
  HARDWARE_PRESETS,
  LIMITS,
  MODEL_PRESETS,
  NETWORK_PRESETS,
  SERVER_LOAD_PRESETS,
} from '../../simulation/simulationConfig'
import type {
  DeploymentId,
  HardwareId,
  ModelSizeId,
  NetworkPresetId,
  ServerLoadId,
} from '../../simulation/types'
import { PRESETS } from '../../data/presets'
import { Button, Segmented, Slider, Toggle } from '../ui/primitives'
import { Term } from '../ui/Tooltip'

/* ------------------------------------------------------------------ */
/* Preset strip                                                        */
/* ------------------------------------------------------------------ */

function PresetStrip() {
  const patchInput = useAppStore((state) => state.patchInput)
  const setCenterView = useAppStore((state) => state.setCenterView)
  const run = useAppStore((state) => state.run)
  const startWhySlow = useAppStore((state) => state.startWhySlow)

  return (
    <div>
      <div className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-slate-400">
        Demo presets
      </div>
      <div className="grid grid-cols-2 gap-1">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            title={preset.teaches}
            onClick={() => {
              patchInput(preset.patch)
              setCenterView(preset.view ?? 'pipeline')
              run()
            }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/30 px-2 py-1.5 text-left text-[0.72rem] font-medium text-slate-300 transition-colors hover:border-sky-400/60 hover:bg-sky-500/10 hover:text-sky-100"
          >
            <span aria-hidden>{preset.icon}</span>
            <span className="truncate">{preset.label}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={startWhySlow}
        className="mt-1.5 w-full rounded-lg border border-amber-500/50 bg-amber-500/10 px-2 py-2 text-[0.76rem] font-bold uppercase tracking-[0.08em] text-amber-200 transition-colors hover:border-amber-400 hover:bg-amber-500/20"
      >
        ❓ Why is my AI slow?
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Playback controls                                                   */
/* ------------------------------------------------------------------ */

function PlaybackControls() {
  const run = useAppStore((state) => state.run)
  const status = useClockStore((clock) => clock.status)
  const scale = useClockStore((clock) => clock.scale)
  const speed = useClockStore((clock) => clock.speed)
  const toggle = useClockStore((clock) => clock.toggle)
  const reset = useClockStore((clock) => clock.reset)
  const setSpeed = useClockStore((clock) => clock.setSpeed)
  const hasResult = useAppStore((state) => state.result !== null)

  return (
    <div className="space-y-2">
      {/*
        * Distinct from the ask bar above: this runs the educational model with
        * the controls below, and never touches the real model.
        */}
      <Button
        variant="primary"
        onClick={run}
        title="Run the educational simulation with the controls below"
        className="w-full py-2.5 text-[0.9rem] uppercase tracking-[0.08em]"
      >
        ▶ Run Simulation
      </Button>

      <div className="flex gap-1">
        <Button onClick={toggle} disabled={!hasResult} className="flex-1">
          {status === 'running' ? '⏸ Pause' : '▶ Resume'}
        </Button>
        <Button onClick={reset} disabled={!hasResult} className="flex-1">
          ↺ Reset
        </Button>
      </div>

      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-slate-400">
            Playback
          </span>
          <span className="text-[0.66rem] text-sky-300">{describeScale(scale)}</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {(['auto', 0.25, 1, 4] as const).map((option) => (
            <button
              key={String(option)}
              type="button"
              onClick={() => setSpeed(option)}
              className={`rounded-md border px-1 py-1 text-[0.7rem] font-medium transition-colors ${
                speed === option
                  ? 'border-sky-400/70 bg-sky-500/15 text-sky-200'
                  : 'border-slate-700/60 bg-slate-800/30 text-slate-400 hover:text-slate-200'
              }`}
            >
              {option === 'auto' ? 'Auto' : option === 0.25 ? '0.25×' : `${option}×`}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[0.64rem] leading-snug text-slate-600">
          Playback speed changes only how fast the animation runs. The timings
          reported above are unaffected.
        </p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* The panel                                                           */
/* ------------------------------------------------------------------ */

export function ControlPanel() {
  const input = useAppStore((state) => state.input)
  const patchInput = useAppStore((state) => state.patchInput)
  const rerun = useAppStore((state) => state.rerun)

  /** Apply a change and refresh the numbers without replaying the animation. */
  const change = (patch: Parameters<typeof patchInput>[0]) => {
    patchInput(patch)
    // Recompute on the next tick so the store has the new input.
    queueMicrotask(rerun)
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto px-4 py-4">
      <PlaybackControls />

      <hr className="border-slate-700/40" />

      <PresetStrip />

      <hr className="border-slate-700/40" />

      <Segmented<DeploymentId>
        label="Where the model runs"
        value={input.deployment}
        onChange={(deployment) => change({ deployment })}
        options={[
          { value: 'cloud', label: '☁ Cloud', hint: 'Across the internet to a provider.' },
          { value: 'local', label: '💻 Local', hint: 'On this machine — no network hop.' },
        ]}
      />

      <Segmented<NetworkPresetId>
        label="Network"
        value={input.network}
        onChange={(network) => change({ network })}
        columns={3}
        options={[
          ...Object.values(NETWORK_PRESETS).map((preset) => ({
            value: preset.id,
            label: preset.label,
            hint: preset.description,
          })),
          { value: 'custom' as const, label: 'Custom', hint: 'Set the one-way latency by hand.' },
        ]}
      />

      {input.network === 'custom' && (
        <Slider
          label="Custom one-way latency"
          value={input.customNetworkMs}
          min={LIMITS.customNetworkMs.min}
          max={LIMITS.customNetworkMs.max}
          step={LIMITS.customNetworkMs.step}
          onChange={(customNetworkMs) => change({ customNetworkMs })}
          format={(value) => `${value} ms`}
          termKey="roundTrip"
        />
      )}

      {input.deployment === 'local' && (
        <p className="-mt-2 rounded-lg border border-slate-700/50 bg-slate-900/40 px-2.5 py-1.5 text-[0.68rem] leading-snug text-slate-400">
          Running locally replaces the network hop with loopback and removes the
          shared queue. It does not make the model itself any faster — pick CPU
          below and watch what happens.
        </p>
      )}

      <Segmented<ModelSizeId>
        label="Model size"
        value={input.modelSize}
        onChange={(modelSize) => change({ modelSize })}
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
        columns={3}
        termKey="queue"
        options={Object.values(SERVER_LOAD_PRESETS).map((preset) => ({
          value: preset.id,
          label: preset.label,
          hint: preset.description,
        }))}
      />

      <Slider
        label="Prompt length"
        termKey="prefill"
        value={input.promptTokens}
        min={LIMITS.promptTokens.min}
        max={LIMITS.promptTokens.max}
        step={LIMITS.promptTokens.step}
        onChange={(promptTokens) => change({ promptTokens })}
        format={(value) => `${value.toLocaleString()} tok`}
        hint="Every one of these must be read before the first word comes back."
      />

      <Slider
        label="Output length"
        value={input.outputTokens}
        min={LIMITS.outputTokens.min}
        max={LIMITS.outputTokens.max}
        step={LIMITS.outputTokens.step}
        onChange={(outputTokens) => change({ outputTokens })}
        format={(value) => `${value.toLocaleString()} tok`}
        hint="Generated one at a time, so this scales the tail of the response."
      />

      <div className="space-y-0.5 rounded-lg border border-slate-700/40 bg-slate-900/30 px-3 py-2">
        <Toggle
          label="Streaming"
          termKey="streaming"
          checked={input.streaming}
          onChange={(streaming) => change({ streaming })}
          hint="Send tokens as they are produced."
        />
        <Toggle
          label="Cache"
          termKey="cache"
          checked={input.cache}
          onChange={(cache) => change({ cache })}
          hint="Reuse work for a repeated prompt prefix."
        />
        <Toggle
          label="Batching"
          termKey="batching"
          checked={input.batching}
          onChange={(batching) => change({ batching })}
          hint="Share the device between requests."
        />
        <Toggle
          label="Deterministic mode"
          termKey="jitter"
          checked={input.deterministic}
          onChange={(deterministic) => change({ deterministic })}
          hint="Switch off jitter so two runs are exactly comparable."
        />
      </div>

      <p className="text-[0.66rem] leading-snug text-slate-600">
        All controls feed documented coefficients in{' '}
        <code className="rounded bg-slate-800/70 px-1 py-0.5 text-[0.62rem] text-slate-400">
          simulationConfig.ts
        </code>
        . They are educational approximations, not measurements of any real{' '}
        <Term k="llm">model</Term> or provider.
      </p>
    </div>
  )
}
