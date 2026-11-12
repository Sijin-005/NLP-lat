/**
 * NLPulse — "NLP is not one thing".
 *
 * Counterweight to the rest of the application. Everything else here models an
 * autoregressive generative pipeline, so this panel exists to make clear that
 * a large part of NLP does not work that way at all and does not share the
 * latency profile the rest of the app teaches.
 */

import { NLP_TASKS } from '../../data/educationalContent'
import { Term } from '../ui/Tooltip'

export function NlpScope() {
  return (
    <div className="px-4 py-3">
      <div className="mb-3 rounded-lg border border-violet-500/30 bg-violet-500/5 p-3">
        <p className="text-[0.86rem] leading-relaxed text-slate-200">
          <Term k="nlp">Natural Language Processing</Term> is the whole field of
          getting computers to work with human language.{' '}
          <Term k="llm">Large language models</Term> are one modern approach
          within it — powerful and general, but neither the oldest nor the only
          one, and by a wide margin not the cheapest.
        </p>
        <p className="mt-2 text-[0.8rem] leading-relaxed text-slate-400">
          This distinction matters for latency. Everything else in NLPulse models
          a generative pipeline with prefill, sequential decoding and a
          meaningful <Term k="ttft">TTFT</Term>. For the tasks marked{' '}
          <span className="font-semibold text-sky-300">single pass</span> below,
          none of those concepts apply: there is no decode loop, no tokens per
          second, and no first token to wait for.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-700/60">
              <th className="py-2 pr-3 text-[0.66rem] uppercase tracking-[0.12em] text-slate-500">
                Task
              </th>
              <th className="py-2 pr-3 text-[0.66rem] uppercase tracking-[0.12em] text-slate-500">
                Example
              </th>
              <th className="py-2 pr-3 text-[0.66rem] uppercase tracking-[0.12em] text-slate-500">
                How output is produced
              </th>
              <th className="py-2 text-[0.66rem] uppercase tracking-[0.12em] text-slate-500">
                Latency shape
              </th>
            </tr>
          </thead>
          <tbody>
            {NLP_TASKS.map((task) => (
              <tr
                key={task.id}
                className="border-b border-slate-800/60 align-top last:border-0"
              >
                <td className="py-2 pr-3 text-[0.8rem] font-semibold text-slate-200">
                  {task.name}
                </td>
                <td className="py-2 pr-3 font-mono text-[0.72rem] text-slate-400">
                  {task.example}
                </td>
                <td className="py-2 pr-3">
                  <span
                    className={`whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[0.66rem] font-semibold ${
                      task.autoregressive
                        ? 'border-pink-500/40 bg-pink-500/10 text-pink-300'
                        : 'border-sky-500/40 bg-sky-500/10 text-sky-300'
                    }`}
                  >
                    {task.autoregressive ? 'token by token' : 'single pass'}
                  </span>
                </td>
                <td className="py-2 text-[0.74rem] leading-snug text-slate-400">
                  {task.latencyShape}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[0.72rem] leading-snug text-slate-500">
        A sentiment classifier answering in nine milliseconds and a chat model
        answering in two seconds are not competing at the same task. Choosing the
        smallest model that solves the problem is itself a latency decision.
      </p>
    </div>
  )
}
