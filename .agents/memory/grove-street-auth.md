---
name: Grove Street Authentication
description: Auth implementation details — hashing, token format, localStorage, mock fallback
---

Password hash: SHA256 of `password + "grove_salt_2024"`.
Token format: `${userId}_${Date.now()}_grove` — parseUserId extracts userId from prefix.
Client storage: localStorage keys `grove_user` (JSON) and `grove_token` (string).
Mock fallback: login.tsx has MOCK_USERS map for offline dev; owner/admin credentials hardcoded.
Admin check: role === "admin" || role === "owner".

**Why:** Backend uses simple SHA256 (no bcrypt) for fast seeding; token is stateless (no DB lookup needed for userId extraction).
**How to apply:** When adding new auth flows, always update both the API route AND the mock fallback in login.tsx.
