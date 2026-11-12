/**
 * NLPulse — educational content.
 *
 * All the teaching text in one place, separate from the components that show
 * it. Written to be accurate first and short second.
 *
 * Editorial rules applied throughout:
 *  - never imply that NLP and LLMs are the same thing
 *  - never imply that every generative system exposes every stage separately
 *  - never state a universal threshold or benchmark as fact
 */

/* ------------------------------------------------------------------ */
/* 1. Why latency happens                                              */
/* ------------------------------------------------------------------ */

export interface WhyCard {
  id: string
  icon: string
  title: string
  summary: string
  detail: string
  /** What a student should take away in one sentence. */
  takeaway: string
}

export const WHY_LATENCY_CARDS: WhyCard[] = [
  {
    id: 'network',
    icon: '🌐',
    title: 'Network',
    summary: 'Distance, routing, congestion and connection setup all add delay.',
    detail:
      'A request to a distant region crosses many routers, each adding a little time. Physical distance sets a floor that no optimisation can go under: light in fibre covers roughly 200 km per millisecond, and the path is never a straight line. Establishing a secure connection costs extra round trips before any data moves.',
    takeaway: 'Some of the wait is simply the speed of light and the shape of the internet.',
  },
  {
    id: 'queue',
    icon: '⏳',
    title: 'Queue',
    summary: 'Requests may wait for compute resources before anything starts.',
    detail:
      'Inference hardware is shared. When requests arrive faster than they can be served, they wait in line. Queueing delay does not grow smoothly with load — it grows sharply as utilisation approaches capacity, which is why a service can look healthy at 70% and fall over at 95%.',
    takeaway: 'Queue time is pure waiting. No computation for your request has happened yet.',
  },
  {
    id: 'tokenization',
    icon: '🔤',
    title: 'Tokenization & preprocessing',
    summary: 'Text must be converted into the representation the system needs.',
    detail:
      'Models do not read characters. Text is segmented into tokens from a learned vocabulary and mapped to numeric ids. Other NLP systems have their own preprocessing — normalisation, stemming, feature extraction — but the principle is the same: raw text is not directly consumable.',
    takeaway: 'Usually small, but it scales with how much text you send.',
  },
  {
    id: 'prefill',
    icon: '📚',
    title: 'Prefill',
    summary: 'The prompt must be processed before generation can begin.',
    detail:
      'For transformer-based generative models, every prompt token is pushed through every layer to build the state that generation will draw on. This work is highly parallel, so it is cheap per token — but a very long prompt is still a very large amount of it, and none of it produces visible output.',
    takeaway: 'Long prompts cost you before the model has written a single word.',
  },
  {
    id: 'compute',
    icon: '🧠',
    title: 'Model computation',
    summary: 'The model performs a great deal of arithmetic to make a prediction.',
    detail:
      'A forward pass multiplies the input through many layers of learned weights. Larger models have more weights to move and more arithmetic to do per token, so they cost more time per token even on identical hardware.',
    takeaway: 'Bigger models are not just more capable — they are more expensive per token.',
  },
  {
    id: 'autoregressive',
    icon: '🔁',
    title: 'Autoregressive generation',
    summary: 'Many generative models produce output one token at a time.',
    detail:
      'Each new token is predicted from everything before it, then appended, then the process repeats. The steps cannot be run in parallel with each other, because step N needs the result of step N-1. This sequential dependency is the defining cost of generative inference.',
    takeaway: 'You cannot parallelise your way out of a sequence that depends on itself.',
  },
  {
    id: 'output',
    icon: '📏',
    title: 'Output length',
    summary: 'More generated tokens generally means more generation time.',
    detail:
      'Because decoding is sequential, the time spent generating scales roughly with the number of tokens produced. Asking a model for a summary rather than an essay is often the single easiest latency improvement available.',
    takeaway: 'Asking for less is the cheapest optimisation there is.',
  },
  {
    id: 'hardware',
    icon: '🖥',
    title: 'Hardware',
    summary: 'Compute hardware affects both throughput and latency.',
    detail:
      'Decoding is largely limited by how fast weights can be moved from memory, so memory bandwidth matters as much as raw arithmetic capability. This is why purpose-built accelerators can be an order of magnitude faster than a general-purpose processor for the same model.',
    takeaway: 'The same model on different hardware is effectively a different product.',
  },
  {
    id: 'load',
    icon: '🔥',
    title: 'Server load',
    summary: 'Heavy utilisation increases queueing for everyone.',
    detail:
      'Load does not only affect the queue. Under batching, a busy server may run your request alongside many others, which raises total throughput while making each individual response slightly slower to decode.',
    takeaway: 'Your latency depends on other people’s requests, not only your own.',
  },
]

/* ------------------------------------------------------------------ */
/* 2. NLP is broader than LLMs                                         */
/* ------------------------------------------------------------------ */

export interface NlpTask {
  id: string
  name: string
  example: string
  /** Does this task generate output token by token? */
  autoregressive: boolean
  latencyShape: string
}

export const NLP_TASKS: NlpTask[] = [
  {
    id: 'tokenization',
    name: 'Tokenization',
    example: '"unbelievable" → ["un", "believ", "able"]',
    autoregressive: false,
    latencyShape: 'Microseconds to milliseconds. A preprocessing step, not a model.',
  },
  {
    id: 'classification',
    name: 'Text classification',
    example: 'A support email → "billing"',
    autoregressive: false,
    latencyShape: 'One forward pass, one answer. No generation loop at all.',
  },
  {
    id: 'sentiment',
    name: 'Sentiment analysis',
    example: '"I loved it" → positive',
    autoregressive: false,
    latencyShape: 'Single pass. Often a small model, often only a few milliseconds.',
  },
  {
    id: 'ner',
    name: 'Named entity recognition',
    example: '"Ada met Alan in London" → PERSON, PERSON, LOCATION',
    autoregressive: false,
    latencyShape: 'One pass over the sequence, labelling every position at once.',
  },
  {
    id: 'translation',
    name: 'Machine translation',
    example: 'English → Tamil',
    autoregressive: true,
    latencyShape: 'Usually generates the target sequence token by token.',
  },
  {
    id: 'qa',
    name: 'Question answering',
    example: 'Find the answer span inside a document',
    autoregressive: false,
    latencyShape: 'Extractive systems locate a span — no generation required.',
  },
  {
    id: 'generation',
    name: 'Text generation',
    example: 'Write a paragraph about NLP',
    autoregressive: true,
    latencyShape: 'Sequential decoding. Time scales with output length.',
  },
  {
    id: 'speech',
    name: 'Speech recognition',
    example: 'Audio → text',
    autoregressive: true,
    latencyShape: 'Often streaming: partial results arrive before you stop speaking.',
  },
]

/* ------------------------------------------------------------------ */
/* 3. Real-world examples                                              */
/* ------------------------------------------------------------------ */

export interface ExampleStage {
  label: string
  /** Illustrative simulated duration, ms. */
  ms: number
  note: string
}

export interface RealWorldExample {
  id: string
  icon: string
  title: string
  scenario: string
  stages: ExampleStage[]
  /** Is the heavy lifting done by an autoregressive generative model? */
  generative: boolean
  lesson: string
  /** What the user is doing while they wait, which shapes what feels acceptable. */
  expectation: string
}

export const REAL_WORLD_EXAMPLES: RealWorldExample[] = [
  {
    id: 'autocomplete',
    icon: '🔎',
    title: 'Search autocomplete',
    scenario: 'You type "Natural lang…" and suggestions appear beneath the box.',
    stages: [
      { label: 'Keystroke captured', ms: 2, note: 'The browser fires an input event.' },
      { label: 'Debounce', ms: 40, note: 'Deliberate wait so every keystroke is not a request.' },
      { label: 'Network', ms: 25, note: 'Usually served from a nearby edge location.' },
      { label: 'Prefix lookup', ms: 8, note: 'An index lookup or small ranking model — not generation.' },
      { label: 'Render', ms: 6, note: 'Drawing the suggestion list.' },
    ],
    generative: false,
    lesson:
      'Autocomplete is a ranking and retrieval problem, not a generation problem. That is exactly why it can be fast enough to keep up with typing.',
    expectation: 'The user is mid-keystroke. Anything they can notice is too slow.',
  },
  {
    id: 'voice',
    icon: '🎤',
    title: 'Voice assistant',
    scenario: 'You ask a question out loud and hear a spoken answer.',
    stages: [
      { label: 'Audio capture', ms: 30, note: 'Buffering microphone input.' },
      { label: 'Endpoint detection', ms: 180, note: 'Deciding you have actually stopped speaking.' },
      { label: 'Speech recognition', ms: 220, note: 'Audio to text, often streamed while you speak.' },
      { label: 'Language model', ms: 480, note: 'Understanding and composing a reply.' },
      { label: 'Text to speech', ms: 260, note: 'Turning the reply into audio.' },
      { label: 'Playback start', ms: 40, note: 'Audio pipeline and buffering.' },
    ],
    generative: true,
    lesson:
      'Four separate models sit between the question and the answer. The language model is only one of them, so optimising it alone has limited effect.',
    expectation:
      'Conversation has rhythm. A pause that would be invisible in a chat window feels broken out loud.',
  },
  {
    id: 'translation',
    icon: '🌍',
    title: 'Translation',
    scenario: 'An English paragraph becomes Tamil.',
    stages: [
      { label: 'Tokenization', ms: 4, note: 'Segmenting the source text.' },
      { label: 'Encoder pass', ms: 55, note: 'Reading the whole source sentence at once.' },
      { label: 'Decoding', ms: 340, note: 'Generating the target text token by token.' },
      { label: 'Detokenize & render', ms: 12, note: 'Reassembling readable text.' },
    ],
    generative: true,
    lesson:
      'Translation generates a sequence, so its cost scales with the length of the output as well as the input.',
    expectation:
      'The user is reading, not conversing. A second here is usually perfectly acceptable.',
  },
  {
    id: 'chatbot',
    icon: '💬',
    title: 'Chat assistant',
    scenario: 'You ask a question and the answer streams in word by word.',
    stages: [
      { label: 'Network', ms: 45, note: 'Request travels to the provider.' },
      { label: 'Queue', ms: 60, note: 'Waiting for a slot on shared hardware.' },
      { label: 'Prefill', ms: 130, note: 'Reading the prompt and conversation history.' },
      { label: 'First token', ms: 25, note: 'The silence ends here.' },
      { label: 'Remaining tokens', ms: 1400, note: 'Streamed while the user reads.' },
    ],
    generative: true,
    lesson:
      'Streaming means the user starts reading at around 260 ms even though the response takes over 1.6 s to finish.',
    expectation:
      'Because output arrives progressively, perceived responsiveness tracks TTFT far more than total time.',
  },
  {
    id: 'sentiment',
    icon: '📊',
    title: 'Sentiment analysis',
    scenario: 'A batch of reviews is labelled positive or negative.',
    stages: [
      { label: 'Tokenization', ms: 3, note: 'Preparing the text.' },
      { label: 'Classifier forward pass', ms: 9, note: 'One pass produces the label.' },
      { label: 'Return label', ms: 1, note: 'A single word of output.' },
    ],
    generative: false,
    lesson:
      'No generation loop, no TTFT, no tokens per second. A whole family of NLP tasks simply does not have the cost structure this application spends most of its time explaining.',
    expectation:
      'Often run in bulk offline, where throughput matters and per-item latency barely does.',
  },
]

/* ------------------------------------------------------------------ */
/* 4. Voice pipeline (the dedicated demo)                              */
/* ------------------------------------------------------------------ */

export interface VoiceStage {
  id: string
  icon: string
  label: string
  /** Illustrative simulated duration, ms. */
  ms: number
  note: string
  color: string
}

export const VOICE_PIPELINE: VoiceStage[] = [
  { id: 'speech', icon: '🎤', label: 'Human speaks', ms: 0, note: 'The utterance itself.', color: '#64748b' },
  { id: 'capture', icon: '🎙', label: 'Audio capture', ms: 30, note: 'Microphone buffering and encoding.', color: '#6366f1' },
  { id: 'endpoint', icon: '⏸', label: 'End-of-speech detection', ms: 180, note: 'The system must decide you have finished. Waiting too little cuts you off; waiting too long feels sluggish.', color: '#f59e0b' },
  { id: 'stt', icon: '📝', label: 'Speech to text', ms: 220, note: 'Audio becomes text. Often streamed, so much of it overlaps with speaking.', color: '#a78bfa' },
  { id: 'nlu', icon: '🧩', label: 'Language understanding', ms: 60, note: 'Intent and context resolution, sometimes a separate small model.', color: '#14b8a6' },
  { id: 'llm', icon: '🧠', label: 'NLP / LLM response', ms: 480, note: 'Composing the reply. This is the stage the rest of the app models in detail.', color: '#ec4899' },
  { id: 'tts', icon: '🔊', label: 'Text to speech', ms: 260, note: 'Generating audio. Often streamed so playback can start early.', color: '#22c55e' },
  { id: 'play', icon: '👂', label: 'Human hears it', ms: 40, note: 'Audio pipeline latency and buffering before the first sound.', color: '#38bdf8' },
]

/* ------------------------------------------------------------------ */
/* 5. Latency vs throughput                                            */
/* ------------------------------------------------------------------ */

export const LATENCY_VS_THROUGHPUT = {
  latency: {
    question: 'How long does ONE request take?',
    road: 'How long one car needs to reach its destination.',
    nlp: 'How long you wait for your answer.',
    unit: 'milliseconds per request',
  },
  throughput: {
    question: 'How much work gets done per unit of time?',
    road: 'How many cars pass a point each minute.',
    nlp: 'How many tokens the serving fleet produces per second, across everyone.',
    unit: 'tokens or requests per second',
  },
  tension:
    'Adding lanes raises throughput without making any single car faster. Batching does the same thing for inference: the fleet serves far more tokens per second, while each individual request decodes a little slower because the device is shared. A system tuned purely for throughput can feel worse to every single user.',
}

/* ------------------------------------------------------------------ */
/* 6. Perception contexts                                              */
/* ------------------------------------------------------------------ */

export interface PerceptionContext {
  id: string
  label: string
  icon: string
  note: string
}

export const PERCEPTION_CONTEXTS: PerceptionContext[] = [
  { id: 'autocomplete', icon: '⌨', label: 'Autocomplete', note: 'Must keep up with typing. The user is still mid-word.' },
  { id: 'search', icon: '🔎', label: 'Search', note: 'A short pause is expected; results are worth a moment.' },
  { id: 'voice', icon: '🎤', label: 'Voice assistant', note: 'Conversation has rhythm. Silence is read as failure.' },
  { id: 'chat', icon: '💬', label: 'Chat', note: 'Streaming buys patience — what matters is when text starts.' },
  { id: 'translation', icon: '🌍', label: 'Translation', note: 'The user is reading, not conversing. Seconds are fine.' },
  { id: 'batch', icon: '📦', label: 'Batch processing', note: 'Nobody is waiting. Only throughput matters.' },
]
