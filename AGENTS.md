# Repository Guidelines

This guide orients new contributors to the School of the Ancients React 19 app and keeps changes consistent across features, assets, and tooling.

## Project Structure & Module Organization
`index.tsx` boots the SPA and hands control to `App.tsx`, which wires feature views such as `ConversationView` and `HistoryView`. UI elements live in `components/` (PascalCase files) with shared icons in `components/icons/`. Conversational seeds and constants stay in `constants.ts`, shared types in `types.ts`, and prompt templates in `suggestions.ts`. Hooks, including audio capture in `hooks/useGeminiLive.ts`, own side effects. Persist artwork and static media under `img/`, audio samples in `audio/`, long-form docs in `docs/`, and research notes in `implementation.md`.

## Build, Test, and Development Commands
Run `npm install` once per clone to pull dependencies. `npm run dev` launches Vite at http://localhost:3000 for live reloading. `npm run build` emits the production bundle, and `npm run preview` serves that bundle for smoke tests. Add an `npm run test` script when automated suites land so the workflow remains obvious.

## Coding Style & Naming Conventions
Write TypeScript functional components with 2-space indentation and single quotes. Favor hooks over classes and isolate effects inside `useEffect`. Name components with PascalCase (e.g., `ConversationPanel.tsx`) and utilities with camelCase (e.g., `formatTimestamp`). Import shared modules via the `@/` alias defined in `tsconfig.json`. Lean on Tailwind utility classes; extend `tailwind.config` before adding custom CSS.

## Testing Guidelines
Adopt Vitest plus React Testing Library, co-locating specs next to sources (`components/ConversationPanel.test.tsx`). Name tests after observable behavior and cover microphone permissions, persona lifecycles, and error states. Document manual test notes (e.g., browser mic prompts) in pull requests until suites are automated. Failing tests should block merges.

## Commit & Pull Request Guidelines
Write imperative, scoped commit messages like `feat: add Cleopatra persona artifacts`. Pull requests must summarize the change, link related issues, include UI screenshots when visuals shift, list environment variables touched (e.g., `GEMINI_API_KEY`), and supply a concise test plan. Keep PRs focused; flag follow-up work rather than bundling it.

## Security & Configuration Tips
Store Gemini API keys in a local `.env` file; Vite exposes them via `process.env`. Never commit captured audio, transcripts, or secrets. Before sharing logs or reproductions, clear `localStorage` and scrub tokens.
