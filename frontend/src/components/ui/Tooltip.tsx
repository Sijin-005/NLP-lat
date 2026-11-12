/**
 * NLPulse — the tooltip education system.
 *
 * `<Term k="ttft">TTFT</Term>` renders an underlined term that explains itself
 * on hover, focus or tap. Definitions live in data/glossary.ts.
 *
 * Accessibility: the trigger is a real <button>, so it is reachable by keyboard
 * and announced by screen readers, and the panel is linked with aria-describedby.
 */

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { GLOSSARY } from '../../data/glossary'

interface TermProps {
  /** Key into the glossary. */
  k: keyof typeof GLOSSARY
  children?: React.ReactNode
  /** Render without the dotted underline (for use inside headings). */
  plain?: boolean
}

export function Term({ k, children, plain = false }: TermProps) {
  const entry = GLOSSARY[k]
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  // Position the panel under the trigger, kept inside the viewport.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const width = 320
    const left = Math.min(
      Math.max(12, rect.left + rect.width / 2 - width / 2),
      window.innerWidth - width - 12,
    )
    // Flip above the trigger when there is not enough room below.
    const below = rect.bottom + 8
    const flip = below + 180 > window.innerHeight && rect.top > 200
    setCoords({ top: flip ? rect.top - 8 : below, left })
  }, [open])

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  if (!entry) return <>{children}</>

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-describedby={open ? panelId : undefined}
        aria-label={`What is ${entry.term}?`}
        className={
          plain
            ? 'cursor-help bg-transparent p-0 text-inherit'
            : 'cursor-help border-b border-dotted border-sky-400/60 bg-transparent p-0 text-inherit transition-colors hover:border-sky-300 hover:text-sky-200'
        }
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(event) => {
          event.preventDefault()
          setOpen((value) => !value)
        }}
      >
        {children ?? entry.term}
      </button>

      {open &&
        createPortal(
          <div
            id={panelId}
            role="tooltip"
            style={{ top: coords.top, left: coords.left, width: 320 }}
            className="pointer-events-none fixed z-[200] rounded-xl border border-sky-500/30 bg-[#0b1020] p-3.5 shadow-2xl shadow-black/70"
          >
            <div className="mb-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-sky-300">
              {entry.term}
            </div>
            <p className="text-[0.84rem] leading-snug text-slate-200">{entry.short}</p>
            {entry.long && (
              <p className="mt-2 border-t border-slate-700/60 pt-2 text-[0.78rem] leading-snug text-slate-400">
                {entry.long}
              </p>
            )}
          </div>,
          document.body,
        )}
    </>
  )
}

/**
 * A plain hover explanation for content that is not a glossary term —
 * used by pipeline nodes and chart segments.
 */
export function InfoTip({
  label,
  children,
}: {
  label: React.ReactNode
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {label}
      {open && (
        <span className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-slate-600/60 bg-[#0b1020] p-2.5 text-[0.76rem] leading-snug text-slate-300 shadow-xl">
          {children}
        </span>
      )}
    </span>
  )
}
