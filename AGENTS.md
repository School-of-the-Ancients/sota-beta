# Repository Guidelines
## Project Structure & Module Organization
- `index.tsx` boots the React 19 SPA; `App.tsx` orchestrates views (`ConversationView`, `HistoryView`, etc.).
- Feature UI lives in `components/` (PascalCase files, icons in `components/icons/`), with shared types in `types.ts` and prompts in `suggestions.ts`.
- `hooks/useGeminiLive.ts` wraps Gemini Live audio sessions; constants and character seeds are in `constants.ts`.
- Static assets are served from `img/`, while Vite config and metadata live at the project root.

## Build, Test, and Development Commands
- `npm install` sets up dependencies; lock files are npm-based.
- `npm run dev` launches Vite on http://localhost:3000 per `vite.config.ts`.
- `npm run build` outputs a production bundle in `dist/`.
- `npm run preview` serves the built assets to sanity-check deployment artifacts.

## Coding Style & Naming Conventions
- Write TypeScript-first React function components; prefer hooks over classes and keep side effects in `useEffect`.
- Use 2-space indentation, single quotes for strings, and Tailwind utility classes for styling.
- Name component files and exported components in PascalCase (`CharacterCreator`); helper functions and hooks stay camelCase (`useGeminiLive`).
- Resolve shared imports via the `@/*` alias defined in `tsconfig.json`, and keep ambient types in `types.ts`.

## Testing Guidelines
- There is no automated test runner yet; add Vitest + React Testing Library when covering new logic, especially in `useGeminiLive` and user flows.
- Until automation lands, verify microphone permissions, environment changes, and character creation end-to-end in the browser before merging.
- Record manual checks in the PR description to track coverage history.

## Commit & Pull Request Guidelines
- Recent commits are terse (“Update README.md”); prefer imperative, scoped messages like `feat: add Cleopatra persona artifacts`.
- Keep PRs focused; include a summary, screenshots for UI changes, API considerations, and a test plan.
- Link issues or TODOs, note required env vars (`GEMINI_API_KEY`), and call out any follow-up work.

## Security & Configuration Tips
- Keep the Gemini key in a local `.env` as `GEMINI_API_KEY`; Vite injects it as `process.env.API_KEY`.
- Never commit API keys or voice assets; use environment-specific `.env.local` files and gitignore them.
- When sharing builds, scrub localStorage content that may contain user transcripts before collecting logs.
