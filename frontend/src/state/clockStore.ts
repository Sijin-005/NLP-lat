/**
 * NLPulse — the playback clock.
 *
 * This store is deliberately separate from the main application store because
 * it updates on every animation frame. Components subscribe with narrow
 * selectors (`activeStageIndex`, `visibleTokens`, …) so that a 60 fps clock
 * only re-renders the handful of things that actually changed this frame.
 *
 * IMPORTANT: the clock advances a *virtual* millisecond counter. Playback speed
 * changes how fast that counter moves in real time, but never changes the
 * simulated numbers themselves — a 4-minute CPU run still reports 4 minutes
 * even when it plays back in twelve seconds. The UI always shows the current
 * playback factor so nobody is misled.
 */

import { create } from 'zustand'
import type { SimulationResult, StageId } from '../simulation/types'

export type PlaybackStatus = 'idle' | 'running' | 'paused' | 'done'

/** Auto playback aims for a run that lasts somewhere in this window. */
const AUTO_MIN_MS = 4500
const AUTO_MAX_MS = 12000

export type SpeedSetting = 'auto' | number

/** Work out how many virtual ms should elapse per real ms. */
export function resolveScale(totalMs: number, speed: SpeedSetting): number {
  if (speed !== 'auto') return speed
  if (totalMs <= 0) return 1
  const targetDuration = Math.min(AUTO_MAX_MS, Math.max(AUTO_MIN_MS, totalMs))
  return totalMs / targetDuration
}

/** Human-readable description of the current playback factor. */
export function describeScale(scale: number): string {
  if (Math.abs(scale - 1) < 0.02) return 'real time'
  if (scale < 1) return `${(1 / scale).toFixed(1)}× slow motion`
  return `${scale.toFixed(scale < 10 ? 1 : 0)}× fast forward`
}

interface ClockState {
  status: PlaybackStatus
  /** Current position on the simulated timeline, in simulated ms. */
  virtualMs: number
  /** Total length of the loaded run, in simulated ms. */
  durationMs: number
  /** Virtual ms elapsed per real ms. */
  scale: number
  speed: SpeedSetting
  /** Pause automatically when the clock reaches this point (seminar freezes). */
  pauseAtMs: number | null

  /* Derived values, recomputed each frame so components can select narrowly. */
  activeStageId: StageId | null
  activeStageIndex: number
  visibleTokens: number
  firstTokenReached: boolean

  load: (result: SimulationResult | null) => void
  play: () => void
  pause: () => void
  toggle: () => void
  reset: () => void
  seek: (ms: number) => void
  setSpeed: (speed: SpeedSetting) => void
  setPauseAt: (ms: number | null) => void
  /** Jump straight to the end without animating (used by Compare and Quiz). */
  complete: () => void
}

/* ------------------------------------------------------------------ */
/* Module-level animation state (not React state — never triggers a render) */
/* ------------------------------------------------------------------ */

let frameHandle: number | null = null
let lastFrameAt = 0
let loadedResult: SimulationResult | null = null

/** Find the stage containing a point on the accounting timeline. */
function stageAt(result: SimulationResult | null, ms: number) {
  if (!result) return { id: null as StageId | null, index: -1 }
  const stages = result.stages
  for (let i = 0; i < stages.length; i += 1) {
    // Zero-length stages are skipped so they never "trap" the highlight.
    if (stages[i].ms > 0 && ms < stages[i].endMs) return { id: stages[i].id, index: i }
  }
  return { id: stages[stages.length - 1].id, index: stages.length - 1 }
}

/** Number of tokens that have reached the user by `ms`. Binary search. */
function tokensVisibleAt(result: SimulationResult | null, ms: number): number {
  if (!result || result.tokens.length === 0) return 0
  const tokens = result.tokens
  if (ms < tokens[0].arrivalMs) return 0
  if (ms >= tokens[tokens.length - 1].arrivalMs) return tokens.length

  let low = 0
  let high = tokens.length - 1
  while (low < high) {
    const mid = (low + high + 1) >> 1
    if (tokens[mid].arrivalMs <= ms) low = mid
    else high = mid - 1
  }
  return low + 1
}

/** Everything the UI derives from a clock position, in one place. */
function derive(result: SimulationResult | null, ms: number) {
  const { id, index } = stageAt(result, ms)
  return {
    activeStageId: id,
    activeStageIndex: index,
    visibleTokens: tokensVisibleAt(result, ms),
    firstTokenReached: result ? ms >= result.ttftMs : false,
  }
}

export const useClockStore = create<ClockState>((set, get) => {
  const stopLoop = () => {
    if (frameHandle !== null) {
      cancelAnimationFrame(frameHandle)
      frameHandle = null
    }
  }

  const frame = (now: number) => {
    const state = get()
    if (state.status !== 'running') {
      stopLoop()
      return
    }

    const deltaReal = Math.min(now - lastFrameAt, 100) // clamp after a tab switch
    lastFrameAt = now

    let next = state.virtualMs + deltaReal * state.scale
    let status: PlaybackStatus = 'running'
    let pauseAt = state.pauseAtMs

    if (pauseAt !== null && next >= pauseAt) {
      next = pauseAt
      status = 'paused'
      pauseAt = null
    }

    if (next >= state.durationMs) {
      next = state.durationMs
      status = 'done'
      pauseAt = null
    }

    set({ virtualMs: next, status, pauseAtMs: pauseAt, ...derive(loadedResult, next) })

    if (status === 'running') frameHandle = requestAnimationFrame(frame)
    else stopLoop()
  }

  const startLoop = () => {
    stopLoop()
    lastFrameAt = performance.now()
    frameHandle = requestAnimationFrame(frame)
  }

  return {
    status: 'idle',
    virtualMs: 0,
    durationMs: 0,
    scale: 1,
    speed: 'auto',
    pauseAtMs: null,
    activeStageId: null,
    activeStageIndex: -1,
    visibleTokens: 0,
    firstTokenReached: false,

    load: (result) => {
      stopLoop()
      loadedResult = result
      const durationMs = result?.totalMs ?? 0
      set({
        status: 'idle',
        virtualMs: 0,
        durationMs,
        scale: resolveScale(durationMs, get().speed),
        pauseAtMs: null,
        ...derive(result, 0),
      })
    },

    play: () => {
      const state = get()
      if (!loadedResult || state.durationMs <= 0) return
      // Replaying a finished run starts it over rather than doing nothing.
      if (state.status === 'done') {
        set({ virtualMs: 0, ...derive(loadedResult, 0) })
      }
      set({ status: 'running' })
      startLoop()
    },

    pause: () => {
      stopLoop()
      if (get().status === 'running') set({ status: 'paused' })
    },

    toggle: () => {
      const { status, play, pause } = get()
      if (status === 'running') pause()
      else play()
    },

    reset: () => {
      stopLoop()
      set({
        status: 'idle',
        virtualMs: 0,
        pauseAtMs: null,
        ...derive(loadedResult, 0),
      })
    },

    seek: (ms) => {
      const state = get()
      const clamped = Math.max(0, Math.min(ms, state.durationMs))
      set({ virtualMs: clamped, ...derive(loadedResult, clamped) })
    },

    setSpeed: (speed) => {
      const state = get()
      set({ speed, scale: resolveScale(state.durationMs, speed) })
    },

    setPauseAt: (ms) => set({ pauseAtMs: ms }),

    complete: () => {
      stopLoop()
      const state = get()
      set({
        status: 'done',
        virtualMs: state.durationMs,
        pauseAtMs: null,
        ...derive(loadedResult, state.durationMs),
      })
    },
  }
})

/** Read the result the clock is currently driving (outside React). */
export function getLoadedResult(): SimulationResult | null {
  return loadedResult
}
