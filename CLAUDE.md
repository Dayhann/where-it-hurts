# Where It Hurts: project rules for AI agents and humans

**Read `BUILD_PLAN.md` §1–§6 before doing anything.** This file is the short version.

## Product in one line

A pre-consult web check-in: the patient marks pain on a 3D body and chats with an AI that picks questions from a clinician-approved bank. Fixed rules screen for red flags. The doctor gets a 20-second, quote-traceable summary panel.

## Non-negotiables

1. **No diagnosis, advice or reassurance** anywhere in the product or its prompts.
2. **Red-flag checks are deterministic** (`src/server/redflags`) and run **before** any LLM call. Never move safety logic into a prompt.
3. **Every clinician summary line must be traceable** to exact patient words (`verified` via `src/server/summary/validate.ts`). Unverified lines are shown as "Unverified", never hidden or silently kept.
4. **"Not asked" ≠ "Patient said no".** Keep these distinct in data and UI.
5. **Synthetic data only.** Never paste real patient information into code, fixtures, prompts or logs.
6. **API keys stay server-side.** Nothing secret gets a `NEXT_PUBLIC_` prefix.

## Ownership (do not edit outside your area)

| Area                                                                                                                                         | Owner                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `src/components/**`, `src/app/(patient)/**`, `src/app/(clinic)/**`, `src/app/page.tsx`, `src/lib/api-client/**`, `public/**`, `tests/e2e/**` | Engineer A / `face-builder`                                                |
| `src/app/api/**`, `src/server/**`, `src/mocks/**`, `data/**`, `tests/unit/**`, `tests/vignettes/**`, `reports/**`                            | Engineer B / `brain-builder`                                               |
| `src/contracts/**`, `CLAUDE.md`, `.claude/agents/**`, `README.md`, `ATTRIBUTION.md`, `package.json`                                          | **Shared**: change only via the contract change protocol (BUILD_PLAN §6.4) |

If a task needs a change in another owner's area, **stop and write a short request** (what, why, proposed diff) for the human to pass on. Don't make the edit.

## Contracts

- The types in `src/contracts/types.ts` and the Zod schemas in `src/contracts/schemas.ts` are the single source of truth.
- Validate every API input and output, and every LLM JSON output, with Zod.
- Mocks in `src/mocks/**` must always satisfy the same schemas.

## Git

- Branches: `a/<ticket>-<slug>` or `b/<ticket>-<slug>`. Small PRs, squash-merge, rebase on `origin/main` before pushing.
- Never hand-edit `package-lock.json` merge conflicts: take `main`'s version and re-run `npm install`.
- Before pushing, run: `npm run typecheck && npm run lint && npm test`.

## Commands

- `npm run dev`: app with the store and LLM per `.env.local`
- `NEXT_PUBLIC_USE_MOCKS=true npm run dev`: UI against mocks only
- `npm test`: Vitest unit tests
- `npm run eval`: 20-vignette evaluation → `reports/eval.md`
- `npx playwright test`: end-to-end tests (use `LLM_MODE=replay`)

## Style

- TypeScript strict. No `any` in contracts or server code.
- Patient-facing copy: plain language, second person, no medical jargon, 18px+ text.
- Clinician-facing copy: concise clinical terms, max 3 headline lines.
- Every new dependency, model, font, icon or media asset gets a line in `ATTRIBUTION.md` in the same PR.
