# 📚 School of the Ancients 

> *Old world wisdom. New world classroom.*  
> An open-source **Living Educational Operating System** that merges ancient philosophy with modern AI to create a personalized, adaptive, and Socratic learning experience.

![School of the Ancients screenshot](sota-beta.png)

---

## 🏛️ Overview

School of the Ancients (SotA) revives the timeless methods of learning — dialogue, mentorship, reflection — and reimagines them for the AI age.  
Students don’t consume lessons. They *create quests*, summon *mentors*, and engage in *Socratic conversations* that grow their understanding over time.

Every curiosity becomes a course.  
Every learner builds their own academy.

---

## ✨ Key Features

| Feature | Description |
|----------|-------------|
| **Find Your Goal** | Reflective dialogue to uncover each learner’s purpose before learning begins. |
| **Dynamic Quests** | Personalized quests created from any learning goal. |
| **AI Mentors** | Historically inspired AI teachers who guide students through Socratic dialogue. |
| **Socratic Dialogue Engine** | A question-based learning model that evaluates understanding in real time. |
| **Questsmith & Mentor Kernel** | Systems that generate new quests and mentors dynamically. |
| **Career Pathfinder** | Analyzes all learning to propose meaningful career directions and next-step skills. |
| **Living Curriculum** | Each learner’s path evolves from their own curiosity and reflections. |

---

## 🧠 Architecture Overview

The system operates as a **living loop** of learning:

```
Find Goal → Create Quest → Summon Mentor → Dialogue → Reflect → Assess → Next Quest
```

### Core Modules
- `CharacterCreator.tsx` – AI Mentor Generator  
- `QuestCreator.tsx` – Questsmith Engine  
- `ConversationView.tsx` – Socratic Dialogue Runtime  
- `QuestQuiz.tsx` – Assessment & Mastery Engine  
- `HistoryView.tsx` – Reflection Archive  
- `CareerRoute.tsx` – Career Pathfinder (in development)

---

## ⚙️ Tech Stack

| Layer | Tools |
|--------|-------|
| **Frontend** | React, Tailwind, Vite |
| **AI Integration** | Google Gemini (2.5 Flash / Imagen 4.0) |
| **Backend** | Supabase (Auth, DB, Storage) |
| **Data Storage** | Encrypted local storage + cloud sync supabase |
| **Environment Engine** | Imagen 4.0 for visual scenes + ambient audio |
| **Voice** | Gemini Live + custom hooks (`useGeminiLive`, `useAmbientAudio`) |

---

## 📁 Documentation Index

| File | Purpose |
|------|----------|
| [`MANIFESTO.md`](.docs/MANIFESTO.md) | The philosophical foundation — “A Living Educational OS.” |
| [`CAREER_PATHFINDER.md`](.docs/CAREER_PATHFINDER.md) | Maps learning data to ideal careers and new quests. |
| [`LEARNING_METHOD.md`](.docs/LEARNING_METHOD.md) | Connects SotA to the scientific method — learning as experimentation. |
| [`ROADMAP.md`](.docs/ROADMAP.md) | Version milestones and implementation plan. |


---

## 🜂 Core Philosophy

> **Education should not end with answers.**  
> It should begin with better questions.

SotA returns learning to its ancient roots — curiosity, conversation, and character — while giving every student a personal mentor, unique curriculum, and infinite room to grow.

---

## 🌍 Contribute

- Fork the repo: `github.com/School-of-the-Ancients/sota-beta`  
- Join discussions under **Issues → Philosophy or Product Ideas.**  
- Share reflections, prompts, or new mentor templates.

---

## 🧭 Vision

To build a **universal academy of wisdom** — where every human and AI can learn, reflect, and evolve through dialogue.

> *Learning, like the soul, should be infinite.*

