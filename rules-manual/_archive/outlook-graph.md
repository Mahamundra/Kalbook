# Outlook / Microsoft Graph Rules

Manual rule for Outlook mail, Microsoft Graph API work, and inbox integration on this project. Read together with [`AGENTS.md`](../rules/AGENTS.md).

Load the installed **`msgraph`** skill (`.agents/skills/msgraph/`) when you need endpoint lookup, permissions, `$filter`/`$select` syntax, or community samples. Docs: [graph.pm](https://graph.pm/getting-started/introduction/).

## Stack overrides (non-negotiable)

**Production code** lives in `src/lib/microsoft/*` and `src/app/api/graph/*`. Do not replace app auth or mail flows with the skill CLI in shipped features.

| Layer | Role |
|-------|------|
| **`msgraph` skill** | Agent knowledge + ad-hoc debugging — search indexes, verify endpoints |
| **`graphRequest()`** | All runtime Graph calls in the app |
| **API routes** | Client-facing mail operations |

App Graph base URL: **`v1.0`** only (`MICROSOFT_GRAPH_BASE_URL` in `src/lib/microsoft/config.ts`). When using the skill CLI for exploration, pass `--api-version v1.0` (skill defaults to beta).

## Auth and env vars

App OAuth (delegated, stored tokens):

- `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID`
- `MICROSOFT_REDIRECT_URI`, `APP_BASE_URL`
- Scopes: `offline_access`, `User.Read`, `Mail.Read`, `Mail.ReadWrite`, `Mail.Send`

Skill CLI auth (separate — for agent testing only):

- `MSGRAPH_CLIENT_ID`, `MSGRAPH_TENANT_ID`, etc.
- Run: `bash .agents/skills/msgraph/scripts/run.sh auth status`

Do not merge skill token cache with app session storage.

## Code map

| Concern | Location |
|---------|----------|
| Config + scopes | `src/lib/microsoft/config.ts` |
| OAuth, tokens, connection status | `src/lib/microsoft/auth.ts` |
| HTTP client | `src/lib/microsoft/graph-client.ts` |
| Mail: inbox, thread, send, attachments | `src/lib/microsoft/mail.ts` |
| Inbox webhooks / subscriptions | `src/lib/microsoft/webhooks.ts` |
| CRM conversation sync | `src/lib/email-conversation-sync.ts` |
| OAuth start/callback | `src/app/api/graph/auth/*`, `src/app/api/auth/microsoft/start/route.ts` |
| Messages, thread, send, draft | `src/app/api/graph/messages/*`, `send-mail`, `send-reply`, `draft` |
| Connection status | `src/app/api/graph/status/route.ts` |

**Before adding a new Graph call:** check whether `mail.ts` or an existing route already covers it.

## Using the msgraph skill

Launcher (macOS/Linux):

```bash
bash .agents/skills/msgraph/scripts/run.sh <command> [flags]
```

Progressive lookup (same order as the skill):

1. Existing helpers in `mail.ts`
2. `sample-search --product exchange` for curated mail/calendar patterns
3. `api-docs-search --endpoint /me/messages --method GET` for permissions and parameters
4. `openapi-search --query "..."` only when the endpoint is unknown

Outlook-focused examples:

```bash
bash .agents/skills/msgraph/scripts/run.sh sample-search --product exchange --query "unread messages"
bash .agents/skills/msgraph/scripts/run.sh api-docs-search --resource message
bash .agents/skills/msgraph/scripts/run.sh api-docs-search --endpoint /me/mailFolders/inbox/messages --method GET
```

Implement findings in TypeScript via `graphRequest()`, matching existing `$select` discipline and pagination in `listMessagePages()`.

## Graph patterns in this app

- **Inbox list:** `/me/mailFolders/inbox/messages` with `$orderby`, tight `$select`
- **Thread:** `$filter` on `conversationId` (escape single quotes in OData)
- **Reply:** `/reply` or `createReply` → PATCH → `/send` when CC/BCC needed
- **Send:** `/me/sendMail` with HTML body, `saveToSentItems: true`
- **Paging:** follow `@odata.nextLink` (see `listMessagePages`)
- **Draft creation:** intentionally disabled in MVP (`createDraftReply`) until review flow exists

Always use `$select` to limit payload size. Use `$top` / page loops — never unbounded fetches.

## Write safety

| Context | Rule |
|---------|------|
| Skill CLI | Read-only by default; `--allow-writes` only after user confirmation; DELETE blocked |
| App code | Sends/replies only through existing API routes; no surprise mail from background jobs |
| Drafts | Do not enable Graph draft writes until explicit product approval |

## When implementing inbox features

1. Search skill indexes if endpoint or filter syntax is uncertain — **never guess paths**
2. Extend `mail.ts` + thin API route; keep business logic out of route handlers where possible
3. Sync side effects go through `email-conversation-sync.ts` when touching CRM conversations
4. Respect inbox UX from [`premium-crm-uiux.md`](./premium-crm-uiux.md) — operational queues, not assistant UI

## Common pitfalls

- Skill default API version is **beta** — app uses **v1.0**
- `conversationId` filters require OData string escaping (`'` → `''`)
- Directory `$search` / `$count` need `ConsistencyLevel: eventual` (not typical for `/me/messages`)
- 401 in app → token refresh via `getValidMicrosoftAccessToken(forceRefresh)`
- Missing scopes → `microsoftNeedsReconsent()` / re-auth flow in settings
