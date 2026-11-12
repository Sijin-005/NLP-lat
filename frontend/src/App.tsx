/**
 * NLPulse — application shell.
 *
 * Decides what the screen shows: the opening screen, one of the three modes, or
 * a full-screen overlay (Seminar, Compare, Quiz, Projector). Each of those is a
 * self-contained component; this file only routes between them.
 */

import { useEffect } from 'react'
import { useAppStore } from './state/appStore'
import { useGlobalShortcuts } from './hooks/useKeyboard'
import { Header } from './components/Layout/Header'
import { AskBar } from './components/Layout/AskBar'
import { ProjectorMode } from './components/Layout/ProjectorMode'
import { LearnMode } from './components/Layout/LearnMode'
import { ExperimentMode } from './components/Layout/ExperimentMode'
import { StatsBar } from './components/LatencyGauge/StatsBar'
import { RealTest } from './components/RealTest/RealTest'
import { SeminarMode } from './components/SeminarMode/SeminarMode'
import { CompareMode } from './components/Compare/CompareMode'
import { Quiz } from './components/Quiz/Quiz'

export default function App() {
  const mode = useAppStore((state) => state.mode)
  const seminarOpen = useAppStore((state) => state.seminarOpen)
  const compareOpen = useAppStore((state) => state.compareOpen)
  const quizOpen = useAppStore((state) => state.quizOpen)
  const projector = useAppStore((state) => state.projector)
  const rerun = useAppStore((state) => state.rerun)

  useGlobalShortcuts()

  // Compute an initial result so no panel is ever empty on first paint.
  useEffect(() => {
    rerun()
  }, [rerun])

  // The quiz can sit on top of anything, including Seminar Mode.
  const overlay = quizOpen ? <Quiz /> : null

  if (seminarOpen) {
    return (
      <>
        <SeminarMode />
        {overlay}
      </>
    )
  }

  if (projector) {
    return (
      <>
        <ProjectorMode />
        {compareOpen && <CompareMode />}
        {overlay}
      </>
    )
  }

  return (
    <>
      <div className="flex h-screen flex-col bg-[#05070d]">
        <Header />
        <main className="flex min-h-0 flex-1 flex-col gap-3 p-3">
          {mode !== 'realtest' && <AskBar />}
          {mode !== 'realtest' && <StatsBar />}

          {mode === 'learn' && <LearnMode />}
          {mode === 'experiment' && <ExperimentMode />}
          {mode === 'realtest' && (
            <div className="min-h-0 flex-1">
              <RealTest />
            </div>
          )}
        </main>
      </div>

      {compareOpen && <CompareMode />}
      {overlay}
    </>
  )
}
