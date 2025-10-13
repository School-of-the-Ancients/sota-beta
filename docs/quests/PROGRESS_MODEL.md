# Progress Model & Persistence

_Last updated: 2025-10-04_

Defines the data model for **quests**, **progress**, **badges**, and how counts are computed across Home/Board/Panel.

---

## Data Model (TypeScript)

```ts
export type QuestState = "DRAFT" | "IN_PROGRESS" | "REFLECTION" | "QUIZ" | "COMPLETE" | "NEEDS_REVIEW";

export interface Quest {
  id: string;                 // uuid
  title: string;
  mentor: string;             // "Socrates", "Ada Lovelace", ...
  subject: string;            // "CSCI 3308", "Algebra", etc.
  objectives: string[];       // learning targets; used to seed quiz
  sections: Section[];        // ordered teaching blocks
  createdAt: string;          // ISO
  updatedAt: string;          // ISO
  state: QuestState;
  config?: {
    reflectionEnabled?: boolean;
    quizEnabled?: boolean;
    passThreshold?: number;   // default 0.6
  };
}

export interface Section {
  id: string;
  title: string;
  topicId?: string;           // optional mapping to knowledge unit
  completed: boolean;
}

export interface QuizResult {
  attemptId: string;
  questId: string;
  scoreRatio: number;         // 0..1
  totalQuestions: number;
  correct: number;
  passed: boolean;
  timestamp: string;          // ISO
}

export interface ProgressRecord {
  questId: string;
  state: QuestState;
  completedAt?: string;       // set when COMPLETE
  lastSectionIndex: number;   // -1 before start
  attempts: number;           // quiz attempts
  lastQuiz?: QuizResult;
  nextRecommendation?: {
    questId?: string;
    topicId?: string;
    label: string;
  };
}

export interface Badge {
  id: string;
  title: string;
  criteria: string;           // human text
  earnedAt: string;           // ISO
}

export interface UserProgressSummary {
  userId: string;
  questsCompleted: number;
  activeQuests: number;
  streakDays: number;         // optional
  badges: Badge[];
}
```

---

## Persistence Strategy

- **Unauthenticated**: `localStorage` keys
  - `sota/quests` → `Quest[]`
  - `sota/progress` → `Record<questId, ProgressRecord>`
  - `sota/badges` → `Badge[]`

- **Authenticated**: Cloud DB (Supabase/Firebase), tables:
  - `users(id, created_at, ...)`
  - `quests(id, owner_id, title, mentor, subject, objectives jsonb, sections jsonb, state, created_at, updated_at, config jsonb)`
  - `progress(id, user_id, quest_id, state, last_section_index, completed_at, attempts, last_quiz jsonb, next_recommendation jsonb, updated_at)`
  - `badges(id, user_id, title, criteria, earned_at)`

**Rule:** Do not maintain counters in multiple places. **Recompute** from records.

---

## Recompute Logic (deterministic)

- `questsCompleted = count(progress where state == "COMPLETE")`
- `activeQuests = count(progress where state in ("IN_PROGRESS","REFLECTION","QUIZ","NEEDS_REVIEW"))`
- Progress % for a quest:
  - `sectionsDone / totalSections` if not completed
  - `1.0` if state == COMPLETE

---

## Integrity Invariants

- `ProgressRecord.state` mirrors `Quest.state`.
- On `quest/delete`: remove `Quest`, its `ProgressRecord`, and recompute summary.
- Only **one** `ProgressRecord` per (`userId`,`questId`).

---

## Badges (MVP)

- **First Steps** — complete your first quest.
- **Steady Scholar** — 3 quests completed.
- **Mastery Unlocked** — score ≥ 80% on any quiz.

Award on transitions; keep badge criteria simple and transparent.

---

## Acceptance Criteria

- Deleting a quest **always** updates counts everywhere on next recompute.
- A completed quest remains completed across reloads and devices (when authed).
- The Progress Panel renders from `UserProgressSummary` only—no ad-hoc math in UI.
- Local → Cloud migration preserves completion state and quiz history.
