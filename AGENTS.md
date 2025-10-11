# Repository Guidelines

refer to the living document execplan.md

## Project Structure & Module Organization
- `index.tsx` boots the SPA and mounts `App.tsx` for routing between conversation, history, and quest flows.
- Feature views and shared widgets live under `components/`; icons stay in `components/icons/`.
- Route-specific logic sits in `src/routes/`, while cross-cutting utilities stay in `src/lib/`.
- Hooks covering Supabase auth, Gemini Live audio, and realtime state belong under `hooks/`, and Supabase helpers stay in `supabaseClient.ts`.
- Static media belongs in `img/` and `audio/`; deep-dive notes stay in `docs/implementation.md`; automation helpers live under `tests/` when added.

## Build, Test, and Development Commands
- `npm install` — install dependencies after cloning.
- `npm run dev` — launch the Vite dev server on http://localhost:3000.
- `npm run build` — create a production bundle.
- `npm run preview` — serve the built bundle for smoke checks.
- `npm run test` / `npm run test -- --coverage` — run Vitest with React Testing Library, optionally collecting v8 coverage.

## Coding Style & Naming Conventions
- Write TypeScript functional components with 2-space indents, single quotes, and explicit prop types for anything non-trivial.
- Name components in PascalCase (`ConversationView.tsx`), hooks with a `use*` prefix (`useGeminiLive`), and utilities in descriptive camelCase verbs.
- Favor Tailwind utility classes; extend `tailwind.config.js` rather than adding ad-hoc CSS.
- Import shared modules via the `@/` alias and keep side effects (Supabase, audio, realtime) confined to hooks.

## Testing Guidelines
- Use Vitest + React Testing Library; co-locate specs as `*.test.tsx` next to their sources (see `components/CharacterCreator.test.tsx`).
- Target edge cases around microphone permissions, persona lifecycle, quest persistence, and error flashes.
- Document manual browser checks (e.g., microphone prompts, Supabase auth flows) in PR descriptions until end-to-end coverage exists.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat: ...`, `fix: ...`, etc.) and keep each change scoped and revert-safe.
- PRs should include a concise summary, linked issues, environment variable callouts (such as `GEMINI_API_KEY`), screenshots for UI shifts, and the executed test plan.
- Note any Supabase schema or security-sensitive adjustments and coordinate rotations for exposed secrets.

## Security & Configuration Tips
- Store secrets in `.env`; Vite exposes approved keys via `import.meta.env`.
- Never commit transcripts, API tokens, or `localStorage` snapshots; scrub logs before sharing.
- Rotate or revoke any leaked keys immediately and confirm Supabase policies stay least-privilege.
