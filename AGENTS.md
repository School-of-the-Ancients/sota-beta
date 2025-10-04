# Repository Guidelines

## Project Structure & Module Organization
- `index.tsx` mounts the SPA and hands off to `App.tsx` for routing feature views like conversations and history.
- UI elements live in `components/` (PascalCase) with shared icons in `components/icons/`; keep cross-cutting helpers in `types.ts`, `constants.ts`, and `suggestions.ts`.
- Side-effectful logic goes into `hooks/` (e.g., `useGeminiLive.ts` for audio capture). Persist media in `img/` and `audio/`, long-form research in `docs/`, and automation or diagnostics under `tests/`.
- Store demos or throwaway scripts outside tracked folders; `implementation.md` houses research notes.

## Build, Test, and Development Commands
- `npm install` once per clone to sync dependencies.
- `npm run dev` starts Vite at http://localhost:3000 with hot reload.
- `npm run test` runs Vitest + React Testing Library; add `--coverage` when you need v8 coverage reports.
- `npm run build` emits the production bundle; `npm run preview` serves that build for smoke checks.

## Coding Style & Naming Conventions
- Write TypeScript functional components with 2-space indentation, single quotes, and explicit props typing where non-trivial.
- Name components with PascalCase (`ConversationPanel.tsx`), hooks with camelCase `use` prefixes, and utilities with camelCase verbs.
- Prefer hooks over classes; isolate side effects inside `useEffect` blocks.
- Lean on Tailwind utility classes; extend `tailwind.config` before adding CSS. Import shared modules via the `@/` alias.

## Testing Guidelines
- Co-locate specs next to sources using `*.test.tsx` or `*.test.ts`. `App.test.tsx` and `vitest.setup.ts` show current patterns.
- Cover microphone permissions, persona lifecycle edges, and error flashes before merging.
- Document manual verification (e.g., browser mic prompts) in PRs until automated coverage exists.

## Commit & Pull Request Guidelines
- Follow conventional commits like `feat: add Cleopatra persona artifacts`; keep each commit scoped and revert-safe.
- PRs must include a concise summary, related issues, environment variables touched (e.g., `GEMINI_API_KEY`), screenshots for UI shifts, and a test plan (commands + results).
- Flag follow-up work rather than bundling it; failing tests block merges.

## Security & Configuration Tips
- Store secrets in `.env`, never in Git. Vite exposes keys through `process.env`.
- Scrub `localStorage`, transcripts, and tokens before sharing logs or reproduction steps.
