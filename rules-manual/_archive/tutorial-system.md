# Tutorial System Rules

This document is the source of truth for the in-app tutorial / help system
that lives under `src/lib/tutorials/*` and `src/components/tutorials/*`. It
codifies the behaviour the system must keep across all future changes.

Read this together with [`AGENTS.md`](./AGENTS.md) and
[`premium-crm-uiux.md`](./premium-crm-uiux.md). Where this file is silent,
defer to those.

## Purpose

The tutorial system exists to help a new user understand the desk **without
making the product feel like an AI tool, a tutorial app, or a consumer
onboarding flow**. It must remain invisible to users who don't need it, and
silent to users who have already moved past it.

If a tutorial UI element would make the product feel chattier, slower, or
more "helpful in an AI way", it does not ship. Restraint wins.

## Anti-AI rules

The tutorial system is the place where well-intentioned UI most often drifts
into "AI assistant" territory. These patterns are banned:

| Banned                                          | Replace with                                               |
| ----------------------------------------------- | ---------------------------------------------------------- |
| "AI thinks…", "AI recommends…", "Smart…"        | A state label + an action verb ("Waiting" + "Reply")       |
| Sparkle / star / wand / glow icons              | `IconHelp`, `IconQuestionMark`, `IconBook2`, `IconKeyboard`|
| Chat bubbles, avatars, conversational copy      | A short sentence in plain voice                            |
| "Let me help you…", "I'll show you…"            | Imperative or descriptive ("Open the inbox", "Customers live here") |
| Animated gradients, rainbow tints, neon strokes | Neutral surfaces and one accent (`var(--ui-primary)`)      |
| Tooltip GIFs, screencasts, video embeds         | Two sentences and one link to the page                     |
| Confetti, applause, celebrations                | Nothing — silently update progress                         |
| "Magic", "intelligently", "automagically"       | Plain verbs ("compute", "rank", "score")                   |

The copy validator (`src/lib/tutorials/copy-rules.ts`) enforces the
banned-term list. Run it as part of any change that adds tutorial content.

## When to use which entry type

The system has five `TutorialEntryType` values. Pick the right one — using
the wrong one creates noise.

| Type             | Use it when                                                        | Don't use it for                                          |
| ---------------- | ------------------------------------------------------------------ | --------------------------------------------------------- |
| `PAGE_HELP`      | Explaining what a top-level route is and what a user can do there  | Describing one button or one filter                       |
| `TOUR_STEP`      | A 3–5 step opt-in walkthrough of a flow the user explicitly opted into | Anything that auto-plays on load                          |
| `CHECKLIST_ITEM` | One of the five dashboard onboarding items                         | Recurring tasks, growth nudges, "did you know" prompts    |
| `TOOLTIP`        | Clarifying a single field, chip, or KPI label                      | A second-tier explanation that needs more than 1 sentence |
| `EMPTY_HINT`     | The first time the user sees a truly empty surface (inbox, customers, tasks, quotes) | Re-empty states (after deleting), low-data states         |

Hard limits:

- **At most 12 `TOOLTIP` keys at any time across the whole product.** If a 13th
  is needed, replace, don't add.
- Multiple opt-in section tours may exist for core routes, but **at most 1 tour
  may be active/running at a time**. A tour must start only from an explicit
  user action (for example the page HelpDrawer).
- **At most 5 checklist items.** Adding a 6th requires removing one.

## Component placement

| Component            | Where it may render                                         | Where it may NOT render                                      |
| -------------------- | ----------------------------------------------------------- | ------------------------------------------------------------ |
| `HelpButton`         | `PageHeader` action slot, page-level toolbars                | Sidebar, topbar, inline next to fields, modal headers        |
| `HelpDrawer`         | Mounted once at the desk-shell layout level (portal)        | Anywhere as a sibling of page content                        |
| `OnboardingChecklist`| Dashboard, single instance                                   | Any other route                                              |
| `TutorialOverlay`    | Mounted once at the desk-shell layout level (portal)        | Anywhere as a sibling of page content                        |
| `EmptyStateGuide`    | Replaces an existing `EmptyState` on the four allowed routes | Any non-empty list, any chart card, any settings section     |
| `ContextualTooltip`  | Inline next to a single label, chip, or KPI                 | Inside a button, inside a form input, inside body copy text  |

The `HelpButton` is the **only** persistent affordance. It must:

- Be exactly `2rem × 2rem` (matches the page-header action button height).
- Use `IconHelp` at `size=18 stroke=1.6`.
- Render `null` when there is no help block for the current route and no
  explicit `helpKey` prop. Never render an empty pill.

## Behaviour rules

These rules describe what the components must do. The Phase 4 implementation
already complies; future changes must preserve them.

1. **Nothing auto-plays.** Tours, drawers, overlays, and tooltips only open
   in response to a deliberate user action. The provider mounts in a
   silent, hydrated state.
2. **Nothing blocks the desk.** No tutorial element disables the shell, the
   sidebar, the topbar, or the page content underneath. A user closing the
   drawer or overlay returns to a fully usable page.
3. **No focus theft.** The `HelpButton` may not autofocus on mount. Step
   cards may take focus only after the user opens a tour.
4. **Optimistic mutations.** All `markComplete`, `dismiss`, `snooze` calls
   update the UI before the server confirms. On failure: rollback + a
   `danger` toast. No success toasts.
5. **Sticky dismissal.** Once a `TOOLTIP`, `EMPTY_HINT`, or `PAGE_HELP` is
   dismissed by the user, it stays dismissed for that user until either:
   - the user runs `Reset tutorials` from Settings, or
   - the entry's `contentVersion` is bumped (see "Versioning" below).
6. **Silent on 401.** When the tutorials API returns 401 (unauth), the
   provider becomes inert. It does not show an error, retry, or warn.
7. **Onboarding ends silently.** When all checklist rows resolve, the
   provider calls `finishOnboarding` and the card unmounts. No toast, no
   confetti, no "well done" copy.

## Copy rules

### Voice

Operational, factual, second-person where unavoidable. Prefer descriptive
to imperative.

- Good: "Customers live here. Use filters to slice the list."
- Good: "Mark a task done with `Space`."
- Bad: "Welcome! Let's set up your customers together!"
- Bad: "Smart filters help you quickly find the right people."

### Length budgets

These are **maximums**, not targets. Most copy should be shorter.

| Surface                        | Limit (chars) |
| ------------------------------ | ------------- |
| `HelpContentBlock.titleKey`    | 48            |
| `HelpContentBlock.summaryKey`  | 200           |
| `HelpAction.labelKey`          | 36            |
| `HelpShortcut.labelKey`        | 36            |
| `HelpRelatedLink.labelKey`     | 36            |
| `ChecklistItemDef.titleKey`    | 48            |
| `ChecklistItemDef.descriptionKey` | 120        |
| `TutorialTourStepDef.titleKey` | 48            |
| `TutorialTourStepDef.bodyKey`  | 200           |
| Tooltip body                   | 140           |

Keys that exceed the limit are a validator error.

### i18n key naming

All tutorial-related i18n keys must:

1. Start with `tutorial.` (so message-file lookups stay namespaced).
2. Use lowerCamelCase segments separated by `.` — no kebab-case, no
   snake_case.
3. Keep depth ≤ 6 segments.

Examples:

- `tutorial.page.dashboard.title` ✓
- `tutorial.button.close` ✓
- `tutorial.page.dashboard.action.openInbox` ✓
- `tutorial.page.dashboard-title` ✗ (kebab-case)
- `Tutorial.Page.Dashboard.Title` ✗ (PascalCase)
- `dashboard.help.title` ✗ (no `tutorial.` prefix)

### Banned terms

The validator scans all literal copy in:

- `HELP_REGISTRY` (i18n key paths only — actual translations are scanned in
  Phase 6 once `messages/{he,en}.json` get a `tutorial` namespace)
- Component-internal placeholder fallbacks (`safe-translate.ts` callers)
- Phase 6 message files

The current banned-term list lives in `src/lib/tutorials/copy-rules.ts` and
is the canonical source. Any change to it requires a code review.

## Tour step popover (guided tours)

Opt-in section tours render as a **tooltip-style popover** anchored to the
spotlight target (`TutorialOverlay` + `TutorialStep`), not a centered modal.

Required chrome (match the product reference popover):

| Region | Content |
| ------ | ------- |
| Top-inline-start | Close (`IconX`, `aria-label` from `tutorial.step.close`) |
| Body | Bold title + muted body (max lengths in Copy rules) |
| Footer start | **Skip tour** — underlined text control (`tutorial.step.skipTour`), ends the tour |
| Footer end | **Back** (outline, disabled on step 0) + **Next** / **Done** (primary) |

Placement:

- The overlay picks the side with the most viewport space and sets
  `data-placement` on the popover (`top` \| `bottom` \| `start` \| `end`;
  `center` when no target).
- CSS draws a square caret on the edge that faces the spotlight (logical
  properties; no physical `left`/`right` for the caret offset).
- Do not show a step counter in the popover header.

Scrim: light (`rgba(15,23,42,0.22)`), spotlight cut-out only — desk chrome
stays usable; tours do not block the shell.

## Sizing & spacing

The tutorial CSS uses tokens added in Phase 4:

```
--tutorial-drawer-width: 408px
--tutorial-radius: 12px            /* card-level corners */
--tutorial-radius-sm: 8px          /* row-level corners */
--tutorial-step-shadow: 0 18px 44px rgba(15,23,42,0.18)
--tutorial-drawer-z: var(--premium-modal-z)        /* 6910 */
--tutorial-overlay-z: 7000
--tutorial-tooltip-z: 6800
```

Rules:

- Do not introduce new `--tutorial-*` tokens without updating this file.
- Do not hard-code colors. Pull from `--crm-*` / `--ui-*` exclusively.
- Tour popover padding: `1rem 1.05rem 0.9rem` (`.tutorial-step-popover`).
- Checklist card padding: `1rem 1.1rem`.
- Spacing between sections inside the drawer body: `1.1rem`.
- The drawer footer ("Don't show again") sits flush against the bottom
  edge with `0.65rem 1.25rem` padding.

## RTL / i18n

- Use logical CSS (`inset-inline-*`, `border-inline-*`, `padding-inline-*`)
  for any layout that must flip in Hebrew.
- Use **physical** `left: 50%` + `transform: translateX(-50%)` only for
  centering relative to a single anchor element (e.g., the tooltip bubble
  centered on its trigger). This is direction-independent on purpose.
- Directional icons (`IconArrowRight`, `IconChevronRight`, `IconArrowLeft`)
  must wear the `tutorial-icon-end` / `tutorial-icon-start` class so the
  global `[dir="rtl"]` flip applies.
- Drawer slide-in uses two named keyframes — `tutorial-drawer-in` (LTR) and
  `tutorial-drawer-in-rtl` (RTL). Adding a new direction-sensitive
  animation requires the same dual-name pattern.
- Translation keys are always LTR ASCII. The Hebrew translations live in
  `messages/he.json` (Phase 6).

## Accessibility

Every tutorial component must satisfy these rules.

- Drawer + overlay are `role="dialog"` with `aria-modal` set appropriately
  (`true` for the drawer, `false` for the tour step — the tour does not
  block the page chrome behind the spotlight).
- Drawer + overlay trap `Tab` / `Shift+Tab` cyclically. `Esc` closes.
- The tour step supports `←` (back), `→` (next), `Esc` (close) at the
  document level while open.
- Every `<button>` carries either text content or an `aria-label`. Icons
  pass `aria-hidden="true"` and a `size`/`stroke` (no aria-label on the
  icon itself).
- The `HelpButton` carries both `aria-label` and `title` so the same hint
  surfaces in screen-reader and tooltip flows.
- The checklist row has `aria-pressed` on its checkbox-style button to
  announce done state.
- The drawer's title is wired via `aria-labelledby={titleId}`; the body is
  not (the drawer body content is too long for a useful description).

## State / persistence rules

- `markComplete` is idempotent. Calling it twice is fine; the DB unique
  constraint absorbs duplicates.
- `dismiss` is sticky. Once dismissed, the entry stays dismissed until
  reset or version bump.
- `snooze` is bounded to ≤ 90 days (`computeSnoozeUntil` in
  `helpers.ts`). The UI must not pass arbitrary future dates.
- A user calling `Reset tutorials` clears all `UserTutorialState` rows for
  that `(userId, workspaceId)` and clears `finishedAt` /
  `dismissedAt` / `activeTour*` on `UserOnboardingProgress`.
- The provider does **not** persist `helpDrawerKey` or `activeTour` —
  these are in-memory UI state. Refreshing the page closes the drawer and
  ends an in-progress tour. This is by design.

## Versioning rules

Bump a `contentVersion` (in `src/lib/tutorials/content.ts`) when:

- The user-visible meaning of an entry changes substantially.
- A previously-correct sentence becomes misleading after a code change
  (e.g., a button moved, a shortcut changed).

Do **not** bump the version when:

- Fixing a typo.
- Translating into a new locale.
- Adjusting punctuation or whitespace.

A bumped version creates a fresh row in `UserTutorialState` because the
`(userId, workspaceId, entryType, entryKey, contentVersion)` unique includes
`contentVersion`. Users who had previously dismissed the entry will see it
again at the new version. That is intentional — it's the only way to
re-surface revised guidance without a destructive migration.

## Forbidden additions

These would violate the locked stack or premium feel and are off-limits:

- New runtime dependencies: `react-joyride`, `intro.js`, `shepherd.js`,
  `@floating-ui/react`, `framer-motion`, `react-spring`, `lottie-react`,
  any tooltip / tour library.
- New icon set (must remain `@tabler/icons-react`).
- Persistent badges, banners, or notification dots driven by the tutorial
  system. Onboarding state must not appear in the topbar.
- "Help center" / docs portal page. Help content is contextual, not
  central.
- Inline product video, animation, or audio.
- Storing tutorial state in `localStorage` or cookies. The DB is the
  authority.

## Phase 6 wiring checklist

When Phase 6 mounts the system, the following must all be true:

1. `TutorialProvider` is mounted inside `(desk)/layout.tsx`, **inside**
   `ToastProvider` (the provider depends on `useToast`).
2. `HelpDrawer` and `TutorialOverlay` are mounted **once**, at the same
   layout level — **not** per page.
3. `HelpButton` slots into the existing `PageHeader` action area via the
   `actions` prop. No new layout component.
4. The dashboard renders `<OnboardingChecklist signals={...} />` with
   server-resolved signals (`graphConnected`, `whatsappConnected`,
   `customerCount`, `quoteCount`).
5. Settings exposes a `Reset tutorials` row that calls
   `tutorial.resetTutorials()`.
6. `messages/{en,he}.json` gain a `tutorial` namespace covering every key
   referenced by the static registry. Validator passes.
7. No existing page mounts a second `TutorialProvider` — the desk-level
   provider is the singleton.

## Validator

Static checks live in `src/lib/tutorials/copy-rules.ts`:

- `validateRegistry()` — runs against `HELP_REGISTRY`, `ONBOARDING_CHECKLIST`,
  `TOUR_INBOX_INTRO`, `TOOLTIP_KEYS`, `EMPTY_HINT_KEYS`. Verifies key
  naming, length budgets, banned terms in keys.
- `validateMessages(messages)` — runs against translated `tutorial.*`
  message trees in Phase 6. Verifies length budgets and banned terms in
  the rendered strings.
- `BANNED_TERMS` — canonical banned-term list.
- `LIMITS` — canonical length budgets.

The validator is called from `copy-rules.spec.ts` as a type-checked
contract. Run it before shipping any registry change.
