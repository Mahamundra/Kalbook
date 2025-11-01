# Bizcraft Next 14 migration

This folder merges your original Vite React UI into a Next 14 App Router scaffold.

- Ported components live in `components/ported/*`.
- Your admin pages are wrapped under `app/(admin)/*` and import the ported components.
- Onboarding page is wrapped under `app/onboarding/page.tsx` if present.
- Admin Settings hosts the language selector. Update translations in `messages/*.json`.
- API stub: `app/api/ai-bootstrap/route.ts`.
- Start dev: `npm i` then `npm run dev`.

Adjust imports in your ported components if they reference Vite paths. Prefer `@/components/...` for local components.