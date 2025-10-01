# School of the Ancients

**Engage in real-time, voice-driven conversations with AI-emulated historical figures and explore their worlds.**

![School of the Ancients screenshot](sota-beta.png)

---

## Table of Contents

- [Overview](#overview)
- [Core Features](#core-features)
- [Architecture Highlights](#architecture-highlights)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running Locally](#running-locally)
  - [Building for Production](#building-for-production)
- [Development Tips](#development-tips)
- [Project Resources](#project-resources)
- [Troubleshooting](#troubleshooting)

---

## Overview

School of the Ancients is a modern web application that pairs immersive visuals with live audio conversations. Powered by the Google Gemini API, you can speak with legendary minds like Leonardo da Vinci, Socrates, and Cleopatra. Mentors converse in their authentic voice, adapt the scenery around you, and display custom artifacts to support the lesson. The result is a "Matrix Operator"-style learning environment that blends dialogue, imagery, and exploration.

## Core Features

- **AI-emulated mentors** &mdash; Each historical figure is defined by a richly crafted system prompt that captures personality, accent, and teaching style.
- **Dynamic voice conversations** &mdash; Uses the Gemini Live API for low-latency, two-way audio with real-time transcription and speech synthesis.
- **Socratic dialogue** &mdash; Mentors avoid blunt answers, instead guiding you with probing questions and comprehension checks.
- **Immersive worlds** &mdash; Ask the Operator to change the environment (e.g., "Take me to the Roman Forum") and watch the background update in real time.
- **Visual artifacts** &mdash; Request images or diagrams (e.g., "Show me a sketch of your flying machine") and the mentor will display the generated result.
- **Custom character creator** &mdash; A multi-step workflow that helps you design brand new mentors, including portrait generation.
- **Conversation history** &mdash; Sessions, transcripts, artifacts, and environments are stored in browser `localStorage` for later review.
- **Responsive design** &mdash; Tailwind CSS keeps the UI beautiful and accessible on mobile, tablet, and desktop displays.

## Architecture Highlights

- **Frontend stack**: React 19, TypeScript, Tailwind CSS, and Vite for development and bundling.
- **Gemini integrations**:
  - `gemini-2.5-flash-native-audio-preview-09-2025` drives live, bi-directional voice chat and function calling.
  - `imagen-4.0-generate-001` renders portraits, environments, and historical artifacts.
  - `gemini-2.5-flash` supports structured JSON output for the Character Creator and dynamic prompt generation.
- **Function calling workflow**: The frontend exposes `changeEnvironment` and `displayArtifact`. When the mentor decides to alter the scene, Gemini issues a structured call that triggers new imagery and UI updates instead of plain text.
- **Prompt engineering**: Persona prompts enforce the Socratic method, proactive tool use, and regular comprehension checks so every conversation feels guided and intentional.

## Getting Started

### Prerequisites

- **Node.js** 20 or later
- **npm** 10 or later (ships with modern Node releases)
- A Google Gemini API key with access to the realtime and Imagen models

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

Visit the printed URL (defaults to http://localhost:3000) and grant the browser microphone access when prompted.

### Building for Production

Create an optimized build and preview it locally:

```bash
npm run build
npm run preview
```

Deploy the contents of `dist/` to your static hosting platform of choice.

## Development Tips

- Vite exposes `process.env.API_KEY` and `process.env.GEMINI_API_KEY` based on the `GEMINI_API_KEY` entry in your `.env` file. Be sure not to commit this file.
- Shared UI components live in `components/`, while feature views are registered in `App.tsx`.
- Hooks such as `useGeminiLive` encapsulate audio capture, streaming, and playback logic.
- Tailwind utility classes handle layout; extend the Tailwind config before introducing custom CSS.
- No automated tests exist yet. If you add Vitest or other tooling, expose it through an `npm run test` script.

## Project Resources

- [`implementation.md`](implementation.md) &mdash; Deep-dive notes about system design choices and future ideas.
- [`docs/`](docs/) &mdash; Additional reference material and design explorations.
- [`audio/`](audio/) &mdash; Placeholder directory for local experimentation (do not commit generated artifacts).

## Troubleshooting

- **"API_KEY not set" errors**: Ensure your `.env` file is present and you restarted `npm run dev` after adding it.
- **Microphone permissions**: Clear browser permissions if you accidentally deny access; audio capture is required for real-time chat.
- **Slow or missing visuals**: Imagen requests can take a few seconds. Watch the developer console for network errors if images do not appear.

---

Ready to explore? Launch the Operator, pick a mentor, and start your journey through history.
