/**
 * NLPulse — sample response text.
 *
 * The simulator needs *something* to stream so students can watch output
 * appear token by token. These are pre-written passages about NLP; no model is
 * being run. The text is deliberately on-topic so the demo doubles as course
 * content while it plays.
 */

import { tokenizeIllustrative } from './tokenizer'

export const SAMPLE_PROMPT = 'What is Natural Language Processing?'

/** Passages cycled through to fill however many output tokens are requested. */
const PASSAGES = [
  'Natural language processing is the field of artificial intelligence concerned with letting computers work with human language.',
  'It covers many different tasks, including tokenization, part of speech tagging, named entity recognition, sentiment analysis, machine translation, question answering and text generation.',
  'Large language models are one modern approach within this broader field, and they are not the only one.',
  'A sentiment classifier, for example, reads an entire input and produces a single label in one forward pass, with no token by token generation at all.',
  'Generative models behave differently. They predict one token, append it to the context, and then predict the next, which is why their output appears gradually rather than all at once.',
  'This sequential behaviour is the reason output length has such a direct effect on how long a response takes to finish.',
  'Before any of that can begin, the prompt itself must be read by the model, a step usually called prefill.',
  'Understanding where the time goes matters more than any single benchmark number, because the slowest stage is rarely the same one twice.',
]

/**
 * Build an array of token strings long enough to cover `count` tokens,
 * cycling through the passages when more output is requested than we wrote.
 */
export function buildResponseTokens(count: number): string[] {
  const tokens: string[] = []
  let passageIndex = 0

  while (tokens.length < count) {
    const passage = PASSAGES[passageIndex % PASSAGES.length]
    const prefix = tokens.length === 0 ? '' : ' '
    for (const token of tokenizeIllustrative(prefix + passage)) {
      tokens.push(token.text)
      if (tokens.length >= count) break
    }
    passageIndex += 1
  }

  return tokens.slice(0, count)
}

/**
 * Build prompt text of roughly `tokenCount` illustrative tokens, so that a
 * prompt-length slider has visible text behind it rather than a bare number.
 */
export function buildPromptText(tokenCount: number, seedText = SAMPLE_PROMPT): string {
  if (tokenCount <= tokenizeIllustrative(seedText).length) return seedText

  const filler = [
    'You are helping a student understand how language systems work.',
    'Here is some background material that has been attached to the question.',
    'Please take the following context into account when answering.',
  ]

  let text = seedText
  let index = 0
  while (tokenizeIllustrative(text).length < tokenCount) {
    text += ' ' + filler[index % filler.length]
    index += 1
    // Guard against pathological growth on very large token counts.
    if (index > 4000) break
  }
  return text
}
