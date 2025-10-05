# Repository Guidelines

## Project Structure & Module Organization
Keep the SPA entry point in `index.tsx`, which mounts `App.tsx` for routing between conversation, history, and quest flows. Feature UI lives under `components/` with icons in `components/icons/`; shared helpers such as typing, constants, and persona suggestions live in `types.ts`, `constants.ts`, and `suggestions.ts`. Side-effectful logic (audio capture, realtime updates) belongs in `hooks/` like `useGeminiLive.ts`. Persist static media in `img/` and `audio/`, reference deep-dive notes in `docs/implementation.md`, and put automation or diagnostics under `tests/`.

## Build, Test, and Development Commands
Run `npm install` once per clone to sync dependencies. Use `npm run dev` to start Vite on http://localhost:3000 with hot reload. Execute `npm run test` (or `npm run test -- --coverage`) to run Vitest with React Testing Library and produce v8 coverage. Ship-ready bundles come from `npm run build`, while `npm run preview` serves that bundle for smoke testing.

## Coding Style & Naming Conventions
Use TypeScript functional components with 2-space indentation, single quotes, and explicit prop typing when non-trivial. Name components in PascalCase (`ConversationView.tsx`), hooks with a `use` prefix (`useGeminiLive`), and utilities with clear camelCase verbs. Prefer Tailwind utility classes; extend `tailwind.config` before adding custom CSS, and import shared modules via the `@/` alias.

## Testing Guidelines
Co-locate specs beside sources as `*.test.tsx` or `*.test.ts`; see `App.test.tsx` and `vitest.setup.ts` for patterns. Focus coverage on microphone permissions, persona lifecycle edges, and error flashes prior to merging. Document manual browser checks (e.g., microphone prompts) in PR descriptions until end-to-end automation lands.

## Commit & Pull Request Guidelines
Follow Conventional Commits such as `feat: add Cleopatra persona artifacts`, keeping each change scoped and revert-safe. Pull requests should provide a concise summary, link related issues, enumerate environment variable touches (like `GEMINI_API_KEY`), include UI screenshots when visuals shift, and share an executed test plan.

## Security & Configuration Tips
Keep secrets in `.env`; Vite exposes selected values through `process.env`. Never commit transcripts, tokens, or `localStorage` snapshots, and scrub logs before sharing externally. Rotate or revoke exposed keys immediately.
