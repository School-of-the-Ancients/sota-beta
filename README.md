# 📚 School of the Ancients

> *Old world wisdom. New world classroom.*
> A **Living Educational Operating System** that fuses ancient pedagogy with modern AI so every learner can cultivate wisdom through dialogue, reflection, and creation.

![School of the Ancients screenshot](sota-beta.png)

---

## Table of Contents

1. [What is SotA?](#-what-is-sota)
2. [The Living Learning Loop](#-the-living-learning-loop)
3. [Experience Pillars](#-experience-pillars)
4. [System Architecture](#-system-architecture)
5. [Getting Started](#-getting-started)
6. [Tech Stack](#%EF%B8%8F-tech-stack)
7. [Product Vision & Roadmap](#-product-vision--roadmap)
8. [Documentation Atlas](#-documentation-atlas)
9. [Contributing](#-contributing)

---

## 🏛️ What is SotA?

School of the Ancients (SotA) revives the timeless practices of the world’s academies—Plato’s dialogues, the Indian Gurukul, the Stoic stoa, Confucian scholarship, and the House of Wisdom—and reimagines them for the AI age.【F:docs/MANIFESTO.md†L8-L49】

Instead of serving static lessons, SotA acts as a **learning companion**. Learners name their curiosity, receive a handcrafted quest, summon historically inspired mentors, and engage in Socratic conversation that adapts to their progress.【F:docs/SOTA_CORE_GOAL.md†L12-L42】

Every curiosity becomes a course. Every learner builds a living academy.

---

## 🔄 The Living Learning Loop

SotA operates as an adaptive loop that continuously regenerates new experiences from past conversations.【F:docs/LIVING_EDUCATIONAL_OS.md†L7-L53】

```
Find Your Goal → Create Quest → Summon Mentor → Dialogue → Reflect → Assess → Next Quest
```

This loop mirrors the scientific method—observation, hypothesis, experiment, reflection, iteration—ensuring learners refine both knowledge and self-understanding over time.【F:docs/LEARNING_METHOD.md†L5-L41】

---

## ✨ Experience Pillars

| Pillar | What learners experience | Ancient inspiration |
|--------|--------------------------|---------------------|
| **Find Your Goal** | Reflective intake that uncovers purpose before learning begins. | Socratic inquiry into first principles. |
| **Dynamic Quests** | Narrative learning paths that evolve from any goal or curiosity. | Heroic epics, Gurukul apprenticeships. |
| **AI Mentors** | Roleplayed guides such as Socrates, Hypatia, Confucius, or Ada Lovelace who teach through questions. | Plato’s Academy, Stoic mentorship. |
| **Socratic Dialogue Engine** | Real-time questioning that tests reasoning instead of giving answers. | Socratic dialectic. |
| **Reflection & Mastery** | Journals, key takeaways, and quest quizzes that capture understanding. | Stoic reflection, oral exams. |
| **Career Pathfinder** | Converts learning signals into tailored career paths, next-step skills, and quests. | Guild apprenticeships, medieval advising.【F:docs/CAREER_PATHFINDER.md†L1-L109】 |

---

## 🧠 System Architecture

SotA behaves like a **living educational operating system**—it orchestrates mentor creation, quest generation, dialogue, assessment, and evolution as modular services.【F:docs/LIVING_EDUCATIONAL_OS.md†L7-L83】

| Layer | Purpose | Implementation |
|-------|---------|----------------|
| **Interface** | Visual + conversational surface for learners. | React, Tailwind, Vite, Gemini Live voice. |
| **Mentor Kernel** | Spawns and governs mentor personas. | `CharacterCreator.tsx`, AI prompt scaffolds. |
| **Quest Engine** | Converts goals into structured learning loops. | `QuestCreator.tsx`, quest templates. |
| **Dialogue Runtime** | Drives Socratic conversations, environment control, and voice. | `ConversationView.tsx`, custom hooks. |
| **Assessment Subsystem** | Generates quizzes, scores mastery, awards badges. | `QuestQuiz.tsx`, progress model specs.【F:docs/quests/QUIZ_MVP_SPEC.md†L1-L94】 |
| **Memory & Persistence** | Stores quests, conversations, and progress with migration from local to cloud. | Supabase auth + JSON persistence.【F:docs/completed/ACCOUNT_PERSISTENCE_FOUNDATION.md†L1-L88】 |
| **Evolution Loop** | Suggests next quests, mentors, or careers based on history. | History + Career Pathfinder modules.【F:docs/CAREER_PATHFINDER.md†L9-L109】 |

Underlying specs in `docs/quests/` detail the quest state machine, progress data model, and quiz mechanics to keep the loop idempotent and recomputable across devices.【F:docs/quests/QUEST_FLOW.md†L1-L74】【F:docs/quests/PROGRESS_MODEL.md†L1-L66】

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Supabase project (optional but required for authenticated persistence)

### Setup

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to launch the Vite dev server.

To enable Supabase-backed auth and persistence, create a project, enable Google OAuth, run the `user_data` table migration, and populate `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Detailed onboarding lives in [Phase 1: Account & Persistence Foundation](./docs/completed/ACCOUNT_PERSISTENCE_FOUNDATION.md).【F:docs/completed/ACCOUNT_PERSISTENCE_FOUNDATION.md†L1-L116】

### Core Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server. |
| `npm run build` | Produce a production bundle. |
| `npm run preview` | Serve the built bundle locally. |
| `npm run test` | Execute Vitest + React Testing Library suites. |

---

## 🛠️ Tech Stack

| Layer | Tools |
|-------|-------|
| **Frontend** | React, TypeScript, Tailwind, Vite |
| **AI Integration** | Google Gemini (2.5 Flash, Imagen 4.0) |
| **Backend & Auth** | Supabase (Postgres, Auth, Storage) |
| **Voice & Audio** | Gemini Live streaming, custom `useGeminiLive` and `useAmbientAudio` hooks |
| **Persistence** | Supabase JSON store + encrypted local storage fallback |

---

## 🧭 Product Vision & Roadmap

Our north star is a **quest-driven learning loop** that feels magical: finish every quest with reflection, mastery, and a clear next step.【F:docs/ROADMAP.md†L10-L31】

### Milestones

- **Beta Stabilization** (due Oct 14, 2025): solidify quest completion, progress accuracy, and quiz MVP.【F:docs/ROADMAP.md†L33-L63】
- **MVP v0.1** (target Oct 31, 2025): ship auth + cloud sync, progress badges, generalized quizzes, and analytics.【F:docs/ROADMAP.md†L65-L84】
- **Post-MVP Backlog**: curriculum classes, community quest libraries, richer learning media, and accessibility/performance polish.【F:docs/ROADMAP.md†L86-L108】

Priority sequencing and implementation steps are captured in [ISSUE_PRIORITIZATION.md](./docs/ISSUE_PRIORITIZATION.md) and follow-up execution plans in `docs/completed/`.【F:docs/ISSUE_PRIORITIZATION.md†L1-L91】

---

## 🗂️ Documentation Atlas

The `docs/` directory is the source of truth for specs, workflows, and philosophical framing.【F:docs/README.md†L1-L42】 Use it before picking up an issue.

| Area | Highlights |
|------|------------|
| **Philosophy** | [MANIFESTO](./docs/MANIFESTO.md), [SOTA_MISSION_STATEMENT](./docs/SOTA_MISSION_STATEMENT.md), [SOTA_CORE_GOAL](./docs/SOTA_CORE_GOAL.md). |
| **Operating Model** | [LIVING_EDUCATIONAL_OS](./docs/LIVING_EDUCATIONAL_OS.md), [LEARNING_METHOD](./docs/LEARNING_METHOD.md). |
| **Product Specs** | [ROADMAP](./docs/ROADMAP.md), [ISSUE_PRIORITIZATION](./docs/ISSUE_PRIORITIZATION.md), [Career Pathfinder](./docs/CAREER_PATHFINDER.md). |
| **Quest System** | [QUEST_FLOW](./docs/quests/QUEST_FLOW.md), [PROGRESS_MODEL](./docs/quests/PROGRESS_MODEL.md), [QUIZ_MVP_SPEC](./docs/quests/QUIZ_MVP_SPEC.md), and progress design explorations (`student-progress*.md`). |
| **Execution Logs** | `docs/completed/` contains shipped plans such as the Supabase persistence foundation. |
| **Prompt Resources** | [studentpromptpack.md](./docs/studentpromptpack.md) curates learner-facing prompts. |

When introducing a new capability, add its spec to `docs/` and link it from [docs/README.md](./docs/README.md) so the community can track living requirements.【F:docs/README.md†L11-L55】

---

## 🤝 Contributing

We welcome explorers, builders, and philosophers.

1. Review the relevant specs in `docs/` and pick an issue on the GitHub board.
2. Implement the smallest valuable slice—keep the quest loop stable and idempotent.【F:docs/README.md†L29-L55】
3. Follow the roadmap priorities when choosing workstreams.【F:docs/ISSUE_PRIORITIZATION.md†L1-L91】
4. Submit PRs with demos, test plans, and doc updates. Follow Conventional Commits and the repository guidelines in `AGENTS.md`.

Share reflections, prompt ideas, new mentors, or curriculum designs—SotA grows stronger with every conversation.

---

> **Vision:** Build a universal academy of wisdom where humans and AIs learn side by side, guided by timeless methods and living technology.【F:docs/SOTA_MISSION_STATEMENT.md†L1-L40】

