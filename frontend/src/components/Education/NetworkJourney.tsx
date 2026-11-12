/**
 * NLPulse — network journey.
 *
 * Animates a packet travelling from the student's laptop to a data centre and
 * back, under whatever network conditions the controls are set to. Also runs
 * the same request locally so the two can be compared honestly — local removes
 * the network hop, but it does not make the model itself any faster.
 */

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '../../state/appStore'
import { runSimulation } from '../../simulation/simulationEngine'
import { formatMs } from '../../simulation/metrics'
import { NETWORK_PRESETS } from '../../simulation/simulationConfig'
import { ProvenanceBadge } from '../ui/primitives'
import { Term } from '../ui/Tooltip'

const HOPS = [
  { id: 'laptop', icon: '💻', label: 'Your laptop' },
  { id: 'router', icon: '📶', label: 'Router' },
  { id: 'isp', icon: '🌐', label: 'Internet' },
  { id: 'datacenter', icon: '🏢', label: 'AI data centre' },
]

export function NetworkJourney() {
  const input = useAppStore((state) => state.input)
  const result = useAppStore((state) => state.result)
  const patchInput = useAppStore((state) => state.patchInput)
  const rerun = useAppStore((state) => state.rerun)

  // Run the identical configuration both ways so the comparison is fair.
  const { cloud, local } = useMemo(() => {
    const deterministic = { ...input, deterministic: true }
    return {
      cloud: runSimulation({ ...deterministic, deployment: 'cloud' }),
      local: runSimulation({ ...deterministic, deployment: 'local' }),
    }
  }, [input])

  const networkLabel =
    input.network === 'custom'
      ? `${input.customNetworkMs} ms one-way`
      : NETWORK_PRESETS[input.network].label

  const stageMs = (run: typeof cloud, id: 'networkUpload' | 'returnNetwork') =>
    run.stages.find((stage) => stage.id === id)?.ms ?? 0

  const cloudNetwork = stageMs(cloud, 'networkUpload') + stageMs(cloud, 'returnNetwork')
  const localNetwork = stageMs(local, 'networkUpload') + stageMs(local, 'returnNetwork')

  // Animation speed reflects the chosen network: slower link, slower packet.
  const travelSeconds = Math.min(
    4,
    Math.max(0.7, (result ? stageMs(result, 'networkUpload') : 40) / 45),
  )

  return (
    <div className="px-4 py-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[0.78rem] text-slate-400">
          Network condition:{' '}
          <span className="font-semibold text-sky-300">{networkLabel}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {(['veryFast', 'fast', 'average', 'slow', 'verySlow'] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                patchInput({ network: id })
                queueMicrotask(rerun)
              }}
              className={`rounded-md border px-2 py-1 text-[0.7rem] font-medium transition-colors ${
                input.network === id
                  ? 'border-sky-400/70 bg-sky-500/15 text-sky-200'
                  : 'border-slate-700/60 bg-slate-900/40 text-slate-400 hover:text-slate-200'
              }`}
            >
              {NETWORK_PRESETS[id].label}
            </button>
          ))}
        </div>
      </div>

      {/* The journey */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
        <div className="relative flex items-center justify-between">
          {HOPS.map((hop, index) => (
            <div key={hop.id} className="relative z-10 flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-600/60 bg-[#0d1220] text-xl">
                <span aria-hidden>{hop.icon}</span>
              </div>
              <span className="mt-1 text-center text-[0.68rem] text-slate-400">
                {hop.label}
              </span>
              {index < HOPS.length - 1 && (
                <span className="sr-only">then travels to</span>
              )}
            </div>
          ))}

          {/* The wire, plus packets going each way. */}
          <div className="absolute inset-x-6 top-6 -z-0 h-px bg-slate-700" />

          <motion.span
            className="absolute top-[18px] z-20 rounded-full bg-sky-400 px-2 py-0.5 text-[0.58rem] font-bold text-slate-950"
            style={{ boxShadow: '0 0 12px 2px rgba(56,189,248,0.6)' }}
            initial={{ left: '4%' }}
            animate={{ left: ['4%', '88%'] }}
            transition={{ duration: travelSeconds, repeat: Infinity, ease: 'linear' }}
          >
            request
          </motion.span>

          <motion.span
            className="absolute top-[42px] z-20 rounded-full bg-emerald-400 px-2 py-0.5 text-[0.58rem] font-bold text-slate-950"
            style={{ boxShadow: '0 0 12px 2px rgba(52,211,153,0.5)' }}
            initial={{ left: '88%' }}
            animate={{ left: ['88%', '4%'] }}
            transition={{
              duration: travelSeconds,
              repeat: Infinity,
              ease: 'linear',
              delay: travelSeconds / 2,
            }}
          >
            response
          </motion.span>
        </div>
      </div>

      {/* Cloud vs local, same configuration */}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Comparison
          title="☁ Cloud model"
          total={cloud.totalMs}
          ttft={cloud.ttftMs}
          network={cloudNetwork}
          accent="#38bdf8"
        />
        <Comparison
          title="💻 Local model"
          total={local.totalMs}
          ttft={local.ttftMs}
          network={localNetwork}
          accent="#22c55e"
        />
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
        <ProvenanceBadge provenance="SIMULATED" className="mt-0.5 shrink-0" />
        <p className="text-[0.76rem] leading-relaxed text-slate-300">
          {local.totalMs < cloud.totalMs ? (
            <>
              With these settings local wins, because the{' '}
              <Term k="roundTrip">round trip</Term> and the queue disappear. That
              is not a general rule.
            </>
          ) : (
            <>
              With these settings the cloud wins <em>despite</em> the network trip,
              because the data-centre hardware more than pays for the round trip.
            </>
          )}{' '}
          Both runs use the same model size and the same hardware setting. Change
          Hardware to CPU and watch the comparison invert — a local model on a
          laptop is running on laptop hardware, which is usually the dominant term.
        </p>
      </div>
    </div>
  )
}

function Comparison({
  title,
  total,
  ttft,
  network,
  accent,
}: {
  title: string
  total: number
  ttft: number
  network: number
  accent: string
}) {
  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3">
      <div className="mb-2 text-[0.8rem] font-bold" style={{ color: accent }}>
        {title}
      </div>
      <dl className="space-y-1 text-[0.76rem]">
        <div className="flex justify-between">
          <dt className="text-slate-400">Time to first token</dt>
          <dd className="tnum font-semibold text-slate-200">{formatMs(ttft)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-400">Total</dt>
          <dd className="tnum font-semibold text-slate-200">{formatMs(total)}</dd>
        </div>
        <div className="flex justify-between border-t border-slate-700/50 pt-1">
          <dt className="text-slate-400">Spent on the network</dt>
          <dd className="tnum font-semibold" style={{ color: accent }}>
            {formatMs(network)}
          </dd>
        </div>
      </dl>
    </div>
  )
}
