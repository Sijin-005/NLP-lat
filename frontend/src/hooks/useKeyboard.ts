/**
 * NLPulse — global keyboard shortcuts and fullscreen handling.
 *
 * Designed for presenting: the shortcuts work anywhere in the app except while
 * the presenter is typing into a field, and Space advances the seminar without
 * scrolling the page.
 */

import { useCallback, useEffect, useState } from 'react'
import { useAppStore } from '../state/appStore'
import { useClockStore } from '../state/clockStore'

export const SHORTCUTS: Array<{ keys: string; action: string }> = [
  { keys: 'Space', action: 'Next seminar step (or play/pause outside Seminar Mode)' },
  { keys: 'S', action: 'Start / re-run the simulation' },
  { keys: 'P', action: 'Pause or resume playback' },
  { keys: 'R', action: 'Reset the current run' },
  { keys: 'F', action: 'Toggle fullscreen' },
  { keys: 'C', action: 'Toggle Compare mode' },
  { keys: 'G', action: 'Toggle Seminar Mode' },
  { keys: 'N', action: 'Toggle presenter notes' },
  { keys: '←  →', action: 'Previous / next seminar step' },
  { keys: 'Esc', action: 'Leave Seminar, Compare or Projector mode' },
]

/** True when focus is in a control where a keystroke means something else. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  )
}

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(
    () => typeof document !== 'undefined' && Boolean(document.fullscreenElement),
  )

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggle = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch {
      // Fullscreen can be refused (permissions policy, or no user gesture).
      // Projector mode still works without it, so this is not worth surfacing.
    }
  }, [])

  return { isFullscreen, toggle }
}

export function useGlobalShortcuts() {
  const { toggle: toggleFullscreen } = useFullscreen()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      const app = useAppStore.getState()
      const clock = useClockStore.getState()
      const key = event.key

      switch (key) {
        case ' ': {
          event.preventDefault()
          if (app.seminarOpen) {
            // Seminar navigation is owned by the seminar component; it listens
            // for this custom event so its step logic stays in one place.
            window.dispatchEvent(new CustomEvent('nlpulse:seminar-next'))
          } else {
            clock.toggle()
          }
          break
        }
        case 'ArrowRight':
          if (app.seminarOpen) {
            event.preventDefault()
            window.dispatchEvent(new CustomEvent('nlpulse:seminar-next'))
          }
          break
        case 'ArrowLeft':
          if (app.seminarOpen) {
            event.preventDefault()
            window.dispatchEvent(new CustomEvent('nlpulse:seminar-prev'))
          }
          break
        case 's':
        case 'S':
          event.preventDefault()
          app.run()
          break
        case 'p':
        case 'P':
          event.preventDefault()
          clock.toggle()
          break
        case 'r':
        case 'R':
          event.preventDefault()
          clock.reset()
          break
        case 'f':
        case 'F':
          event.preventDefault()
          void toggleFullscreen()
          break
        case 'c':
        case 'C':
          event.preventDefault()
          app.setCompareOpen(!app.compareOpen)
          break
        case 'g':
        case 'G':
          event.preventDefault()
          if (app.seminarOpen) app.closeSeminar()
          else app.openSeminar()
          break
        case 'n':
        case 'N':
          event.preventDefault()
          app.togglePresenterNotes()
          break
        case 'Escape':
          if (app.quizOpen) app.setQuizOpen(false)
          else if (app.seminarOpen) app.closeSeminar()
          else if (app.compareOpen) app.setCompareOpen(false)
          else if (app.projector) app.setProjector(false)
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggleFullscreen])
}
