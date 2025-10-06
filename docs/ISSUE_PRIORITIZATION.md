# Issue Prioritization & Implementation Plan

_Last updated: 2025-10-06_

## Context
The open issues currently span backend accounts, curriculum intelligence, content sharing, and media integrations. Given the goal to graduate from local-only state and support real user accounts, we prioritize the foundational backend work before layering advanced pedagogy and multimedia features.

## Priority Stack (Highest to Lowest)
| Rank | Issue | Rationale |
| --- | --- | --- |
| 1 | #111 — Implement user login and backend instead of local storage | Blocks any persistent user experience, aligns with roadmap MVP requirement for auth + sync. |
| 2 | #118 — Track dynamic curriculum across quests/goals | Depends on backend; drives core learning loop by persisting progress and next-step recommendations. |
| 3 | #112 — Implement AI progress tracker, mastery, next-step quest chains, rewards | Builds on curriculum tracking; turns stored data into actionable feedback. |
| 4 | #120 — Implement curriculum classes (multi-instructor, multi-goal) | Extends curriculum once persistence & tracking exist; large scope so follow after foundation. |
| 5 | #114 — Implement database of user created characters/quests | Requires backend plus content schema; unlocks sharing ecosystem post-auth. |
| 6 | #113 — Implement character/quest downloads/uploads | Depends on shared database; follow #114 to expose import/export surface. |
| 7 | #116 — Implement user uploads | Needs auth, storage, moderation policies; pairs with content database after security guardrails. |
| 8 | #119 — Implement other mediums besides voice | Enhances UX but not blocked by backend; schedule after persistence-critical work. |
| 9 | #163 — Implement OpenAI Realtime Audio / Google Live toggle | Platform integration, independent of persistence but less urgent than curriculum progress. |
| 10 | #121 — Implement Sora 2 API | Future-looking enhancement; no immediate dependency but low urgency. |
| 11 | #108 — Historical accuracy issues in environments/diagrams | Bug fixes should be addressed opportunistically; not on critical path but monitor for severity. |

## Implementation Plan
### Phase 1 — Account & Persistence Foundation (Issue #111)
- **Requirements & Architecture**
  - Choose auth provider (e.g., Supabase, Firebase, custom OAuth) aligning with existing stack and roadmap’s MVP auth goals.
  - Define backend service boundaries (user profiles, quest records, progress snapshots) and hosting strategy.
- **Data Modeling**
  - Draft schemas covering users, quests, progress milestones, badges, uploads.
  - Plan migration path from current localStorage structure to cloud persistence with conflict resolution.
- **API & Integration**
  - Implement REST/GraphQL endpoints or use BaaS client SDK for CRUD operations.
  - Update frontend state management to sync with backend, including offline caching and optimistic updates.
- **Security & Compliance**
  - Establish roles/permissions, rate limiting, audit logging.
  - Document environment variables, secrets management, and onboarding steps.
- **Deliverables**
  - Backend deployed with CI/CD hooks.
  - Frontend login/signup UI with session handling.
  - Migration utility syncing existing quests for early adopters.

### Phase 2 — Curriculum & Progress Intelligence (Issues #118, #112, #120)
- **Dynamic Curriculum Tracking (#118)**
  - Formalize state machine for goals → quests → follow-on goals (sync with `docs/QUEST_FLOW.md`).
  - Store progression history and compute next recommendations server-side for consistency.
- **Progress Tracker & Rewards (#112)**
  - Implement analytics layer summarizing mastery, badges, streaks; expose via API.
  - Surface dashboards in UI, including notifications triggered by backend events.
- **Curriculum Classes (#120)**
  - Design schema for multi-instructor narratives and goal bundling.
  - Extend backend orchestration to support assignment of mentors and multi-goal progress rollups.
- **Deliverables**
  - Unified progress service powering dashboard and quest recommendations.
  - Documentation covering new data flows and failure handling.

### Phase 3 — Content Ecosystem (Issues #114, #113, #116)
- **Shared Quest Library (#114)**
  - Build backend endpoints for CRUD operations on community-created quests/characters with moderation workflows.
  - Implement discoverability UI components and search.
- **Import/Export Channels (#113)**
  - Define interchange format (JSON schema) with versioning for quests and characters.
  - Support uploads/downloads with validation and conflict resolution.
- **User Asset Uploads (#116)**
  - Add storage bucket integration with quotas, virus scanning, and content policy enforcement.
  - Provide UI for attaching assets within quests.
- **Deliverables**
  - Community library available post-auth with audit trails.
  - Documentation for creators to share/import content.

### Phase 4 — Experience Enhancements (Issues #119, #163, #121)
- **Multi-Medium Learning (#119)**
  - Prioritize mediums that benefit curriculum (code editors, whiteboards) leveraging new backend for state persistence.
- **Realtime Audio Toggle (#163)**
  - Abstract audio pipeline to swap between OpenAI Realtime and Google Live, with feature flags and analytics.
- **Sora 2 Integration (#121)**
  - Experiment with generative video for quest cutscenes; ensure alignment with storage & bandwidth budgets.
- **Deliverables**
  - Configurable media experiences tested with backend syncing.

### Ongoing — Quality & Accuracy (Issue #108)
- Establish data validation checks and curator review workflows to reduce hallucinations in environments/diagrams.
- Integrate feedback loops within curriculum tracking to flag inaccurate content for revision.

## Next Steps
1. Kick off Phase 1 spike: confirm backend stack, draft schemas, and produce ADR.
2. Create subtasks under Issue #111 for auth UI, API integration, migration tooling.
3. Align roadmap milestones with phases to communicate progress to stakeholders.
