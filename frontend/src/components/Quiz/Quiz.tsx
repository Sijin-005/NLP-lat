/**
 * NLPulse — quiz.
 *
 * A wrap-up for the end of the session. Each answer is explained immediately,
 * so the quiz teaches rather than only scoring, and the final screen reports
 * which ideas the room has and has not absorbed.
 */

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '../../state/appStore'
import { QUIZ_QUESTIONS } from '../../data/quizQuestions'
import { Button } from '../ui/primitives'

export function Quiz() {
  const setQuizOpen = useAppStore((state) => state.setQuizOpen)
  const [index, setIndex] = useState(0)
  const [chosen, setChosen] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [finished, setFinished] = useState(false)

  const question = QUIZ_QUESTIONS[index]
  const answered = chosen !== null
  const correct = chosen === question?.correct

  const score = QUIZ_QUESTIONS.filter((q) => answers[q.id] === q.correct).length

  const choose = (optionId: string) => {
    if (answered) return
    setChosen(optionId)
    setAnswers((current) => ({ ...current, [question.id]: optionId }))
  }

  const next = () => {
    if (index + 1 >= QUIZ_QUESTIONS.length) {
      setFinished(true)
      return
    }
    setIndex(index + 1)
    setChosen(null)
  }

  const restart = () => {
    setIndex(0)
    setChosen(null)
    setAnswers({})
    setFinished(false)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="panel flex max-h-full w-full max-w-3xl flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-3 border-b border-slate-700/50 px-5 py-3">
          <h2 className="text-base font-bold text-white">📝 Check your understanding</h2>
          {!finished && (
            <span className="tnum text-[0.74rem] text-slate-500">
              Question {index + 1} of {QUIZ_QUESTIONS.length}
            </span>
          )}
          <Button
            variant="ghost"
            className="ml-auto"
            onClick={() => setQuizOpen(false)}
            title="Close (Esc)"
          >
            ✕
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {finished ? (
            <Results score={score} total={QUIZ_QUESTIONS.length} answers={answers} />
          ) : (
            <>
              <h3 className="text-balance text-lg font-semibold leading-snug text-white">
                {question.question}
              </h3>

              <div className="mt-4 space-y-2">
                {question.options.map((option) => {
                  const isChosen = chosen === option.id
                  const isCorrect = option.id === question.correct
                  const reveal = answered && (isChosen || isCorrect)

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => choose(option.id)}
                      disabled={answered}
                      className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                        reveal && isCorrect
                          ? 'border-emerald-400/70 bg-emerald-500/15'
                          : reveal && isChosen
                            ? 'border-rose-400/70 bg-rose-500/15'
                            : answered
                              ? 'border-slate-700/50 bg-slate-900/40 opacity-60'
                              : 'border-slate-700/60 bg-slate-900/40 hover:border-sky-400/60 hover:bg-sky-500/10'
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[0.76rem] font-bold uppercase ${
                          reveal && isCorrect
                            ? 'bg-emerald-400 text-slate-950'
                            : reveal && isChosen
                              ? 'bg-rose-400 text-slate-950'
                              : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {option.id}
                      </span>
                      <span className="text-[0.92rem] leading-snug text-slate-200">
                        {option.text}
                      </span>
                    </button>
                  )
                })}
              </div>

              <AnimatePresence>
                {answered && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="overflow-hidden"
                  >
                    <div
                      className={`mt-4 rounded-xl border p-3.5 ${
                        correct
                          ? 'border-emerald-500/40 bg-emerald-500/5'
                          : 'border-amber-500/40 bg-amber-500/5'
                      }`}
                    >
                      <div
                        className={`mb-1 text-[0.76rem] font-bold uppercase tracking-[0.12em] ${
                          correct ? 'text-emerald-300' : 'text-amber-300'
                        }`}
                      >
                        {correct ? '✓ Correct' : '✕ Not quite'}
                      </div>
                      <p className="text-[0.88rem] leading-relaxed text-slate-300">
                        {question.explanation}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        <footer className="flex shrink-0 items-center gap-2 border-t border-slate-700/50 px-5 py-3">
          {finished ? (
            <>
              <Button onClick={restart}>↺ Try again</Button>
              <Button variant="primary" className="ml-auto" onClick={() => setQuizOpen(false)}>
                Done
              </Button>
            </>
          ) : (
            <>
              <span className="tnum text-[0.76rem] text-slate-500">
                Score so far: {score} / {Object.keys(answers).length || 0}
              </span>
              <Button
                variant="primary"
                className="ml-auto"
                onClick={next}
                disabled={!answered}
              >
                {index + 1 >= QUIZ_QUESTIONS.length ? 'See results' : 'Next question →'}
              </Button>
            </>
          )}
        </footer>
      </div>
    </div>
  )
}

function Results({
  score,
  total,
  answers,
}: {
  score: number
  total: number
  answers: Record<string, string>
}) {
  const percent = Math.round((score / total) * 100)
  const missed = QUIZ_QUESTIONS.filter((q) => answers[q.id] !== q.correct)

  return (
    <div>
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="tnum text-6xl font-black text-sky-300"
        >
          {score} / {total}
        </motion.div>
        <p className="mt-1 text-slate-400">
          {percent}% —{' '}
          {percent === 100
            ? 'every idea landed.'
            : percent >= 70
              ? 'the core ideas landed.'
              : 'worth revisiting the pipeline together.'}
        </p>
      </div>

      {missed.length > 0 && (
        <div className="mt-5">
          <h4 className="panel-title mb-2">Worth going over again</h4>
          <ul className="space-y-2">
            {missed.map((q) => (
              <li
                key={q.id}
                className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3"
              >
                <p className="text-[0.86rem] font-semibold text-slate-200">{q.question}</p>
                <p className="mt-1 text-[0.8rem] leading-relaxed text-slate-400">
                  {q.explanation}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
