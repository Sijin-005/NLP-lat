/**
 * NLPulse — application header.
 *
 * Identity on the left, the three modes in the middle, presentation controls on
 * the right. Kept to one row so it never eats vertical space on a projector.
 */

import { useAppStore, type AppMode } from '../../state/appStore'
import { useFullscreen } from '../../hooks/useKeyboard'
import { Button } from '../ui/primitives'

const MODES: Array<{ id: AppMode; label: string; hint: string }> = [
  { id: 'learn', label: 'Learn', hint: 'Follow the pipeline and the concepts behind it.' },
  { id: 'experiment', label: 'Experiment', hint: 'Change the conditions and watch latency move.' },
  { id: 'realtest', label: 'Real Test', hint: 'Take actual measurements with real clocks.' },
]

export function Header() {
  const mode = useAppStore((state) => state.mode)
  const setMode = useAppStore((state) => state.setMode)
  const compareOpen = useAppStore((state) => state.compareOpen)
  const setCompareOpen = useAppStore((state) => state.setCompareOpen)
  const projector = useAppStore((state) => state.projector)
  const setProjector = useAppStore((state) => state.setProjector)
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen()

  return (
    <header className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-700/40 bg-[#070b14] px-5 py-2.5">
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-black tracking-tight text-white">
          NL<span className="text-sky-400">Pulse</span>
        </h1>
        <p className="hidden text-[0.72rem] uppercase tracking-[0.18em] text-slate-500 sm:block">
          Inside AI Response Time
        </p>
      </div>

      <nav className="flex gap-1" aria-label="Application mode">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            title={item.hint}
            aria-current={mode === item.id ? 'page' : undefined}
            onClick={() => setMode(item.id)}
            className={`rounded-lg px-3 py-1.5 text-[0.82rem] font-semibold transition-colors ${
              mode === item.id
                ? 'bg-sky-500/20 text-sky-200 ring-1 ring-sky-400/50'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <Button
          onClick={() => setCompareOpen(!compareOpen)}
          title="Side-by-side comparison (C)"
        >
          ⚖ Compare
        </Button>
        <Button
          onClick={() => setProjector(!projector)}
          title="Large type, high contrast, minimal chrome"
          variant={projector ? 'primary' : 'default'}
        >
          📽 Projector
        </Button>
        <Button onClick={toggleFullscreen} title="Fullscreen (F)">
          {isFullscreen ? '⤢ Exit' : '⛶ Fullscreen'}
        </Button>
      </div>
    </header>
  )
}
