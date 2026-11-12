/**
 * NLPulse — "why latency happens" cards.
 *
 * Nine causes, each expandable. Kept as flip-open cards rather than a wall of
 * prose so a presenter can open exactly the one the room just asked about.
 */

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { WHY_LATENCY_CARDS } from '../../data/educationalContent'

export function WhyLatency() {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div className="grid gap-2 px-4 py-3 sm:grid-cols-2 xl:grid-cols-3">
      {WHY_LATENCY_CARDS.map((card) => {
        const open = openId === card.id
        return (
          <button
            key={card.id}
            type="button"
            aria-expanded={open}
            onClick={() => setOpenId(open ? null : card.id)}
            className={`rounded-xl border p-3 text-left transition-colors ${
              open
                ? 'border-sky-400/60 bg-sky-500/10'
                : 'border-slate-700/50 bg-slate-900/40 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden>
                {card.icon}
              </span>
              <span className="text-[0.88rem] font-bold text-slate-100">{card.title}</span>
              <span className="ml-auto text-slate-600">{open ? '−' : '+'}</span>
            </div>

            <p className="mt-1.5 text-[0.76rem] leading-snug text-slate-400">
              {card.summary}
            </p>

            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <p className="mt-2 border-t border-slate-700/50 pt-2 text-[0.76rem] leading-relaxed text-slate-300">
                    {card.detail}
                  </p>
                  <p className="mt-2 rounded-md bg-slate-800/60 px-2 py-1.5 text-[0.74rem] font-medium leading-snug text-sky-200">
                    {card.takeaway}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        )
      })}
    </div>
  )
}
