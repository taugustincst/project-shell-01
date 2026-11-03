# HANDOFF — project-shell-01 — OPEN STALL

## Status: ASSIGNED 2026-11-02 — flagship title, build priority #2 (after shell-04's funnel test)

Roster assignment by Folder at Tj's direction, from the 2026-11-02 Google Play niche research (undersaturated lanes for a solo HTML5 premium dev). This file is the build brief AND the living handoff. Keep it updated.

## 1. THE GAME — exactly what to make

**Fantasy:** You run a farmers'-market stall. Over one 12-week season you turn a borrowed trestle table into the market's legendary stall, earn enough to buy the shop on the square — or miss rent and go bust.

**Why this game, why now:** Balatro (1M+ Play installs, $9.99, ~$21.3M mobile) and Luck be a Landlord (~190k paid installs, still ~140/day three years on) prove the symbol-builder loop sells on Android. Every existing entry is poker/slot/gambling themed. There are only ~3 quality titles in the whole idea-space. A cozy, non-gambling version is the open lane — and it is a pure systems build, which is this team's strength.

**Core loop (one market day):**
1. DAWN — Buy stock at the wholesaler: draw from the symbol pool, spend coins, choose what your stall sells today.
2. MARKET — Customers browse: the 5-reel stall "spins" a set number of times per day. Each spin, symbols on the reels pay out coins based on adjacency and combo rules (honey next to tea pays double; flowers sell out on rainy days). No player timing input — the skill is in what you stocked and how you arranged it.
3. DUSK — Pay the day's costs, read the day in a short results ledger, then buy/sell symbols and charms (passive modifiers) to engineer tomorrow's synergies.
4. WEEKLY — Rent and fees escalate on a published schedule. Season win: accumulate the shop price and buy the shop (season clear). Loss: you cannot pay rent when due — the run ends, meta-unlocks persist.
5. After a season clear: "Free Market" endless mode plus harder stall locations.

**Content targets (v1.0, non-negotiable floors):**
- 120 symbols across 6 families (produce, baked goods, preserves, flowers, crafts, curios). Every symbol has: price, payout, tags, and ONE plain-language rule shown in full on tap.
- 80 charms (passive run modifiers).
- Weather system (5 states) + a deck of ~30 day-events that interact with symbol tags.
- 3 stall locations (difficulty tiers), 12-week season structure each.
- A combo journal that records every combo the player has ever triggered, with its rule — discovering combos IS the game.
- Meta-progression: unlock new symbols/charms/locations permanently across runs. NEVER unlock power for money — the unlock is the whole game, once.

**Design rules:**
- ZERO gambling skin: no casino words, imagery, or sounds anywhere (also avoids Play gambling-content friction). It is a shop, not a slot machine, in every word and picture.
- Touch-first: every rule readable by tapping; nothing hover-only. (Lesson paid for on Ironhold.)
- Runs must support both 5-minute and 45-minute play; a market day is 2–4 minutes.

## 2. BUILD SPEC

- Vanilla HTML5/CSS/JS, no framework, no build step. Static files, deployed to GitHub Pages from this repo (same pattern as taugustincst/bubblepop and taugustincst/ironhold).
- Fully offline after load. Zero network calls, zero analytics, zero ads, zero accounts.
- Saves: localStorage, versioned key, sanitizer on load that clamps/drops invalid entries and never hard-fails on a corrupt save (Ironhold lesson — fail soft, keep the profile).
- Expose a `window.__openstall` test API (seed state, jump to day/week, force weather) for staged screenshots and automated balance runs.
- Headless balance harness: a Node script that auto-plays 1,000+ runs with simple heuristics and reports win-rate, coin curves, and combo usage distribution. Balance decisions come from this data, not vibes.
- Portrait-first responsive layout, one-handed playable, large-text option, colourblind-safe palette (never encode meaning in colour alone), no twitch input.
- Total size budget under 3 MB. 60fps on a mid-range Android phone. Flat icons + text only.

## 3. MONETIZATION — exact

- Google Play: FREE app. One non-consumable in-app product, `full_unlock`, **$4.99**, unlocks everything past the free content. Restore-purchases supported.
- Free content = the full first location's season (a complete, winnable game). The unlock adds locations 2–3, Free Market endless, and the full symbol/charm pool. The free part must feel COMPLETE, not amputated — Melvor Idle's 3.7 stars are what stingy gating earns.
- No ads, no consumables, no currency packs, no daily-login bait. Ever. This is the brand.

## 4. HOW IT SUCCEEDS — the launch playbook

- Store title carries the search terms ("Market Stall Roguelite" shape — final title/ASO pass at store-pack time). Short description (max 80 chars) describes features; NEVER use price/promo wording ("no ads, no IAP, free, sale") — Play flags it as promotion and limits featuring (Ironhold lesson).
- Screenshots: real staged gameplay via the test API, never composited. Shot 1 = a mid-spin stall with a big combo paying out. Captions state content ("120 symbols · 80 charms"), not price claims.
- Declarations: IARC questionnaire; target audience 13-15 / 16-17 / 18+ (NOT child-directed); Data safety = no data collected, no data shared; privacy policy at this repo's Pages site (privacy.html); contact elderon@augustinnovations.io.
- Process = the proven Bubble Pop / Ironhold route: internal-testing draft → all declarations → production release → Folder runs an expert review pass before anything is submitted → submission happens only on Tj's explicit approval.
- Post-launch: reply to every Play review for the first 30 days. The Ironhold listing publicly promises reviews shape the game — honour that across the roster. Ship a v1.1 balance/content patch inside 30 days driven by review themes.
- SUCCESS TARGETS (90 days post-launch, measured in Play Console only): 25,000 free installs; unlock conversion at or above 3%; rating at or above 4.4 stars. Below 1.5% conversion with a 4.4+ rating = pricing/funnel problem, escalate FOR TJ.
- KILL/PIVOT RULE: if the balance harness cannot produce at least 15 distinct viable combo archetypes by end of week 4, stop and rework the symbol rules before any art or store work. Synergy depth is the whole product.

## 5. BUILD ORDER (4–5 weeks)

- Week 1: Core engine + reels/payouts/adjacency + 40 symbols, greybox UI. Harness runs.
- Week 2: Full 120 symbols + 80 charms as data; weather + events; combo journal.
- Week 3: Season structure, 3 locations, meta-unlocks, save hardening, test API.
- Week 4: Balance from harness data (this week is sacred — do not steal it for features).
- Week 5: Store pack (icon, feature graphic, staged screenshots, listing), expert review, submission prep.

## 6. COORDINATION RULES

- Tj decides scope, names, spending, submissions, and anything irreversible. Everything else, the working agent owns end to end.
- Log entries are dated and appended below, newest last: what changed, who decided, what is blocked, next step.
- Anything needing Tj is marked FOR TJ and work stops on that item only.
- Verify live state before asserting anything is done, broken, or blocked.
- No prices on marketing websites, ever. Prices live only in the Play listing and procurement/store documents.
- Passwords and signing keys are always Tj's, set by him through secure forms; keystore handling follows the Elderon/Bubble Pop/Ironhold pattern.

## Log

- **2026-10-28** — Shell created (README.md + this HANDOFF.md). Awaiting project assignment from Tj.
- **2026-11-02** — ASSIGNED: Open Stall (roster #1). Full build brief installed above by Folder. Build priority #2 in the roster sequence (shell-04 ships first as the funnel test).
- **2026-11-02** — GitHub Pages ENABLED (workflow deploy, standard static workflow added at .github/workflows/pages.yml). Site: https://taugustincst.github.io/project-shell-01/ — until the game is built, this serves the repo files (README/HANDOFF); the shipped game + privacy.html deploy from this same root.
- **2026-11-03** — **v1.0.0 DRAFT BUILT** (branch `ccr-89815447-wojzds`, merged to `main`). Full playable game: 5-shelf stall (15 spaces, 8-neighbour adjacency), 120 items in 6 families each with one plain-language rule on tap, 80 charms, 5 weathers with forecast, 30 day-events, 3 markets with published fee schedules, 12-week seasons, combo journal, pool tiers unlocked by play (week 6 / shop / chandlery), Free Market endless, free = complete Village Green season, Play Billing via Digital Goods API (`full_unlock`), sanitized fail-soft save, `window.__openstall` test API, PWA, privacy.html, engine tests (10), Playwright smoke test (24 checks), balance harness, CI + Pages workflows, store copy draft, `tasks/todo.md` and `tasks/lessons.md` per Tj's build guidelines. Harness (50 runs/strategy, Village Green, free pool): random 6%, greedy-by-payout 50%, 19 of 22 focused archetypes viable (≥25% win), 15 distinct signature combos — above the week-4 kill rule of 15. No gambling vocabulary (tested).
  - **FOR TJ:** (1) Pages is enabled (Folder, 2026-11-02); the game is live at `https://taugustincst.github.io/project-shell-01/` once this merge deploys. (2) Web gating as built: Harbour/Square/Free Market and tiers 2–3 need the unlock on the web too; `?dev=1` frees it for testing. Keep, or open the web build fully? (3) Play Console: app, `full_unlock` at $4.99, package name (suggest `com.taugustincst.openstall`), upload keystore.
  - **Next (agent-owned):** week-4 balance pass (Harbour/Square are cliffs for the simple heuristics: 7 and 0 viable; teach the harness to use weather-lock and browse charms, then retune their fees), Android TWA wrapper, phone playtest of a full season (target 2–4 min per market day), feature graphic, expert review.
- **2026-11-03** — Roster-level handoff for Folder (all eight games, decisions, open items, lessons): https://github.com/taugustincst/taugustincst.github.io/blob/main/ROSTER-HANDOFF.md
- **2026-11-02 — FOR CLAUDE: EVALUATION FIX LIST (Folder's expert review, 2026-11-02). Overall 7/10 — ship after fixes. Full report filed in this repo at EVALUATION-2026-11-02.md. Work in this priority order and log closures here.**
  - P1-1 BALANCE THE PAID LOCATIONS, WITH A HARNESS GATE: City Square is unwinnable (0 of 22 archetypes viable, 0% for every strategy across 1,200 runs/config) and Harbour Market is a cliff (8/22 viable, greedy 4%). These two locations ARE the paid unlock's headline content. Levers: Square to 5 browses/day, lower shop price, softer weeks 9–12 rent. Gate: do not call any location balanced until sim/harness.js shows at least 12/22 viable archetypes and greedy at or above 15% on it.
  - P1-2 RESTORE PLAYER AGENCY (brief + listing promise it): today browse() shuffles stock into random grid slots (adjacency is re-rolled, not arranged) and takeOffer() charges no coins, while store copy says "Lay them out." Implement a dawn arrange step (tap-swap/pin on the 15-cell grid) and charge coins for wholesaler offers (symbols already carry prices) — or, if you judge the current design better, record that re-decision explicitly here and rewrite the listing so nothing claims arrangement.
  - P2-3 FINISH THE STORE PACK: 1024x500 feature graphic from real game art + 4 or more staged screenshots captured through window.__openstall (shot 1 = mid-browse stall with a combo paying out), filed in store/.
  - P2-4 BILLING LEFTOVERS: js/billing.js fallback label reads "The rest of the century" (Keep the Light's text) and game.js falls back to window.KTL_BILLING. Rename to Open Stall's own. (Same defect exists in shells 02/03/07/08; shell-04 is the source.)
  - P2-5 LISTING WORDING: full description uses "No ads" and "complete and free" phrasing; the promo-word filter can read full text, not just the short description — reword to features-only.
  - P3-6 Free-location top archetypes win 94–98% (ageing 98%, sweet stall 94%) — gentle retune after P1-1.

- **2026-11-03** — Claude (for Taylor's "package all 8"): Google Play edition added on branch `play/package`: `android/play` (Trusted Web Activity, package `com.taugustincst.openstall`), build and launch checks (`android.yml`), signed-bundle workflow (`release.yml`), store graphics in `store/`, and `PLAY.md` with the submission steps that need Taylor's accounts. Also fixed: purchases were never acknowledged (Play refunds them after three days), so `js/billing.js` now reports each token to the acknowledgement service with a retry queue; `?dev=1` limited to local copies; billing global renamed to this game's own; privacy page and data safety updated for the purchase report. Folder's evaluation fixes are untouched and still come first.

- **2026-11-03** — Claude (for Taylor: "None of the games should be free"): the game is now a paid download, $4.99 on Play, with no in-app purchases. The free-to-try gate, the `full_unlock` purchase, `js/billing.js` and the `?dev=1` unlock are removed: every save loads fully open, and old saves stopped at the gate carry on. Section 3 (monetization) above is superseded. `android/play` is now a WebView app with the whole game packed inside the APK (WebViewAssetLoader, no internet permission) instead of a Trusted Web Activity, and `tools/launch-test.sh` fails unless the game loads with no script errors. The website becomes a store page (`site/index.html`, built from `store/listing.md`) that links to Play; merging `play/package` takes the free web copy down at once. `PLAY.md` lists the Console steps.
