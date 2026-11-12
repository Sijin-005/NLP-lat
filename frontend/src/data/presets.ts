/**
 * NLPulse — demo presets.
 *
 * Each preset is a partial configuration applied on top of the current one, so
 * a presenter can jump straight to the scenario they want to talk about
 * without touching eight controls on stage.
 */

import type { SimulationInput } from '../simulation/types'

export interface Preset {
  id: string
  icon: string
  label: string
  /** One line shown under the button explaining what it demonstrates. */
  teaches: string
  patch: Partial<SimulationInput>
  /** Optional: switch the app to a different view when this preset is chosen. */
  view?: 'voice'
}

export const PRESETS: Preset[] = [
  {
    id: 'fastAi',
    icon: '⚡',
    label: 'Fast AI',
    teaches: 'Everything tuned for responsiveness: short prompt, small model, idle fleet.',
    patch: {
      network: 'veryFast',
      modelSize: 'small',
      hardware: 'accelerator',
      serverLoad: 'empty',
      deployment: 'cloud',
      promptTokens: 60,
      outputTokens: 60,
      streaming: true,
      cache: true,
      batching: true,
    },
  },
  {
    id: 'slowNetwork',
    icon: '🌐',
    label: 'Slow Network',
    teaches: 'The model is unchanged — only the distance to it. Watch TTFT move anyway.',
    patch: {
      network: 'verySlow',
      modelSize: 'medium',
      hardware: 'accelerator',
      serverLoad: 'low',
      deployment: 'cloud',
      promptTokens: 120,
      outputTokens: 80,
      streaming: true,
    },
  },
  {
    id: 'largeModel',
    icon: '🧠',
    label: 'Large Model',
    teaches: 'A bigger model costs more per token, so generation stretches out.',
    patch: {
      network: 'fast',
      modelSize: 'veryLarge',
      hardware: 'accelerator',
      serverLoad: 'low',
      promptTokens: 200,
      outputTokens: 150,
      streaming: true,
    },
  },
  {
    id: 'hugePrompt',
    icon: '📚',
    label: 'Huge Prompt',
    teaches: 'A 10,000-token prompt must be read before a single word comes back.',
    patch: {
      network: 'fast',
      modelSize: 'large',
      hardware: 'highEndGpu',
      serverLoad: 'low',
      promptTokens: 10000,
      outputTokens: 80,
      cache: false,
      streaming: true,
    },
  },
  {
    id: 'overloaded',
    icon: '🔥',
    label: 'Overloaded Server',
    teaches: 'Same model, same network — but the fleet is at 97% and you queue.',
    patch: {
      network: 'fast',
      modelSize: 'large',
      hardware: 'accelerator',
      serverLoad: 'overloaded',
      promptTokens: 200,
      outputTokens: 40,
      batching: false,
      streaming: true,
    },
  },
  {
    id: 'cpu',
    icon: '💻',
    label: 'CPU Inference',
    teaches: 'The same request on a general-purpose processor.',
    patch: {
      network: 'fast',
      modelSize: 'medium',
      hardware: 'cpu',
      serverLoad: 'low',
      promptTokens: 200,
      outputTokens: 100,
      streaming: true,
    },
  },
  {
    id: 'accelerator',
    icon: '🚀',
    label: 'Accelerator Inference',
    teaches: 'Identical request, purpose-built inference hardware. Compare with CPU.',
    patch: {
      network: 'fast',
      modelSize: 'medium',
      hardware: 'accelerator',
      serverLoad: 'low',
      promptTokens: 200,
      outputTokens: 100,
      streaming: true,
    },
  },
  {
    id: 'voice',
    icon: '🎤',
    label: 'Voice Assistant',
    teaches: 'Speech in, speech out — the language model is only one link in the chain.',
    patch: {
      network: 'fast',
      modelSize: 'small',
      hardware: 'accelerator',
      serverLoad: 'low',
      promptTokens: 40,
      outputTokens: 45,
      streaming: true,
      cache: false,
      batching: true,
    },
    view: 'voice',
  },
]

/* ------------------------------------------------------------------ */
/* The headline teaching scenario                                      */
/* ------------------------------------------------------------------ */

export interface Optimisation {
  id: string
  label: string
  patch: Partial<SimulationInput>
  explain: string
}

/**
 * "Why is my AI slow?" — the most important experiment in the app.
 *
 * It starts in a deliberately bad configuration where no single change fixes
 * things, then lets the presenter remove one cause at a time. The lesson is
 * that latency is almost never traceable to one culprit.
 */
export const WHY_SLOW_BASELINE: Partial<SimulationInput> = {
  network: 'average',
  serverLoad: 'high',
  promptTokens: 8000,
  modelSize: 'large',
  hardware: 'cpu',
  outputTokens: 500,
  streaming: true,
  cache: false,
  batching: false,
  deployment: 'cloud',
}

export const WHY_SLOW_OPTIMISATIONS: Optimisation[] = [
  {
    id: 'queue',
    label: 'Drain the queue',
    patch: { serverLoad: 'low', batching: true },
    explain:
      'Add capacity and turn on continuous batching. The wait for a free slot collapses, but every other stage is untouched.',
  },
  {
    id: 'network',
    label: 'Improve the network',
    patch: { network: 'veryFast' },
    explain:
      'Move to a nearby region. Both traversals shrink — a real gain, but a small share of this particular problem.',
  },
  {
    id: 'prompt',
    label: 'Shrink the prompt',
    patch: { promptTokens: 800, cache: true },
    explain:
      'Send 800 tokens instead of 8,000 and reuse a cached prefix. Prefill drops sharply, which is felt directly in TTFT.',
  },
  {
    id: 'hardware',
    label: 'Move to an accelerator',
    patch: { hardware: 'accelerator' },
    explain:
      'The single largest change here. Decode was costing 18× the reference; now it does not.',
  },
  {
    id: 'output',
    label: 'Ask for less output',
    patch: { outputTokens: 120 },
    explain:
      'Generation is sequential, so asking for 120 tokens instead of 500 cuts the tail proportionally.',
  },
]
