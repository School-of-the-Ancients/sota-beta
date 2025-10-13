# Quiz MVP Specification

_Last updated: 2025-10-04_

A short mastery check that closes the loop and earns completion.

---

## Goals

- Validate learning with **3–5 questions** tied to quest objectives.
- Pass/fail gate decides **COMPLETE** vs **NEEDS_REVIEW**.
- Persist results and recommend the next step.

---

## Component API (React-ish)

```ts
type QuestionType = "mcq" | "short";

interface QuizQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[];      // for mcq
  answer?: number;         // index for mcq (kept server-side in prod)
  rubric?: string;         // for short answer guidance
  objectiveTag?: string;   // maps to quest objective for remediation
}

interface QuizConfig {
  passThreshold?: number;  // default 0.6
  maxQuestions?: number;   // default 5
}

interface QuizProps {
  questId: string;
  objectives: string[];
  generateQuestions: (args: {
    questId: string;
    objectives: string[];
    maxQuestions: number;
  }) => Promise<QuizQuestion[]>;

  onSubmit: (result: {
    correct: number;
    total: number;
    scoreRatio: number;
    passed: boolean;
    missedObjectiveTags: string[];
  }) => void;
}
```

---

## Question Generation (MVP)

- Build questions from a **small bank** seeded by objectives.
- If AI-generated, cache per quest to keep attempts consistent.
- Ensure at least one question touches each objective (if ≤ 5).

**MCQ rubric**
- One correct, 2–3 plausible distractors.
- Avoid “all of the above” and negation traps.

**Short answer rubric**
- 1–2 sentence expectation + keywords to check.
- Grade with simple keyword match (privacy-friendly) or model rubric check.

---

## Scoring

```
scoreRatio = correct / total
passed = scoreRatio >= passThreshold (default 0.6)
```

- Persist a `QuizResult` (see Progress Model).
- On **pass**: transition quest → COMPLETE, award badges if criteria met.
- On **fail**: transition → NEEDS_REVIEW and produce `missedObjectiveTags`.

---

## Review & Retry

- For each missed objectiveTag, show 1–2 targeted review prompts/sections.
- After review, enable **Retry Quiz** (new attempt with varied questions).

---

## UX Flow

1) User hits **Finish Quest** → (optional) Reflection → **Start Quiz**  
2) Quiz renders (3–5 Q)  
3) Submit → show score + pass/fail  
4a) **Pass** → Endcard with badge(s) + Next Quest recommendation  
4b) **Fail** → “Review weak areas” (chips per objective) → Retry Quiz

---

## Accessibility

- All controls reachable by keyboard.
- Associate labels with inputs.
- Live region for validation feedback.

---

## Telemetry

- `quiz_started`, `quiz_question_shown`, `quiz_submitted`, `quiz_passed`, `quiz_failed`, `quiz_retry`.

---

## Acceptance Criteria

- At least one objective is assessed; if objectives < 3, still render 3 Q using variants.
- Submitting computes `scoreRatio` correctly and sets state to COMPLETE or NEEDS_REVIEW.
- Results persist and appear on Progress Panel.
- Failing shows objective-based review chips and enables **Retry Quiz**.
- No duplicate suggestions after **COMPLETE**.

---

## Future (Post-MVP)

- Item difficulty & adaptive selection
- Confidence calibration (“How sure were you?”)
- Explanations for each answer
- Banked items per course with versioning
