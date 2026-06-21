# rules-manual

Workflow and domain rules for AI agents on **KalBook**. Start at [`rules/AGENTS.md`](../rules/AGENTS.md).

## Active files

| File | Purpose |
|------|---------|
| [`kalbook-uiux.md`](./kalbook-uiux.md) | KalBook UI stack, patterns, review checklist |
| [`agent-skills/`](./agent-skills/) | Generic engineering workflow skills (spec → plan → implement → review) |

### agent-skills index

| Skill | When to load |
|-------|----------------|
| `using-agent-skills.md` | Session start — pick the right skill |
| `spec-driven-development.md` | New feature, unclear requirements |
| `planning-and-task-breakdown.md` | Break a spec into tasks |
| `incremental-implementation.md` | Multi-file work — ship in slices |
| `frontend-ui-engineering.md` | UI implementation quality bar |
| `api-and-interface-design.md` | API routes and contracts |
| `debugging-and-error-recovery.md` | Bugs and regressions |
| `code-review-and-quality.md` | Pre-merge review |
| `security-and-hardening.md` | Auth, input, secrets |

## Archived (do not use for KalBook)

Moved to [`_archive/`](./_archive/) — copied from another CRM project (Bootstrap/Tabler, `src/` layout, Outlook Graph, tutorial system). Kept for reference only.

## Relationship to `.cursorrules`

- **`.cursorrules`** — Vercel deployment safety (env vars, Edge, Supabase)
- **`rules/AGENTS.md`** — project map, stack, conventions
- **`rules-manual/`** — how to work (skills) + UI direction (`kalbook-uiux.md`)
