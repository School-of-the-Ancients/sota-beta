# Repository Guidelines

## Project Structure & Module Organization
The React 19 SPA boots from `index.tsx`, while `App.tsx` wires the main views such as `ConversationView` and `HistoryView`. UI pieces live under `components/` (PascalCase filenames) with icons in `components/icons/`. Conversation seeds and shared constants sit in `constants.ts`; reusable types stay in `types.ts`; prompt templates are in `suggestions.ts`. Audio handling resides in `hooks/useGeminiLive.ts`, and static assets ship from `img/`. Keep new docs under `docs/` and place one-off exploration artifacts in `implementation.md`.

## Build, Test, and Development Commands
Install dependencies once with `npm install`. Use `npm run dev` to launch Vite at http://localhost:3000 for local work. Run `npm run build` to emit the production bundle in `dist/`, then `npm run preview` to sanity-check the build. Add a dedicated script if you introduce automated tests (Vitest + React Testing Library is the expected stack).

## Coding Style & Naming Conventions
Stick to TypeScript-first functional components, 2-space indentation, and single quotes. Prefer hooks over classes, isolating side effects in `useEffect`. Name components in PascalCase (`CharacterCreator.tsx`), hooks and helpers in camelCase (`useGeminiLive`), and access shared modules through the `@/` alias defined in `tsconfig.json`. Tailwind utility classes provide layout and spacing; extend the config before inventing bespoke class names.

## Testing Guidelines
There is no default runner yet—add Vitest suites alongside the feature you cover and co-locate them near the source (e.g., `components/ChatPanel.test.tsx`). For now, document manual verification: microphone permission flows, character creation, and environment toggles. Record the scenario list in your PR description so future work knows what regressed.

## Commit & Pull Request Guidelines
Use imperative, scoped commit messages (`feat: add Cleopatra persona artifacts`). PRs should include a summary, screenshots for UI changes, linked issues, environment variables touched (e.g., `GEMINI_API_KEY`), and a short test plan. Keep changes focused; note follow-ups instead of bundling them.

## Security & Configuration Tips
Store Gemini credentials in a local `.env` (`GEMINI_API_KEY`) and rely on Vite to expose `process.env.API_KEY`. Never commit voice captures or transcripts. Before sharing logs, wipe `localStorage` to avoid leaking user conversations.
