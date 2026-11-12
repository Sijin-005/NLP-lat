/**
 * NLPulse — quiz questions.
 *
 * Written to check the ideas the seminar actually teaches, not trivia. Every
 * question carries an explanation shown after answering, so the quiz teaches
 * a second time rather than only scoring.
 */

export interface QuizOption {
  id: string
  text: string
}

export interface QuizQuestion {
  id: string
  question: string
  options: QuizOption[]
  correct: string
  explanation: string
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'ttft',
    question: 'What does TTFT mean?',
    options: [
      { id: 'a', text: 'Total Token File Transfer' },
      { id: 'b', text: 'Time To First Token' },
      { id: 'c', text: 'Token Transfer Frequency' },
      { id: 'd', text: 'Total Transformer Function Time' },
    ],
    correct: 'b',
    explanation:
      'Time To First Token: the wait between sending a request and the first piece of the answer appearing. It is the part of the delay the user experiences as a blank screen.',
  },
  {
    id: 'queue',
    question: 'What can increase queue latency?',
    options: [
      { id: 'a', text: 'A longer response from the model' },
      { id: 'b', text: 'Many requests arriving while hardware is already busy' },
      { id: 'c', text: 'Using a shorter prompt' },
      { id: 'd', text: 'Turning streaming on' },
    ],
    correct: 'b',
    explanation:
      'Queueing is time spent waiting for a free slot on shared hardware, before any computation for your request begins. It grows sharply as the serving fleet approaches full utilisation.',
  },
  {
    id: 'output',
    question: 'What usually happens when the requested output length increases?',
    options: [
      { id: 'a', text: 'Time to first token rises proportionally' },
      { id: 'b', text: 'Generation time rises, because decoding is sequential' },
      { id: 'c', text: 'Nothing changes — the model produces all tokens at once' },
      { id: 'd', text: 'The prompt has to be processed again for each token' },
    ],
    correct: 'b',
    explanation:
      'Autoregressive models produce one token per forward pass, so generation time scales roughly with the number of tokens produced. TTFT is largely unaffected — the first token still arrives at about the same moment.',
  },
  {
    id: 'latencyThroughput',
    question: 'What is the difference between latency and throughput?',
    options: [
      { id: 'a', text: 'They are two names for the same measurement' },
      { id: 'b', text: 'Latency is how long one request takes; throughput is how much work is completed per unit of time' },
      { id: 'c', text: 'Latency applies to models, throughput applies to networks' },
      { id: 'd', text: 'Throughput is latency measured in seconds instead of milliseconds' },
    ],
    correct: 'b',
    explanation:
      'Latency is about a single request. Throughput is about the system as a whole. Batching raises throughput while slightly increasing the latency of each individual request — a real trade-off, not a free win.',
  },
  {
    id: 'cloud',
    question: 'Why can a cloud-hosted NLP system include additional communication delay?',
    options: [
      { id: 'a', text: 'Cloud models are always larger than local ones' },
      { id: 'b', text: 'The request and response must physically travel across a network' },
      { id: 'c', text: 'Cloud providers deliberately slow down free requests' },
      { id: 'd', text: 'Tokenization can only run on the client' },
    ],
    correct: 'b',
    explanation:
      'Distance, routing hops and connection setup all cost time in both directions. This is why the same model can feel different depending on which region serves it — and why local is sometimes, but not always, faster.',
  },
  {
    id: 'prefill',
    question:
      'In many transformer-based LLMs, which stage processes the prompt before token generation begins?',
    options: [
      { id: 'a', text: 'Prefill' },
      { id: 'b', text: 'Sampling' },
      { id: 'c', text: 'Detokenization' },
      { id: 'd', text: 'Batching' },
    ],
    correct: 'a',
    explanation:
      'Prefill pushes every prompt token through every layer to build the state generation will draw on. It happens entirely before the first output token, which is why long prompts directly increase TTFT.',
  },
  {
    id: 'streaming',
    question: 'What does turning streaming on actually change?',
    options: [
      { id: 'a', text: 'The model generates tokens faster' },
      { id: 'b', text: 'Total completion time drops significantly' },
      { id: 'c', text: 'The user starts seeing output much earlier, though the work is the same' },
      { id: 'd', text: 'The prompt no longer needs to be processed' },
    ],
    correct: 'c',
    explanation:
      'Streaming does not speed up computation. The final token arrives at roughly the same moment either way. What changes is when the first one appears — which is what people actually perceive as responsiveness.',
  },
  {
    id: 'nlpScope',
    question: 'Which statement about NLP is correct?',
    options: [
      { id: 'a', text: 'NLP and large language models are the same thing' },
      { id: 'b', text: 'NLP covers many tasks; LLMs are one modern approach within it' },
      { id: 'c', text: 'All NLP systems generate their output one token at a time' },
      { id: 'd', text: 'NLP began with the invention of the transformer' },
    ],
    correct: 'b',
    explanation:
      'Classification, named entity recognition, sentiment analysis and extractive question answering all produce their answer in a single pass, with no generation loop, no TTFT and no tokens per second. The latency story in this app applies to generative models specifically.',
  },
  {
    id: 'notOneCause',
    question:
      'A chat system feels slow. Its fleet is at 95% utilisation and prompts average 9,000 tokens. What is the safest conclusion?',
    options: [
      { id: 'a', text: 'Buy faster hardware — that always fixes latency' },
      { id: 'b', text: 'It is the network; it usually is' },
      { id: 'c', text: 'Measure the stages first: queueing and prefill are both strong candidates here' },
      { id: 'd', text: 'Reduce the output length; nothing else matters' },
    ],
    correct: 'c',
    explanation:
      'There is rarely one universal cause. Here two stages are independently suspicious, and faster hardware would help prefill while doing nothing at all for the queue. Measuring the breakdown comes before choosing a fix.',
  },
]
