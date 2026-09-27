# SAFETY REVIEW — ux/spacing-and-visual-refresh (PR #55) — 2026-09-27 15:53 ACST

Reviewed squash `2129a13..08dc0de` on `main` (`08dc0de`). `origin/main` is the same commit, so `origin/main...HEAD` is empty.

Arabic header / RTL / threading `lang` through `PageShell` is **out of scope** (per review brief) and is not used to fail any item.

**Verdict: ⚠️ MERGE AFTER FIXES**

This squash is already on `main`. The a11y type-size failures should land in a follow-up Face PR before demo recording.

---

## Checklist

| #   | Item                   | Result   | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --- | ---------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Ownership              | **PASS** | 23 files. Feature changes are Face (`src/components/**`, `src/app/(patient)/**`, `src/app/page.tsx`). `src/app/layout.tsx` and `src/app/globals.css` are unlisted in CODEOWNERS but are UI chrome. Shared `ATTRIBUTION.md` only adds Inter Tight (required for the font change). No `src/contracts/**`, `src/server/**`, `src/app/api/**`, `data/**`. Branch was `ux/…` not `a/…` (process note only).                                                                                                                                                               |
| 2   | Contracts              | **N/A**  | No files under `src/contracts/` in the squash. PR body: contract impact none.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 3   | Build health           | **PASS** | `tsc --noEmit` clean. ESLint 0 errors / 1 pre-existing warning in `src/components/interior/skeleton-swap.tsx:109` (untouched). Vitest 25 files, 146 tests passed.                                                                                                                                                                                                                                                                                                                                                                                                    |
| 4   | Red flags              | **PASS** | Engine untouched. `checkRedFlags` still runs before extract at `src/server/engine/conversation.ts:212–226`. Prompts still forbid diagnosis/advice/reassurance; no safety logic moved into them. `data/red-flag-rules.json` unchanged; `tests/unit/redflags.test.ts` still has ≥3 positive and ≥3 negative cases per text rule, plus mandatory/systemic coverage. `mandatoryRemaining` still gates `done` (`conversation.ts:227–239`). UI: red-flag stop overlay retained (`CheckinSession.tsx:155–160`); clinic list alarm restored (`ClinicWorkspace.tsx:590–609`). |
| 5   | Traceability           | **PASS** | Quote guard still applied in `supported()` (`conversation.ts:96–104`) before facts merge (`:222`). `verifyLine` still maps every summary line (`src/server/summary/generate.ts:69–70`). `notAsked` / `unsure` still computed in code (`generate.ts:81–84`). Doctor panel still renders a visible `Unverified` tag (`DoctorPanel.tsx:72–75`) and separate Not asked / Unsure sections (`:352–370`).                                                                                                                                                                   |
| 6   | Clinical language      | **PASS** | Diff copy is instructional/greeting (`Good to see you,`, `Let's get started.`, `Tap where it hurts`, `Back to the body map`). Prototype disclaimer still says it does not diagnose, treat, or give medical advice (`patient.ts:24–26`). Red-flag copy unchanged: call 000 / go to ED (`patient.ts:133–137`). No “you have”, “it’s probably”, “don’t worry”, “you should take”, “nothing serious” in product copy. LLM prompts untouched and still ban diagnosis/advice/reassurance.                                                                                  |
| 7   | Privacy and secrets    | **PASS** | Synthetic names only (existing “Riverside Family Clinic”). No new fixtures, phones, emails, or health details. No API keys. `NEXT_PUBLIC_` still only `USE_MOCKS`. `.env.local` not in the squash or in git.                                                                                                                                                                                                                                                                                                                                                         |
| 8   | Attribution            | **PASS** | Inter Tight listed in `ATTRIBUTION.md` (SIL OFL 1.1, `next/font/google`). Geist Sans removed to match `src/app/layout.tsx`. No new npm packages. `lucide-react` already attributed. Cursor / Claude already listed under AI tools; PR notes Claude Code.                                                                                                                                                                                                                                                                                                             |
| 9   | Demo reliability       | **N/A**  | Not a demo-recording gate. Playwright not re-run in this review.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 10  | Mobile / accessibility | **FAIL** | Tap targets on patient primary controls are 46px (`button` `touch`/`lg`, body-map column, chips, bottom nav). `card-row` min-height 52px. Focus remains visible (`focus-visible:outline-2` on `button.tsx:6`). Patient `PageShell` still sets 18px (`PageShell.tsx:33`). **But** several patient-facing strings now render below the 16px floor because `type-body` is 14.5px (`globals.css:531–533`) and is used on patient chrome; Clear-all is 11px. RTL / Arabic / `PageShell` lang threading not scored (out of scope).                                         |

---

## Blocking

- [10] `src/app/globals.css:531-533` + `src/components/layout/AppHeader.tsx:57,66` — Patient greeting and date chip use `type-body` (14.5px / 18px line-height), below the 16px patient-page floor and the 18px+ product rule. `globals.css:529-530` even says patient body copy stays at 18px. **Fix (A):** do not apply `type-body` on patient chrome; inherit `PageShell` 18px (or add a patient type utility ≥18px).
- [10] `src/components/layout/StepCard.tsx:29` — Step name on every patient step card is `type-body` (14.5px). **Fix (A):** 18px.
- [10] `src/components/body-map/BodyViewer.tsx:481,499,517,530` — Front/Back/Left/Right/Undo labels are `text-[14.5px]`. These are primary marking controls on the patient phone screen. **Fix (A):** ≥16px (prefer 18px).
- [10] `src/components/body-map/BodyViewer.tsx:544` — Hold-to-clear is `text-[11px]! leading-[14px]!`. Destructive control, well under 16px. **Fix (A):** ≥16px; if the label overflows the narrow column, wrap or use an icon-plus-`sr-only` label, do not shrink the type.

---

## Non-blocking

- [10] `src/components/checkin/CheckinSession.tsx:293` — Session ID demoted to `text-xs` (12px). Intentional (it used to sit above the heading at 18px). Acceptable as support metadata; still below the letter of the 16px rule.
- [10] `src/components/layout/AppHeader.tsx:52` — “Recover” wordmark is `text-[0.8125rem]` (13px). Decorative, but the product name in the UI is now “Recover”, not “Where It Hurts”. `copy.home.wordmark` is unused.
- [10] Several patient actions dropped from `text-lg` (18px) to `text-base` (16px) — start, send, chips, “Next” (`StartCheckin.tsx:427`, `ChatComposer.tsx:45`, `BodyViewer.tsx:738`). Meets the 16px floor, misses CLAUDE.md 18px+.
- [5] `src/components/doctor-panel/DoctorPanel.tsx:73` — `Unverified` is still shown, but the amber warning chip became `bg-accent` / `text-accent-foreground` (light forest green on cream). Weaker as a “do not trust this line” signal. Prefer a non-red warning treatment that is still distinct from decorative accent.
- [4] `src/components/red-flag/RedFlagStop.tsx:30` — Stop heading is now `type-title text-destructive` (red serif-sized title). Copy is unchanged and still tells the patient to call 000. Calmer “Call 000” button retained. Worth a clinical eye; not a language or logic regression.
- [4] `src/components/doctor-panel/ClinicWorkspace.tsx:590-609` — Restored at-a-glance red-flag strip (good). Jump buttons are `min-h-[42px]`, 2px under 44px, on the clinic surface.
- [1] Branch was `ux/spacing-and-visual-refresh`, not `a/<ticket>-<slug>`.
- [1] Shared `ATTRIBUTION.md` edited outside a `contracts:` PR. Required for the font; fine this time.
- Face: `BottomNav` on every patient `PageShell` links Home / Clinic / Reception (`BottomNav.tsx:15-19`). Fine for the demo; a real patient should not be one tap from the mock clinic.
- Face: “Back to the body map” (`CheckinSession.tsx:300-311`) re-opens a writable map after questions have started. Facts/messages are not reset. Marks/snapshots can drift from already-extracted quotes. Prefer freeze, or clear/re-ask if marks change.
- Face: language picker is gone; `src/app/(patient)/layout.tsx:7` and `src/app/page.tsx:6` hardcode `patientCopy('en')`; `AppHeader` date is `en-AU`; Inter Tight loads `latin` only. **Not scored** (out of scope).
- Face: `checkinStep()` has no remaining caller (left in place because `steps.ts` is another owner’s file). `copy.checkin.backToQuestions` / `copy.body.showFull` unused.
- `npm run lint`: unused eslint-disable in `skeleton-swap.tsx:109`, pre-existing, not this squash.

---

## What this squash got right (safety-relevant)

- Mobile: `touch-action: pan-y !important` on the body canvas (`globals.css:399-400`) so the page can scroll to “Next” / “Done marking”.
- Body map is read-only once questions start (`body-canvas-locked` + `pointer-events: none` on the canvas, `BodyViewer.tsx:383-395`, `globals.css:407-409`).
- Clinic queue had lost a red-flag signal in `HookSidebar` plain strings; the new strip restores it.
- Session ID no longer leads the patient heading.
- Red is reserved for clinical alarm in the new tokens (`globals.css:64`).
- Quote-traceability UI, Not asked ≠ Unsure, and the red-flag stop overlay are intact.

---

## Commands run + results

```
git rev-parse HEAD origin/main
08dc0de610f676b23d16e8a89565ac9a40a520bf
08dc0de610f676b23d16e8a89565ac9a40a520bf

git diff --stat 2129a13..08dc0de
23 files changed, 1337 insertions(+), 540 deletions(-)

npm run typecheck
> tsc --noEmit
(exit 0)

npm run lint
> eslint .
0 errors, 1 warning (src/components/interior/skeleton-swap.tsx:109, unused eslint-disable; pre-existing)

npm test
> vitest run --passWithNoTests
Test Files  25 passed (25)
Tests       146 passed (146)
Duration    2.27s

LLM_MODE=replay npx playwright test
not run (item 9 N/A for this review)
```
