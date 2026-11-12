/**
 * NLPulse — latency vs throughput.
 *
 * The road analogy, made interactive: a slider adds lanes (concurrency) and the
 * animation shows cars-per-minute rising while any one car's journey time stays
 * the same — or gets slightly worse. Then the same numbers are restated in
 * inference terms using the current simulation.
 */

import { useState } from 'react'
import { useAppStore } from '../../state/appStore'
import { LATENCY_VS_THROUGHPUT } from '../../data/educationalContent'
import { COEFFICIENTS } from '../../simulation/simulationConfig'
import { formatMs } from '../../simulation/metrics'
import { Slider } from '../ui/primitives'
import { Term } from '../ui/Tooltip'

/** Animated lanes of traffic. Each lane carries the same car at the same speed. */
function Road({ lanes }: { lanes: number }) {
  return (
    <div className="space-y-1.5" aria-hidden>
      {Array.from({ length: lanes }, (_, lane) => (
        <div
          key={lane}
          className="relative h-5 overflow-hidden rounded bg-slate-800/60"
        >
          {/* Lane markings */}
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 border-t border-dashed border-slate-700" />
          {[0, 1, 2].map((car) => (
            <span
              key={car}
              className="absolute top-1/2 -translate-y-1/2 text-sm"
              style={{
                animation: `driveAcross 3s linear infinite`,
                animationDelay: `${car * 1 + lane * 0.27}s`,
              }}
            >
              🚗
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

export function LatencyVsThroughput() {
  const [lanes, setLanes] = useState(2)
  const result = useAppStore((state) => state.result)

  // One car always takes the same time to drive the road, whatever the lane count.
  const journeySeconds = 3
  const carsPerMinute = Math.round((60 / journeySeconds) * lanes)

  const perRequest = result?.tokensPerSecond ?? 0
  const fleet = result
    ? result.tokensPerSecond * (result.input.batching ? COEFFICIENTS.batchSize : 1)
    : 0

  return (
    <div className="grid gap-4 px-4 py-3 lg:grid-cols-2">
      {/* The analogy */}
      <div>
        <div className="mb-2 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-sky-500/40 bg-sky-500/5 p-2.5">
            <div className="text-[0.64rem] uppercase tracking-[0.12em] text-sky-400/80">
              <Term k="latency">Latency</Term>
            </div>
            <p className="mt-0.5 text-[0.76rem] leading-snug text-slate-300">
              {LATENCY_VS_THROUGHPUT.latency.road}
            </p>
            <p className="tnum mt-1 text-lg font-bold text-sky-300">
              {journeySeconds.toFixed(1)} s
            </p>
            <p className="text-[0.64rem] text-slate-500">per car — unchanged by lanes</p>
          </div>
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-2.5">
            <div className="text-[0.64rem] uppercase tracking-[0.12em] text-emerald-400/80">
              <Term k="throughput">Throughput</Term>
            </div>
            <p className="mt-0.5 text-[0.76rem] leading-snug text-slate-300">
              {LATENCY_VS_THROUGHPUT.throughput.road}
            </p>
            <p className="tnum mt-1 text-lg font-bold text-emerald-300">
              {carsPerMinute} / min
            </p>
            <p className="text-[0.64rem] text-slate-500">rises with every lane added</p>
          </div>
        </div>

        <Road lanes={lanes} />

        <div className="mt-3">
          <Slider
            label="Lanes (concurrency)"
            value={lanes}
            min={1}
            max={5}
            step={1}
            onChange={setLanes}
            format={(value) => `${value} lane${value > 1 ? 's' : ''}`}
            hint="Adding lanes moves more cars per minute. It does not make any car arrive sooner."
          />
        </div>
      </div>

      {/* The same idea in inference terms */}
      <div className="flex flex-col gap-2">
        <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3">
          <div className="panel-title mb-2">In this simulation</div>
          {result ? (
            <dl className="space-y-1.5 text-[0.78rem]">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-400">Your request finishes in</dt>
                <dd className="tnum font-semibold text-sky-300">
                  {formatMs(result.totalMs)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-400">Your generation rate</dt>
                <dd className="tnum font-semibold text-sky-300">
                  {perRequest.toFixed(1)} tok/s
                </dd>
              </div>
              <div className="flex justify-between gap-2 border-t border-slate-700/50 pt-1.5">
                <dt className="text-slate-400">
                  Fleet output{' '}
                  {result.input.batching
                    ? `(${COEFFICIENTS.batchSize} requests batched)`
                    : '(no batching)'}
                </dt>
                <dd className="tnum font-semibold text-emerald-300">
                  {fleet.toFixed(1)} tok/s
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-[0.78rem] text-slate-500">Run a simulation first.</p>
          )}
          <p className="mt-2 text-[0.7rem] leading-snug text-slate-500">
            Turn <Term k="batching">batching</Term> on and off in the controls and
            watch these two numbers move in different directions.
          </p>
        </div>

        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="mb-1 text-[0.64rem] uppercase tracking-[0.12em] text-amber-400/80">
            The trade-off
          </div>
          <p className="text-[0.78rem] leading-relaxed text-slate-300">
            {LATENCY_VS_THROUGHPUT.tension}
          </p>
        </div>
      </div>
    </div>
  )
}
