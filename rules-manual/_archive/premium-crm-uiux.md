# Premium CRM UI/UX Direction

Manual rule for UI design, review, and implementation on this project. Read together with [`AGENTS.md`](../rules/AGENTS.md). Where this file conflicts with installed upstream skills, **this file and AGENTS.md win**.

## Stack overrides (non-negotiable)

This CRM uses the locked stack from `AGENTS.md`:

- Next.js 14 App Router, React 18, TypeScript
- Bootstrap 5 + Tabler UI + `@tabler/icons-react`
- Custom CSS tokens in `src/app/globals.css`
- next-intl (Hebrew-first, RTL/LTR)
- FullCalendar, HugeRTE, Prisma, PostgreSQL API routes

**Do not introduce** Tailwind, shadcn, MUI, Radix, Framer Motion, Vite-specific patterns, glassmorphism, glow effects, or dark-dashboard aesthetics from upstream skills.

Installed skills in `.agents/skills/` are reference material only:

| Skill | Use for | Ignore from skill |
|-------|---------|-------------------|
| `frontend-design-review` | Quality pillars, review workflow, a11y bar | Figma/Storybook assumptions, decorative maximalism |
| `frontend-ui-dark-ts` | Token hierarchy, spacing scale, motion timing, focus/touch | Tailwind classes, Framer Motion, glass effects, dark theme defaults |

## Product diagnosis

The stack is not why the product feels less premium. Bootstrap exposes CSS custom properties, Tabler extends Bootstrap with theme variables, and Next.js App Router supports layouts plus server/client composition. The premium gap comes from information architecture, default styling, and interaction design — not framework capability.

Reference products that feel expensive win on **operational surfaces**, not decoration:

- **Linear** — curated views, triage, command menu, preview-on-demand
- **Superhuman** — split inboxes, reminders, command surface
- **Pipedrive** — pipeline-first deals, consolidated detail
- **Notion** — light chrome, one dataset in many views
- **Attio** — strong record pages, activity tied to the record

The redesign should behave like an **operations console**, not a generic dashboard. Visual grammar: **queue, row, detail pane, status chip, action toolbar, command palette, record page**. Progressive disclosure: show controls that matter now; hide the rest until selection or drill-down.

Likely causes of a “less premium” feel:

1. Landing experience is dashboard-like, not task-like
2. Bootstrap/Tabler defaults still visible in cards, shadows, spacing, icon density
3. Product explains too much instead of expressing state
4. AI is too visible instead of sitting behind explicit user actions

All fixable without changing the stack.

## Premium pattern research

| Product | Pattern | Why it works | How to adapt | What to avoid |
|---------|---------|--------------|--------------|---------------|
| Linear | Custom views, command menu, triage inbox, peek preview | Focused default surface; power users move fast from keyboard | Saved inbox queues, `Cmd/Ctrl+K`, keyboard selection, light detail pane | Issue-tracker jargon, excessive row metadata, developer-only density |
| Superhuman | Split inbox, reminders, command surface, Done | Priority as structure, not narrative | Sections: `Needs reply`, `Due today`, `Waiting`, `Snoozed` with counts | Consumer-email chrome, gesture-heavy desktop, too many inbox types |
| Pipedrive | Pipeline-first deals, consolidated detail, table view | Board for flow; table for bulk work | Board + table as first-class deal views; right-side detail panel | Rainbow stages, oversized cards, buried next actions |
| Notion | Light sidebar, hideable chrome, multiple views | Calm navigation; same data, different lenses | One underlying dataset with alternate views; narrow sidebar | Heavy document pages, too many shell widgets |
| Attio | Record pages, configurable layout, linked activity | Stable customer object + contextual workflow views | Customer detail: summary, open work, timeline, quotes, conversations | Home-screen summaries that belong on the record |

**Takeaway:** premium software uses quiet structure, not loud explanation. Rank silently; surface as queues, filters, counts, timestamps, states, and commands.

## Anti-AI rules and target principles

Ban UI patterns that personify the system. Model Linear, Superhuman, Pipedrive, and Notion: views, commands, sections, counts, direct actions — not conversational explanation.

**Banned → replacement**

| Banned | Replace with |
|--------|--------------|
| “AI thinks you should follow up” | `Needs reply` + `Reply`, or `Due today` + `Complete` |
| Recommendation cards | Sorted queues ordered by urgency |
| Sparkles, wands, gradients, glowing panels | Quiet iconography, restrained status badges |
| Chat-style surfaces | Command palette + detail pane |
| Long explanatory empty states | One sentence + one primary action |
| Auto-generated draft shown by default | Explicit `Draft reply` in thread toolbar |
| Color-heavy urgency | Neutral rows + small priority mark, relative date, count |

**Target UX principles**

1. Default screen = **operational surface**, not dashboard
2. **List/detail** for daily work; **board** only when stage motion is the job
3. Priority via **order, count, due date, ownership** before color
4. **Progressive disclosure** — row shows next move; pane shows context; overflow holds rare actions
5. Important actions reachable by **mouse, keyboard, and command palette**
6. UI speaks in **states**, never recommendations
7. One accent color; interface lives in neutrals
8. Optimistic actions feel instant; recover gracefully on failure
9. Same record visible across workflows; no duplicated data per screen
10. Direction-aware, keyboard-visible, reduced-motion-friendly from the start

**Product principle:** the system can be intelligent; the interface behaves like a professional operating system.

## Design quality pillars

Adapted from `frontend-design-review`. Use when building or reviewing any UI surface.

### 1. Frictionless insight to action

- Core task completable in ≤3 interactions where possible
- One clear primary action per view; secondary actions in toolbar overflow or command palette
- Every screen answers: “What can I do?” and “What happens next?”
- Clear entry/exit; back/cancel always available

**Red flags:** excessive clicks, competing primary buttons, buried actions, dead ends.

### 2. Quality is craft

- **Token discipline:** use `--crm-*` and mapped Bootstrap/Tabler variables; no hardcoded hex in components
- **Density:** consistent row heights, spacing scale, typography hierarchy
- **Motion:** CSS-only; fast and restrained (see Interaction section)
- **Accessibility:** WCAG 2.1 Grade C minimum; Grade B (AA) ideal — keyboard nav, focus rings, contrast, reflow

**Red flags:** generic AI aesthetics, hardcoded values, broken reflow, missing focus indicators, template Bootstrap cards everywhere.

### 3. Trustworthy building

- AI-generated content (e.g. draft replies) only via explicit action; no ambient AI copy
- Error messages actionable: what failed, what to do next, retry when applicable
- Optimistic updates with honest failure recovery

**Red flags:** assistant language, opaque errors, auto-shown generated text.

## Creative direction for this CRM

Before coding UI, commit to direction **within operational constraints**:

| Dimension | This CRM |
|-----------|----------|
| Purpose | Sales engineer triage, follow-up, pipeline, customer record |
| Tone | **Minimal, professional, dense** — not playful, maximalist, or decorative |
| Differentiation | Speed, clarity, keyboard workflow, Hebrew-first RTL polish |
| Density | Controlled density (Superhuman/Linear), not spacious marketing site |

**Apply from design-review skill**

- Cohesive palette via CSS variables; one accent + neutrals
- Intentional motion: selection and pane transitions only; respect `prefers-reduced-motion`
- Spatial composition: split panes, aligned rows, consistent gutters — not asymmetry for its own sake

**Reject for this product**

- Glassmorphism, glow shadows, gradient meshes, grain overlays
- Display fonts, decorative backgrounds, page-load stagger animations
- Inter/Roboto as “distinctive” choices — use existing system/body stack calmly
- Tailwind utility patterns or Framer Motion from `frontend-ui-dark-ts`

## Design review checklist

Use before approving UI work. Replace Figma/Storybook references with this project's sources.

### Design system compliance

- [ ] Uses semantic classes (`.crm-surface`, `.crm-row`, `.crm-pane`, `.crm-chip`, `.crm-toolbar`) or Bootstrap/Tabler primitives correctly
- [ ] Colors/spacing from `--crm-*` tokens mapped to `--bs-*` / `--tblr-*`; no stray hex in TSX/CSS
- [ ] Row height, typography, and chip style match Design system section below
- [ ] All interactive states present: default, hover, focus, disabled, loading, empty, error
- [ ] Deviations documented in PR if intentional

### Frictionless

- [ ] Core task ≤3 interactions where reasonable
- [ ] Single clear primary action per view
- [ ] Secondary actions in toolbar overflow or command palette

### Quality craft

- [ ] Accessible: keyboard complete, visible focus, sufficient contrast (Grade C min)
- [ ] Tested in Hebrew RTL and English LTR
- [ ] No template-card wrapping of list queues
- [ ] Skeleton loading for list + detail, not full-page spinners

### Trustworthy

- [ ] No assistant/recommendation language
- [ ] Draft/AI features explicit and secondary
- [ ] Errors inline with retry path

### Review output

When reviewing, score issues **blocking / major / minor** and cite which pillar failed. For full template see `.agents/skills/frontend-design-review/references/review-output-format.md`.

## Screen blueprints

### Inbox

**Purpose.** Default landing page. Triage, reply, follow-up creation, customer linking. Closer to Superhuman structured inbox + Linear triage-preview than mail client or admin table.

**Layout.** Two-pane workspace in slim app shell. List pane inline-start (360–420px desktop); detail pane takes remainder. Queue tabs with counts: `Needs reply`, `Assigned`, `Waiting`, `Snoozed`, `Done today`. Filter bar: owner, company, lead/deal/quote, search. No third permanent pane; customer context in detail header.

**Components.** `InboxList`, `InboxRow`, `InboxDetailPane`, `ActionToolbar`, `ThreadComposer`, `CustomerContextStrip`, `StatusBadge`, `PriorityIndicator`, `EmptyState`, `SkeletonRow`.

**Row content.** Sender/customer, subject, one-line snippet, relative time, ≤2 chips (`Quote`, `Lead`, `Overdue`, `Unlinked`). Unread = weight/contrast, not color block.

**Primary flow.** Open inbox → `Needs reply` first → arrow/click row → detail updates → toolbar: `Reply`, `Follow up`, `Task`, `Handled`, `Snooze`, `Link customer` → composer docked bottom → `Draft reply` secondary.

**Secondary actions.** Overflow/command palette: convert to lead/quote, reassign, note, open customer, attach deal, copy link.

**States.** Skeleton rows + skeleton detail; terse empty (“No threads need action.” + optional `Review waiting`); inline error banner + retry in detail pane.

**Mobile.** List first, detail second; sticky bottom action bar in thread view.

**RTL.** List on inline-start; logical CSS throughout; preserve email body direction inside viewer.

### Follow-ups

Disciplined queue manager, not “AI suggestions.” Sections: `Overdue`, `Due today`, `Upcoming`; optional `Waiting on customer`. Row: customer, linked thread/deal/quote, due date, last contact, crisp reason (`Quote sent`, `No reply after 3d`). Priority computed silently; exposed as order + chips only.

Actions: `Complete`, `Snooze`, `Open conversation`, `Open customer`; overflow: `Convert to task`, `Relink`, `Delete`. Neutral rows; muted amber for due today; muted red text for overdue only.

### Pipeline and deals

Board default on deals route; **table as equal toggle**. Compact board: stage name, count, value; cards show company, deal name, value, owner, next step due, age in stage. Click → `DealDetailPanel` right; full route only on explicit open. Drag-and-drop + non-drag alternatives (stage dropdown, command menu). Stage columns neutral; color only on small health markers.

Table: same filters, bulk actions, sort by value, age, next activity, owner, quote status. Mobile: grouped list by stage, not horizontal kanban.

### Tasks

Linear-style compact list: `Today`, `Upcoming`, `Waiting`, `Done`. Row: checkbox, title, linked customer/deal, due date, assignee, tiny priority mark. Optimistic complete; inline edit due/assignee/priority; bulk action bar. Keyboard: arrows, enter, space, `Cmd/Ctrl+K`. FullCalendar **secondary** — list/agenda views over same data.

### Customer detail

Serious record page, not giant form. Summary header: name, owner, lifecycle, last in/out, last order, debt/stopped-buying flags, tags, quick actions. Tabs: `Overview`, `Timeline`, `Open work`, `Quotes`, `Conversations`, `Notes`. Overview = act-now summary only. Timeline merges emails, tasks, quotes, notes, manual activity. ≤6 summary fields before collapse. Header actions: `Email`, `New quote`, `Task`, `Follow up`, `Note`. No AI summary box.

## Design system

Make Bootstrap and Tabler stop looking like Bootstrap and Tabler via CSS variables in `globals.css` — not a new framework.

### Color tokens

One accent, large neutral scale, restrained status colors:

```css
--crm-bg: #f6f7f9;
--crm-surface: #ffffff;
--crm-surface-muted: #f2f4f7;
--crm-border: #e5e7eb;
--crm-text: #101828;
--crm-text-muted: #667085;
--crm-primary: #2457ff;
--crm-success: #157347;
--crm-warning: #b7791f;
--crm-danger: #c2412d;
```

Map to `--bs-primary`, `--bs-border-color`, `--tblr-primary`, etc. at `:root`. Never hardcode colors in components when a token exists.

### Typography

| Role | Size / weight |
|------|----------------|
| Page title | 20px / 600 |
| Section title | 14px / 600 |
| Row primary | 14px / 500 |
| Row secondary | 12px / 500 |
| Helper | 12px / 400 |

No all-caps labels except tiny overlines. Override Tabler default heading rhythm via root variables.

### Spacing and density

Strict scale: 4 / 8 / 12 / 16 / 24 / 32. Inbox/task rows: 52–56px standard, 44–48px compact. Minimum touch target: **44px** on mobile interactive elements.

### Motion and focus

Adapted from token/motion discipline (not dark-theme animation libraries):

| Transition | Duration | Use |
|------------|----------|-----|
| Hover | 120ms | Buttons, rows, chips |
| Pane open / selection | 160ms | Split pane, detail swap |
| Instant | 0ms | Row selection highlight, checkbox toggle |

No bouncy transforms. `@media (prefers-reduced-motion: reduce)` → near-zero duration.

Focus: visible ring on all interactive elements — Bootstrap focus-ring or custom `box-shadow` token in `globals.css`. Keyboard users must always know focus location.

### Buttons

| Level | Use |
|-------|-----|
| Primary | Commit: `Reply`, `Save`, `Create quote` |
| Secondary | Contextual: `Follow up`, `Task` |
| Quiet | Row/pane icon or text with subtle hover |
| Destructive | Delete/archive |

Avoid filled secondary buttons.

### Surfaces, forms, icons, chips

- **Lists over cards** for queues (inbox, follow-ups, tasks). Cards only for bounded objects (quote summary, customer header).
- **Forms:** flat, border-led, top labels, inline validation, progressive advanced fields.
- **Icons:** `AppIcon` wrapper; 16–18px, 1.5 stroke; action affordance only.
- **Chips:** text-first, low-chroma, ≤3 per row.
- **RTL:** logical properties (`padding-inline`, `margin-inline`, `border-inline-start`, `inset-inline-end`) everywhere.

## Interaction and implementation blueprint

### Loading

Skeleton rows and pane headers via `loading.tsx` on main surfaces. Avoid full-screen spinners when structure is known.

### Route structure

```text
app/
  [locale]/
    (desk)/
      layout.tsx
      loading.tsx
      inbox/page.tsx
      follow-ups/page.tsx
      deals/page.tsx
      tasks/page.tsx
      customers/[customerId]/page.tsx
app/api/...
```

Route groups for clean URLs. Parallel routes or `?thread=` search params for deep-linkable detail — upgrade only when needed.

### Server and client boundaries

**Server:** page shells, initial counts, list/detail payloads when URL-driven.

**Client:** split-pane resize, row selection, keyboard shortcuts, optimistic mutations, drag-and-drop, composer, local filters.

**Component map**

- Shell: `AppShell`, `WorkspaceLayout`, `TopCommandBar`
- Primitives: `SplitPane`, `ActionToolbar`, `StatusBadge`, `PriorityIndicator`, `EmptyState`, `SkeletonRow`, `KeyHint`
- Domain: inbox, follow-ups, deals, tasks, customer modules as listed in Screen blueprints

### Data loading

Server-fetch shell + initial list; cheap aggregate counts for queue tabs. Detail by URL or client fetch by ID — never refetch whole page on row change. Mutations via route handlers with optimistic UI.

Operational fields for silent ranking:

- `waitingOn`: `us | customer | none`
- `nextActionAt`, `lastInboundAt`, `lastOutboundAt`, `stageUpdatedAt`
- `health`: `on_track | at_risk | stalled`
- `linkedCustomerId`, optional `linkedDealId`, `linkedQuoteId`, `linkedThreadId`

### Bootstrap/Tabler de-template checklist

- Flatten cards into bordered surfaces
- Reduce shadows
- Unify border radius
- Remove icon-heavy headings
- Tighten dropdowns and toolbars
- Standardize icon size/stroke
- Stop using primary color for everything

### FullCalendar and HugeRTE

FullCalendar: secondary planning view; prefer list/agenda on mobile. HugeRTE: trimmed reply toolbar, localized, inline — “compose a business reply,” not document editor.

## Execution plan

**Priority sequence:** inbox → follow-ups → customer record → deals polish.

### 7-day quick wins

1. Remove assistant copy, sparkle icons, suggestion language
2. Make inbox default landing
3. List/detail surfaces on inbox and tasks (not card wrappers)
4. Unified status chip system
5. Trim HugeRTE to reply-safe toolbar
6. Skeleton rows/detail on main lists
7. Single `AppIcon` wrapper
8. One accent + neutrals
9. Visible `Cmd/Ctrl+K` hint
10. One row-height system everywhere

### 30 / 60 / 90 days

- **30d:** Inbox split-pane, queue tabs, detail toolbar, handled/snooze, follow-up creation
- **60d:** Follow-up queue, Linear-style tasks, customer detail (overview, timeline, open work, quotes)
- **90d:** Deals board + table parity, deep-linkable panes, command palette breadth, keyboarding, mobile view logic

### Ignore for now

AI dashboard, bot UI, auto-summarization panels, deep charting, theme customization, animated pipeline theatrics, home page full of cards.

### Final direction

A **quiet sales operating system**. Inbox is the front door. Follow-ups are a queue, not advice. Deals are clean stage views with next-action context. Tasks are dense and keyboard-friendly. Customer Detail is the trusted record. Intelligence stays in ranking, defaults, and one-click helpers; the interface speaks only in structure, state, and action.
