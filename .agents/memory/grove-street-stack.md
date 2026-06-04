---
name: Grove Street Stack Quirks
description: Non-obvious tech decisions, Express 5 rules, Orval limitations, RTL setup
---

Express 5: wildcard routes use `/{*splat}` syntax; async handlers must return `Promise<void>`; `req.params.id` is `string|string[]` (cast needed).
Orval 8.9.1: fails on `type: ["string","null"]` in OpenAPI — use plain `type: string` with nullable in description only.
RTL: `dir="rtl" lang="ar"` set in artifacts/grove-street/index.html; Cairo font via Google Fonts in index.css.
DB seed: `pnpm --filter @workspace/scripts run seed` — @workspace/db is a dependency of @workspace/scripts.
Codegen order: schema change → `pnpm --filter @workspace/db run push` → `pnpm --filter @workspace/api-spec run codegen`.

**Why:** These are environment-specific quirks discovered during initial build that aren't obvious from docs.
**How to apply:** Always check these when adding new routes, schema fields, or OpenAPI entries.
