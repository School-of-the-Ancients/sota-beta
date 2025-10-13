
# Career Pathfinder — Turning Curiosity into a Calling

> **Feature goal**: Over time, analyze a learner’s quests, conversations, and mastery to infer **ideal careers** and suggest **next-step skills, quests, and credentials**.  
> _“Based on everything you’ve wanted to learn, a great fit could be **X**. To move toward this path, consider learning **Y**, practicing **Z**, and exploring **these quests**.”_

---

## Why this belongs in SotA
School of the Ancients is a **living educational operating system**: it observes what the learner *chooses* to learn and regenerates their path. Career Pathfinder closes the loop by translating **patterns of curiosity** into **purposeful directions** — apprenticeships, majors, projects, and roles.

---

## Summary
- **Input signals**: quests & focus points, mentors/domains, transcript topics, quiz mastery, time-on-task.
- **Model**: build a *Learner Interest Vector* + *Skill Evidence Map* → match to a **Career Ontology**.
- **Output**: ranked careers (with confidence), rationale from evidence, skill gaps, suggested quests & resources, optional academic or project roadmap.
- **UX**: a new `/career` view: “**Your emerging paths**”. Export as PDF for advising or applications.

---

## Data & Signals

| Signal | Source | Notes |
|---|---|---|
| Quest topics & focus points | `Quest` objects | Strong evidence of *what* the learner pursued. |
| Mentor domains | `Character.expertise`, mentor selection | Encodes learning *style* (empirical, ethical, canonical, craft, integrative). |
| Transcript concepts | `ConversationTurn[]` | N-gram / embedding topics; detects persistent interests. |
| Mastery | `QuestAssessment`, `QuizResult` | Confidence & depth; maps to skills. |
| Time & repetition | session counts, durations | Commitment indicator. |

**Integration points in current codebase**  
- Conversations + quest assessments are already saved when a session ends (see `handleEndConversation`), which updates history and completed quest IDs.  
- Quests are created from goals and paired with mentors, storing clear `objective` and `focusPoints`.  
These give us rich, structured signals without extra user input.

---

## Minimal Schema Additions

```ts
// types.ts (new)
export type CareerSuggestion = {
  id: string;               // e.g., "ml_engineer"
  title: string;            // "Machine Learning Engineer"
  confidence: number;       // 0..1
  rationale: string[];      // evidence strings
  top_skills: string[];     // inferred strengths
  gaps: string[];           // prioritized gaps
  next_quests: string[];    // quest IDs or prompts to generate
  resources?: { label: string, url: string }[];
};

export type CareerProfile = {
  updatedAt: number;
  suggestions: CareerSuggestion[];
  interest_tags: string[];           // frequent topics
  skill_evidence: Record<string, number>; // skill -> score
};
```

```ts
// UserData (extend)
career?: CareerProfile;
```

---

## Matching Algorithm (v1, language-model + tags)

1. **Aggregate evidence**
   - Collect all `Quest.focusPoints`, `Quest.objective`, mentor `expertise`, transcript keywords, passed quizzes.
2. **Normalize → tag & embed**
   - Tag to canonical skill labels (e.g., `python`, `statistics`, `ethics`, `design_thinking`).  
   - Optionally embed strings (MiniLM/all-MPNet) to cluster semantically.
3. **Score strengths & gaps**
   - Strength = recency-weighted frequency × mastery (pass) × depth (conversation length).
   - Gaps = career-required skill − strength score.
4. **Map to Careers**
   - Maintain a simple JSON **Career Ontology** (v1) with required skills and helpful skills per role.
5. **Rank & explain**
   - Confidence = coverage of required skills × evidence strength × consistency across time.
   - Produce natural-language rationale citing the strongest evidence.
6. **Generate suggestions**
   - For the top 1–3 roles: propose **next quests** (auto-generate with Questsmith), projects, and resources.
7. **Persist profile** and show in `/career` view. Recompute **weekly** or after N new quests.

---

## Career Ontology (starter JSON)

```json
{
  "ml_engineer": {
    "title": "Machine Learning Engineer",
    "required": ["python", "linear_algebra", "statistics", "ml_fundamentals"],
    "helpful": ["deep_learning", "data_engineering", "ethics_ai", "cloud"]
  },
  "data_analyst": {
    "title": "Data Analyst",
    "required": ["sql", "statistics", "excel_basics", "data_viz"],
    "helpful": ["python", "dashboarding", "domain_knowledge"]
  },
  "xr_edu_designer": {
    "title": "XR Educational Designer",
    "required": ["instructional_design", "storyboarding", "ux", "unity_unreal_basics"],
    "helpful": ["assessment_design", "ai_tutoring", "3d_assets"]
  }
}
```

> Keep it editable in `/data/careers.json` so the community can PR new paths.

---

## Route & UI

- **New route**: `/career` — **Career Pathfinder**  
  - **Top section**: “Based on your learning trail, here are your emerging paths.”  
  - Cards (1–3): Title, confidence, rationale bullets, **Next Quests** (buttons), “Fill the gaps” chips.  
  - **Export**: “Download career brief (PDF)” for advising / applications.
- **Entry points**:  
  - Home hub tile: “**Your Emerging Paths**”  
  - HistoryView “Next steps → Create quest” also links “Add to career plan.”
- **Copy examples**:  
  - “Your curiosity consistently returns to *algorithmic thinking, experimentation, and ethics in AI*. You passed 4 quests in these themes. A great fit could be **Machine Learning Engineer**.”  
  - “To move toward this path: **Reinforcement Learning**, **SQL for Data**, **Cloud Pipelines**. Start with these quests →”

---

## Prompt Templates (LLM)

**1) Interest extraction**
```
You are a skill-mapper. Given quests (title, objective, focusPoints), mentor expertise, selected transcript snippets, and quiz passes, return:
{
  "tags": string[],      // canonical skills/areas
  "evidence": string[]   // 3-8 short evidence bullets (quote or paraphrase)
}
Canonicalize tags into a small set (e.g., "python", "statistics", "ethics_ai", "unity_unreal_basics").
```

**2) Career mapping**
```
You are a career matcher. Using the learner tags and the Career Ontology (JSON provided), rank 3 roles:
For each: confidence (0..1), rationale bullets citing evidence, top_skills, gaps (missing or weak tags).
Return CareerProfile.suggestions (JSON).
```

**3) Quest generation for gaps**
```
You are the Questsmith. For each "gap" skill, craft a short quest (title, objective, 3-5 focusPoints, duration) that matches the learner's style (empirical/ethical/canonical/craft) observed from their mentors.
```

---

## Scheduling

- Recompute:  
  - after **ending a conversation** with a quest, or  
  - every **Sunday** (RRULE weekly).  
- Store `career.updatedAt` to debounce compute.

---

## Privacy, Consent, and Controls

- **Explain**: “We analyze only your SotA learning data to suggest paths. You can turn this off anytime.”  
- **Toggle**: Settings → “Enable Career Pathfinder” (default ON).  
- **Delete**: “Clear career profile” button.  
- **Export**: PDF career brief with data snapshot.

---

## Acceptance Criteria (v1)

- [ ] New `/career` view shows at least 1 suggestion after 3+ quests.  
- [ ] Confidence score matches evidence strength (deterministic formula).  
- [ ] Suggestions include **at least two** actionable next quests.  
- [ ] Export PDF works and includes rationale & roadmap.

---

## Nice-to-haves (v1.1+)

- Multi-mentor ensemble viewpoints (“Socrates vs. Ada on your path”).  
- Labor market context (optional, privacy-first).  
- Faculty/mentor human review mode.  
- Time-series “you are trending toward…” visualization.

---

## Implementation Hooks

- **When to compute**: append to `handleEndConversation` and in a weekly task.  
- **Where to render**: new `CareerRoute`.  
- **Where to store**: `UserData.career` in Supabase; keep intermediate artifacts client-side only.  
- **How to keep prompts auditable**: store prompt templates in `/prompts/career/` with versioning.

---

**One-sentence value prop**  
> *Career Pathfinder turns your learning trail into a compass — revealing the roles your curiosity is already training you to fill, and the next quests to get you there.*
