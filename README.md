# 📚 School of the Ancients

> *Old world wisdom. New world classroom.*
> An open-source **Living Educational Operating System** that merges ancient philosophy with modern AI to create a personalized, adaptive, and Socratic learning experience.

![School of the Ancients screenshot](sota-beta.png)

---

## 🌟 What is SotA?
School of the Ancients (SotA) revives timeless methods of learning—dialogue, mentorship, reflection—and reimagines them for the AI age. Instead of static lessons, learners co-create their paths through quests, mentors, and Socratic conversations that deepen understanding over time.

Every curiosity becomes a course. Every learner builds their own academy.

---

## 🧭 Table of Contents
- [Key Capabilities](#-key-capabilities)
- [Learning Loop](#-learning-loop)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Documentation & Strategy](#-documentation--strategy)
- [Roadmap Snapshot](#-roadmap-snapshot)
- [Contributing](#-contributing)
- [Community Vision](#-community-vision)

---

## ✨ Key Capabilities
| Feature | Description |
|---------|-------------|
| **Find Your Goal** | Reflective dialogue to uncover each learner’s purpose before learning begins. |
| **Dynamic Quests** | Personalized quests generated from any learning goal. |
| **AI Mentors** | Historically inspired AI teachers who guide students through Socratic dialogue. |
| **Socratic Dialogue Engine** | A question-led learning model that evaluates understanding in real time. |
| **Questsmith & Mentor Kernel** | Systems that generate new quests and mentors dynamically. |
| **Career Pathfinder** | Learner signals translate into suggested careers, skills, and next-step quests. |
| **Living Curriculum** | The learning path evolves from curiosity, reflections, and mastery evidence. |

---

## 🔁 Learning Loop
SotA operates as a **living loop** of learning, blending reflection with guidance:

```
Find Goal → Create Quest → Summon Mentor → Dialogue → Reflect → Assess → Next Quest
```

This mirrors the scientific method applied to personal growth—observe, hypothesize, experiment, analyze, and refine your understanding. [Read more about the learning process](./docs/LEARNING_METHOD.md).

---

## 🧠 Architecture
- `CharacterCreator.tsx` – AI Mentor Generator
- `QuestCreator.tsx` – Questsmith Engine
- `ConversationView.tsx` – Socratic Dialogue Runtime
- `QuestQuiz.tsx` – Assessment & Mastery Engine
- `HistoryView.tsx` – Reflection Archive
- `CareerRoute.tsx` – Career Pathfinder (in development)

**Tech Stack**
| Layer | Tools |
|-------|-------|
| **Frontend** | React, Tailwind, Vite |
| **AI Integration** | Google Gemini (2.5 Flash / Imagen 4.0) |
| **Backend** | Supabase (Auth, DB, Storage) |
| **Storage** | Encrypted local storage + Supabase sync |
| **Media** | Imagen 4.0 scenes, Gemini Live voice + ambient audio hooks |

---

## 🚀 Getting Started
1. **Prerequisites**
   - Node.js 18+
   - npm 9+
   - Supabase project (optional, required for auth/storage features)

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   - Copy `.env.example` (when available) to `.env.local`.
   - Provide keys for Google Gemini, Supabase, and any optional integrations referenced in [`supabaseClient.ts`](./supabaseClient.ts).

4. **Run the development server**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000` to explore the app.

5. **Testing**
   ```bash
   npm run test
   ```

6. **Production build**
   ```bash
   npm run build
   npm run preview
   ```

---

## 🗂️ Project Structure
```
.
├── App.tsx / index.tsx     # SPA shell and routing
├── components/             # Feature views and shared UI widgets
├── hooks/                  # Supabase auth, Gemini Live audio, realtime state
├── supabaseClient.ts       # Supabase helpers and configuration
├── docs/                   # Strategy, pedagogy, and roadmap documents
├── audio/, img/            # Static media assets
└── tests/ (planned)        # Future automation helpers
```

---

## 📚 Documentation & Strategy
Dive deeper into SotA’s philosophy and plans:

| Document | Purpose |
|----------|---------|
| [`docs/MANIFESTO.md`](./docs/MANIFESTO.md) | Philosophical foundation and educational principles. |
| [`docs/SOTA_CORE_GOAL.md`](./docs/SOTA_CORE_GOAL.md) | Core problem, solution, and value proposition. |
| [`docs/SOTA_MISSION_STATEMENT.md`](./docs/SOTA_MISSION_STATEMENT.md) | Mission, solution framing, and long-term vision. |
| [`docs/LIVING_EDUCATIONAL_OS.md`](./docs/LIVING_EDUCATIONAL_OS.md) | Defines the “Living Educational OS” paradigm. |
| [`docs/LEARNING_METHOD.md`](./docs/LEARNING_METHOD.md) | Maps the SotA loop to the scientific method. |
| [`docs/CAREER_PATHFINDER.md`](./docs/CAREER_PATHFINDER.md) | Details the upcoming career guidance experience. |
| [`docs/studentpromptpack.md`](./docs/studentpromptpack.md) | Ready-to-use prompts for learners and educators. |
| [`docs/ISSUE_PRIORITIZATION.md`](./docs/ISSUE_PRIORITIZATION.md) | Current implementation priorities drawn from open issues. |
| [`docs/ROADMAP.md`](./docs/ROADMAP.md) | Milestones and acceptance criteria for upcoming releases. |

For design processes and multi-hour implementation approaches, see [`docs/codex_exec_plans.md`](./docs/codex_exec_plans.md).

---

## 🛣️ Roadmap Snapshot
- **North Star**: Deliver a magical quest-driven learning loop with goal setting → Socratic dialogue → mastery quiz → next-step recommendations.
- **Immediate Priorities** (from [`docs/ISSUE_PRIORITIZATION.md`](./docs/ISSUE_PRIORITIZATION.md))
  1. Replace local storage with Supabase-backed authentication and persistence.
  2. Track dynamic curricula across quests and goals.
  3. Implement AI progress tracking, mastery signals, and next-step quest chains.
  4. Unlock shared content libraries and class experiences once persistence is stable.

Explore the full [product roadmap](./docs/ROADMAP.md) for detailed milestones and status.

---

## 🤝 Contributing
We welcome contributions across pedagogy, product, and engineering.

1. Fork the repository and clone your copy.
2. Create a branch: `git checkout -b feat/my-feature`.
3. Install dependencies and run the app locally (`npm run dev`).
4. Write tests when adding new behaviors (`npm run test`).
5. Commit using [Conventional Commits](https://www.conventionalcommits.org/): `feat: add mentor archetype selector`.
6. Submit a pull request with screenshots or screen recordings for UI changes, plus a test plan.

Check open discussions under **Issues → Philosophy** or **Product Ideas** to coordinate work and share reflections, prompts, or mentor templates.

---

## 🌍 Community Vision
> **Education should not end with answers. It should begin with better questions.**

Our long-term vision is to build a **universal academy of wisdom**—where every human and AI can learn, reflect, and evolve through dialogue. Join us in reviving the world’s ancient schools of wisdom for the AI age.

> *Learning, like the soul, should be infinite.*
