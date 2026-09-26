# Where It Hurts: Build Plan (2 engineers, 3 AI agents)

> **One-line product:** a website link sent after a patient books a phone consult. They mark their pain on a 3D body, answer "What's the issue?", and an AI asks 5–8 adaptive follow-up questions from a clinician-approved list. A rule-based red-flag check runs on every answer. The doctor gets a 20-second side panel next to their (mock) practice software, where every summary line links back to the patient's own words.

Companion docs: `pain-body-map-plan-v2.md` (the why) · `ideabrowser-style-brief.md` (the market).

---

## 0. How to use this plan

1. **Both engineers read §1–§6 before writing any code** (about 20 min).
2. Do **§16 "First 90 minutes" together**, on one screen. It sets up the repo, the contracts and the mocks that make parallel work conflict-free.
3. Then split: **Engineer A** works through the `A-xx` tickets, **Engineer B** through `B-xx`. Shared tickets are `S-xx`.
4. Meet at each **integration checkpoint** (§7). Don't skip them.

**Assumptions (change these if they're wrong):**

| Assumption                                 | If different                                                     |
| ------------------------------------------ | ---------------------------------------------------------------- |
| ~24 hours of build time                    | 12h: use the cut list in §14. 36–48h: add the "stretch" tickets. |
| Both engineers can write TypeScript/React  | If B is Python-only, see the §3 note on a FastAPI backend.       |
| You have an LLM API key (Claude or Gemini) | Without one: run the entire demo on scripted mode (§9.10).       |
| No real patient data, ever                 | Synthetic patients only. Say so in the video and the README.     |

---

## 1. What we're building (MVP scope)

### The core loop (must work end-to-end in the demo)

1. **Reception or clinic** creates a check-in for an appointment, which gives a patient link.
2. **The patient** opens the link on their phone and sees a **3D body plus "What's the issue?"**
3. The patient marks the pain (and where it spreads) and types or says their answer.
4. **The engine:**
   - runs the red-flag rules,
   - uses the LLM to extract facts, each with an exact quote,
   - picks the next question from the question bank,
   - repeats 5–8 times.
5. **Red flag found →** the chat stops, the patient sees "call 000", and reception sees a red alert.
6. **The patient sees a plain-language recap**, edits it if needed, and confirms.
7. **The doctor** opens the mock practice-software screen and clicks "Start consult". The side panel slides in with:
   - red-flag banner
   - 3-line summary (tap a line to see the quote)
   - body map snapshot
   - "Not asked" and "Unsure" lists
   - "Clarify on the call"
   - transcript
   - "Copy to notes" and "Flag inaccuracy"

### BUILD / MOCK / OUT

| BUILD (really works)                          | MOCK (declared in video)                       | OUT (future)                                              |
| --------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------- |
| 3D body map + marks + snapshot                | Practice software screen (Best Practice-style) | Real Best Practice / MedicalDirector / HotDoc integration |
| Adaptive chat (question bank + LLM selection) | SMS link sending (just show the link)          | TGA pathway, clinical pilot                               |
| Rule-based red flags + stop screen            | Booking system                                 | More body regions beyond musculoskeletal                  |
| Quote-traceable clinician summary             | Reception alert (in-app only)                  | Auth / multi-clinic accounts                              |
| Patient recap + confirm                       |                                                |                                                           |
| Doctor side panel + copy to notes             |                                                |                                                           |
| Voice input + 1 extra language (Arabic)       |                                                |                                                           |
| Eval harness: 20 vignettes + metrics          |                                                |                                                           |

---

## 2. Team split at a glance

|              | **Engineer A: "Face"**                                                                             | **Engineer B: "Brain"**                                                                |
| ------------ | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Owns         | Everything the user **sees**                                                                       | Everything that **decides**                                                            |
| Patient side | 3D body map, chat UI, voice, recap, red-flag stop screen                                           | Conversation engine, question bank, LLM calls, red-flag rules                          |
| Doctor side  | Mock practice-software screen, side panel, reception queue                                         | Summary generation, quote validator, storage, API routes                               |
| Quality      | Playwright end-to-end test of the demo flow                                                        | Unit tests, 20-vignette eval harness, metrics report                                   |
| Folders      | `src/app/(patient)`, `src/app/(clinic)`, `src/components/**`, `src/lib/api-client/**`, `public/**` | `src/app/api/**`, `src/server/**`, `src/mocks/**`, `data/**`, `tests/**`, `reports/**` |
| AI agent     | `face-builder`                                                                                     | `brain-builder`                                                                        |
| Shared       | `src/contracts/**` (both approve), README, ATTRIBUTION, video                                      | same                                                                                   |

**The third agent, `safety-reviewer`,** is shared. Either engineer runs it before merging any PR. It checks contracts, tests, red-flag coverage, privacy and attribution, and only writes reports and tests.

**Why this split works:**

- The two halves touch **different folders**, so git conflicts are almost impossible.
- They meet at **one typed contract** (`src/contracts`).
- **Mocks let A build the full UI** before B's engine exists.

---

## 3. Tech stack

| Layer      | Choice                                                                                   | Why                                                                                                    | Licence                               |
| ---------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| App        | **Next.js (App Router) + TypeScript**                                                    | One repo, one deploy; front and back share types, so contract breaks are compile errors, not demo bugs | MIT                                   |
| UI         | Tailwind CSS + shadcn/ui                                                                 | Fast, polished, consistent                                                                             | MIT                                   |
| 3D         | three.js + @react-three/fiber + @react-three/drei                                        | Declarative 3D in React; click → exact hit point                                                       | MIT                                   |
| Body model | **MakeHuman** export (official app, built-in assets only) → Blender → `.glb`             | Exports from unmodified MakeHuman using its own assets are CC0 [MakeHuman licence]                     | CC0 (see conditions)                  |
| Validation | Zod                                                                                      | Runtime check of API payloads and LLM JSON                                                             | MIT                                   |
| LLM        | Claude API **or** Gemini API, behind `LlmProvider`                                       | Swappable; whichever you have credits for                                                              | Provider terms: record in ATTRIBUTION |
| Storage    | `MemoryStore` (dev/tests) + Supabase Postgres free tier (deployed) behind `SessionStore` | Serverless needs a persistent store; interface keeps it swappable                                      | Apache-2.0 client                     |
| Voice      | Browser Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`)                 | No key, no cost; feature-detect and hide the mic if unsupported                                        | Browser                               |
| Tests      | Vitest (unit) + Playwright (end-to-end)                                                  | Fast; Playwright can record the demo flow                                                              | MIT / Apache-2.0                      |
| Deploy     | Vercel (Hobby)                                                                           | Zero-config for Next.js                                                                                | Check ToS                             |
| CI         | GitHub Actions                                                                           | Typecheck + lint + tests on every PR                                                                   | —                                     |

> **Python option:** if B is much stronger in Python, B can build `/server` as FastAPI with Pydantic models mirroring `src/contracts`. The cost is two deploys, plus keeping two type definitions in sync by hand. **Recommended only if B isn't comfortable in TypeScript.**

---

## 4. Repo structure and ownership

```
where-it-hurts/
├── CLAUDE.md                     # shared rules for AI agents (SHARED)
├── .claude/agents/               # face-builder.md, brain-builder.md, safety-reviewer.md (SHARED)
├── .github/
│   ├── CODEOWNERS                # enforces ownership below
│   ├── pull_request_template.md
│   └── workflows/ci.yml
├── README.md  ATTRIBUTION.md  .env.example   # SHARED
├── public/
│   └── models/body.glb           # A
├── data/
│   ├── question-bank.json        # B (content reviewed by both)
│   ├── red-flag-rules.json       # B
│   └── i18n/ar.json              # B (question text), A (UI strings in src/components/i18n)
├── src/
│   ├── contracts/                # SHARED: types.ts, schemas.ts, api.ts, regions.ts
│   ├── app/
│   │   ├── (patient)/checkin/[sessionId]/page.tsx   # A
│   │   ├── (clinic)/clinic/page.tsx                 # A (mock practice software + side panel)
│   │   ├── (clinic)/reception/page.tsx              # A
│   │   ├── page.tsx                                 # A (landing/demo launcher)
│   │   └── api/                                     # B (all route handlers)
│   ├── components/               # A: body-map/, chat/, recap/, doctor-panel/, ui/
│   ├── lib/api-client/           # A: typed fetch wrapper + mock switch
│   ├── mocks/                    # B: fixtures A builds against
│   └── server/                   # B: engine/, llm/, redflags/, summary/, store/
├── tests/                        # B (+ safety-reviewer adds tests)
│   ├── unit/  vignettes/  e2e/   # e2e/ is A's
└── reports/eval.md               # generated by the eval harness
```

**`.github/CODEOWNERS`** (replace with your GitHub usernames):

```
/src/app/api/        @engineerB
/src/server/         @engineerB
/src/mocks/          @engineerB
/data/               @engineerB
/tests/unit/         @engineerB
/tests/vignettes/    @engineerB
/src/components/     @engineerA
/src/app/(patient)/  @engineerA
/src/app/(clinic)/   @engineerA
/src/lib/api-client/ @engineerA
/public/             @engineerA
/tests/e2e/          @engineerA
/src/contracts/      @engineerA @engineerB
```

---

## 5. The contracts (write these together in the first 90 minutes, then freeze)

`src/contracts/types.ts`:

```ts
export type Lang = 'en' | 'ar';

export type SocratesSlot =
  | 'site'
  | 'onset'
  | 'character'
  | 'radiation'
  | 'associated'
  | 'timing'
  | 'exacerbating'
  | 'relieving'
  | 'severity'
  | 'meds_tried';

export type RegionId = string; // defined in regions.ts, e.g. 'lower_back_left', 'thigh_back_left'

export interface BodyMark {
  id: string;
  regionId: RegionId;
  point: [number, number, number]; // model-space hit point
  kind: 'pain' | 'spread';
  intensity?: number; // 0–10
  createdAt: string;
}

export interface Message {
  id: string;
  role: 'patient' | 'assistant';
  text: string; // as shown to the patient (their language)
  textEn?: string; // English version for processing (if lang !== 'en')
  questionId?: string; // for assistant messages
  choiceId?: string; // if the patient tapped an option
  inputMode?: 'text' | 'voice' | 'choice';
  createdAt: string;
}

export type FactStatus = 'answered' | 'unsure' | 'denied';
export interface SlotFact {
  slot: SocratesSlot;
  value: string; // short plain-English value, e.g. "worse when sitting"
  status: FactStatus;
  sourceMessageIds: string[]; // must point to patient messages
  quote: string; // exact substring of a source message
}

export interface QuestionOption {
  id: string;
  label: Record<Lang, string>;
}
export interface Question {
  id: string; // e.g. 'Q_EXAC_SIT_STAND'
  slot: SocratesSlot | 'redflag';
  kind: 'open' | 'single' | 'multi' | 'scale' | 'bodymap';
  text: Record<Lang, string>;
  options?: QuestionOption[]; // always includes 'not_sure' + 'something_else' for closed questions
  mandatory?: boolean; // red-flag questions
  appliesTo?: string[]; // region groups, e.g. ['back']
}

export interface RedFlagHit {
  ruleId: string;
  label: string;
  sourceMessageId: string;
}

export type SessionStatus =
  'in_progress' | 'redflag_stopped' | 'awaiting_confirm' | 'confirmed';

export interface Session {
  id: string;
  appointment: {
    patientDisplayName: string;
    clinician: string;
    startsAt: string;
  };
  lang: Lang;
  carerMode: boolean;
  status: SessionStatus;
  marks: BodyMark[];
  messages: Message[];
  facts: SlotFact[];
  askedQuestionIds: string[];
  redFlags: RedFlagHit[];
  bodySnapshots?: { front?: string; back?: string }; // PNG data URLs
  createdAt: string;
}

export interface SummaryLine {
  text: string; // clinical wording, e.g. "Left lower back pain radiating to posterior left thigh"
  slot: SocratesSlot;
  sourceMessageIds: string[];
  quotes: string[]; // the exact patient words shown on tap
  verified: boolean; // validator passed
}

export interface ClinicianSummary {
  sessionId: string;
  redFlags: RedFlagHit[];
  headline: string[]; // max 3 lines (SummaryLine.text of top 3)
  lines: SummaryLine[];
  notAsked: SocratesSlot[];
  unsure: SocratesSlot[];
  clarify: string[]; // 1–3 prompts for the call
  aiLabel: 'AI-drafted from patient answers. Verify before use.';
  generatedAt: string;
}

export interface PatientRecapLine {
  text: string;
  slot: SocratesSlot;
  editable: true;
}

export type AssistantTurn =
  | {
      type: 'question';
      message: Message;
      question: Question;
      progress: { asked: number; estimatedTotal: number };
    }
  | { type: 'redflag_stop'; hits: RedFlagHit[] }
  | { type: 'done' }; // go to recap
```

`src/contracts/api.ts` (REST endpoints; B implements them, A calls them via `lib/api-client`):

| Method & path                     | Body                                                 | Returns                                                                                              |
| --------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `POST /api/sessions`              | `{ appointment, lang, carerMode }`                   | `{ session, firstTurn: AssistantTurn }`                                                              |
| `GET /api/sessions/:id`           | —                                                    | `{ session }`                                                                                        |
| `PUT /api/sessions/:id/marks`     | `{ marks: BodyMark[], snapshots?: {front?, back?} }` | `{ ok: true }`                                                                                       |
| `POST /api/sessions/:id/messages` | `{ text, choiceId?, inputMode }`                     | `{ turn: AssistantTurn, session }`                                                                   |
| `GET /api/sessions/:id/recap`     | —                                                    | `{ lines: PatientRecapLine[] }`                                                                      |
| `POST /api/sessions/:id/confirm`  | `{ edits?: {slot, text}[] }`                         | `{ ok: true }`                                                                                       |
| `GET /api/sessions/:id/summary`   | —                                                    | `{ summary: ClinicianSummary }`                                                                      |
| `POST /api/sessions/:id/feedback` | `{ lineIndex, note }`                                | `{ ok: true }`                                                                                       |
| `GET /api/clinic/queue`           | —                                                    | `{ items: {sessionId, patientDisplayName, startsAt, status, redFlag: boolean}[] }` (red flags first) |

`src/contracts/schemas.ts` holds **Zod schemas for every type above**. B validates all inputs and outputs with them; A's api-client parses responses with them.

`src/contracts/regions.ts` holds about 30 region IDs, human labels (EN/AR), a region group (`back`, `neck`, `shoulder`, `hip`, `knee`, `ankle`…), and **anchor points** (model-space coordinates, filled in by A's calibration tool, §9.6).

**Freeze rule:** after the first 90 minutes, contracts only change through the protocol in §6.4.

---

## 6. How we avoid conflicts

### 6.1 Ten rules

1. **Stay in your folders** (§4). CODEOWNERS makes the other person a required reviewer if you cross the line.
2. **Contracts first, then mocks, then code.** A never waits for B: A builds against `src/mocks` fixtures, with `NEXT_PUBLIC_USE_MOCKS=true`.
3. **Small PRs, merged often:** at least every 2–3 hours, under ~400 lines where possible.
4. **Short-lived branches** named `a/<ticket>-<slug>` or `b/<ticket>-<slug>`, e.g. `a/A-03-body-map-marks`.
5. **Rebase on `main` before every push:** `git fetch && git rebase origin/main`.
6. **Squash-merge only.** `main` is protected: CI must pass, and 1 approval (the other engineer, or the safety-reviewer report pasted into the PR when the other person is heads-down).
7. **Dependencies:** add all expected packages in the first 90 minutes. Later additions get announced in chat and merged in their own tiny PR. **Never hand-merge `package-lock.json`.** On conflict, take `main`'s version and re-run `npm install`.
8. **Formatting can't conflict:** Prettier and ESLint are set up in hour 1, format-on-save is on, and `npm run format` runs before each commit (husky + lint-staged).
9. **Secrets:** `.env.local` is never committed. Keep `.env.example` up to date.
10. **Talk before touching shared files:** `src/contracts/**`, `CLAUDE.md`, `.claude/agents/**`, `README.md`, `ATTRIBUTION.md`.

### 6.2 Daily git commands

```bash
# start a ticket
git checkout main && git pull
git checkout -b b/B-04-redflag-rules

# work, commit small
git add -p && git commit -m "feat(redflags): saddle anaesthesia + bladder rules with tests"

# before pushing
git fetch && git rebase origin/main
npm run typecheck && npm run lint && npm test
git push -u origin HEAD
# open PR -> run safety-reviewer -> paste its report -> squash merge
```

### 6.3 PR template (`.github/pull_request_template.md`)

```
## Ticket
A-xx / B-xx / S-xx

## What changed
-

## Contract impact
[ ] none   [ ] contracts changed (link to contract PR)

## Checks
[ ] typecheck/lint/tests pass   [ ] safety-reviewer report attached
[ ] no real patient data   [ ] new deps/assets added to ATTRIBUTION.md
```

### 6.4 Contract change protocol (the only way shared types change)

1. Post in team chat: _"Need `SummaryLine.confidence?: number` for X."_
2. The requester opens a PR touching **only** `src/contracts/**` (plus `src/mocks/**` if fixtures need updating), titled `contracts: …`.
3. The other engineer reviews within 15 minutes. **Additive changes (new optional fields) are fast-tracked. Renames and removals need a call.**
4. Merge, then **both rebase immediately.**

### 6.5 Sync rhythm

- **Check-ins every 3 hours (10 min):** what's merged, what's blocked, any contract needs.
- **Integration checkpoints** (§7): both switch mocks off and run the flow together.
- **One shared "Demo board"** (GitHub Projects or a checklist issue) listing every ticket, with owner and status.

---

## 7. Timeline (24h version)

`H` = hours from start. ⏸ = integration checkpoint (both together).

| Phase                           | Hours   | Engineer A (Face)                                                                                                         | Engineer B (Brain)                                                                                               | Together                                                           |
| ------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **0. Setup**                    | H0–H1.5 |                                                                                                                           |                                                                                                                  | S-01 repo · S-02 contracts · S-03 mocks · S-04 CI · S-05 agents    |
| **1. Core loop (mocked joins)** | H1.5–H7 | A-01 layout & design tokens · A-02 3D body viewer · A-03 marks + calibration · A-04 chat UI                               | B-01 store · B-02 question bank · B-03 engine · B-04 red-flag rules · B-05 LLM provider + extract                |                                                                    |
| ⏸ **Integration 1**             | H7      | Mocks off: one full patient conversation hits the real API                                                                |                                                                                                                  | Fix contract mismatches now                                        |
| **2. Summary + doctor**         | H7–H13  | A-05 red-flag stop screen · A-06 recap & confirm · A-07 mock practice-software screen + side panel · A-08 reception queue | B-06 next-question selection · B-07 summary + quote validator · B-08 recap generator · B-09 remaining API routes |                                                                    |
| ⏸ **Integration 2**             | H13     | Doctor panel shows a real summary from a real chat                                                                        |                                                                                                                  | Record a rough screen capture as a backup                          |
| **3. Trust, access, evidence**  | H13–H18 | A-09 snapshots + tap-to-quote · A-10 voice input · A-11 Arabic UI + carer mode · A-12 Playwright e2e                      | B-10 translation path · B-11 20 vignettes + eval harness · B-12 scripted demo mode · B-13 deploy                 | S-06 role-play timing test (with a med/physio student if possible) |
| 🧊 **Feature freeze**           | H18     | Bug fixes and polish only                                                                                                 | Bug fixes and polish only                                                                                        |                                                                    |
| **4. Ship**                     | H18–H22 | A-13 polish pass + screenshots                                                                                            | B-14 eval report + README tech section                                                                           | S-07 video · S-08 submission                                       |
| **Buffer**                      | H22–H24 |                                                                                                                           |                                                                                                                  | Re-record, re-deploy, submit early                                 |

**Sleep:** this timeline assumes working straight through. If you need sleep, take staggered 3-hour blocks during Phase 3 and drop Phase 3 items from the §14 cut list (Arabic, then voice) to make room. Never move the H18 feature freeze or the Integration 2 backup recording.

---

## 8. Tickets (acceptance criteria = definition of done)

### Shared (S)

- **S-01 Repo & tooling (H0–0.5)**
  ```bash
  npx create-next-app@latest where-it-hurts --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
  cd where-it-hurts
  npx shadcn@latest init
  npm i three @react-three/fiber @react-three/drei zod @supabase/supabase-js nanoid
  npm i -D @types/three vitest @vitejs/plugin-react @playwright/test prettier husky lint-staged
  # plus ONE of: npm i @anthropic-ai/sdk   |   npm i @google/genai
  ```
  - ✅ Protected `main`, CODEOWNERS, PR template, `.env.example`, Prettier config, scripts: `dev`, `typecheck`, `lint`, `test`, `eval`, `format`.
- **S-02 Contracts (H0.5–1.0):** write §5 verbatim, plus Zod schemas. ✅ `npm run typecheck` passes.
- **S-03 Mocks (H1.0–1.25), written by B, reviewed by A:**
  - `src/mocks/` holds: a session in progress, a red-flag session, a confirmed session with a full `ClinicianSummary`, and a `mockApi` implementing every endpoint in memory with a 300 ms delay.
  - ✅ A can click through the whole flow with mocks.
- **S-04 CI (H1.25):** `.github/workflows/ci.yml` runs `npm ci`, typecheck, lint and `vitest run`. ✅ Green on `main`.
- **S-05 Agents (H1.25–1.5):** copy `CLAUDE.md` and `.claude/agents/*` from this kit. ✅ Both engineers run each agent once.
- **S-06 Timing test (H14–H17):**
  - Role-play 6 consults, 3 with the panel and 3 without, using vignette scripts.
  - Time how long until the doctor knows _where, what and how long_, and count repeated questions.
  - ✅ Numbers in `reports/eval.md`.
- **S-07 Video (H18–H21):** see §13. ✅ Rendered, within the length limit, with captions.
- **S-08 Submission (H21–H22):** see §12 checklist. ✅ Submitted with at least 1 hour spare.

### Engineer A (Face)

- **A-01 Layout & tokens (H1.5–2.5):**
  - Calm palette, large type (patient pages start at 18px), `max-w-md` mobile layout, landing page with 3 demo buttons: _Start patient check-in_, _Open clinic view_, _Open reception_.
  - ✅ Looks good at 375px wide.
- **A-02 3D body viewer (H2.5–4.5):**
  - Load `public/models/body.glb` with `useGLTF`.
  - `OrbitControls` limited to horizontal rotation (clamp polar angle).
  - Big buttons: **Front / Back / Left / Right**, so nobody has to drag.
  - Soft lighting, neutral material.
  - ✅ 60fps on a mid-range phone; loads in under 3 s on 4G. Decimate the mesh in Blender to about 30–60k triangles.
  - **Timebox: if the 3D isn't solid by H5, switch to the 2D SVG front/back fallback (A-02b) and move on.**
- **A-02b 2D fallback (only if needed):** SVG front/back outlines, each region a `<path id={regionId}>`. ✅ Same `BodyMark` output.
- **A-03 Marks + calibration mode (H4.5–6):**
  - On mesh `onClick`, use `e.point` to find the nearest anchor in `regions.ts`, giving the `regionId`.
  - Render the mark as a small sphere (pain = red, spread = orange).
  - "Spread" mode: tap a second point, draw a dashed line or arrow from the pain mark.
  - Undo and clear buttons, plus an intensity slider on the selected mark.
  - **Calibration mode (`?calibrate=1`):** clicking logs `{point}` to the console so you can fill region anchors in 20 minutes.
  - ✅ Marks persist via `PUT /marks`.
- **A-04 Chat UI (H6–7):**
  - Message list, typing indicator, and quick-reply chips from `question.options`, always including **Not sure** and **Something else**.
  - Free text always allowed.
  - Progress text: "Question 3 of about 7".
  - The body map stays visible (collapsed to a thumbnail on mobile once the chat starts).
  - ✅ Works end-to-end on mocks.
- **A-05 Red-flag stop screen (H7–8):**
  - Full-screen, calm but unmistakable: "Please call **000** or go to your nearest emergency department now. Your clinic has been notified."
  - A `tel:000` button; no further input.
  - ✅ Triggered by `turn.type === 'redflag_stop'`.
- **A-06 Recap & confirm (H8–9.5):**
  - Plain-language lines from `/recap`, each editable inline; "Looks right, send to my doctor" button; thank-you screen.
  - ✅ Edits are sent in `/confirm`.
- **A-07 Mock practice software + side panel (H9.5–12):**
  - `/clinic` looks like a generic practice-management screen: patient list on the left, consult notes area in the middle. Don't copy Best Practice's branding; make it generic.
  - "Start consult" slides in a right-hand panel (420px) with, in order:
    1. **Red-flag banner** (red) or "No red flags reported" (grey)
    2. **Headline**, 3 lines
    3. **Body map snapshot** (front/back toggle)
    4. **Not asked · Unsure** chips
    5. **Clarify on the call** list
    6. **Transcript** (collapsed)
    7. Footer: **Copy to notes** · **Flag inaccuracy** · AI label
  - ✅ Readable in 20 seconds (test it on someone new).
- **A-08 Reception queue (H12–13):** `/reception` lists today's check-ins, red flags pinned to the top in red, status chips, and polls every 5 s. ✅ A red-flag session appears within 5 s.
- **A-09 Snapshots + tap-to-quote (H13–14.5):**
  - Snapshots: `<Canvas gl={{ preserveDrawingBuffer: true }}>`; on "Done marking", set the camera to front, render, `toDataURL('image/png')`, then do the same for back, and send in `PUT /marks`.
  - Tap-to-quote: a popover on each summary line showing `quotes[]` and "from the patient's message at 9:42". Unverified lines get an amber "Unverified" tag.
  - ✅ Works in the doctor panel.
- **A-10 Voice input (H14.5–15.5):**
  - Feature-detect `window.SpeechRecognition || window.webkitSpeechRecognition`; hide the mic if missing.
  - `lang = 'en-AU' | 'ar'`; interim results shown in the input box; the patient must press send (no auto-send).
  - ✅ `inputMode: 'voice'` is sent.
- **A-11 Arabic + carer mode (H15.5–16.5):**
  - Language toggle at the start; `dir="rtl"` for Arabic; UI strings in `components/i18n`.
  - Carer toggle: "I'm answering for someone else" changes the pronouns in UI copy.
  - ✅ The full flow works in Arabic.
- **A-12 Playwright e2e (H16.5–18):** script the demo scenario (back pain → 6 questions → recap → confirm → clinic panel) and a red-flag scenario. ✅ Both pass against scripted demo mode.
- **A-13 Polish + screenshots (H18–20):** empty states, loading skeletons, focus rings, 44px tap targets, favicon, OG image; capture 6 screenshots for the submission. ✅ Screenshots saved in `/docs/images`.

### Engineer B (Brain)

- **B-01 Store (H1.5–2.5):**
  - `SessionStore` interface: `create`, `get`, `update`, `listQueue`.
  - `MemoryStore` for dev and tests; `SupabaseStore` storing one `sessions` table with a `data jsonb` column plus indexed `status` and `starts_at`.
  - Chosen via `STORE=memory|supabase`.
  - ✅ Unit tests on `MemoryStore`.
- **B-02 Question bank (H2.5–3.5):**
  - `data/question-bank.json`, about 22 questions covering all SOCRATES slots plus the mandatory red-flag questions (§9.1), with EN and AR text.
  - ✅ Validated by Zod at build time.
  - **Content check:** ask a nursing, medical or physio student to sanity-read the questions if you can.
- **B-03 Conversation engine (H3.5–5):** state machine per §9.2: `handlePatientMessage(session, input) → { session, turn }`. ✅ Unit tests for each transition, including the "done" and 8-question cap.
- **B-04 Red-flag rules (H5–6):**
  - `data/red-flag-rules.json` plus `server/redflags/check.ts`: keyword/regex rules on every patient message, **plus** answers to mandatory questions (§9.5).
  - Runs **before** any LLM call.
  - ✅ 100% of red-flag test phrases trigger, 0 false positives on the 20 benign vignette phrases.
- **B-05 LLM provider + extraction (H6–7):**
  - `LlmProvider.completeJson(prompt, schema)` with temperature 0, a timeout (8 s), 1 retry, and Zod-validated output.
  - EXTRACT prompt (§9.3).
  - **Quote guard:** drop any fact whose `quote` isn't a substring (normalised) of a patient message.
  - ✅ Unit tests with a fake provider.
- **B-06 Next-question selection (H7–8.5):**
  - Deterministic filter builds the candidate questions, the LLM SELECT prompt picks one, and a fallback priority order is used if the LLM fails or picks an invalid ID.
  - ✅ It never asks an already-answered slot and never invents a question.
- **B-07 Summary + quote validator (H8.5–10.5):**
  - SUMMARISE prompt returns `SummaryLine[]` with `sourceMessageIds`.
  - The validator checks that each ID exists, belongs to a patient message and contains the quote; otherwise `verified=false`.
  - Headline = top 3 verified lines. `notAsked` = slots with no fact (computed, not by the LLM). `unsure` = facts with status `unsure`.
  - ✅ Zero verified lines without a matching quote across all vignettes.
- **B-08 Recap generator (H10.5–11.5):** plain-language, second-person lines from facts ("You said the pain is worse when sitting…"). ✅ No clinical jargon in the recap (test against a small banned-words list).
- **B-09 Remaining API routes (H11.5–13):** everything in §5, validated with Zod, returning `400` with a message on bad input. ✅ Mocks and real API return identical shapes (contract test).
- **B-10 Translation path (H13–14):**
  - If `lang !== 'en'`, translate the patient message to English (`textEn`) before extraction.
  - Quotes are validated against the **original** text, and the doctor panel shows the original plus the English.
  - ✅ The Arabic vignette passes.
- **B-11 Vignettes + eval harness (H14–16.5):**
  - 20 JSON vignettes in `tests/vignettes/`: 15 benign musculoskeletal, 5 red flag.
  - Each has scripted patient answers keyed by `questionId`, a default answer for unexpected questions, ground-truth facts and the expected red flag.
  - `npm run eval` runs every vignette through the real engine and writes `reports/eval.md` (§10.2).
  - ✅ The report is generated and its numbers go in the video.
- **B-12 Scripted demo mode (H16.5–17.5):**
  - `LLM_MODE=live|record|replay`. `record` saves every LLM request/response to `data/llm-cache/<hash>.json`; `replay` serves from the cache (no network).
  - ✅ The demo scenario runs fully offline in replay.
- **B-13 Deploy (H17.5–18):**
  - Vercel project, env vars set, Supabase table created (SQL in README), `STORE=supabase`.
  - ✅ The public URL runs the demo in replay mode, with live mode behind a toggle.
- **B-14 Eval report + README tech section (H18–20):** architecture diagram, how the safety works, how to run the eval. ✅ Merged.

**Stretch (only if ahead):** clinic feedback accuracy dashboard · print/PDF of the summary · neck/shoulder/knee question packs · a light "reset" of the region anchors for a second body model.

---

## 9. Implementation details

### 9.1 Question bank: shape and starter set

```json
[
  {
    "id": "Q_OPEN",
    "slot": "site",
    "kind": "open",
    "text": {
      "en": "What's the issue? Tell us in your own words.",
      "ar": "..."
    }
  },
  {
    "id": "Q_ONSET",
    "slot": "onset",
    "kind": "single",
    "text": { "en": "When did it start?" },
    "options": [
      { "id": "today", "label": { "en": "Today" } },
      { "id": "days", "label": { "en": "A few days ago" } },
      { "id": "weeks", "label": { "en": "A few weeks ago" } },
      { "id": "months", "label": { "en": "Months or longer" } },
      { "id": "not_sure", "label": { "en": "Not sure" } },
      { "id": "something_else", "label": { "en": "Something else" } }
    ]
  },
  {
    "id": "Q_CHAR",
    "slot": "character",
    "kind": "multi",
    "text": { "en": "Which words fit how it feels? Pick any." },
    "options": [
      "aching",
      "sharp/stabbing",
      "burning",
      "pins and needles",
      "throbbing",
      "pulling",
      "not_sure",
      "something_else"
    ]
  },
  {
    "id": "Q_RAD",
    "slot": "radiation",
    "kind": "bodymap",
    "text": {
      "en": "Does it stay in one place or travel anywhere? You can mark it on the body."
    }
  },
  {
    "id": "Q_EXAC_OPEN",
    "slot": "exacerbating",
    "kind": "open",
    "text": { "en": "What makes it worse?" }
  },
  {
    "id": "Q_EXAC_SIT_STAND",
    "slot": "exacerbating",
    "kind": "single",
    "appliesTo": ["back"],
    "text": { "en": "Is it worse when you're sitting, standing, or neither?" },
    "options": [
      "sitting",
      "standing",
      "both",
      "neither",
      "not_sure",
      "something_else"
    ]
  },
  {
    "id": "Q_RELIEF",
    "slot": "relieving",
    "kind": "open",
    "text": { "en": "Does anything make it better?" }
  },
  {
    "id": "Q_TIMING",
    "slot": "timing",
    "kind": "single",
    "text": { "en": "Is it there all the time, or does it come and go?" },
    "options": [
      "constant",
      "comes_and_goes",
      "worse_mornings",
      "worse_nights",
      "not_sure",
      "something_else"
    ]
  },
  {
    "id": "Q_SEV",
    "slot": "severity",
    "kind": "scale",
    "text": { "en": "On a scale of 0 to 10, how bad is it at its worst?" }
  },
  {
    "id": "Q_ASSOC",
    "slot": "associated",
    "kind": "open",
    "text": {
      "en": "Have you noticed anything else with it, like numbness, weakness, swelling or fever?"
    }
  },
  {
    "id": "Q_MEDS",
    "slot": "meds_tried",
    "kind": "open",
    "text": { "en": "Have you taken or tried anything for it?" }
  },

  {
    "id": "RF_SADDLE",
    "slot": "redflag",
    "kind": "single",
    "mandatory": true,
    "appliesTo": ["back"],
    "text": { "en": "Any numbness around your bottom, groin or inner thighs?" },
    "options": ["yes", "no", "not_sure"]
  },
  {
    "id": "RF_BLADDER",
    "slot": "redflag",
    "kind": "single",
    "mandatory": true,
    "appliesTo": ["back"],
    "text": {
      "en": "Any new trouble controlling your bladder or bowels, or trouble passing urine?"
    },
    "options": ["yes", "no", "not_sure"]
  },
  {
    "id": "RF_BILAT_WEAK",
    "slot": "redflag",
    "kind": "single",
    "mandatory": true,
    "appliesTo": ["back"],
    "text": { "en": "Any new weakness in both legs?" },
    "options": ["yes", "no", "not_sure"]
  },
  {
    "id": "RF_FEVER_TRAUMA",
    "slot": "redflag",
    "kind": "multi",
    "mandatory": true,
    "text": { "en": "Do any of these apply? Pick any." },
    "options": [
      "fever",
      "recent_fall_or_injury",
      "history_of_cancer",
      "unexplained_weight_loss",
      "none",
      "not_sure"
    ]
  }
]
```

_(Options are shown as IDs to save space. In the real file each option has `{id, label:{en, ar}}`.)_
**Rule:** a `yes` or `not_sure` on a mandatory red-flag question triggers the stop, erring on the side of safety.
⚠️ The red-flag list is a starting point for a demo, **not clinical guidance**. Say this in the README.

### 9.2 Conversation engine (pseudocode)

```text
handlePatientMessage(session, input):
  msg = appendPatientMessage(session, input)                 # store original text
  if session.lang != 'en': msg.textEn = translate(msg.text)  # B-10

  # 1. SAFETY FIRST — deterministic, no LLM
  hits = redflags.check(msg, lastQuestion(session))
  if hits: session.status = 'redflag_stopped'; save; return {type:'redflag_stop', hits}

  # 2. EXTRACT facts (LLM) -> quote guard
  facts = llm.extract(msg, session.facts, lastQuestion(session))
  facts = facts.filter(f => isSubstring(normalise(f.quote), normalise(msg.text or msg.textEn)))
  merge(session.facts, facts)                                # newer fact for same slot wins; keep both quotes

  # 3. DONE?
  if requiredSlotsFilled(session) and mandatoryRedFlagsAsked(session): -> done
  if patientQuestionsAsked(session) >= 8 and mandatoryRedFlagsAsked(session): -> done

  # 4. PICK NEXT QUESTION
  due = mandatoryRedFlagQuestionDue(session)                 # e.g. after question 2 once region group known
  if due: q = due
  else:
    candidates = bank.filter(q => !answered(q.slot) && !asked(q.id) && applies(q, regionGroups(session.marks)))
    q = llm.select(candidates, session) ?? fallbackPriority(candidates)
  append assistant message; save
  return {type:'question', question:q, progress:{asked, estimatedTotal: 7}}

requiredSlots = [site, onset, character, radiation, exacerbating, timing, severity]
fallbackPriority = site > onset > character > radiation > severity > exacerbating > timing > associated > relieving > meds_tried
```

Region groups come from `marks` (e.g. any `lower_back_*` → `back`). If there are no marks yet, the first follow-up is the body-map prompt.

### 9.3 LLM prompts (keep them in `src/server/llm/prompts/*.ts`)

**Shared system prompt:**

```
You help collect a patient's pain history before a booked GP/physio consult.
You NEVER diagnose, suggest conditions, give medical advice, or reassure.
You only (a) extract what the patient said, (b) choose the next question from a given list, or (c) reword the patient's own statements into concise clinical language.
Return ONLY JSON matching the schema. If unsure, say so in the JSON (status "unsure") rather than guessing.
```

**EXTRACT** (input: last question, patient message, current facts):

```
From PATIENT_MESSAGE, extract facts for these slots: site, onset, character, radiation, associated, timing, exacerbating, relieving, severity, meds_tried.
For each fact return {slot, value, status, quote}.
- quote MUST be copied exactly from PATIENT_MESSAGE (a substring, no paraphrase).
- status: "answered", "unsure" (patient said not sure / don't know), or "denied" (patient said no).
- Do not infer facts the patient didn't state.
```

**SELECT** (input: candidate questions `[{id, slot, text}]`, facts so far, region groups):

```
Choose the ONE candidate question id that would most help a clinician understand this pain next.
Prefer questions that clarify vague or missing key details. Never choose a slot already answered.
Return {"questionId": "<one of the candidate ids>", "reason": "<max 12 words>"}.
```

**SUMMARISE** (input: messages with IDs, facts):

```
Write up to 6 lines of concise clinical history in standard terminology (e.g. "radiating to posterior left thigh", "aggravated by sitting").
Each line: {text, slot, sourceMessageIds, quotes}. quotes must be exact substrings of the cited patient messages.
Do not add anything not supported by a quote. No diagnoses, no differential, no advice.
Also return up to 3 "clarify" prompts: things the clinician may want to confirm because the patient was vague or unsure.
```

### 9.4 Quote validator (`src/server/summary/validate.ts`)

```ts
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[“”"']/g, '')
    .trim();
export function verifyLine(line: SummaryLine, msgs: Message[]): SummaryLine {
  const patient = new Map(
    msgs.filter((m) => m.role === 'patient').map((m) => [m.id, m]),
  );
  const ok =
    line.sourceMessageIds.length > 0 &&
    line.quotes.length > 0 &&
    line.quotes.every((q) =>
      line.sourceMessageIds.some((id) => {
        const m = patient.get(id);
        if (!m) return false;
        return (
          norm(m.text).includes(norm(q)) ||
          (!!m.textEn && norm(m.textEn).includes(norm(q)))
        );
      }),
    );
  return { ...line, verified: ok };
}
```

Tapped option chips count as patient messages whose `text` is the option label. The validator therefore works for both typed and tapped answers.

### 9.5 Red-flag rules (`data/red-flag-rules.json`)

```json
[
  {
    "id": "RF_CAUDA_SADDLE",
    "label": "Possible saddle anaesthesia",
    "allOf": [
      ["numb", "no feeling", "can't feel", "pins and needles"],
      ["groin", "bottom", "bum", "buttock", "private", "inner thigh", "saddle"]
    ]
  },
  {
    "id": "RF_CAUDA_BLADDER",
    "label": "New bladder/bowel dysfunction",
    "anyOf": [
      "can't pee",
      "cannot urinate",
      "wet myself",
      "lost control of my bladder",
      "bowel control",
      "incontinen"
    ]
  },
  {
    "id": "RF_BILATERAL",
    "label": "Bilateral leg weakness",
    "allOf": [["both legs"], ["weak", "giving way", "can't walk"]]
  },
  {
    "id": "RF_CHEST",
    "label": "Chest pain",
    "anyOf": ["chest pain", "pain in my chest", "tight chest"]
  },
  {
    "id": "RF_BREATH",
    "label": "Breathing difficulty",
    "anyOf": ["can't breathe", "short of breath", "struggling to breathe"]
  },
  {
    "id": "RF_MANDATORY_YES",
    "label": "Positive answer to a mandatory red-flag question",
    "questionAnswer": {
      "questionIds": ["RF_SADDLE", "RF_BLADDER", "RF_BILAT_WEAK"],
      "choiceIds": ["yes", "not_sure"]
    }
  },
  {
    "id": "RF_SYSTEMIC",
    "label": "Systemic / trauma flag",
    "questionAnswer": {
      "questionIds": ["RF_FEVER_TRAUMA"],
      "choiceIds": [
        "fever",
        "recent_fall_or_injury",
        "history_of_cancer",
        "unexplained_weight_loss",
        "not_sure"
      ]
    }
  }
]
```

- Matching is case-insensitive on the original text **and** `textEn`.
- Add Arabic keyword lists for the Arabic demo.
- **Tests:** at least 3 positive phrasings and 3 near-miss negatives per rule (e.g. "numb toes" alone must not trigger saddle).

### 9.6 3D body map: step by step

1. **Model:** install the official MakeHuman app → default human, neutral pose, **no third-party assets** (keeps CC0) → export `.obj`/`.fbx` → Blender: apply a neutral grey material, decimate to about 40k triangles, export `.glb` (Draco optional) → `public/models/body.glb`. _(If this takes more than 45 min, use any CC0/CC-BY humanoid and record it in ATTRIBUTION.)_
2. **Viewer:** `<Canvas camera={{position:[0,1,3], fov:35}} gl={{preserveDrawingBuffer:true}}>` + `useGLTF` + `<OrbitControls enablePan={false} minPolarAngle={Math.PI/2} maxPolarAngle={Math.PI/2} />`.
3. **Calibration (`?calibrate=1`):** `onClick={(e)=>console.log(JSON.stringify(e.point.toArray()))}`. Click the centre of each of about 30 regions and paste the results into `regions.ts` anchors.
4. **Region lookup:** nearest anchor by Euclidean distance. Ignore clicks more than about 0.25 units from any anchor.
5. **Marks:** `<mesh position={p}><sphereGeometry args={[0.02]} /><meshStandardMaterial color="red" /></mesh>`. For spread, use a drei `<Line>` between points, dashed and orange.
6. **Camera presets:** Front/Back/Left/Right buttons animate the camera azimuth with a small lerp.
7. **Snapshot:** on "Done", set the front preset, wait 2 frames, `gl.domElement.toDataURL('image/png')`, then the back preset and the same again.

### 9.7 Doctor side panel spec (what "readable in 20 seconds" means)

- **Top:** red banner "RED FLAG: possible saddle anaesthesia (patient said: 'numb around my bum')" or a grey "No red flags reported".
- **Headline:** 3 lines max, 15px semibold. Each line is tappable to show the quote.
- **Body snapshot** at 160px, front/back toggle.
- **Chip rows:** `Not asked: relieving, meds` · `Unsure: onset`.
- **Clarify on the call:** a numbered list (at most 3).
- **Footer:** `Copy to notes` (writes formatted text into the mock notes textarea and the clipboard) · `Flag inaccuracy` · the AI label in small grey text.
- **Copy-to-notes format:**

```
Pre-consult check-in (AI-drafted, patient-confirmed 9:44am):
- L lower back pain radiating to posterior L thigh; aggravated by sitting. 6/10 at worst.
- Onset ~3 weeks. Intermittent.
Red flags screened: saddle numbness – no; bladder/bowel – no; bilateral weakness – no.
Not asked: relieving factors.
```

### 9.8 Voice and language

- Voice is **input only**. The patient sees and edits the transcript before sending; nothing auto-sends.
- Arabic: UI strings live in A's i18n file, question text in B's `question-bank.json`. Ahmed can translate and check both.

### 9.9 Storage

Supabase SQL (put it in the README):

```sql
create table sessions (
  id text primary key,
  status text not null,
  starts_at timestamptz,
  red_flag boolean default false,
  data jsonb not null,
  created_at timestamptz default now()
);
create index on sessions (red_flag desc, starts_at);
```

- Access Supabase **only from server routes**, using the service key from env.
- No patient-identifying fields beyond a made-up display name.

### 9.10 Demo reliability: record and replay

- `LLM_MODE=record`: run the demo script once, which saves every prompt and response.
- `LLM_MODE=replay`: the demo runs with **no network** and the same outputs every time.
- **Record the video in replay mode.** Show one live-mode moment separately if the network is good, and label it honestly.

---

## 10. Testing and evidence

### 10.1 Test layers

| Layer            | Owner | What                                                                              |
| ---------------- | ----- | --------------------------------------------------------------------------------- |
| Unit (Vitest)    | B     | red-flag rules, quote validator, engine transitions, store, prompt output parsing |
| Contract         | B     | mock API vs real API return the same Zod-valid shapes                             |
| Eval (vignettes) | B     | 20 scripted patients through the real engine                                      |
| E2E (Playwright) | A     | demo scenario + red-flag scenario, in replay mode                                 |
| Human            | S     | 6 role-play consults (timing test) + one "20-second read" test with a stranger    |

### 10.2 Eval metrics (`reports/eval.md`, used in the pitch)

| Metric                                          | Target                     |
| ----------------------------------------------- | -------------------------- |
| Red-flag recall (5 red-flag vignettes)          | **100%**                   |
| Red-flag false alarms (15 benign)               | 0–1                        |
| Slot accuracy (extracted facts vs ground truth) | ≥ 85%                      |
| Verified summary lines with no matching quote   | **0** (by construction)    |
| Unverified lines shown as "Unverified"          | 100%                       |
| Avg questions asked                             | 5–8                        |
| Time to "where/what/how long" (role-play)       | with panel < without panel |

---

## 11. Deployment and environment

`.env.example`:

```
NEXT_PUBLIC_USE_MOCKS=false
STORE=memory                 # memory | supabase
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
LLM_PROVIDER=anthropic       # anthropic | gemini
LLM_MODEL=                   # set to a current model name from your provider's docs
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
LLM_MODE=live                # live | record | replay
```

- Vercel: import the repo, set env vars, and deploy `main` automatically. Preview deploys per PR are a free integration test.
- Keep API keys **server-side only** (no `NEXT_PUBLIC_` prefix).

---

## 12. Submission checklist (from the hackathon brief)

- [ ] **ATTRIBUTION.md:** every library + licence, the body model + licence, the LLM provider(s), fonts/icons, video music/footage, and **AI tools used** (the in-product LLM _and_ Claude used for research and planning).
- [ ] **Public repo** with a README covering:
  - what it is, and the problem with sources
  - how "map" is used (the body map, plus mapping patient words to clinical terms)
  - architecture diagram
  - safety design
  - how to run (mock / replay / live)
  - eval results
  - "not clinical guidance" disclaimer
  - team
- [ ] **Images:** 6 screenshots (patient body map, chat, recap, red-flag stop, doctor panel, reception) plus 1 architecture diagram.
- [ ] **Video:** pitch + working demo, within the length limit (§13).
- [ ] Deployed URL in the README (replay mode by default).
- [ ] Submit at least 1 hour early.

---

## 13. Demo video script (~3 min; scale to the limit)

| Time      | Shot                                                                                                                                                | Say                                                                                                                |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 0:00–0:15 | Phone ringing, GP running late                                                                                                                      | "In a phone consult, your doctor can't see where it hurts, and on average they'll interrupt you after 11 seconds." |
| 0:15–0:30 | Title: **Where It Hurts**                                                                                                                           | "A pre-consult check-in that _maps_ your pain and maps your words into clinical language."                         |
| 0:30–1:15 | Patient phone: mark lower back → spread to leg → "my back's killing me when I drive" → 3 adaptive questions with "Not sure" chips → recap → confirm | "It starts with your words, then asks only what matters, from a clinician-approved list."                          |
| 1:15–1:45 | Clinic screen: Start consult → panel slides in → tap a line to show the quote → Copy to notes                                                       | "Twenty seconds to read. Every line links back to what the patient actually said."                                 |
| 1:45–2:05 | Second patient: "numb around my bum" → stop screen → red row in reception                                                                           | "Safety isn't left to the AI. Fixed rules check every answer."                                                     |
| 2:05–2:30 | `reports/eval.md` numbers                                                                                                                           | "20 test patients: 100% of red flags caught, 0 unsupported summary lines…"                                         |
| 2:30–2:50 | Mocked vs real slide                                                                                                                                | "The practice software is mocked; here's what's real, and what's next."                                            |
| 2:50–3:00 | Team + URL                                                                                                                                          | —                                                                                                                  |

---

## 14. Risks, fallbacks and the cut list

| Risk                             | Early warning                 | Fallback                                                      |
| -------------------------------- | ----------------------------- | ------------------------------------------------------------- |
| 3D model or clicking is flaky    | Not solid by H5               | A-02b 2D SVG body (same `BodyMark` contract)                  |
| LLM slow, down or out of credits | p95 latency > 5 s             | Deterministic question order (engine fallback) + replay mode  |
| LLM returns bad JSON             | Zod parse failures            | 1 retry → fallback question; extraction skipped for that turn |
| Contracts drift                  | Integration 1 fails           | Contract test (B-09) + fix in a contracts PR, together        |
| Merge conflicts                  | Long-lived branches           | Rule: merge at least every 3h; rebase before push             |
| Voice not supported              | Feature-detect false          | Hide the mic; typing works                                    |
| Deploy breaks near the end       | Vercel error after H18        | Record from localhost in replay mode; deploy fix later        |
| Scope creep                      | Anything not in §8 before H18 | Park it on the "What's next" slide                            |

**Cut list (cut from the top first if behind):** stretch items → Arabic (keep EN) → voice → reception page (keep the doctor banner) → snapshots (show the live 3D thumbnail instead) → Supabase (demo from memory store locally).
**Never cut:** red-flag rules, the quote validator, the doctor panel, replay mode.

---

## 15. Definition of done (per ticket)

- Acceptance criteria met, typecheck, lint and tests green, safety-reviewer report attached.
- Works on a 375px phone viewport (A tickets).
- No real data; any new asset or dependency is in ATTRIBUTION.md.

---

## 16. First 90 minutes (do together, one screen)

- [ ] **0:00** Create the GitHub repo, protect `main`, add both engineers.
- [ ] **0:05** Run S-01 scaffold commands; commit.
- [ ] **0:20** Add Prettier + ESLint + husky/lint-staged; commit.
- [ ] **0:30** Write `src/contracts/types.ts`, `api.ts` and `regions.ts` (IDs and labels; anchors come later) + Zod schemas; commit.
- [ ] **0:60** B writes the `src/mocks` fixtures + `mockApi`; A writes the `lib/api-client` switch (`NEXT_PUBLIC_USE_MOCKS`); commit.
- [ ] **1:15** Add CI, CODEOWNERS, the PR template, `CLAUDE.md` and `.claude/agents/*`; commit.
- [ ] **1:25** Create the Demo board with every ticket from §8, each with an owner.
- [ ] **1:30** Split. A starts A-01, B starts B-01.

---

## Sources

- MakeHuman licence explanation: http://www.makehumancommunity.org/content/license_explanation.html
- Supporting research and competitor evidence: see `ideabrowser-style-brief.md` and `pain-body-map-plan-v2.md`.
