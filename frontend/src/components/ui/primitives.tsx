/**
 * NLPulse — shared UI primitives.
 *
 * Panels, provenance badges and form controls. Kept in one file because each
 * piece is small and they are always used together.
 */

import type { ReactNode } from 'react'
import type { Provenance } from '../../simulation/types'
import { Term } from './Tooltip'

/* ------------------------------------------------------------------ */
/* Provenance badge — the honesty mechanism of the whole application    */
/* ------------------------------------------------------------------ */

/**
 * Every number on screen carries one of these. SIMULATED means the value came
 * out of the educational model; MEASURED means a real clock produced it.
 * They are never blended in the same readout.
 */
export function ProvenanceBadge({
  provenance,
  className = '',
}: {
  provenance: Provenance
  className?: string
}) {
  const simulated = provenance === 'SIMULATED'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.14em] ${
        simulated
          ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
          : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
      } ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${simulated ? 'bg-amber-400' : 'bg-emerald-400'}`}
        aria-hidden
      />
      <Term k={simulated ? 'simulated' : 'measured'} plain>
        {provenance}
      </Term>
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export function Panel({
  title,
  right,
  children,
  className = '',
  bodyClassName = '',
}: {
  title?: ReactNode
  right?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={`panel flex min-h-0 flex-col ${className}`}>
      {(title || right) && (
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-700/40 px-4 py-2.5">
          <h2 className="panel-title">{title}</h2>
          {right}
        </header>
      )}
      <div className={`min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Segmented control                                                   */
/* ------------------------------------------------------------------ */

export interface SegmentOption<T extends string> {
  value: T
  label: string
  hint?: string
}

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  columns = 2,
  termKey,
}: {
  label: ReactNode
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  columns?: number
  termKey?: Parameters<typeof Term>[0]['k']
}) {
  return (
    <div>
      <div className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-slate-400">
        {termKey ? <Term k={termKey}>{label}</Term> : label}
      </div>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        role="group"
        aria-label={typeof label === 'string' ? label : undefined}
      >
        {options.map((option) => {
          const active = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              title={option.hint}
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={`rounded-lg border px-2 py-1.5 text-[0.78rem] font-medium transition-colors ${
                active
                  ? 'border-sky-400/70 bg-sky-500/15 text-sky-200'
                  : 'border-slate-700/60 bg-slate-800/30 text-slate-400 hover:border-slate-500 hover:text-slate-200'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Slider                                                              */
/* ------------------------------------------------------------------ */

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format = (v: number) => v.toLocaleString(),
  termKey,
  hint,
}: {
  label: ReactNode
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  format?: (value: number) => string
  termKey?: Parameters<typeof Term>[0]['k']
  hint?: string
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-slate-400">
          {termKey ? <Term k={termKey}>{label}</Term> : label}
        </span>
        <span className="tnum text-sm font-semibold text-sky-300">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={typeof label === 'string' ? label : undefined}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-sky-400"
      />
      {hint && <p className="mt-1 text-[0.68rem] leading-snug text-slate-500">{hint}</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Toggle                                                              */
/* ------------------------------------------------------------------ */

export function Toggle({
  label,
  checked,
  onChange,
  termKey,
  hint,
}: {
  label: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  termKey?: Parameters<typeof Term>[0]['k']
  hint?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="min-w-0">
        <div className="text-[0.82rem] font-medium text-slate-200">
          {termKey ? <Term k={termKey}>{label}</Term> : label}
        </div>
        {hint && <p className="text-[0.68rem] leading-snug text-slate-500">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={typeof label === 'string' ? label : undefined}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
          checked
            ? 'border-sky-400/60 bg-sky-500/40'
            : 'border-slate-600 bg-slate-800'
        }`}
      >
        <span
          className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-all ${
            checked ? 'left-6 bg-sky-300' : 'left-1 bg-slate-400'
          }`}
        />
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

export function Button({
  children,
  onClick,
  variant = 'default',
  className = '',
  disabled = false,
  title,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'default' | 'primary' | 'ghost' | 'danger'
  className?: string
  disabled?: boolean
  title?: string
}) {
  const variants = {
    default:
      'border-slate-600/70 bg-slate-800/60 text-slate-200 hover:border-slate-500 hover:bg-slate-700/60',
    primary:
      'border-sky-400/60 bg-sky-500/20 text-sky-100 hover:border-sky-300 hover:bg-sky-500/30',
    ghost:
      'border-transparent bg-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-200',
    danger:
      'border-rose-500/50 bg-rose-500/15 text-rose-200 hover:border-rose-400 hover:bg-rose-500/25',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded-lg border px-3 py-1.5 text-[0.82rem] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

/** A short caption used under simulated figures. */
export function SimNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 text-[0.68rem] leading-snug text-slate-500">{children}</p>
  )
}
