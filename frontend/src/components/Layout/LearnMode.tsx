/**
 * NLPulse — Learn mode.
 *
 * The explanatory half of the application. A sub-navigation keeps each concept
 * on its own screen rather than in one long scroll, so a presenter can jump
 * straight to whatever the room just asked about.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { PipelineView } from '../Pipeline/PipelineView'
import { TokenVisualizer } from '../TokenVisualizer/TokenVisualizer'
import { ModelVisualizer } from '../ModelVisualizer/ModelVisualizer'
import { StageDetail } from '../Education/StageDetail'
import { WhyLatency } from '../Education/WhyLatency'
import { NlpScope } from '../Education/NlpScope'
import { RealWorldExamples } from '../Education/RealWorldExamples'
import { LatencyVsThroughput } from '../Education/LatencyVsThroughput'
import { NetworkJourney } from '../Education/NetworkJourney'
import { Perception } from '../Education/Perception'
import { Panel } from '../ui/primitives'

type Topic =
  | 'journey'
  | 'tokens'
  | 'why'
  | 'scope'
  | 'examples'
  | 'throughput'
  | 'network'
  | 'perception'

const TOPICS: Array<{ id: Topic; label: string; icon: string }> = [
  { id: 'journey', label: 'The journey', icon: '🛤' },
  { id: 'tokens', label: 'Tokens & the model', icon: '🔤' },
  { id: 'why', label: 'Why latency happens', icon: '🧩' },
  { id: 'scope', label: 'NLP is not one thing', icon: '🗂' },
  { id: 'examples', label: 'Real-world examples', icon: '🌍' },
  { id: 'throughput', label: 'Latency vs throughput', icon: '🛣' },
  { id: 'network', label: 'Network journey', icon: '📡' },
  { id: 'perception', label: 'How delay feels', icon: '👁' },
]

export function LearnMode() {
  const [topic, setTopic] = useState<Topic>('journey')

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Topic navigation */}
      <nav
        className="panel flex shrink-0 gap-1 overflow-x-auto px-2 py-1.5 scrollbar-none"
        aria-label="Learn topics"
      >
        {TOPICS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={topic === item.id ? 'page' : undefined}
            onClick={() => setTopic(item.id)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-[0.8rem] font-semibold transition-colors ${
              topic === item.id
                ? 'bg-sky-500/20 text-sky-200 ring-1 ring-sky-400/50'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            <span aria-hidden>{item.icon}</span> {item.label}
          </button>
        ))}
      </nav>

      <motion.div
        key={topic}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="min-h-0 flex-1"
      >
        <TopicContent topic={topic} />
      </motion.div>
    </div>
  )
}

function TopicContent({ topic }: { topic: Topic }) {
  switch (topic) {
    case 'journey':
      return (
        <div className="grid h-full min-h-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_330px]">
          <Panel title="NLP / LLM Request Pipeline" bodyClassName="overflow-auto p-4">
            <PipelineView />
          </Panel>
          <Panel title="What is happening here?" bodyClassName="overflow-auto">
            <StageDetail />
          </Panel>
        </div>
      )

    case 'tokens':
      return (
        <div className="grid h-full min-h-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <Panel title="Text → tokens → text" bodyClassName="overflow-auto p-4">
            <TokenVisualizer />
          </Panel>
          <Panel title="Inside the model" bodyClassName="overflow-auto p-4">
            <ModelVisualizer />
          </Panel>
        </div>
      )

    case 'why':
      return (
        <Panel title="Why latency happens" bodyClassName="overflow-auto">
          <WhyLatency />
        </Panel>
      )

    case 'scope':
      return (
        <Panel title="NLP is a field, not a single model" bodyClassName="overflow-auto">
          <NlpScope />
        </Panel>
      )

    case 'examples':
      return (
        <Panel title="Real-world NLP examples" bodyClassName="overflow-auto">
          <RealWorldExamples />
        </Panel>
      )

    case 'throughput':
      return (
        <Panel title="Latency vs throughput" bodyClassName="overflow-auto">
          <LatencyVsThroughput />
        </Panel>
      )

    case 'network':
      return (
        <Panel title="The network journey" bodyClassName="overflow-auto">
          <NetworkJourney />
        </Panel>
      )

    case 'perception':
      return (
        <Panel title="How delay is perceived" bodyClassName="overflow-auto">
          <Perception />
        </Panel>
      )

    default:
      return null
  }
}
