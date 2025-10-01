# School of the Ancients

**Engage in real-time, voice-driven conversations with AI-emulated historical figures and explore their worlds.**

![School of the Ancients screenshot](sota-beta.png)

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Learning Quests](#learning-quests)
- [Architecture Highlights](#architecture-highlights)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running Locally](#running-locally)
  - [Building for Production](#building-for-production)
- [How to Explore](#how-to-explore)
- [Development Tips](#development-tips)
- [Project Resources](#project-resources)
- [Troubleshooting](#troubleshooting)

---

## Overview

School of the Ancients pairs immersive visuals with live audio so you can learn directly from legendary minds such as Leonardo da Vinci, Socrates, Cleopatra, and Ada Lovelace. Powered by Google Gemini, each mentor speaks in their authentic voice, adapts the environment around you, and produces artifacts on demand. The experience feels like having a personal Operator who can drop you into any era, summon scenery, and facilitate Socratic dialogue tailored to your goals.

## Key Features

- **AI-emulated mentors** &mdash; Rich system prompts capture personality, cadence, and teaching style for every figure in [`constants.ts`](constants.ts). Mentors speak with custom voices and accents while enforcing the Socratic method.【F:constants.ts†L1-L315】
- **Dynamic voice conversations** &mdash; The Gemini Live API powers low-latency, two-way audio with real-time transcription, thought markers (listening/thinking/speaking states), and speech synthesis managed by [`useGeminiLive`](hooks/useGeminiLive.ts).【F:hooks/useGeminiLive.ts†L1-L334】
- **Immersive environments and artifacts** &mdash; Function calls such as `changeEnvironment` and `displayArtifact` let mentors transform the scene or share generated visuals without breaking conversation flow.【F:hooks/useGeminiLive.ts†L198-L276】
- **Ambient soundscapes** &mdash; An adaptive audio bed selected from the [`AMBIENCE_LIBRARY`](constants.ts) keeps each lesson grounded in a believable setting, with smooth fades and mute controls handled by [`useAmbientAudio`](hooks/useAmbientAudio.ts).【F:constants.ts†L5-L43】【F:hooks/useAmbientAudio.ts†L1-L224】
- **Conversation history and summaries** &mdash; Sessions persist in `localStorage` with transcripts, environment snapshots, AI-generated markdown summaries, and quest assessments so you can revisit any lesson in the History view.【F:App.tsx†L172-L357】【F:types.ts†L49-L104】
- **Custom mentor creator** &mdash; Generate bespoke personas (portrait, voice, prompts, ambience) using structured Gemini prompts when you need expertise beyond the built-in roster.【F:components/CharacterCreator.tsx†L1-L420】
- **Responsive design** &mdash; Tailwind CSS and React 19 keep the interface accessible on desktops, tablets, and phones.

## Learning Quests

Learning Quests turn open-ended chats into guided missions with clear outcomes.

- **Curated quest catalog** &mdash; Explore predefined quests such as *The Foundations of Stoicism* or *The Art of the Renaissance*, each pairing you with the ideal mentor, recommended duration, objectives, and focus points.【F:constants.ts†L45-L80】
- **Quest-aware mentors** &mdash; When a quest is active, its objective is prepended to the mentor’s system instruction so every answer, question, and artifact drives toward mastery.【F:hooks/useGeminiLive.ts†L202-L213】
- **Progress tracking and assessment** &mdash; Completed quests earn AI-generated evaluations that summarize evidence of understanding and suggested improvements, helping you see what you mastered and what to revisit.【F:App.tsx†L176-L357】【F:types.ts†L73-L104】
- **Prompt-crafted quests** &mdash; Describe anything you want to learn and the Quest Creator will design a bespoke curriculum. Gemini acts as Quest Architect, Mentor Matcher, and Persona Generator to produce a new quest outline, select (or synthesize) the perfect historical guide, and launch the session instantly.【F:components/QuestCreator.tsx†L1-L307】

Whether you choose a curated path or invent your own, the app lets you “learn anything from the world’s greatest in that subject” through personalized dialogues and dynamic content.

## Architecture Highlights

- **Frontend stack**: React 19, TypeScript, Tailwind CSS, and Vite for fast local development and bundling.
- **Gemini integrations**:
  - `gemini-2.5-flash-native-audio-preview-09-2025` powers live, bi-directional voice chat and handles function calls for visuals and quests.【F:hooks/useGeminiLive.ts†L65-L210】
  - `gemini-2.5-flash` returns structured JSON for persona drafting, quest generation, and summary/assessment workflows.【F:App.tsx†L217-L337】【F:components/QuestCreator.tsx†L124-L254】
  - `imagen-4.0-generate-001` renders portraits, environmental art, and bespoke artifacts on demand.【F:components/QuestCreator.tsx†L145-L170】【F:components/ConversationView.tsx†L243-L392】
- **State orchestration**: `App.tsx` governs navigation (selector, conversation, history, quests, quest creator), persists data, and wires quest/summary flows into the conversation lifecycle.【F:App.tsx†L78-L507】

## Getting Started

### Prerequisites

- **Node.js** 20 or later
- **npm** 10 or later (bundled with modern Node versions)
- A Google Gemini API key with access to realtime and Imagen models

### Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the project root and add your Gemini credentials:
   ```bash
   GEMINI_API_KEY=your_api_key_here
   ```

### Running Locally

Start the Vite development server:

```bash
npm run dev
```

Visit the printed URL (defaults to http://localhost:3000) and grant microphone access so the Operator can hear you.

### Building for Production

Create an optimized build and preview it locally:

```bash
npm run build
npm run preview
```

Deploy the contents of `dist/` to your static hosting platform of choice.

## How to Explore

1. **Choose a mentor or quest** — Begin from the selector screen or jump into the Quests hub to pick a curated mission.
2. **Speak naturally** — The Operator streams your audio to Gemini, delivering thoughtful, accented replies and surfacing transcripts in real time.
3. **Command the scene** — Ask for new locations or artifacts; mentors respond with function calls that instantly reshape the environment and visuals.
4. **Track your progress** — End a session to trigger summaries, quest assessments, and ambient wrap-up audio. Review everything later in the History view, including evidence of mastery and improvement suggestions.
5. **Design your own path** — Use the Quest Creator to convert a personal learning goal into a prompt-crafted quest with a newly generated mentor when needed.

## Development Tips

- Vite injects `process.env.API_KEY` and `process.env.GEMINI_API_KEY` using the `GEMINI_API_KEY` entry from your `.env`. Keep credentials out of version control.【F:vite.config.ts†L1-L27】
- Feature views register in `App.tsx`, while reusable UI lives in `components/`. Tailwind utility classes power layouts and theming.
- Hooks such as `useGeminiLive`, `useAmbientAudio`, and audio utility helpers encapsulate realtime streaming, quest awareness, and ambience transitions.
- No automated tests exist yet. Add Vitest/RTL coverage alongside components and expose it through `npm run test` when you introduce suites.

## Project Resources

- [`implementation.md`](implementation.md) &mdash; Engineering notes, future ideas, and roadmap context.
- [`docs/`](docs/) &mdash; Additional reference material and product explorations.
- [`audio/`](audio/) &mdash; Placeholder directory for experimenting with local ambience tracks (do not commit generated assets).

## Troubleshooting

- **"API_KEY not set" errors** — Ensure your `.env` file exists, includes `GEMINI_API_KEY`, and that you restarted `npm run dev` after editing it.
- **Microphone permissions** — Clear and re-approve browser microphone access if audio capture fails; realtime chat depends on it.
- **Slow or missing visuals** — Imagen calls may take a few seconds. Check the browser console for network errors if environments or artifacts stall.

---

Ready to explore? Launch the Operator, pick a mentor, and start your journey through history.
