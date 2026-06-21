# KalBook — Agent Rules

Source of truth for AI agents working on this repo. Read this first, then load skills from [`rules-manual/agent-skills/`](../rules-manual/agent-skills/) as needed.

Deployment safety details live in [`.cursorrules`](../.cursorrules) at the repo root — follow both.

## Product

KalBook is a multi-tenant booking + CRM SaaS for Israeli businesses (Hebrew-first, RTL/LTR). Core flows: onboarding, OTP auth, public booking pages, admin under `/b/[slug]/admin/*`, plans/trials, gym vertical features.

## Locked stack (do not swap)

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 App Router, React 18, TypeScript (strict) |
| Styling | Tailwind CSS 3 + `tailwindcss-animate`, tokens in `app/globals.css` |
| Components | Radix UI primitives + shadcn-style wrappers in `components/ui/` |
| Icons | `lucide-react` |
| i18n | `next-intl` — Hebrew primary, Arabic/English supported |
| Database / auth | Supabase (multi-tenant, RLS) |
| Validation | Zod (`lib/api/validation/schemas.ts`) |
| Calendar | FullCalendar |
| Email | Brevo |
| OTP | Twilio (via API routes) |
| Deploy | Vercel, Edge middleware |

**Do not introduce** Bootstrap, Tabler, MUI, or a second styling system without an explicit decision.

## Directory map

```
app/                    # Routes (App Router)
  api/                  # REST handlers — always server-side
  b/[slug]/admin/       # Tenant admin (canonical)
  (admin)/              # Legacy paths → LegacyAdminRedirect
  booking/              # Public booking flow
  onboarding/           # Business signup
components/
  pages/                # Page-level client components
  admin/                # Admin shell + shared admin UI
  booking/              # Booking layouts + steps
  ui/                   # Reusable UI primitives
lib/
  api/                  # responses.ts, parse-request-body, validation
  auth/                 # OTP, rate limiting
  phone/display.ts      # Israeli phone input/display helpers (use these)
  supabase/             # server / client / middleware / admin clients
messages/               # next-intl JSON (he, ar, en)
tests/smoke/            # Vitest smoke tests
rules-manual/           # Workflow skills + KalBook UI rules
```

## Multi-tenant rules

- API routes: `getTenantInfoFromRequest()` before DB work
- Server components: `getTenantContext()` where applicable
- Always scope queries by `business_id` (RLS backs this — still be explicit)
- Canonical admin URL: `/b/[slug]/admin/*`
- Legacy `/admin/*` and `(admin)` routes redirect via `LegacyAdminRedirect`

## API conventions

- Validate bodies with Zod via `parseRequestBody()` from `lib/api/parse-request-body.ts`
- Return structured errors from `lib/api/responses.ts`:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {} } }
```

- Wrap handlers in try/catch; never expose stack traces or secrets
- Status codes: 200, 400, 401, 403, 404, 409, 422, 429, 500

## Server / client boundaries

- `app/api/**/route.ts` — server only, no `'use client'`
- `middleware.ts` — Edge runtime only; no Node.js APIs (`fs`, `path`, etc.)
- `'use client'` when using hooks, events, or browser APIs
- Supabase: `@/lib/supabase/server` (RSC), `middleware` (Edge), `client` (browser), `admin` (service role, server-only)

## Required environment variables

Check before use; throw descriptive errors if missing:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `COOKIE_SECRET`
- `BREVO_API_KEY`
- `NEXT_PUBLIC_APP_URL` or `VERCEL_URL` for absolute URLs

## Shared utilities (prefer over copy-paste)

| Need | Use |
|------|-----|
| Phone input formatting | `formatIsraeliPhoneInput` from `@/lib/phone/display` |
| Phone display | `formatPhoneForDisplay` from `@/lib/phone/display` |
| Phone → E.164 | `phoneInputToE164` from `@/lib/phone/display` |
| API errors | `apiError`, `internalError`, etc. from `@/lib/api/responses` |
| Request validation | schemas in `@/lib/api/validation/schemas` |

## Verification before merge

```bash
npm test          # vitest smoke tests
npm run build     # must pass
npm run lint      # fix new issues in touched files
```

Manual smoke: `/onboarding`, OTP send/verify, `/b/[slug]/admin`, `/booking`.

## Workflow skills

Load from [`rules-manual/agent-skills/`](../rules-manual/agent-skills/):

| Phase | Skill |
|-------|-------|
| Start / pick skill | `using-agent-skills.md` |
| New feature | `spec-driven-development.md` → `planning-and-task-breakdown.md` |
| Implement | `incremental-implementation.md` |
| UI work | `frontend-ui-engineering.md` + [`kalbook-uiux.md`](../rules-manual/kalbook-uiux.md) |
| API work | `api-and-interface-design.md` |
| Debug | `debugging-and-error-recovery.md` |
| Review | `code-review-and-quality.md`, `security-and-hardening.md` |

## Scope discipline

- Touch only what the task requires
- Do not delete code that seems unused without approval
- Prefer extending existing helpers over new abstractions
- Large files (`Onboarding.tsx`, etc.) — split incrementally, one slice at a time

## Archived rules

Files under `rules-manual/_archive/` are from other projects (wrong stack/paths). Do not follow them for KalBook.
