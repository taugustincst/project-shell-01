# Open Stall — build plan (v1.0.0 draft)

## Content targets (brief §1)
- [x] 120 symbols across 6 families, each with price, payout, tags and one plain-language rule shown on tap
- [x] 80 charms (passive run modifiers)
- [x] 5 weather states + ~30 day-events that interact with symbol tags
- [x] 3 stall locations (difficulty tiers), 12-week season with published rent schedule
- [x] Combo journal recording every combo ever triggered, with its rule
- [x] Meta-progression: stock/charm pool tiers unlock across runs (week 6, first shop, Harbour shop); never power for money
- [x] Free Market endless mode after a season clear
- [x] Zero gambling words/imagery: "browses", "stall", "wholesaler", no reels/spins/slots in player-facing text

## Build spec (brief §2)
- [x] Vanilla HTML/CSS/JS, no build step, static files
- [x] Offline: zero network calls, no analytics/ads/accounts; service worker app shell
- [x] Versioned localStorage save with sanitizer, fail-soft on corrupt saves (backup key)
- [x] `window.__openstall` test API (start with seed, setWeek, setWeather, give, stock, charm, browse, take/skip, pay, unlock, setTier)
- [x] Headless balance harness `sim/harness.js` (1000+ runs, win-rate, coin curves, combo usage, archetype viability count)
- [x] Portrait, one-handed, large-text, high-contrast, reduce-motion; rules readable by tap; no twitch input
- [x] Size well under 3 MB (no binary assets beyond icons)

## Monetization (brief §3)
- [x] `full_unlock` via Digital Goods API, restore purchases, `?dev=1` free unlock for test builds
- [x] Free content = complete Village Green season; unlock adds Harbour, Square, Free Market, full pool

## Tests & verification
- [x] Engine unit tests (`tests/engine.test.js`)
- [x] Harness: ≥15 viable archetypes on Village Green (free pool)
- [x] Playwright smoke test over file:// (`tests/smoke.js`)
- [x] CI workflow runs all three; Pages workflow on main

## Store pack
- [x] Icons (192/512/maskable), staged screenshot via test API
- [x] `store/listing.md` draft (no price/promo wording in short description)
- [x] privacy.html, README, HANDOFF log entry with FOR TJ items

## Review
See the bottom of this file after verification.

## Review (2026-11-03)
Built: the complete v1.0.0 draft listed above, every content floor met (120/80/5/30/3) and asserted by `tests/engine.test.js`.
Verified locally: `node tests/engine.test.js` → ALL 10 PASSED; `node sim/harness.js 50 green 1` → 19 of 22 archetypes viable, 15 distinct signature combos, random 6%, greedy 50%; `node tests/smoke.js` over file:// → ALL PASSED (24 checks, no page/console errors). Icons and the staged screenshot render from the test API.
Not yet verified: Harbour/Square balance with a smarter heuristic (harness currently 7 and 0 viable there), real-device feel, and the service worker (cannot register over file://; CI and Pages exercise it over http).
