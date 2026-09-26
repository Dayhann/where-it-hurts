# Where It Hurts

A pre-consult web check-in. After a patient books a phone consult they open a link, mark their pain on a 3D body, and answer a short adaptive chat. Fixed rules screen for red flags. The booked clinician gets a 20-second, quote-traceable summary panel.

This is a hackathon prototype. **It is not clinical guidance, not a medical device, and not a diagnosis tool.** It never diagnoses, advises or reassures. Demo data is **synthetic only** — never paste real patient information into the app, fixtures, prompts or logs.

## How "map" is used

- The patient **shows** where it hurts on a 3D body map instead of describing it in words.
- The engine **maps** everyday patient words onto clinical terms, with every summary line linked back to an exact quote.

## How to run

```bash
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
# paste GEMINI_API_KEY into .env.local if you will use live mode
npm run dev
```

| Mode    | Command / env                            | What it does                                                 |
| ------- | ---------------------------------------- | ------------------------------------------------------------ |
| Mock UI | `NEXT_PUBLIC_USE_MOCKS=true npm run dev` | Face (Engineer A) builds against `src/mocks` with no backend |
| Replay  | `LLM_MODE=replay npm run dev`            | Uses cached LLM responses, no network (demo / e2e)           |
| Live    | `LLM_MODE=live` plus `GEMINI_API_KEY`    | Real Gemini calls from server routes only                    |

Other scripts: `npm run typecheck`, `npm run lint`, `npm test`, `npm run eval` (B-11), `npx playwright test`.

## Team

- Engineer A (Face) — UI, 3D body map, clinic panel. Agent: `face-builder`.
- Engineer B (Brain) — engine, red flags, LLM, storage. Agent: `brain-builder`. GitHub: [KostaToulantas](https://github.com/KostaToulantas).

See `BUILD_PLAN.md` for tickets, contracts and the safety design. See `ATTRIBUTION.md` for licences and AI tools used.
