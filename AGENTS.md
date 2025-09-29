# Repository Guidelines

## Project Structure & Module Organization
The React 19 single-page app boots from `index.tsx`, and `App.tsx` registers feature views like `ConversationView` and `HistoryView`. UI pieces sit in `components/` (PascalCase filenames) with shared icons under `components/icons/`. Conversation seeds and constants live in `constants.ts`, reusable types in `types.ts`, and prompt templates in `suggestions.ts`. Audio capture and playback logic belong to `hooks/useGeminiLive.ts`. Store static assets and artwork in `img/`, long-form docs in `docs/`, and exploratory notes in `implementation.md`.

## Build, Test, and Development Commands
Run `npm install` once to pull dependencies. Use `npm run dev` to start Vite on http://localhost:3000 for iterative work. Ship-ready bundles come from `npm run build`, and `npm run preview` serves the compiled output for smoke testing. When you introduce automated tests, add a script (e.g., `npm run test`) so the workflow remains discoverable.

## Coding Style & Naming Conventions
Author TypeScript functional components with 2-space indentation and single quotes. Prefer hooks over classes, isolating side effects inside `useEffect`. Components follow PascalCase (`ConversationPanel.tsx`), hooks and helpers stay camelCase (`useGeminiLive`, `formatTimestamp`). Import shared modules through the `@/` alias defined in `tsconfig.json`. Rely on Tailwind utility classes for layout; extend the Tailwind config before inventing custom CSS.

## Testing Guidelines
Adopt Vitest with React Testing Library when adding automated coverage, co-locating specs beside the source (`components/ConversationPanel.test.tsx`). Name tests after the behavior under verification and document any manual scenarios (microphone permissions, persona creation, environment toggles) in your PR description. Add a test script to `package.json` once suites exist.

## Commit & Pull Request Guidelines
Write imperative, scoped commit messages such as `feat: add Cleopatra persona artifacts`. Pull requests should summarize the change, attach UI screenshots when the visuals shift, link related issues, note environment variables touched (e.g., `GEMINI_API_KEY`), and include a short test plan. Keep changes narrowly focused and call out follow-up work instead of bundling it.

## Security & Configuration Tips
Keep Gemini API keys in a local `.env` file; Vite exposes them via `process.env`. Never commit audio captures, transcripts, or other sensitive artifacts. Before sharing logs, clear `localStorage` to avoid leaking prior conversations or tokens.
