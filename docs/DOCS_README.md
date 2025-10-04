# School of the Ancients — `docs/`

_Last updated: 2025-10-04_

This folder is the **source of truth for specs** that define how the app should behave. Day‑to‑day status and ownership live in GitHub **Issues**, **Milestones**, and the **Project** board. Use these docs to understand the product’s learning loop, data model, and acceptance criteria before you pick up an issue.

---

## What lives here

- **[ROADMAP.md](./ROADMAP.md)** — high‑level milestones (Beta Stabilization, MVP v0.1, Post‑MVP) and what “done” means for each.
- **[QUEST_FLOW.md](./QUEST_FLOW.md)** — the state machine from *start → teach → reflect → quiz → complete*; events, UI contracts, and suggestion cadence.
- **[PROGRESS_MODEL.md](./PROGRESS_MODEL.md)** — data model, persistence rules (local → cloud), recompute logic, and badges.
- **[QUIZ_MVP_SPEC.md](./QUIZ_MVP_SPEC.md)** — 3–5 question mastery check with pass/fail, review & retry.

> If you’re adding a new capability, place its spec here and link it from this README.

---

## How these docs relate to GitHub

- **Issues** capture *work items* with labels (`priority:*`, `type:*`, `area:*`) and **acceptance criteria** drawn from these docs.
- **Milestones** map to ROADMAP goals (e.g., *Beta Stabilization*). If scope changes, update the doc **and** the milestone.
- **PRs** must reference the issue and check off the acceptance list in `.github/pull_request_template.md`.

---

## Contributing workflow (short)

1. **Read** the relevant spec(s) in `docs/`.
2. **Open/claim an issue** and ensure it has acceptance criteria.
3. **Implement** the smallest valuable slice (land thin, often).
4. **Update docs** if the behavior or data model changed.
5. **Submit PR** referencing the issue and include a quick demo (GIF/screenshot).

> If a spec is unclear, propose edits in the PR or open a `type:docs` issue.

---

## Conventions

- **Single source of truth:** State and counts are *derived*, not duplicated. Recompute from records; avoid drifting counters.
- **Explicit end states:** Every quest ends in **COMPLETE** or **NEEDS_REVIEW**—no dangling flows.
- **Suggestion hygiene:** Suggestions appear at section boundaries or on explicit user action (no spam).
- **Accessibility:** Keyboard‑first, labeled controls, and clear focus states.

---

## Adding new docs

When introducing a new area, use this pattern:

```
docs/
├─ <AREA_NAME>/                # optional subfolder for large areas
│  ├─ OVERVIEW.md              # high-level goals, user value
│  ├─ SPEC.md                  # API, state, data model
│  └─ TEST_PLAN.md             # acceptance tests, QA notes
└─ <NEW_SPEC>.md               # for smaller additions
```

And link the new spec here under **What lives here**.

---

## Quick links

- Issues: https://github.com/School-of-the-Ancients/sota-beta/issues
- Project: *(create a milestone-filtered board for “Beta Stabilization”)*
- PR template: `.github/pull_request_template.md`
- Issue templates: `.github/ISSUE_TEMPLATE/*`

---

## License & attribution

Unless noted otherwise, documentation is released under the repository’s license. Content may incorporate summaries of primary educational philosophies and in‑project research notes.
