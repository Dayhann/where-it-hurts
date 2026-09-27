# Attribution

Every library, model, font, icon, media asset and AI tool used in this project. Required by the hackathon brief and `BUILD_PLAN.md` §12.

This prototype is **not clinical guidance**.

## Application libraries

| Package                           | Licence    | Role                                   |
| --------------------------------- | ---------- | -------------------------------------- |
| next                              | MIT        | App framework                          |
| react, react-dom                  | MIT        | UI                                     |
| typescript                        | Apache-2.0 | Types                                  |
| tailwindcss, @tailwindcss/postcss | MIT        | Styling                                |
| shadcn                            | MIT        | UI kit                                 |
| @base-ui/react                    | MIT        | shadcn primitives                      |
| class-variance-authority          | Apache-2.0 | Component variants                     |
| cn                                | MIT        | className helper (shadcn)              |
| lucide-react                      | ISC        | Icons                                  |
| tw-animate-css                    | MIT        | CSS animations                         |
| motion                            | MIT        | Springs for Rare UI components         |
| three                             | MIT        | 3D renderer                            |
| @react-three/fiber                | MIT        | React bindings for three.js            |
| @react-three/drei                 | MIT        | 3D helpers (OrbitControls, Html)       |
| zod                               | MIT        | Runtime validation of API and LLM JSON |
| @google/genai                     | Apache-2.0 | Gemini API client (server-side only)   |
| @supabase/supabase-js             | MIT        | Optional Postgres store client         |
| nanoid                            | MIT        | IDs                                    |

## Copied UI components

| Component                                                                                                                                                                                                                                       | Licence                                      | Source and notes                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hook Sidebar, Animated Counter, Fluid Orb, Matrix Orb, Grid Reveal                                                                                                                                                                              | MIT + Commons Clause + Attribution (Rare UI) | [Rare UI](https://rareui.com) by Swami Malode ([swamimalode07/rare-ui](https://github.com/swamimalode07/rare-ui)). Copied unchanged into `src/components/ui/` (Animated Counter is lightly adapted), notice kept in each file. Visible credit link on the home page. The patient masthead wash in `HeroFluid.tsx` is the Fluid Orb fragment shader, unmasked and tinted forest green. |
| Typing Indicator, Segmented Control, Copy Button, Skeleton Swap, Text Reveal, Loading Button, Task Steps, Streaming Text, Press Depth, Ripple, Slider Detents, Hold to Confirm, New Items Pill, Value Flash, Live Activity, Accordion, Dropdown | MIT (interior.dev)                           | [interior.dev](https://www.interior.dev) by ozzy ([ddoemonn/interior](https://github.com/ddoemonn/interior)). Copied unchanged into `src/components/interior/`; size and colour are set from the call site. MIT licence text in `src/components/interior/LICENSE`.                                                                                                                    |

## Tooling

| Package                                                   | Licence    | Role                  |
| --------------------------------------------------------- | ---------- | --------------------- |
| eslint, eslint-config-next, eslint-config-prettier        | MIT        | Lint                  |
| prettier                                                  | MIT        | Format                |
| husky                                                     | MIT        | Git hooks             |
| lint-staged                                               | MIT        | Pre-commit formatting |
| vitest                                                    | MIT        | Unit tests            |
| @vitejs/plugin-react                                      | MIT        | Vitest JSX transform  |
| @playwright/test                                          | Apache-2.0 | End-to-end tests      |
| @types/node, @types/react, @types/react-dom, @types/three | MIT        | TypeScript types      |

## Fonts

| Asset       | Licence                   | Source                                                      |
| ----------- | ------------------------- | ----------------------------------------------------------- |
| Inter Tight | SIL Open Font Licence 1.1 | `next/font/google` (Rasmus Andersson). UI and heading face. |
| Petrona     | SIL Open Font Licence 1.1 | `next/font/google` (Ringo Kattestaart). Home display line.  |
| Geist Mono  | SIL Open Font Licence 1.1 | `next/font/google` (Vercel)                                 |

## Body model

| Asset                    | Licence | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/models/body.glb` | CC0 1.0 | MakeHuman hm08 base mesh (`makehuman/data/3dobjs/base.obj`, [makehumancommunity/makehuman@3c701a8](https://github.com/makehumancommunity/makehuman/blob/3c701a8e52f09e69922e8b598d23be2d7dfc49e3/makehuman/data/3dobjs/base.obj)), released as CC0 in September 2020 by Data Collection AB, Joel Palmius and Jonas Hauquier. Converted by `scripts/build-body-glb.mjs`: kept the skin and eyeballs, dropped helper geometry, triangulated, scaled to 1.7 m, smooth normals. No other changes to the shape. The skin is split into the 35 selectable regions using only the CC0 `joint-*` marker groups inside `base.obj`. MakeHuman's rig weights file (`default_weights.mhw`, AGPL-3) is not used. |

## LLM providers

| Provider      | Terms                     | Notes                                                                                                             |
| ------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Google Gemini | Google API / Gemini terms | In-product summarisation and question selection, called only from server routes. Model name lives in `LLM_MODEL`. |

## AI tools used (planning and code)

| Tool                | Used for                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| Cursor              | In-editor agent for repo setup and Face tickets                                                             |
| emilkowalski/skills | Design-engineering and animation guidance applied to Face UI polish                                         |
| Claude (Anthropic)  | Research and planning of BUILD_PLAN.md / agent kits (not called at runtime unless `LLM_PROVIDER=anthropic`) |

## Still to add when they land

- Demo video music or footage
- Any extra fonts, icons or 3D textures
- Arabic copy reviewer credit (Ahmed) when AR strings ship
