/**
 * NLPulse — the seminar script.
 *
 * A guided presentation that runs the real simulator rather than playing a
 * recording. Each step declares what the audience should be looking at, what
 * the presenter says, and an `onEnter` hook that drives the stores.
 *
 * The script is the presentation. A presenter can run the whole session with
 * the space bar.
 */

import type { SimulationInput } from '../simulation/types'

/** Which visual the stage area should show for this step. */
export type SeminarFocus =
  | 'pipeline'
  | 'tokens'
  | 'model'
  | 'ttft'
  | 'breakdown'
  | 'waterfall'
  | 'compare'
  | 'closing'

export interface SeminarStep {
  id: string
  /** Large heading shown to the room. */
  title: string
  /** One or two sentences of narration, shown on screen. */
  narration: string
  focus: SeminarFocus
  /** Optional presenter-only note, hidden by the notes toggle. */
  note?: string
  /**
   * Configuration this step needs. Applied before the run starts.
   * Omit to keep whatever the previous step left in place.
   */
  config?: Partial<SimulationInput>
  /** Start playback when the step opens. */
  play?: boolean
  /** Freeze the animation at a moment of interest. */
  freezeAt?: 'firstToken' | 'end'
  /** Seek straight to the end without animating (for analysis steps). */
  jumpToEnd?: boolean
  /** An optional experiment the presenter can trigger from the step. */
  action?: {
    label: string
    config: Partial<SimulationInput>
    /** What the room should notice after pressing it. */
    expect: string
  }
}

/** The baseline the seminar opens with: an ordinary, healthy request. */
export const SEMINAR_BASELINE: Partial<SimulationInput> = {
  network: 'average',
  modelSize: 'medium',
  hardware: 'accelerator',
  serverLoad: 'low',
  deployment: 'cloud',
  promptTokens: 100,
  outputTokens: 80,
  streaming: true,
  cache: false,
  batching: true,
  deterministic: true,
}

export const SEMINAR_STEPS: SeminarStep[] = [
  {
    id: 'question',
    title: 'What happens after you press Send?',
    narration:
      'You type a question and hit Send. The answer does not appear instantly — and the reason is not one delay. It is a whole pipeline of them, and we are about to follow a single request through every stage of it.',
    focus: 'pipeline',
    config: SEMINAR_BASELINE,
    note: 'Ask the room to guess where the time goes before you start. Most people say "the model is thinking". Keep their answers on the board — you will come back to them at the end, and the biggest contributor is frequently not what anyone guessed.',
  },
  {
    id: 'network',
    title: 'First, it has to get there',
    narration:
      'Before any AI is involved at all, the request has to physically travel to the provider. Distance, routing hops and connection setup all cost time, and none of that time has produced a single word yet.',
    focus: 'pipeline',
    play: true,
    note: 'Point out that nothing intelligent has happened yet. If the provider is on another continent, this stage alone can exceed a hundred milliseconds no matter how good the model is.',
  },
  {
    id: 'tokenization',
    title: 'Text becomes tokens',
    narration:
      'The model cannot read characters. Your text is split into tokens — chunks from a fixed vocabulary, often pieces of words rather than whole ones — and turned into numbers.',
    focus: 'tokens',
    note: 'Worth saying out loud: the boundaries shown here are illustrative. A real tokenizer learns its vocabulary from data and its choices often look strange. The teaching point is that text becomes discrete units, not where exactly the cuts fall.',
  },
  {
    id: 'queue',
    title: 'Then it waits its turn',
    narration:
      'Inference hardware is shared between everyone using the service. If the fleet is busy, your request simply waits. This is pure queueing delay — no computation for you has started.',
    focus: 'pipeline',
    note: 'The important detail: queueing does not grow smoothly with load. It grows sharply as utilisation approaches capacity. A service at 70% looks fine. At 95% it feels broken. We will demonstrate that in a moment.',
  },
  {
    id: 'prefill',
    title: 'The model reads your prompt',
    narration:
      'Now the model processes the entire prompt to build its internal state. This is called prefill. Every prompt token passes through every layer — and the model still has not written anything.',
    focus: 'model',
    note: 'This is the stage students consistently underestimate. Emphasise that prefill cost scales with prompt length, which is why stuffing a huge document into context has a direct, felt cost before the answer starts.',
  },
  {
    id: 'firstToken',
    title: '⚡ This is the first token',
    narration:
      'Everything up to this instant happened with a blank screen. The time from pressing Send to this moment is Time To First Token — TTFT — and it is what the user actually experiences as "how fast is this thing".',
    focus: 'ttft',
    play: true,
    freezeAt: 'firstToken',
    note: 'Freeze here and let it sit for a few seconds. This is the single most important idea in the session. Read the TTFT number out loud, then point at the stacked bars and say: none of this was the model being clever. Most of it was waiting.',
  },
  {
    id: 'generation',
    title: 'Now it writes, one token at a time',
    narration:
      'The model predicts a token, appends it to the context, and predicts the next. The steps cannot be parallelised, because each one needs the result of the one before. That is why output appears progressively.',
    focus: 'tokens',
    play: true,
    note: 'Let the tokens stream and stay quiet for a moment — the visual does the teaching. Then make the point: asking for twice as much output costs roughly twice as much generation time, and that is the easiest latency lever most people never pull.',
  },
  {
    id: 'complete',
    title: 'The complete response',
    narration:
      'The last token arrives. Notice how much later this is than the first one — and notice that the user has been reading since the first token, which is why streaming changes the experience so much without changing the computation at all.',
    focus: 'waterfall',
    jumpToEnd: true,
    note: 'Contrast TTFT with total time explicitly. Then mention: if we turned streaming off, the user would see nothing at all until this final moment. Same work, same total, far worse experience.',
  },
  {
    id: 'breakdown',
    title: 'So where did the time actually go?',
    narration:
      'Here is the whole request accounted for. Every stage, as a share of the total. This is the answer to the question we started with — and it is rarely the answer people expect.',
    focus: 'breakdown',
    jumpToEnd: true,
    note: 'Go back to the guesses on the board now. Ask the room which stage they would attack first. Then make the key point: the answer changes completely depending on the configuration — which is exactly what we are about to prove.',
  },
  {
    id: 'slowNetwork',
    title: 'What if the network gets slower?',
    narration:
      'Same model. Same hardware. Same prompt. The only thing we change is the distance to the provider.',
    focus: 'breakdown',
    jumpToEnd: true,
    action: {
      label: '🌐 Make the network very slow',
      config: { network: 'verySlow' },
      expect:
        'TTFT rises sharply while generation time is untouched — the model is exactly as fast as it was.',
    },
    note: 'This is the "a fast model is not enough" moment. The model did not change at all, and the user experience got materially worse.',
  },
  {
    id: 'hugePrompt',
    title: 'What if the prompt goes from 100 to 10,000 tokens?',
    narration:
      'A hundred times more context to read. Watch which stage absorbs it — and watch that it happens entirely before the first word comes back.',
    focus: 'breakdown',
    jumpToEnd: true,
    config: { network: 'average' },
    action: {
      label: '📚 Grow the prompt to 10,000 tokens',
      config: { promptTokens: 10000 },
      expect:
        'Prefill grows dramatically and pushes TTFT out with it. Generation is unchanged — the output is the same length as before.',
    },
    note: 'Connect this to retrieval-augmented systems and long chat histories: every extra token of context is paid for on every single request, before the user sees anything.',
  },
  {
    id: 'hardware',
    title: 'What if we move from CPU to an accelerator?',
    narration:
      'The same request, the same model, the same network. Only the hardware underneath changes.',
    focus: 'compare',
    jumpToEnd: true,
    config: { promptTokens: 2000, hardware: 'cpu', outputTokens: 200 },
    action: {
      label: '🚀 Switch CPU → data centre accelerator',
      config: { hardware: 'accelerator' },
      expect:
        'Prefill and generation both collapse. Network and queue do not move at all — hardware cannot fix those.',
    },
    note: 'The honest framing: hardware is a huge lever on the compute stages and no lever whatsoever on the rest. If your latency is dominated by queueing, buying faster chips is not the fix. That is the lesson to leave them with.',
  },
  {
    id: 'closing',
    title: 'Fast AI is not just a fast model',
    narration:
      'Human → network → NLP system → tokens → response → human. Every link matters, and the slowest one is different in every system. Understanding latency means understanding the journey of information.',
    focus: 'closing',
    note: 'Closing line. If there is time, open the Quiz from the header and run the questions with the room — it works well as a five-minute wrap-up and tells you immediately whether the TTFT idea landed.',
  },
]
