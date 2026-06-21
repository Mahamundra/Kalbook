# KalBook UI/UX Rules

Manual rule for UI design and implementation on KalBook. Read with [`rules/AGENTS.md`](../rules/AGENTS.md). Where generic upstream skills conflict with this file, **this file and AGENTS.md win**.

## Stack (non-negotiable)

- Tailwind CSS + design tokens in `app/globals.css`
- Radix + `components/ui/*` (shadcn-style)
- `lucide-react` icons
- `next-intl` for copy — never hardcode user-facing strings in components
- RTL/LTR via `DirectionProvider` and logical properties where possible

Do not add Bootstrap, Tabler, or a parallel component library.

## Product feel

KalBook should feel like a **calm operations tool**, not a generic SaaS dashboard or an AI product.

**Prefer**

- Clear queues, lists, and status chips
- One primary action per surface
- Short empty states: one line + one button
- Progressive disclosure (row → detail pane → overflow menu)

**Avoid**

- Sparkles, wands, gradient hero panels, “AI recommends…” copy
- Long explanatory empty states
- Chat-style help surfaces
- Decorative motion that slows booking/admin tasks

## Layout patterns

| Surface | Pattern |
|---------|---------|
| Admin pages | `PageHeader` + content; actions in header slot |
| Booking | Step flow in `components/booking/` layouts — keep steps focused |
| Modals | Radix Dialog; max width appropriate to content (plans → accordion or 2-col, not 4-col grid) |
| Forms | `react-hook-form` + Zod where validation is non-trivial |

## RTL / Hebrew

- User-facing strings from `messages/*.json`
- Phone numbers and codes: `dir="ltr"` on the value, label can follow page direction
- Test plan picker, onboarding, and admin modals in Hebrew RTL

## Component hygiene

- Reuse `components/ui/*` before inventing new primitives
- Phone fields: import from `@/lib/phone/display` — do not copy formatters
- Global button hover styles in `globals.css` affect all `<button>` — override with explicit classes when needed (e.g. accordion triggers)
- Dark mode: `ThemeProvider` / `next-themes` — use semantic tokens, not hardcoded `#030408` overrides on interactive elements

## Accessibility baseline

- Icon-only buttons need `aria-label`
- Focus visible on keyboard navigation
- Dialogs trap focus and restore on close
- Color is not the only urgency signal — use text, order, due dates

## Review checklist (before UI PR)

- [ ] Copy is i18n-keyed, not inline English/Hebrew
- [ ] RTL layout checked on the changed screen
- [ ] No new duplicate formatters/helpers
- [ ] Empty and error states have one clear action
- [ ] Works at mobile width (booking + onboarding especially)
