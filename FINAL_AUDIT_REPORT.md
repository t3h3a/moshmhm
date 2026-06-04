# Grove Street Final Audit Report

## Pre-fix findings

- `/admin/suggestions` opened a router 404 page because the route was missing.
- Admin pages correctly required admin state, but the missing suggestions route made that section unusable.
- `scripts/heal_all.cjs` restored old source files from git before every build, which could reintroduce mojibake and old rank/service data.
- `mock-app.ts` still carried old rank values, including old `Nega` naming and oversized rank discounts.
- Social boosting products still had placeholder prices instead of the requested JOD unit prices.
- Product purchase flow needed stricter social-link validation and minimum quantity protection.
- `/api/suggestions` was missing from the mock API, so the suggestions form could not be trusted.
- `/api/ticker` was missing while the admin Event page was trying to save to it.
- Sticker assets were outside the frontend public tree and needed a stable public registry.
- Some Niga badge fallbacks could show Niga visuals for non-Niga ranks.

## Post-fix verification

- `pnpm build` passed after the fixes. TypeScript passed for `api-server`, `grove-street`, `mockup-sandbox`, and scripts.
- Remaining build output is warnings only: Vite sourcemap warnings for UI components and a large chunk warning.
- Browser smoke test passed for `/`, `/games`, `/products/2020`, `/suggestions`, `/admin/suggestions`, `/ranks`, and `/marketplace` with no visible mojibake in tested page text.
- `/admin/suggestions` no longer returns the router 404 page.
- `/api/suggestions` accepts authenticated user submissions and stores them with status `new`.
- Social service order validation rejects missing links with HTTP 400 JSON.
- `/api/ticker` now exists, accepts admin PATCH with JSON, returns JSON, and feeds the home ticker.
- `/api/event-announcement/current` returns `{ announcement: null }` when disabled and valid JSON when active.
- `/api/event-announcement` accepts admin POST with JSON and no HTML error response.
- Home ticker was verified in browser after frontend restart; it displays the admin ticker text without mojibake.
- Product `2020` was verified by API as Instagram Followers, `0.150` JOD, `minQuantity: 100`, stock available.
- YouTube Subscribers was set as out of stock through catalog normalization.
- Niga badge fallback was tightened in `ranks.tsx`, `UserBadge.tsx`, and `home.tsx`; Niga image is only used for exact rank `Niga`.
- Sticker files were copied to `artifacts/grove-street/public/assets/stickers` and registered in `artifacts/grove-street/src/lib/stickers.ts`.
