# Student Progress Feature Design

## Goals
- Present an at-a-glance understanding of each student's advancement across learning quests.
- Recommend the next quests or practice activities based on mastery gaps.
- Motivate continued learning by granting adaptive badges and achievements generated from dynamic prompts.

## Core Concepts
- **Quest**: A learning unit with objectives, completion criteria, and optional mastery rubric.
- **Progress Event**: Timestamped record emitted by AI observers when a student attempts, completes, or revisits quest tasks.
- **Mastery Profile**: Aggregated competency scores per subject, derived from progress events and rubric evaluations.
- **Achievement**: Dynamic badge built from prompt templates that summarize notable progress moments.

## Data Model
1. **ProgressEvent**
   - `id`, `studentId`, `questId`, `timestamp`.
   - `eventType`: `attempted`, `completed`, `reviewed`, `feedbackApplied`.
   - `evidence`: structured notes from AI observer (e.g., rubric scores, reflection snippets).
   - `delta`: normalized change in mastery produced by the observer.
2. **MasterySnapshot**
   - Stores `studentId`, `subjectId`, rolling `masteryScore` (0-1), decay factor, and last-updated timestamp.
3. **AchievementRecord**
   - `badgeId`, `studentId`, `promptSeed`, `issuedAt`, `criteria` metadata, `shareableSummary`.

Persist events in an append-only store (e.g., Supabase table or Firestore collection). Generate materialized views for snapshots to keep UI reads fast.

## Tracking Pipeline
1. **Observation Hook**: Extend the AI orchestration layer so each tutor session emits structured `ProgressEvent` objects whenever quests are suggested or completed. Centralize conversion logic inside a `useProgressObserver` hook to keep React components lean.
2. **Event Processor**: A serverless function (e.g., Cloud Functions or Vercel Edge) consumes events, normalizes scores, and updates `MasterySnapshot` entries using weighted averaging with recency decay.
3. **Mastery Engine**: Encapsulate subject-level models that map quests to competencies. When a quest completes, look up impacted subjects, apply the delta, and log rationale for auditing.
4. **Achievement Generator**: Upon significant milestones (first quest in subject, mastery threshold, streaks), call a prompt template service to craft personalized badge names, visuals, and summaries. Cache generated assets to avoid repetition.

## UI/UX Recommendations
- **Progress Dashboard**: Embed a `ProgressOverviewCard` showing mastery per subject, quest streaks, and recent badges. Use horizontal bar charts with color-coded mastery bands.
- **Quest Timeline**: A chronological feed sourced from `ProgressEvent` records, filterable by quest or subject. Inline feedback chips highlight AI observations.
- **Badge Gallery**: Masonry layout displaying earned achievements. Each badge card reveals the dynamically generated prompt description and unlock criteria.
- **Next Steps Panel**: Surfaces recommended quests by comparing current mastery gaps to available quest prerequisites.

## Badge Prompting Strategy
- Maintain templates in `suggestions.ts` such as `"Celebrate {studentName}'s {subject} breakthrough"` with placeholders for evidence and mastery jumps.
- Feed the prompt generator with structured context: quest objectives, deltas, student tone preferences.
- Rate-limit badge creation to avoid spam—require minimum mastery gain or streak length.

## Analytics and Feedback
- Log badge impressions and dashboard interactions to refine badge thresholds.
- Provide educators with exportable progress reports combining mastery trends and notable achievements.
- Surface AI uncertainty (e.g., low evidence confidence) so instructors can review and adjust.

## Implementation Notes
- Reuse shared types from `types.ts` by adding interfaces for events and snapshots.
- Introduce Vitest suites that mock `ProgressEvent` streams and assert mastery calculations.
- Store generated badge images under `img/badges/` with naming schema `studentId_badgeId.png`.
- Document manual QA steps in PRs until end-to-end automation exists.
