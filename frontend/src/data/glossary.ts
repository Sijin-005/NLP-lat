/**
 * NLPulse — glossary powering the tooltip education system.
 *
 * Every technical term the interface uses has an entry here, written for
 * someone meeting it for the first time. Definitions avoid implying that all
 * NLP systems are large language models, because most are not.
 */

export interface GlossaryEntry {
  term: string
  short: string
  long?: string
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  token: {
    term: 'Token',
    short: 'The small chunk of text a model actually reads and writes — often part of a word rather than a whole one.',
    long: 'Models do not work with letters or words directly. Text is converted into tokens from a fixed vocabulary learned during training. "Processing" might become "Process" + "ing". Counting tokens, not words, is what tells you how much work a request involves.',
  },
  latency: {
    term: 'Latency',
    short: 'How long one request takes from start to finish.',
    long: 'Latency is about a single operation. It is not the same as throughput, which is about how much work a system gets through overall. A system can have high throughput and still feel slow to each individual user.',
  },
  ttft: {
    term: 'TTFT (Time To First Token)',
    short: 'The wait between sending a request and seeing the first piece of the answer.',
    long: 'Everything before the first token happens with a blank screen: the network trip, the queue, tokenization and prompt processing. Because users judge responsiveness by when a system starts answering, TTFT often matters more to how fast something feels than the total time does.',
  },
  prefill: {
    term: 'Prefill',
    short: 'The step where a generative model reads the whole prompt before writing anything.',
    long: 'Every prompt token is pushed through every layer of the network to build the internal state that generation will draw on. The work is highly parallel, so it is cheap per token — but a 10,000-token prompt is still 10,000 tokens of it, and it all happens before the first word comes back.',
  },
  inference: {
    term: 'Inference',
    short: 'Running a trained model on new input to get a result.',
    long: 'Training is the expensive one-off process of creating a model. Inference is what happens every time you use it. All the latency in this application is inference latency.',
  },
  transformer: {
    term: 'Transformer',
    short: 'The neural network architecture behind most modern language models.',
    long: 'Transformers process a sequence using attention, which lets each position draw on other positions in the input. This is an architecture, not a task: transformers are used for classification and translation as well as for text generation.',
  },
  throughput: {
    term: 'Throughput',
    short: 'How much work a system completes over a period of time.',
    long: 'Measured in requests or tokens per second across the whole system. Techniques that raise throughput, such as batching, can slightly increase the latency of any one request — a genuine trade-off rather than a free win.',
  },
  streaming: {
    term: 'Streaming',
    short: 'Sending each piece of the response as it is produced instead of waiting for all of it.',
    long: 'Streaming does not make the model faster. The final token arrives at almost the same moment either way. What changes is when the user sees the first one, which is usually the difference between a system feeling responsive and feeling stuck.',
  },
  queue: {
    term: 'Queue',
    short: 'Time your request spends waiting for hardware, before any computation starts.',
    long: 'Inference hardware is shared between many users. When requests arrive faster than they can be served, they wait. Waiting time grows sharply as a system approaches full utilisation, which is why a service can feel fine at 70% load and fall apart at 95%.',
  },
  batching: {
    term: 'Batching',
    short: 'Processing several requests together on the same hardware.',
    long: 'Accelerators are far more efficient when given many sequences at once, so batching raises total throughput and shortens queues. The cost is a short wait for the batch to form and slightly slower decoding per request, because the device is now shared.',
  },
  cache: {
    term: 'Cache',
    short: 'Reusing work already done for a prompt prefix that was seen before.',
    long: 'If a request starts with the same context as an earlier one, the model state for that prefix can be reused instead of recomputed, which cuts prefill time. It does not remove model computation: the new part of the prompt still has to be processed, and every output token still costs a full decode step.',
  },
  tokensPerSecond: {
    term: 'Tokens per second',
    short: 'How quickly a model produces output once it has started.',
    long: 'A useful measure of generation speed, but on its own it says nothing about how long you waited to see the first token. A system can generate quickly and still feel slow if the queue or the prompt processing was long.',
  },
  interTokenLatency: {
    term: 'Inter-token latency',
    short: 'The gap between one output token appearing and the next.',
    long: 'Roughly the inverse of tokens per second. It is not perfectly constant: scheduling, batch composition and growing context all make some steps slower than others.',
  },
  tokenization: {
    term: 'Tokenization',
    short: 'Converting text into the numeric tokens a model consumes.',
    long: 'A preprocessing step present in nearly every NLP system, not just generative ones. It is usually fast, but it does scale with input length.',
  },
  autoregressive: {
    term: 'Autoregressive generation',
    short: 'Producing output one token at a time, each one conditioned on those before it.',
    long: 'The model predicts a token, appends it to the context, and predicts again. This is why generative output appears progressively, and why doubling the requested output length roughly doubles the generation time. Many NLP tasks — classification, tagging, retrieval — do not work this way at all.',
  },
  embedding: {
    term: 'Embedding',
    short: 'A numeric vector representing a token, so the model can compute with it.',
    long: 'Token IDs are just indices. Embeddings turn them into vectors in a space where related meanings sit near each other. This is the first layer of most modern language models.',
  },
  attention: {
    term: 'Attention',
    short: 'The mechanism that lets each position in a sequence draw on other positions.',
    long: 'Attention is how a transformer decides which earlier tokens are relevant to the one being processed. Its cost grows with context length, which is part of why very long prompts get expensive.',
  },
  kvCache: {
    term: 'KV cache',
    short: 'Stored intermediate state that lets a model avoid reprocessing the whole context for every new token.',
    long: 'Without it, generating token 500 would mean re-reading all 499 previous tokens from scratch. With it, each step only processes the newest token — but the cache grows as the response gets longer, which is why decoding gradually slows down.',
  },
  roundTrip: {
    term: 'Round-trip time',
    short: 'How long a message takes to reach the other end and come back.',
    long: 'Determined largely by physical distance and the number of network hops, so it has a hard floor no amount of optimisation can go under. Light in fibre takes roughly 5 ms per 1,000 km, before any routing is accounted for.',
  },
  jitter: {
    term: 'Jitter',
    short: 'Run-to-run variation in delay.',
    long: 'Real networks and real servers are not perfectly consistent. This simulator adds a small random variation so repeated runs differ slightly, and Deterministic Mode switches it off when you need two runs to be exactly comparable.',
  },
  simulated: {
    term: 'SIMULATED',
    short: 'Computed by this application from documented educational coefficients.',
    long: 'Not measured from any real model or provider. The numbers are chosen so the relationships between stages are instructive; the absolute values are illustrative.',
  },
  measured: {
    term: 'MEASURED',
    short: 'A real timing taken with a real clock during this session.',
    long: 'These come from the browser and the local backend using actual timers. They are real measurements of this machine, which is not the same as measuring a production AI provider.',
  },
  nlp: {
    term: 'NLP',
    short: 'Natural Language Processing — the whole field of getting computers to work with human language.',
    long: 'It covers tokenization, classification, named entity recognition, translation, summarisation, question answering, speech-related language tasks and text generation. Large language models are one modern approach within the field, not the whole of it.',
  },
  llm: {
    term: 'LLM',
    short: 'Large Language Model — a large neural network trained to predict text.',
    long: 'One family of models within NLP. Very capable and very general, but also far more expensive per request than the task-specific models many production systems still use.',
  },
}

export type GlossaryKey = keyof typeof GLOSSARY
