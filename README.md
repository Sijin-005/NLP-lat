# NLPulse — Inside AI Response Time

An interactive laboratory for understanding **why an AI answer does not appear instantly**.

NLPulse follows a single request through the complete NLP/LLM pipeline — from a human pressing Send to the same human reading a response — and shows, stage by stage, where the milliseconds go.

It is built for teaching. Every stage is animated, every number is explained, and every value on screen is labelled either **SIMULATED** or **MEASURED** so the two are never confused.

---

## Quick start

Double-click **`.\start.bat`**, then type a question and press **Send**.

That is the whole procedure. The first run installs dependencies (a few minutes); after that it takes seconds. Two windows open, a browser opens at <http://localhost:5173>, and the app is ready.

To stop everything: **`stop.bat`**.

> **If Python is missing**, `start.bat` says so and starts the frontend anyway. The entire seminar — simulation, Seminar Mode, pipeline, charts, quiz — works without the backend.

---

## Asking a real model

The app opens on an **ask bar**. Type a question, press Send, and the pipeline
carries it to a **real model running locally via [Ollama](https://ollama.com)**
and back — every stage animated, every number a real measurement.

Ollama is a good fit for teaching because it reports its own internals, which
almost no hosted provider does. From one response NLPulse reads:

| Ollama field | Becomes | Provenance |
|---|---|---|
| `prompt_eval_duration` | Prompt Prefill | **measured** |
| `eval_duration` | Generation | **measured** |
| `prompt_eval_count` | Prompt tokens — from the model's **real tokenizer** | **measured** |
| `eval_count` | Output tokens | **measured** |
| `load_duration` | Model load / scheduling | **measured** |

Plus the browser's own clock for TTFT, total time and rendering.

**Switch models from the dropdown and watch TTFT move.** A 1B model against a
100B model on the same question is the single most convincing demonstration in
the whole application, and it is entirely real.

### Where the numbers come from

Each stage carries its own label, because no provider exposes everything:

- **measured** — a real clock produced it
- **derived** — computed from measured figures (e.g. the first token's cost is the mean decode step; Ollama does not time it separately)
- **not reported** — Ollama folds this stage into another, so no number is shown rather than one being invented

Transport and overhead is taken as the **residual**: the measured wall clock
minus everything the model reported. That way no measured value is ever scaled
or adjusted to make a chart look tidy, and the stages still sum exactly to the
real total. Anything the run could not measure is listed under *"What this run
could not measure"* in the explanation panel.

### No Ollama? Nothing breaks.

If Ollama is not running, the ask bar says **"no model · simulated"** and Send
runs the educational simulator instead, clearly labelled. The seminar is
unaffected — see *Offline reliability* below.

To add a model:

```bat
ollama pull llama3
```

---

## What NLP latency actually is

The central idea NLPulse exists to teach:

> **Latency is not one delay. It is the accumulated effect of many stages.**

A single request passes through all of this:

```
Human → Input Capture → Request Creation → Network Upload → Server Arrival
      → Queue/Scheduler → Tokenization → Prompt Prefill → FIRST TOKEN
      → Autoregressive Generation → Token Streaming → Return Path
      → Browser Rendering → Human sees the response
```

Roughly:

```
total perceived time =
      input & request overhead
    + network delay
    + queue delay
    + tokenization
    + prompt processing (prefill)
    + generation
    + return, streaming and rendering overhead
```

Two numbers matter, and they are **not** the same thing:

| Metric | What it measures | Why it matters |
|---|---|---|
| **TTFT** (Time To First Token) | Send → first visible output | How responsive the system *feels* |
| **Total completion time** | Send → complete response | How long the whole task takes |

With streaming on, a response can take 1.6 s to finish while the user starts reading at 260 ms. With streaming off, the screen stays blank for the full 1.6 s — identical computation, very different experience. NLPulse lets you toggle exactly that and watch it happen.

### Not every NLP system works this way

This matters and the app says so repeatedly. **NLP is a field; large language models are one approach within it.** Classification, sentiment analysis, named entity recognition and extractive question answering produce their answer in a *single forward pass*: no generation loop, no TTFT, no tokens per second. The **Learn → NLP is not one thing** panel lays this out task by task.

---

## Simulated vs measured

This distinction is enforced throughout the UI, not just documented here.

| Badge | Meaning |
|---|---|
| 🟠 **SIMULATED** | Computed by the app from documented coefficients in `frontend/src/simulation/simulationConfig.ts`. Chosen so the *relationships* between stages are instructive. **Not** a measurement of any real model, provider, GPU or network. |
| 🟢 **MEASURED** | A real timing from a real clock during this session — `performance.now()` in the browser, `time.perf_counter()` in the backend. Real measurements **of this machine**, which is not the same as measuring a production AI provider. |

Terminology is kept strict. Real Test reports a **browser → backend round trip**, and calls the remainder after subtracting server time **"transport and overhead"** — never "network latency", because it also contains the HTTP stack, serialisation and parsing. Likewise, the streaming test reports **time to first *chunk***, not TTFT, since a provider chunk may carry several tokens or a fraction of one.

---

## The three modes

### 🎓 Learn
Ten topic screens: the journey, tokens and the model, TTFT, why latency happens, NLP's real breadth, real-world examples, latency vs throughput, the network journey, the voice pipeline, and how delay is perceived.

### 🧪 Experiment
The dashboard. Change conditions, watch latency move:

| Control | Effect |
|---|---|
| **Network** (5 presets + custom 0–500 ms) | Both traversals; a bigger prompt also takes longer to upload |
| **Model size** (4 presets) | Per-token cost of prefill and decode |
| **Hardware** (CPU → accelerator) | Multiplies all model computation |
| **Server load** (5 presets) | Queue delay, on a `ρ/(1-ρ)` curve — non-linear on purpose |
| **Prompt length** (10–10,000 tokens) | Prefill, tokenization, upload size |
| **Output length** (10–1,000 tokens) | Generation time, streaming, rendering |
| **Streaming** on/off | When the user sees anything at all |
| **Cache** on/off | Skips most prefill for a repeated prefix — *not* all computation |
| **Batching** on/off | Relieves the queue, slightly slows each request's decode |
| **Deterministic mode** | Disables jitter so two runs are exactly comparable |
| **Where it runs** (cloud/local) | Replaces the network hop with loopback and removes the shared queue |

Plus eight demo presets and the headline experiment, **"Why is my AI slow?"**, which starts from a deliberately bad configuration and lets you remove one cause at a time.

### 📡 Real Test
Genuine measurements against the local backend: round trips with a per-sample distribution, and a real streamed HTTP response timed chunk by chunk. (Asking a real model happens from the ask bar at the top of Learn and Experiment.)

---

## Seminar Mode

Press **G**, or the header button. A thirteen-step guided presentation that **is** the talk:

1. What happens after you press Send?
2. First, it has to get there *(network)*
3. Text becomes tokens
4. Then it waits its turn *(queue)*
5. The model reads your prompt *(prefill)*
6. **⚡ This is the first token** — the animation freezes here
7. Now it writes, one token at a time
8. The complete response
9. So where did the time actually go?
10. What if the network gets slower? *(live experiment)*
11. What if the prompt goes from 100 to 10,000 tokens? *(live experiment)*
12. What if we move from CPU to an accelerator? *(live experiment)*
13. Closing: **fast AI is not just a fast model**

Steps 10–12 have a button that reruns the simulator and shows a before/after delta. Every number is generated live by the same engine the rest of the app uses — nothing is pre-recorded.

**Presenter notes** appear under each step and toggle with **N**, so the room never sees them on a mirrored display.

---

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Space` | Next seminar step (or play/pause elsewhere) |
| `←` `→` | Previous / next seminar step |
| `S` | Start or re-run the simulation |
| `P` | Pause or resume |
| `R` | Reset the current run |
| `F` | Toggle fullscreen |
| `C` | Toggle Compare mode |
| `G` | Toggle Seminar Mode |
| `N` | Toggle presenter notes |
| `Esc` | Leave Seminar, Compare, Quiz or Projector mode |

Shortcuts are ignored while typing in a field.

---

## How the simulator works

The engine (`frontend/src/simulation/simulationEngine.ts`) is a **pure function**: same input and seed, same result, every time. No randomness beyond a seeded PRNG (mulberry32), and Deterministic Mode switches jitter off entirely.

**The accounting rule.** Stage durations are mutually exclusive slices of the wall clock, so they sum *exactly* to the total. That is what makes the breakdown percentages trustworthy. Where real pipelines overlap — streaming happens *during* generation — only the extra framing cost is attributed to the streaming stage, and the waterfall draws the true overlapping spans separately, marking them.

The model, in outline:

```
networkUpload  = oneWay + connectionSetup + payloadBytes / bandwidth      + jitter
queue          = queueBase × ρ/(1-ρ) × modelWeight × hardwareOccupancy
                 (× batchRelief + batchWindow when batching is on)
tokenization   = fixed + promptTokens × perTokenCost
prefill        = promptTokens × (1 - cacheHitRatio) × modelPrefill × hardwareFactor
perTokenDecode = modelDecode × hardwareFactor × contextGrowth × batchPenalty
generation     = Σ per-token gaps for tokens 2..n
total          = Σ all stages
```

Notable details, all of which are deliberate teaching choices:

- **Queueing uses `ρ/(1-ρ)`** — the standard shape of a queueing delay curve. Going from 65% to 88% utilisation costs far more than going from 0% to 65%, and the Server Load control exists to make that visible.
- **Decode slows as context grows**, because each new token attends over everything before it.
- **The first decode step costs slightly more** than steady-state decode.
- **Caching reduces prefill, not all computation.** Every output token still costs a full decode step.
- **Batching is a genuine trade-off**: it relieves the queue and multiplies fleet throughput, while adding a batch-window wait and a small per-token decode penalty.
- **Per-token gaps vary.** Tokens do not arrive on a metronome, and the app does not pretend they do.

All coefficients live in `simulationConfig.ts` with a header explaining that they are order-of-magnitude educational parameters, not measurements.

### Playback speed

A 4-minute CPU simulation cannot take 4 real minutes on stage. The clock advances a *virtual* millisecond counter, and Auto playback scales it so a run lasts 4.5–12 seconds. **The reported timings never change** — only how fast the animation moves — and the current factor is always shown ("3.8× slow motion", "24× fast forward").

---

## Architecture

```
NLPulse/
├── start.bat / stop.bat          one-command launch and shutdown
├── frontend/
│   └── src/
│       ├── simulation/
│       │   ├── simulationConfig.ts   ← every coefficient, documented
│       │   ├── simulationEngine.ts   ← pure input → result function
│       │   ├── realRun.ts            ← REAL runs: Ollama → MEASURED result
│       │   ├── metrics.ts            ← waterfall, TTFT breakdown, comparison
│       │   ├── tokenizer.ts          ← illustrative token boundaries
│       │   ├── responseText.ts       ← sample passages to stream
│       │   └── types.ts
│       ├── state/
│       │   ├── appStore.ts           ← configuration and UI state
│       │   └── clockStore.ts         ← the 60 fps playback clock (kept separate)
│       ├── components/
│       │   ├── Pipeline/  TokenVisualizer/  ModelVisualizer/
│       │   ├── LatencyGauge/  Waterfall/  Charts/
│       │   ├── ExperimentControls/  SeminarMode/  Quiz/
│       │   ├── Compare/  RealTest/  Education/  Layout/  ui/
│       ├── data/
│       │   ├── educationalContent.ts  seminarScript.ts
│       │   ├── quizQuestions.ts  glossary.ts  presets.ts
│       └── hooks/
└── backend/
    ├── main.py                   FastAPI app + arrival-time middleware
    ├── routers/measure.py        HTTP layer for the measurement endpoints
    ├── routers/ollama.py         ← real local model: status + streaming chat
    ├── routers/provider.py       optional external model bridge
    ├── services/timing.py        the timing logic, framework-free
    ├── services/ollama.py        ← Ollama conversation + metric conversion
    └── models/schemas.py
```

**Why two stores?** The playback clock updates every animation frame. Keeping it apart from the main store means components subscribe with narrow selectors that return primitives, so a frame typically re-renders one node instead of the whole tree.

---

## Manual setup (if you prefer not to use `start.bat`)

**Backend** (optional):

```bat
cd backend
py -3 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**

```bat
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. The Vite dev server proxies `/api` to port 8000, so requests are same-origin and CORS never appears.

### VS Code

Open the `NLPulse` folder as the workspace root. Recommended extensions: **ESLint**, **Tailwind CSS IntelliSense**, **Python**. Select `backend/.venv/Scripts/python.exe` as the interpreter (`Ctrl+Shift+P` → *Python: Select Interpreter*) so imports resolve.

Useful commands:

```bat
cd frontend && npm run build     REM typecheck + production build
cd frontend && npm run preview   REM serve the production build
```

---

## Offline reliability

The seminar runs with the network cable out, once dependencies are installed.

- No fonts, scripts or stylesheets are loaded from a CDN at runtime. Typography uses a local system-font stack.
- The simulation is pure client-side computation with no external dependency.
- The backend binds to `127.0.0.1` and never calls out, unless an external provider is deliberately configured.
- Ollama also runs locally on `127.0.0.1`, so even real model runs need no internet.
- If the backend is unreachable, Real Test shows a clear message with the command to start it, and nothing else is affected.

---

## Optional: connecting a real model

**Not required, and not recommended for the seminar itself.** If you want Real Test to also report genuine TTFT from a real model, set these before starting the backend:

```bat
set NLPULSE_PROVIDER_BASE_URL=http://localhost:11434/v1
set NLPULSE_PROVIDER_MODEL=your-model-name
set NLPULSE_PROVIDER_API_KEY=optional-token
```

Any OpenAI-compatible chat-completions endpoint works, including a local server — so this need not break the offline promise. Keys are read from the environment only: never committed, never logged, never sent to the browser. With nothing configured, the panel simply reports "not configured" and offers no broken buttons.

---

## Demo script (about 20 minutes)

1. **Open cold.** Ask the room: *"why doesn't the answer appear instantly?"* Take three guesses and write them down. Then take a question **from the audience**, type it into the ask bar and press Send — the pipeline runs it against a real model in front of them.
2. **Press G.** Seminar Mode. Space through steps 1–5 — narrate, don't read the screen aloud.
3. **Step 6 — freeze.** Let it sit. This is the moment the session turns on. Read the TTFT out loud, point at the stacked bars: *none of this was the model being clever.*
4. **Steps 7–9.** Tokens stream; the waterfall and breakdown appear. Return to the guesses on the board.
5. **Steps 10–12.** Press each experiment button. Three variables, three different dominant stages.
6. **Step 13.** Closing slide.
7. **Esc → Experiment → "Why is my AI slow?"** Hand the controls to a student and let them fix it one cause at a time.
8. **Press C** for Compare if there is time, then **📝 Quiz** to close.

**The killer demo.** Ask the same question twice, switching the model dropdown from the 1B to the largest one. Same question, same machine, same network — and a completely different TTFT. Nothing in the session lands harder.

**Contingencies.** Ollama not running? The ask bar falls back to the simulator automatically and says so. Projector too dim? **📽 Projector** for maximum contrast. Running long? Skip to step 6 with `→`. Backend down? Skip Real Test — nothing else is affected. Animation too slow with a huge prompt? Playback is already on Auto; `4×` is one click away.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `start.bat` closes instantly | Run it from a terminal (`cmd /k start.bat`) to see the error. |
| Port 5173 already in use | Vite picks the next free port — check the frontend window for the real URL. |
| Port 8000 already in use | Run `stop.bat`, or `uvicorn main:app --port 8001` and update the proxy in `frontend/vite.config.ts`. |
| Real Test says "backend not reachable" | Expected if Python is missing. Everything else works; the panel shows the exact command to start it. |
| Ask bar says "no model · simulated" | Ollama is not running. Start it (`ollama serve`) and press *retry connection*. Send still works — it runs the simulator. |
| First real answer takes 20+ seconds | Cold start: Ollama is loading the model into memory. It shows up as **Model load** in the breakdown. Ask again and it collapses — which is itself worth showing the room. |
| A large model is very slow to answer | Expected — that is the lesson. Pick a smaller model from the dropdown for the rest of the session. |
| Blank page after `npm run dev` | Hard-refresh (`Ctrl+F5`). If it persists, delete `frontend/node_modules/.vite` and restart. |
| Animation stutters on the projector | Switch playback to `1×` or `4×`; Auto recalculates per run. Closing other apps helps more than any setting. |
| `npm install` fails behind a proxy | `npm config set registry <your mirror>`, or copy a working `node_modules` from another machine. |
| Text too small from the back | **📽 Projector**, then **F** for fullscreen. |

---

## Technical limitations

Stated plainly, because a teaching tool that overclaims is worse than useless.

1. **The simulated coefficients are educational, not empirical.** They are chosen so relationships between stages are correct and instructive. Real systems vary by orders of magnitude with architecture, quantisation, batch composition, kernel implementation, context length and interconnect. Never quote a NLPulse number as a fact about a real product.
2. **The tokenizer is illustrative.** Real vocabularies are learned from data and split text in ways that often look arbitrary. The app labels these boundaries as illustrative everywhere they appear.
3. **The inference visual is a diagram, not a model.** It shows the decode *loop*. It is not a rendering of a transformer, and does not depict attention heads, layer counts or weights.
4. **The queue model is a single-parameter approximation.** Real schedulers do continuous batching, preemption, priority tiers and admission control. `ρ/(1-ρ)` captures the shape of the curve, not any specific scheduler.
5. **Real Test and real model runs measure this machine.** A local model on one laptop is not a measurement of a production AI provider, and the UI says so. Local inference has no shared queue and no internet hop, so two stages that dominate real cloud systems are near zero here — the simulator is what covers those.
6. **Streaming measurements use scripted server delays.** The arrival times are genuinely measured; the delays being measured are set by sliders, not produced by a model.
7. **Perception bands are adjustable demonstration defaults**, not sourced universal thresholds. They are adjustable precisely so the point lands: acceptable latency is a property of the interaction, not a number that exists on its own.
8. **Provider chunks are not tokens.** A streamed chunk may contain several tokens or part of one, which is why the app says "chunks per second" when it is measuring chunks.
9. **The app models autoregressive generative inference.** Most of the NLP field does not work that way, and the *NLP is not one thing* panel exists to keep that in view.

---

## Success criteria

After the demonstration a student should be able to answer:

1. What is latency? · 2. Why does an NLP/AI system have latency? · 3. Where does it occur? · 4. What is TTFT? · 5. Why does prompt length matter? · 6. Why does output length matter? · 7. How does hardware affect inference? · 8. How does network communication affect cloud NLP? · 9. What is queue latency? · 10. Why are tokens generated progressively? · 11. What is tokens/sec? · 12. Latency vs throughput? · 13. Why isn't a fast model alone enough? · 14. How does a traditional NLP task differ from generative LLM inference?

The **📝 Quiz** covers all of these and explains every answer.
