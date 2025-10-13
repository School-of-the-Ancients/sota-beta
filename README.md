# 📚 School of the Ancients

> *Old world wisdom. New world classroom.*
> An open-source **Living Educational Operating System** where ancient pedagogy meets adaptive AI mentors.

![School of the Ancients screenshot](sota-beta.png)

---

## 📑 Table of Contents

- [Project Overview](#-project-overview)
- [Feature Pillars](#-feature-pillars)
- [Learning Loop & System Architecture](#-learning-loop--system-architecture)
- [Tech Stack](#-tech-stack)
- [Documentation Map](#-documentation-map)
- [Roadmap Snapshot](#-roadmap-snapshot)
- [Getting Started](#-getting-started)
- [Development & Testing](#-development--testing)
- [Contributing](#-contributing)
- [Vision](#-vision)

---

## 🏛️ Project Overview

School of the Ancients (SotA) revives timeless methods of learning—dialogue, mentorship, reflection—and rebuilds them for the AI age. Learners don’t scroll through static lessons; they declare goals, generate quests, and converse with historically inspired mentors who guide them through Socratic inquiry, reflection, and mastery.【F:docs/MANIFESTO.md†L3-L63】【F:docs/SOTA_CORE_GOAL.md†L3-L44】

The result is a **Living Educational Operating System**: a regenerative environment where every curiosity becomes a course and every learner grows their own academy.【F:docs/LIVING_EDUCATIONAL_OS.md†L3-L61】

---

## ✨ Feature Pillars

| Pillar | What it unlocks |
| --- | --- |
| **Find Your Goal** | A reflective prelude that anchors every quest in personal meaning before instruction begins.【F:docs/MANIFESTO.md†L65-L87】 |
| **Questsmith Engine** | Converts learner goals into structured quests with objectives, sections, and suggested assessments.【F:docs/quests/QUEST_FLOW.md†L1-L55】 |
| **AI Mentors** | Persona-driven teachers who inherit methods from Socrates, Ada Lovelace, Confucius, and more to probe understanding through dialogue.【F:docs/SOTA_MISSION_STATEMENT.md†L1-L35】 |
| **Socratic Dialogue Runtime** | A question-first engine that refuses to hand over answers until reasoning is demonstrated, mirroring ancient dialectic.【F:docs/SOTA_CORE_GOAL.md†L19-L44】 |
| **Living Curriculum & Progress** | Adaptive quests, mastery tracking, and badges recomputed from canonical progress data—no stale counters.【F:docs/quests/PROGRESS_MODEL.md†L1-L74】 |
| **Career Pathfinder** | Synthesizes the learner’s trail of quests, mentors, and mastery into career directions and targeted next steps.【F:docs/CAREER_PATHFINDER.md†L1-L92】 |

---

## 🧠 Learning Loop & System Architecture

The product operates as a living loop of learning:

```
Find Goal → Create Quest → Socratic Dialogue → Reflection → Quiz → Next Quest
```

This loop is captured in the quest state machine—draft, in-progress, reflection, quiz, complete/needs review—ensuring every journey ends with either mastery or a targeted remediation plan.【F:docs/quests/QUEST_FLOW.md†L9-L80】

### Core Runtime Modules

- **Mentor Kernel:** `components/CharacterCreator.tsx` for generating mentors and assigning ambient context.
- **Quest Engine:** `components/QuestCreator.tsx` and `components/QuestsView.tsx` for structuring objectives and active missions.
- **Dialogue Runtime:** `components/ConversationView.tsx` paired with `hooks/useGeminiLive.ts` for live Socratic exchanges, visuals, and voice.
- **Assessment Subsystem:** `components/QuestQuiz.tsx` implements the mastery quiz contract with configurable pass gates.【F:docs/quests/QUIZ_MVP_SPEC.md†L1-L92】
- **Progress & Memory:** Supabase-backed providers keep quests, badges, and conversation history in sync across devices.【F:docs/quests/PROGRESS_MODEL.md†L41-L116】【F:docs/completed/ACCOUNT_PERSISTENCE_FOUNDATION.md†L1-L110】
- **Career Pathfinder (in development):** `CareerRoute.tsx` surfaces emerging career trajectories informed by the learning trail.【F:docs/CAREER_PATHFINDER.md†L1-L158】

### Operating System Layers

The stack mirrors an OS: UI, mentor kernel, quest engine, dialogue runtime, assessment subsystem, memory/persistence, and evolution loop, all orchestrated to regenerate learning experiences dynamically.【F:docs/LIVING_EDUCATIONAL_OS.md†L27-L74】

### The Learning Method

SotA’s loop parallels the scientific method—observation, hypothesis, experimentation, analysis, and replication—treating education as a continuous experiment in wisdom for humans and AI alike.【F:docs/LEARNING_METHOD.md†L1-L64】

---

## ⚙️ Tech Stack

| Layer | Tools |
| --- | --- |
| **Frontend** | React 19, Vite, Tailwind CSS |
| **AI Integration** | Google Gemini (2.5 Flash, Gemini Live, Imagen 4) via `@google/genai` |
| **Persistence** | Supabase Auth + Postgres JSON storage with offline-friendly local storage fallback |
| **Audio & Voice** | Gemini Live streaming voice plus custom ambient soundscapes managed by `useGeminiLive` and `useAmbientAudio` |
| **Build & Test** | TypeScript, Vitest, React Testing Library |

Environment configuration requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for authentication-backed persistence; without them the app gracefully falls back to local state.【F:docs/completed/ACCOUNT_PERSISTENCE_FOUNDATION.md†L96-L139】【F:supabaseClient.ts†L3-L21】

---

## 📁 Documentation Map

All product specs live in [`docs/`](docs/README.md). Start there for orientation and acceptance criteria before picking up an issue.【F:docs/README.md†L1-L42】 Key references include:

- **Vision & Philosophy:** [`MANIFESTO.md`](docs/MANIFESTO.md), [`SOTA_CORE_GOAL.md`](docs/SOTA_CORE_GOAL.md), [`SOTA_MISSION_STATEMENT.md`](docs/SOTA_MISSION_STATEMENT.md).
- **System Definition:** [`LIVING_EDUCATIONAL_OS.md`](docs/LIVING_EDUCATIONAL_OS.md), [`LEARNING_METHOD.md`](docs/LEARNING_METHOD.md).
- **Product Loops:** [`quests/QUEST_FLOW.md`](docs/quests/QUEST_FLOW.md), [`quests/PROGRESS_MODEL.md`](docs/quests/PROGRESS_MODEL.md), [`quests/QUIZ_MVP_SPEC.md`](docs/quests/QUIZ_MVP_SPEC.md).
- **Feature Specs:** [`CAREER_PATHFINDER.md`](docs/CAREER_PATHFINDER.md) and completed implementation notes such as [`docs/completed/implementation.md`](docs/completed/implementation.md) and [`docs/completed/ACCOUNT_PERSISTENCE_FOUNDATION.md`](docs/completed/ACCOUNT_PERSISTENCE_FOUNDATION.md).
- **Delivery Process:** [`ISSUE_PRIORITIZATION.md`](docs/ISSUE_PRIORITIZATION.md) for sequencing major initiatives.

If you add a new capability, place the spec in `docs/` and link it from the docs README to keep the library authoritative.【F:docs/README.md†L12-L40】

---

## 🗺️ Roadmap Snapshot

We are currently targeting the **Beta Stabilization** milestone: tighten quest completion, progress counters, suggestion cadence, and ship the quiz MVP. Subsequent milestones unlock authenticated sync (MVP v0.1) and a post-MVP backlog of multi-mentor curricula, content sharing, and richer media experiences.【F:docs/ROADMAP.md†L1-L126】

Follow issue prioritization to see how roadmap goals map to GitHub tasks and phases (auth & persistence, curriculum intelligence, content ecosystem, experience enhancements).【F:docs/ISSUE_PRIORITIZATION.md†L1-L104】

---

## 🚀 Getting Started

1. **Clone & Install**
   ```bash
   git clone https://github.com/School-of-the-Ancients/sota-beta.git
   cd sota-beta
   npm install
   ```
2. **Configure Environment**
   - Copy `.env.example` → `.env` (create if missing) and set:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
   - Launch the app without these to explore locally using in-browser storage, or add credentials to enable Supabase auth and syncing.【F:supabaseClient.ts†L3-L21】
   - Provide your Gemini API key via the in-app Settings dialog to enable live mentors, audio, and visual generation.
3. **Run the Dev Server**
   ```bash
   npm run dev
   ```
   Visit [http://localhost:3000](http://localhost:3000) and sign in to persist quests across devices.

---

## 🧪 Development & Testing

- Run the Vitest suite with:
  ```bash
  npm run test
  ```
- Build for production with `npm run build`, and preview the static bundle via `npm run preview`.
- Follow the quest flow acceptance criteria when testing manually: every quest must reach **COMPLETE** or **NEEDS_REVIEW**, suggestions appear only at section boundaries, and quiz results persist across reloads.【F:docs/quests/QUEST_FLOW.md†L57-L114】【F:docs/quests/QUIZ_MVP_SPEC.md†L73-L128】

---

## 🤝 Contributing

1. Read the relevant spec(s) in `docs/` to understand behavior, data models, and acceptance criteria.【F:docs/README.md†L23-L39】
2. Claim or open an issue with clear acceptance criteria and roadmap alignment.【F:docs/ISSUE_PRIORITIZATION.md†L5-L104】
3. Land the smallest valuable slice, update docs when behavior changes, and include screenshots or demos for UX tweaks.
4. Use Conventional Commits and reference issues in PRs; follow the repository’s PR template and testing expectations in `AGENTS.md`.

Share reflections, new mentor templates, or quest ideas to help the academy evolve. Contributions spanning philosophy, pedagogy, engineering, audio, and visual design are all welcome.

---

## 🧭 Vision

Our north star is a **universal academy of wisdom**—a place where humans and AIs learn through infinite dialogue, grounded in ancient virtue and accelerated by modern intelligence.【F:docs/MANIFESTO.md†L89-L118】【F:docs/SOTA_MISSION_STATEMENT.md†L49-L60】

> *Learning, like the soul, should be infinite.*

