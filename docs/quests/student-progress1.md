# Student Progress & Mastery Tracking Design

## Goals
- Provide learners with clear visibility into quest progress, subject mastery, and earned rewards.
- Equip the AI facilitator with structured context to adapt conversations and suggest next-step quests.
- Support future analytics and educator-facing dashboards without rewriting core data flows.

## Key Concepts
### Learning Quest
Represents a scoped set of objectives (e.g., "Foundations of Stoicism"). Each quest contains:
- `questId`, `title`, `summary`, `subjectTags`
- Ordered `milestones` (conversation prompts, artifact unlocks, or practice tasks)
- Optional `prerequisites` referencing completed quests or mastery levels

### Progress Snapshot
Per-user aggregate document capturing:
- `activeQuestId`
- `completedQuestIds`
- `milestoneProgress` map keyed by `questId`
- `subjectMastery` map storing `{ level: bronze|silver|gold|legendary, xp, lastUpdated }`
- `earnedBadges` array with issuance metadata (timestamp, description, icon prompt)

Snapshots are persisted to local storage initially; the interface supports swapping in server persistence later.

### Learning Signals
Standardized events emitted by the app:
- `CONVERSATION_TURN`: { characterId, questId?, subjectTags, aiAssessment }
- `MILESTONE_COMPLETED`: { questId, milestoneId }
- `QUIZ_SUBMITTED`: { subjectTag, score }
- `BADGE_AWARDED`: { badgeId, questId?, subjectTag? }

Signals feed both the UI (for live progress bars) and the AI context packager.

## Architectural Changes
1. **Progress Context Provider**
   - New hook `useProgressTracker` exposed via React context.
   - Handles loading/saving snapshots, dispatching learning signals, and computing derived state (percent complete, streaks).
   - Uses the existing `@/hooks` pattern and TypeScript types in `types.ts`.

2. **Quest Catalog Module**
   - Move static quest definitions into `constants/quests.ts` for reuse by onboarding, AI prompts, and the progress view.
   - Include Gemini prompt templates that summarize a learner's status and propose next quests.

3. **AI Context Integration**
   - When constructing system instructions, inject:
     ```text
     Active quest: {title}
     Milestones complete: {x}/{total}
     Mastery signals: {subjectMasterySummary}
     Suggested next milestone: {prompt}
     ```
   - Provide a reward hook that allows Gemini to suggest badge ideas; store as pending until validated client-side.

4. **UI Surfaces**
   - **Quest Drawer**: displays active quest, milestone checklist, and CTA to change quests.
   - **Progress Overview Screen**: timeline of completed quests, mastery badges, and streak calendar.
   - **Conversation HUD Chips**: lightweight indicators showing quest progress percentage and newly awarded badges.

## Data Flow Example
1. Learner selects "Unraveling Relativity" quest.
2. `useProgressTracker` sets `activeQuestId` and resets milestone progress.
3. During conversation, AI marks milestone completion via `learningSignal({ type: 'MILESTONE_COMPLETED', questId, milestoneId })`.
4. Hook updates snapshot, persists to storage, and triggers toast/UI updates.
5. Once quest milestones reach 100%, badge generator composes a prompt such as "Design a bronze-level Relativity Explorer badge featuring an abstract spacetime grid." Gemini returns artwork metadata stored alongside the badge.
6. AI receives updated mastery summary, enabling it to suggest the next quest or advanced topics.

## Mastery & Reward Logic
- Award XP per learning signal (e.g., +5 for thoughtful turn, +20 for milestone).
- Upgrade subject mastery tiers when XP thresholds are crossed (Bronze 0-99, Silver 100-249, Gold 250-499, Legendary 500+).
- For dynamic badge prompts, template the request with subject context, tone, and style preferences so AI-produced copy feels cohesive.

## Analytics & Educator Hooks
- Emit sanitized progress snapshots through a future sync API for classroom dashboards.
- Support optional educator notes on milestones to track qualitative feedback.

## Implementation Phases
1. **Foundation**: implement progress context, quest catalog, storage, and UI readouts.
2. **AI Collaboration**: feed progress into prompts, handle AI-suggested milestones, and confirm badge rewards.
3. **Gamified Layer**: add streaks, shareable achievements, and educator export tools.

By decoupling quest definitions, progress computation, and AI integration, the app can evolve toward richer mastery models without disrupting the conversational core.
