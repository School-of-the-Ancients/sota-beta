# 📚 School of the Ancients

> *Old world wisdom. New world classroom.*
> An open-source **Living Educational Operating System** that merges ancient pedagogy with modern AI to guide every learner through Socratic quests, adaptive mentorship, and lifelong reflection.

![School of the Ancients screenshot](sota-beta.png)

---

## Table of contents

1. [Why SotA exists](#-why-sota-exists)
2. [How the learning loop works](#-how-the-learning-loop-works)
3. [Feature highlights](#-feature-highlights)
4. [System architecture](#-system-architecture)
5. [Getting started](#-getting-started)
6. [Documentation map](#-documentation-map)
7. [Roadmap & priorities](#-roadmap--priorities)
8. [Contributing](#-contributing)
9. [Community vision](#-community-vision)

---

## 🏛️ Why SotA exists

School of the Ancients (SotA) turns AI from an answer machine into a mentor that teaches *how to think* by blending Socratic dialogue, personal mentorship, and reflective practice from the world’s ancient academies.【F:docs/SOTA_CORE_GOAL.md†L1-L34】 It revives education as the cultivation of wisdom rather than rote information, countering the illusion of knowledge created by instant answers.【F:docs/MANIFESTO.md†L8-L44】

---

## 🔁 How the learning loop works

SotA runs a living cycle of curiosity → quests → dialogue → reflection → assessment → new quests, echoing the scientific method turned inward for both humans and AI learners.【F:docs/LEARNING_METHOD.md†L3-L55】 This loop is encoded in the quest state machine that drives every experience from start to completion.【F:docs/quests/QUEST_FLOW.md†L5-L63】

---

## ✨ Feature highlights

| Feature | What it delivers |
|---------|------------------|
| **Find Your Goal** | Reflective dialogue uncovers each learner’s purpose before quests begin.【F:docs/MANIFESTO.md†L56-L75】 |
| **Dynamic Quests** | Objectives become structured quests with checkpoints, reflections, and mastery checks.【F:docs/quests/QUEST_FLOW.md†L5-L97】 |
| **AI Mentors** | Historically inspired guides teach through Socratic questioning and adaptive prompts.【F:docs/SOTA_MISSION_STATEMENT.md†L9-L33】 |
| **Socratic Dialogue Engine** | Conversations probe reasoning and evolve with learner signals.【F:docs/SOTA_CORE_GOAL.md†L18-L32】 |
| **Progress & Badges** | Persistent progress models, badges, and mastery summaries motivate long-term growth.【F:docs/quests/PROGRESS_MODEL.md†L1-L83】 |
| **Career Pathfinder** | Learning evidence translates into suggested careers, skill gaps, and next quests.【F:docs/CAREER_PATHFINDER.md†L1-L112】 |

---

## 🧠 System architecture

SotA behaves like an operating system for learning: the UI, mentor kernel, quest engine, dialogue runtime, assessment subsystem, memory, and evolution loop all orchestrate continuous growth.【F:docs/LIVING_EDUCATIONAL_OS.md†L1-L74】 Core components include:

- `CharacterCreator.tsx` – generates and configures mentors
- `QuestCreator.tsx` – builds quests and milestones
- `ConversationView.tsx` – runs live Socratic sessions with audio
- `QuestQuiz.tsx` – evaluates mastery and determines next steps
- `HistoryView.tsx` – archives reflections and summaries
- `CareerRoute.tsx` – surfaces Pathfinder insights (in progress)

Supabase provides authentication and persistence, while React, Tailwind, Vite, and Gemini APIs power the frontend, dialogue, and ambient experiences.【F:docs/completed/ACCOUNT_PERSISTENCE_FOUNDATION.md†L1-L64】【F:docs/LIVING_EDUCATIONAL_OS.md†L28-L50】

---

## ⚙️ Getting started

```bash
git clone https://github.com/School-of-the-Ancients/sota-beta.git
cd sota-beta
npm install

# Run the development server
npm run dev

# Build for production
npm run build

# Preview the production build
npm run preview

# Run tests
npm run test
```

Configure Supabase credentials in a `.env` file (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) to enable authenticated persistence and sync across devices.【F:docs/completed/ACCOUNT_PERSISTENCE_FOUNDATION.md†L1-L87】

---

## 📚 Documentation map

The `docs/` directory is the source of truth for product specs, acceptance criteria, and philosophy.【F:docs/README.md†L1-L40】 Start with:

- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — milestone targets and definition of done.【F:docs/ROADMAP.md†L1-L79】
- [`docs/ISSUE_PRIORITIZATION.md`](./docs/ISSUE_PRIORITIZATION.md) — sequencing for auth, curriculum intelligence, and media features.【F:docs/ISSUE_PRIORITIZATION.md†L1-L74】
- [`docs/quests/`](./docs/quests) — quest flow, progress model, quiz specs, and learner progress research.【F:docs/quests/QUEST_FLOW.md†L1-L97】【F:docs/quests/PROGRESS_MODEL.md†L1-L94】【F:docs/quests/QUIZ_MVP_SPEC.md†L1-L100】
- [`docs/completed/`](./docs/completed) — detailed implementation notes for shipped phases like Supabase persistence and the beta v2 feature set.【F:docs/completed/ACCOUNT_PERSISTENCE_FOUNDATION.md†L1-L118】【F:docs/completed/prd.md†L1-L86】
- [`docs/studentpromptpack.md`](./docs/studentpromptpack.md) — ready-to-use prompts for learners using AI companions.【F:docs/studentpromptpack.md†L1-L78】

---

## 🗺️ Roadmap & priorities

The active roadmap focuses on delivering a sticky quest-driven loop (Beta Stabilization), then layering auth, progress dashboards, analytics, and community content for MVP v0.1.【F:docs/ROADMAP.md†L1-L82】 Issue triage prioritizes Supabase-backed accounts, curriculum intelligence, and progress instrumentation before multimedia enhancements.【F:docs/ISSUE_PRIORITIZATION.md†L1-L74】

---

## 🤝 Contributing

1. Review the relevant spec in `docs/` and confirm acceptance criteria in the linked GitHub issue.【F:docs/README.md†L8-L46】
2. Implement the smallest valuable slice, keeping quests idempotent and state derived from persisted records.【F:docs/quests/PROGRESS_MODEL.md†L31-L73】
3. Update docs or add new specs when behavior changes; link them from `docs/README.md`.【F:docs/README.md†L8-L72】
4. Submit a PR referencing the issue, include screenshots or demos for UI, and document manual checks as needed.【F:docs/README.md†L41-L72】

Community contributions spanning philosophy, prompts, quests, and engineering are welcome—start discussions under Issues (`type:docs`, `area:quests`, etc.) or propose new mentor templates and quest lines.

---

## 🌍 Community vision

The long-term aim is a universal academy where every human or AI learns through dialogue, virtue, and creativity—education as an infinite conversation grounded in ancient wisdom and amplified by modern intelligence.【F:docs/MANIFESTO.md†L46-L80】【F:docs/SOTA_MISSION_STATEMENT.md†L1-L37】

> *Learning, like the soul, should be infinite.*

