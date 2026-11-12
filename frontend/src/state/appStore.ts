/**
 * NLPulse — main application store.
 *
 * Holds the simulation configuration, the latest result, and all UI mode flags.
 * Deliberately kept apart from the playback clock (see clockStore.ts) so that
 * per-frame animation updates never re-render the control panel.
 */

import { create } from 'zustand'
import { DEFAULT_INPUT, runSimulation } from '../simulation/simulationEngine'
import { DEFAULT_PERCEPTION_BANDS, type PerceptionBand } from '../simulation/metrics'
import type { SimulationInput, SimulationResult, StageId } from '../simulation/types'
import {
  fetchOllamaStatus,
  runRealRequest,
  type OllamaStatus,
} from '../simulation/realRun'
import { WHY_SLOW_BASELINE, WHY_SLOW_OPTIMISATIONS } from '../data/presets'
import { useClockStore } from './clockStore'

export type AppMode = 'learn' | 'experiment' | 'realtest'
export type CenterView = 'pipeline' | 'voice' | 'network'

/** Scenario A is deliberately the "before" and B the "after" in Compare mode. */
const SCENARIO_A: SimulationInput = {
  ...DEFAULT_INPUT,
  network: 'slow',
  modelSize: 'large',
  hardware: 'cpu',
  serverLoad: 'high',
  promptTokens: 5000,
  outputTokens: 200,
  batching: false,
  deterministic: true,
}

const SCENARIO_B: SimulationInput = {
  ...DEFAULT_INPUT,
  network: 'veryFast',
  modelSize: 'small',
  hardware: 'accelerator',
  serverLoad: 'low',
  promptTokens: 500,
  outputTokens: 200,
  batching: true,
  deterministic: true,
}

interface AppState {
  mode: AppMode
  centerView: CenterView

  input: SimulationInput
  result: SimulationResult | null
  /** Increments on every run; used to retrigger one-shot animations. */
  runCount: number

  /** Stage whose explanation is pinned in the education panel. */
  selectedStage: StageId | null
  perceptionBands: PerceptionBand[]

  /* Compare mode */
  compareOpen: boolean
  scenarioA: SimulationInput
  scenarioB: SimulationInput
  resultA: SimulationResult | null
  resultB: SimulationResult | null

  /* Seminar mode */
  seminarOpen: boolean
  seminarStep: number
  presenterNotes: boolean

  /* Projector / fullscreen presentation mode */
  projector: boolean

  /* Quiz */
  quizOpen: boolean

  /* Real model (Ollama) */
  ollama: OllamaStatus | null
  ollamaModel: string
  /** The question typed into the ask bar. */
  question: string
  /** True while a real request is in flight. */
  asking: boolean
  /** Error from the last real request, if any. */
  askError: string | null
  /** Live text as a real response streams in, before the run is assembled. */
  liveAnswer: string

  /* "Why is my AI slow?" walkthrough */
  whySlowActive: boolean
  whySlowApplied: string[]

  setMode: (mode: AppMode) => void
  setCenterView: (view: CenterView) => void
  patchInput: (patch: Partial<SimulationInput>) => void
  run: () => void
  rerun: () => void
  selectStage: (id: StageId | null) => void
  setPerceptionBands: (bands: PerceptionBand[]) => void

  setCompareOpen: (open: boolean) => void
  patchScenario: (which: 'A' | 'B', patch: Partial<SimulationInput>) => void
  runComparison: () => void

  openSeminar: () => void
  closeSeminar: () => void
  setSeminarStep: (step: number) => void
  togglePresenterNotes: () => void

  setProjector: (on: boolean) => void
  setQuizOpen: (open: boolean) => void

  refreshOllama: () => Promise<void>
  setOllamaModel: (model: string) => void
  setQuestion: (question: string) => void
  /** Ask the real model, or fall back to the simulator when it is unavailable. */
  ask: () => Promise<void>

  startWhySlow: () => void
  applyWhySlowStep: (id: string) => void
  resetWhySlow: () => void
}

/** A fresh seed so each run has its own jitter, unless deterministic mode is on. */
function nextSeed(): number {
  return Math.floor(Math.random() * 2_000_000_000)
}

export const useAppStore = create<AppState>((set, get) => ({
  mode: 'learn',
  centerView: 'pipeline',

  input: DEFAULT_INPUT,
  result: null,
  runCount: 0,

  selectedStage: null,
  perceptionBands: DEFAULT_PERCEPTION_BANDS,

  compareOpen: false,
  scenarioA: SCENARIO_A,
  scenarioB: SCENARIO_B,
  resultA: null,
  resultB: null,

  seminarOpen: false,
  seminarStep: 0,
  presenterNotes: true,

  projector: false,
  quizOpen: false,

  ollama: null,
  ollamaModel: '',
  question: 'What is Natural Language Processing?',
  asking: false,
  askError: null,
  liveAnswer: '',

  whySlowActive: false,
  whySlowApplied: [],

  setMode: (mode) => set({ mode }),
  setCenterView: (centerView) => set({ centerView }),

  patchInput: (patch) => {
    set((state) => ({ input: { ...state.input, ...patch } }))
  },

  /** Compute a fresh result from the current input and start playing it. */
  run: () => {
    const state = get()
    const input: SimulationInput = { ...state.input, seed: nextSeed() }
    const result = runSimulation(input)
    set({ input, result, runCount: state.runCount + 1 })
    useClockStore.getState().load(result)
    useClockStore.getState().play()
  },

  /** Recompute without replaying — used when a control changes mid-demo. */
  rerun: () => {
    const state = get()
    const result = runSimulation(state.input)
    set({ result })
    useClockStore.getState().load(result)
  },

  selectStage: (selectedStage) => set({ selectedStage }),
  setPerceptionBands: (perceptionBands) => set({ perceptionBands }),

  setCompareOpen: (compareOpen) => {
    set({ compareOpen })
    if (compareOpen) get().runComparison()
  },

  patchScenario: (which, patch) => {
    set((state) =>
      which === 'A'
        ? { scenarioA: { ...state.scenarioA, ...patch } }
        : { scenarioB: { ...state.scenarioB, ...patch } },
    )
    get().runComparison()
  },

  runComparison: () => {
    const state = get()
    set({
      resultA: runSimulation(state.scenarioA),
      resultB: runSimulation(state.scenarioB),
    })
  },

  openSeminar: () => set({ seminarOpen: true, seminarStep: 0 }),
  closeSeminar: () => set({ seminarOpen: false }),
  setSeminarStep: (seminarStep) => set({ seminarStep }),
  togglePresenterNotes: () =>
    set((state) => ({ presenterNotes: !state.presenterNotes })),

  setProjector: (projector) => set({ projector }),
  setQuizOpen: (quizOpen) => set({ quizOpen }),

  refreshOllama: async () => {
    const status = await fetchOllamaStatus()
    set((state) => ({
      ollama: status,
      // Default to the first (smallest) model, which is the most responsive
      // choice for a live demo. Keep the user's pick if it still exists.
      ollamaModel:
        state.ollamaModel && status.models.some((m) => m.name === state.ollamaModel)
          ? state.ollamaModel
          : (status.models[0]?.name ?? ''),
    }))
  },

  setOllamaModel: (ollamaModel) => set({ ollamaModel }),
  setQuestion: (question) => set({ question }),

  /**
   * Send the question. If a real model is available the run is MEASURED;
   * otherwise we fall back to the simulator so the demo never dead-ends.
   */
  ask: async () => {
    const state = get()
    const question = state.question.trim()
    if (!question || state.asking) return

    const canUseModel = Boolean(state.ollama?.available && state.ollamaModel)

    if (!canUseModel) {
      // No model: run the educational simulation instead, clearly labelled.
      set({
        askError: state.ollama
          ? 'No local model available — showing a simulated run instead.'
          : null,
      })
      get().run()
      return
    }

    set({ asking: true, askError: null, liveAnswer: '' })
    useClockStore.getState().load(null)

    try {
      const result = await runRealRequest(
        state.ollamaModel,
        question,
        state.input.outputTokens,
        state.input,
        {
          onChunk: (text) =>
            set((current) => ({ liveAnswer: current.liveAnswer + text })),
        },
      )
      set((current) => ({ result, runCount: current.runCount + 1, asking: false }))
      useClockStore.getState().load(result)
      useClockStore.getState().play()
    } catch (error) {
      set({
        asking: false,
        askError: error instanceof Error ? error.message : String(error),
      })
      // Keep the session moving: fall back to a simulated run.
      get().run()
    }
  },

  startWhySlow: () => {
    set((state) => ({
      whySlowActive: true,
      whySlowApplied: [],
      mode: 'experiment',
      centerView: 'pipeline',
      input: { ...state.input, ...WHY_SLOW_BASELINE },
    }))
    get().run()
  },

  /** Apply one optimisation from the "Why is my AI slow?" sequence. */
  applyWhySlowStep: (id) => {
    const optimisation = WHY_SLOW_OPTIMISATIONS.find((item) => item.id === id)
    if (!optimisation) return
    set((state) => ({
      input: { ...state.input, ...optimisation.patch },
      whySlowApplied: state.whySlowApplied.includes(id)
        ? state.whySlowApplied
        : [...state.whySlowApplied, id],
    }))
    get().run()
  },

  resetWhySlow: () => {
    set((state) => ({
      whySlowApplied: [],
      input: { ...state.input, ...WHY_SLOW_BASELINE },
    }))
    get().run()
  },
}))
