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
| three                             | MIT        | 3D renderer                            |
| @react-three/fiber                | MIT        | React bindings for three.js            |
| @react-three/drei                 | MIT        | 3D helpers (OrbitControls, Html)       |
| zod                               | MIT        | Runtime validation of API and LLM JSON |
| @google/genai                     | Apache-2.0 | Gemini API client (server-side only)   |
| @supabase/supabase-js             | MIT        | Optional Postgres store client         |
| nanoid                            | MIT        | IDs                                    |

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

| Asset             | Licence                   | Source                      |
| ----------------- | ------------------------- | --------------------------- |
| Geist, Geist Mono | SIL Open Font Licence 1.1 | `next/font/google` (Vercel) |

## Body model

| Asset                    | Licence        | Notes                                                                                                                                                                                                                                                                      |
| ------------------------ | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/models/body.glb` | CC0 (intended) | Not added yet. Export from unmodified official MakeHuman using its own assets only (see BUILD_PLAN.md §9.6). Record the exact export and any Blender steps here in the same PR that adds the file. If a different CC0/CC-BY humanoid is used, name it and link the source. |

## LLM providers

| Provider      | Terms                     | Notes                                                                                                             |
| ------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Google Gemini | Google API / Gemini terms | In-product summarisation and question selection, called only from server routes. Model name lives in `LLM_MODEL`. |

## AI tools used (planning and code)

| Tool               | Used for                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| Cursor             | In-editor agent for repo setup and Face tickets                                                             |
| Claude (Anthropic) | Research and planning of BUILD_PLAN.md / agent kits (not called at runtime unless `LLM_PROVIDER=anthropic`) |

## Still to add when they land

- Demo video music or footage
- Any extra fonts, icons or 3D textures
- Arabic copy reviewer credit (Ahmed) when AR strings ship
