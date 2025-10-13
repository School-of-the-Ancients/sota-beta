# Quest Flow (State Machine & UX)

_Last updated: 2025-10-04_

This doc defines the **single learning loop**: start → teach → reflect → quiz → complete. The flow is event-driven and idempotent so we can recompute UI from state.

---

## States

- **DRAFT** — Quest created but not started (no learning content delivered).
- **IN_PROGRESS** — Teaching/Dialogue in progress.
- **REFLECTION** — Short reflection prompts (optional) before quiz.
- **QUIZ** — 3–5 item mastery check.
- **COMPLETE** — Passed quiz OR quest marked complete (no quiz path).
- **NEEDS_REVIEW** — Quiz failed; route learner to weak topics and allow retry.

> A quest must always end in **COMPLETE** or **NEEDS_REVIEW**. Never “hang” in IN_PROGRESS.

---

## Events

- `quest/create(payload)` — from UI or generator.
- `quest/start()` — first learning turn renders; transition → IN_PROGRESS.
- `lesson/next(topicId)` — deliver next chunk/section.
- `lesson/endOfSection()` — safe point to show **one** suggestion (throttled).
- `quest/finish()` — user presses “Finish Quest” → REFLECTION (if enabled) else QUIZ or COMPLETE.
- `reflection/submit(answers)` — transition → QUIZ (if configured).
- `quiz/submit(result)` — pass → COMPLETE; fail → NEEDS_REVIEW.
- `quest/review()` — jump to targeted remediation content; after review, allow `quiz/retry()`.
- `quest/delete()` — removes quest and recomputes progress counters.
- `quest/archive()` — hides from active lists, keeps history.

---

## State Diagram (ASCII)

```
DRAFT
  | quest/start
  v
IN_PROGRESS -- lesson/endOfSection --> (suggest once)
  | quest/finish
  v
REFLECTION -- reflection/submit --> QUIZ
  | (if reflection disabled)
  v
QUIZ -- pass --> COMPLETE
  |
  '-- fail --> NEEDS_REVIEW -- quest/review --> QUIZ (retry)
```

---

## Suggestion Cadence (anti-spam)

- Show **at most 1** suggestion UI per `lesson/endOfSection`.
- Never push suggestions after **COMPLETE/NEEDS_REVIEW**.
- Provide a **“Suggest next step”** button for manual pull.

---

## UI Contracts (minimum)

- **Header**: title, mentor (ancient), progress dots (% of sections).
- **Footer**: primary action advances flow (`Next`, `Finish`, `Start Quiz`, `Retry Quiz`).
- **Endcard (COMPLETE)**: score (if quiz), summary, badge(s), **Next quest** CTA.

---

## Telemetry (MVP)

- `quest_started`, `section_completed`, `suggestion_shown`, `quest_finished`,
  `quiz_started`, `quiz_passed`, `quiz_failed`, `quest_completed`.

---

## Acceptance Criteria

- Starting a quest flips state to **IN_PROGRESS** and renders the first section.
- Hitting **Finish** transitions to REFLECTION (if enabled) or QUIZ.
- Submitting quiz with passing score marks **COMPLETE**, persists, stops suggestions.
- Deleting a quest removes it from lists and **recomputes** counters from store/DB.
- Reloading the page reconstructs the exact state and available actions.

---

## Developer Notes

- Keep state in a single source (`Quest.state` + `QuestProgress`).
- Derive UI booleans (`canFinish`, `canRetry`) from state; avoid scattered flags.
- Suggestions should read the current `topicId` + history to avoid repeats.
