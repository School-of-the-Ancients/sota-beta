# School of the Ancients — Roadmap

_Last updated: 2025-10-04_

This roadmap keeps contributors aligned on **what’s next** and **what “done” means**. Status/ownership lives in GitHub Issues + Project. This doc captures scope, acceptance criteria, and guardrails.

---

## North Star
Deliver a sticky **Quest-Driven Learning** loop:
1) Choose/auto-generate a quest →  
2) Socratic teaching with dynamic suggestions →  
3) Short mastery **quiz** →  
4) **Completion** state + **progress** & next-step recommendation.

If this loop feels magical, everything else is additive.

---

## Milestones

### 🔴 Beta Stabilization — **due Oct 14, 2025**
Stabilize quest completion, progress counters, suggestion cadence, and quiz MVP.

**Goals**
- Quests reliably enter a **Complete** state.
- Progress is accurate across home/board/panel.
- Suggestions are helpful, not spammy.
- A minimal mastery **quiz** exists for at least one quest template.

**Acceptance tests**
- After final lesson is delivered → UI shows **Quest Complete** banner, persists completion, and stops auto-continuation.
- Creating/deleting quests updates counts consistently everywhere.
- Suggestions appear only on explicit user action or section boundaries.
- Quiz: 3–5 questions, pass gate, result saved; failing shows a review path.

**Tracking**
- Milestone: _Beta Stabilization_  
- Labels: `priority:P0`, `area:quests`, `area:progress`, `area:ai`, `type:bug|feature`

---

### 🟡 MVP v0.1 — **target Oct 31, 2025**
Public-demo quality with account sync.

**Scope**
- Auth + cloud persistence (users, quests, progress)
- Progress panel with badges & next-quest recommendation
- Quiz component generalized across subjects
- Basic analytics/telemetry (errors, completion rate)

**Tracking**
- Milestone: _MVP v0.1_  
- Labels: `priority:P1`, `area:auth`, `area:progress`, `area:ui`, `type:feature`

---

### 🟢 Post-MVP Backlog
Enhancements queued after MVP.

**Candidates**
- Multi-instructor “Curriculum Classes” (handoffs between ancients)
- Import/export + library of user-created quests/characters
- User uploads (notes/assets) with quotas and abuse guards
- Richer learning mediums (inline code panes, stepper labs)
- Accessibility polish, performance budgets, caching

**Tracking**
- Milestone: _Post-MVP Backlog_  
- Labels: `priority:P2` + relevant `area:*`

---

## Workstreams & Specs

### 1) Quest Flow (`area:quests`)
_State machine & UX from start → teach → reflect → quiz → complete._

**Done when**
- A quest always terminates in a **Complete** or **Needs Review** state.
- A “Finish quest” control exists; on finish, auto-offers quiz if configured.
- Endcard shows summary + next recommendation.

**Refs**
- `docs/QUEST_FLOW.md` (add detailed states & events)

---

### 2) Progress Model (`area:progress`)
_Persistence rules and counts across surfaces._

**Done when**
- Single source of truth (localStorage → DB when authed).
- Counters recompute from persisted records (no drift).
- Progress panel shows: completed quests, streak, badges, next steps.

**Refs**
- `docs/PROGRESS_MODEL.md` (schema + recompute logic)

---

### 3) Quiz MVP (`area:quests`, `area:ui`)
_Short mastery checks anchored to quest objectives._

**Done when**
- Component supports MCQ + short-answer (rubric-scored).
- Pass/fail threshold configurable (default 60%).
- Results persisted; failing suggests targeted review.

**Refs**
- `docs/QUIZ_MVP_SPEC.md` (components, data model, rubrics)

---

### 4) Auth & Sync (`area:auth`, `area:infra`)
_Minimal accounts and cloud persistence._

**Done when**
- Users can sign in (OAuth or magic link).
- Quests/progress sync to DB; local → cloud migration path exists.
- Basic rate-limits & abuse safeguards in place.

---

## Labels (triage rules of thumb)

- **Priority**
  - `priority:P0` — Ship-blocker. Impacts core loop or data integrity.
  - `priority:P1` — MVP must-have. Needed for demo-quality.
  - `priority:P2` — Nice-to-have. Post-MVP.

- **Type**
  - `type:bug` / `type:feature` / `type:chore` / `type:docs`

- **Area**
  - `area:quests` / `area:progress` / `area:auth` / `area:ui` / `area:ai` / `area:infra`

- **Workflow helpers**
  - `status:needs-repro`, `status:blocked`, `good first issue`, `help wanted`

---

## Definition of Done (DOD)
- Meets **Acceptance criteria** in its issue.
- Tests or reproducible manual steps included.
- No console errors; basic accessibility pass.
- Docs updated (`/docs` or README).
- Added to/changelogged in the Project board.

---

## How to contribute
- Pick an issue, comment “I’m on it”, link a draft PR early.
- Use the PR template; keep changeset minimal.
- If scope creeps, cut follow-ups and land the smallest valuable slice.
