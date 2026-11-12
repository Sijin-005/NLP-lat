/**
 * NLPulse — Experiment mode.
 *
 * The dashboard: controls on the left, the live pipeline in the middle, the
 * explanation on the right, and the analysis panels along the bottom. Laid out
 * so a presenter can change one control and point at the consequence without
 * scrolling anything.
 */

import { useState } from 'react'
import { useAppStore } from '../../state/appStore'
import { ControlPanel } from '../ExperimentControls/ControlPanel'
import { WhySlowPanel } from '../ExperimentControls/WhySlowPanel'
import { PipelineView } from '../Pipeline/PipelineView'
import { TokenVisualizer } from '../TokenVisualizer/TokenVisualizer'
import { StageDetail } from '../Education/StageDetail'
import { ResultsSummary } from '../LatencyGauge/ResultsSummary'
import { Waterfall } from '../Waterfall/Waterfall'
import { Breakdown } from '../Charts/Breakdown'
import { TtftExplainer } from '../LatencyGauge/TtftExplainer'
import { VoicePipeline } from '../Education/VoicePipeline'
import { NetworkJourney } from '../Education/NetworkJourney'
import { Panel } from '../ui/primitives'

type Analysis = 'waterfall' | 'breakdown' | 'ttft'

const ANALYSIS_TABS: Array<{ id: Analysis; label: string }> = [
  { id: 'waterfall', label: '📊 Waterfall' },
  { id: 'breakdown', label: '🥧 Breakdown' },
  { id: 'ttft', label: '⚡ TTFT' },
]

export function ExperimentMode() {
  const whySlowActive = useAppStore((state) => state.whySlowActive)
  const centerView = useAppStore((state) => state.centerView)
  const setCenterView = useAppStore((state) => state.setCenterView)
  const [analysis, setAnalysis] = useState<Analysis>('waterfall')

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[300px_minmax(0,1fr)_330px]">
      {/* Controls */}
      <div className="flex min-h-0 flex-col gap-3">
        <Panel
          title={whySlowActive ? 'Optimise one cause at a time' : 'Experiment Controls'}
          className="min-h-0 flex-1 overflow-hidden"
          bodyClassName="overflow-y-auto"
        >
          {whySlowActive ? <WhySlowPanel /> : <ControlPanel />}
        </Panel>
        {whySlowActive && (
          <Panel title="All controls" className="max-h-[38%] overflow-hidden" bodyClassName="overflow-y-auto">
            <ControlPanel />
          </Panel>
        )}
      </div>

      {/* Centre: the live pipeline and the analysis panels */}
      <div className="flex min-h-0 flex-col gap-3">
        <Panel
          title={
            <div className="flex items-center gap-2">
              <span>
                {centerView === 'voice'
                  ? 'Voice pipeline'
                  : centerView === 'network'
                    ? 'Network journey'
                    : 'NLP / LLM Request Pipeline'}
              </span>
              <div className="flex gap-0.5">
                {(['pipeline', 'voice', 'network'] as const).map((view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setCenterView(view)}
                    className={`rounded px-1.5 py-0.5 text-[0.62rem] font-semibold normal-case tracking-normal transition-colors ${
                      centerView === view
                        ? 'bg-sky-500/20 text-sky-200'
                        : 'text-slate-600 hover:text-slate-300'
                    }`}
                  >
                    {view === 'pipeline' ? 'Text' : view === 'voice' ? 'Voice' : 'Network'}
                  </button>
                ))}
              </div>
            </div>
          }
          bodyClassName="overflow-auto"
        >
          {centerView === 'voice' ? (
            <VoicePipeline />
          ) : centerView === 'network' ? (
            <NetworkJourney />
          ) : (
            <div className="p-4">
              <PipelineView />
            </div>
          )}
        </Panel>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Panel title="Tokens" bodyClassName="overflow-auto p-4">
            <TokenVisualizer />
          </Panel>

          <Panel
            title={
              <div className="flex gap-0.5">
                {ANALYSIS_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setAnalysis(tab.id)}
                    className={`rounded px-2 py-0.5 text-[0.66rem] font-bold normal-case tracking-normal transition-colors ${
                      analysis === tab.id
                        ? 'bg-sky-500/20 text-sky-200'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            }
            bodyClassName="overflow-hidden"
          >
            {analysis === 'waterfall' ? (
              <Waterfall />
            ) : analysis === 'breakdown' ? (
              <Breakdown />
            ) : (
              <div className="h-full overflow-auto">
                <TtftExplainer />
              </div>
            )}
          </Panel>
        </div>
      </div>

      {/* Explanation and results */}
      <div className="flex min-h-0 flex-col gap-3">
        <Panel title="What is happening here?" className="min-h-0 flex-1 overflow-hidden" bodyClassName="overflow-y-auto">
          <StageDetail />
        </Panel>
        <Panel title="Result" className="min-h-0 flex-1 overflow-hidden" bodyClassName="overflow-y-auto">
          <ResultsSummary />
        </Panel>
      </div>
    </div>
  )
}
