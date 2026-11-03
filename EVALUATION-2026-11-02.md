# Evaluation — Shell 01: Open Stall (project-shell-01)

Evaluated 2026-11-02 by Folder (expert review) against the build brief in the repo's HANDOFF.md.
Method: read the brief, ran the repo's own tests and balance harness, independently counted content in `js/data.js`, grepped for network/analytics/gambling/hover patterns, and read `js/engine.js`, `js/game.js`, `js/billing.js`, and `store/listing.md` in full.

## Scores

| Dimension | Score /10 |
|---|---|
| Brief compliance | 7 |
| Gameplay / design | 7 |
| Balance evidence | 5 |
| Polish / presentation | 6 |
| UX / accessibility | 8 |
| Technical quality | 9 |
| Store readiness | 5 |
| **Overall** | **7 — ship after fixes** |

## Test & sim results (run by the evaluator, verbatim)

- `npm test` → `node tests/engine.test.js`: **ALL 10 PASSED** (content floors, readable rules, no gambling vocabulary, seeded determinism, season ends win/loss ≤12 weeks, every rule kind pays what it says, charms/events change numbers, rent schedule + shop purchase, pool-tier gating, save sanitizer).
- `node tests/smoke.js` (Playwright, real browser): **23 PASS lines, "ALL PASSED"** — title/locks, season start, browse layout, customers pay, offer take, tap-to-read rule, dusk ledger, charm buy, stock sell, fee → week 2, combo journal entries, reload persistence, missed fee ends season, shop purchase wins + raises tier, Free Market unlock-gated, locked locations explain themselves, no-billing unlock path explains itself, unlock opens locations, City Square 4 browses, 3 mangled-save cases load, zero page/console/network errors.
  - Note: smoke initially failed in this sandbox with `Cannot find module 'playwright'` (devDependency not installed in the fresh clone). After `npm install` it passed fully. The HANDOFF log claims 24 smoke checks; 23 PASS lines were observed.
- Balance harness (`node sim/harness.js`, 1,200 runs per configuration):
  - **Village Green, free pool (tier ≤1): random 6%, greedy-by-payout 50%, 19 of 22 archetypes viable (≥25% win), 15 distinct signature combos.** The brief's kill rule (≥15 viable archetypes) is met on the free location — exactly at the signature-combo threshold.
  - Village Green, full pool (tier ≤3): greedy 63%, archetypes healthy (e.g. Slow burners 77%).
  - **Harbour Market (tier ≤3): random 0%, greedy 4%, only 8 of 22 archetypes viable, 8 signature combos.** (Tier ≤2: also 8 of 22.)
  - **City Square (tier ≤3): random 0%, greedy 0%, 0 of 22 archetypes viable, 0 signature combos.** Every focused archetype scored 0–6% across 1,200 runs. Mean coin curves peak around week 8 (~850–910) and then decline — rent outruns income before the 1,200-coin shop price is reachable.
- Independent content count (from `js/data.js`): **120 symbols** (exactly 20 per family × 6 families), **80 charms**, **30 events**, **5 weathers**, **3 locations**, 22 named archetypes. Symbol tiers 48/36/22/14 (t0–t3); charm tiers 25/27/20/8.
- Size: entire repo 396 KB including icons; web payload (HTML/CSS/JS/manifest) ~117 KB. Brief budget is <3 MB — met with ~25× headroom.

## What the brief asked vs what was built

**Met, verified in code:**
- Core loop is complete: market browses with offers → dusk ledger (charm shop, sell stock) → weekly fee on a published, escalating schedule (`LOCATIONS[].rent`) → win by buying the shop → loss on missed fee or week-12 expiry → Free Market endless (`goEndless`) with ever-rising fees.
- Combo journal: persistent across runs in profile meta (`game.js` `sanitizeMeta`/`journal`), records every combo key with its plain-language rule and a lifetime count; new-combo toasts in play. This is the brief's centrepiece and it works.
- Meta-progression: pool tiers unlock by play (week 6 → tier 1, buy the shop → tier 2, win Harbour → tier 3); nothing is sold except the single full-game unlock. Free players are capped at tier ≤1 by `maxTier()` even if their meta tier is higher.
- Free content = the complete Village Green season with 84 of 120 symbols and 52 of 80 charms available across tiers 0–1 — genuinely a complete, winnable game (greedy 50%, focused archetypes up to 98%), not an amputated demo.
- Monetization: `js/billing.js` implements the Digital Goods API against SKU `full_unlock`, with `listPurchases()` restore and a graceful "available in the Google Play version" path in a plain browser; locked locations explain themselves; a `?dev=1` override exists for testing. All verified by the smoke test.
- Save hardening: versioned key `openstall.v1` plus a backup key written on JSON parse failure; `sanitizeRun` clamps/validates every field (ids checked against data tables, arrays capped, numbers bounded); meta and settings sanitizers likewise; smoke tests prove truncated/wrong-type/non-object saves load. Fail-soft throughout — the Ironhold lesson applied properly.
- Test API `window.__openstall`: start, setWeek, setWeather, give, stock, charm, browse, take, skip, pay, unlock, setTier, save, reset — exceeds the brief.
- Offline/purity: no `fetch`/`XMLHttpRequest`/analytics/ads anywhere in game code; the only `fetch` is the service worker's own-origin cache (`sw.js`), and the only external string is the Play Billing payment-method identifier. Zero gambling vocabulary in player-facing text (engine test enforces it; evaluator grep confirms — the only hit is the store listing's IARC note stating there is none, which is a declaration, not game text).
- Touch-first: every stall cell, stock item, and wholesaler offer is a tappable button; rules are shown inline on offer cards and in full in the tap info modal; the weather header's `title=` attribute is redundant decoration, not the information channel (tapping it shows the full description). No hover-only information found.
- Accessibility: working settings for large text, high contrast, and reduced motion (wired in `applySettings`); portrait tab layout, one-handed; meaning is never colour-only (emoji + name + numeric payout on every cell).

**Deviations from the brief (the substance behind the scores):**
1. **Two of three locations fail the balance evidence.** The brief's week-4 balance pass is explicitly listed as "next" in the repo's own HANDOFF log, and it shows: Harbour is a cliff (8/22 viable) and City Square is a wall (0/22 viable, 0% for random, greedy, and essentially every focused strategy over 1,200 runs each). Root cause visible in data: Square gives only 4 browses/day (vs 5) against Green's identical rent schedule and a higher shop price (1,200 vs 1,000), so income and stock growth both fall behind from week 1. These two locations are the paid unlock's headline content.
2. **The player never arranges the stall, and stock costs nothing.** The brief's loop is "spend coins at the wholesaler… the skill is in what you stocked and how you arranged it." In `engine.js` `browse()`, the stock is shuffled into random grid slots on every browse, so adjacency — the core combo mechanic — is re-rolled by chance rather than constructed by the player; and `takeOffer()` adds stock for free (a symbol's `price` is used only for its sell value). The store copy ("Lay them out…") promises arrangement the game doesn't offer. The stock-selection game that remains is real (random 6% vs focused 50–98% on Green proves selection skill matters), but a core pillar of the brief was quietly replaced with dice.
3. **Store pack is half-built.** `store/` contains only `listing.md` (copy is good — see below). There is no 1024×500 feature graphic and no staged screenshot set; the single portrait screenshot sits in `icons/`. The brief's week-5 store pack requires both, produced via the test API.
4. **Cross-project copy-paste remnants.** `js/billing.js` falls back to the payment label "The rest of the century" (that's Keep the Light's unlock text) when Play returns no details, and `js/game.js` line 4 falls back to `window.KTL_BILLING`. Harmless functionally, sloppy in the one file that handles money.

## Design quality notes

The synergy engine is genuinely good: 14 symbol rule kinds (adjacency, adjacency-multiplier, boost, weather, count, sell-through "eat", ageing, sell-out timing, empty-space, row, season-week, spawn, transform, lone) interacting in a 4-phase resolution (transform → boost → own rules → charm/event modifiers), plus 25 charm effect kinds including weather-lock, interest, first/last-browse multipliers. Signature combos in the harness are distinct per archetype (tea↔honey adjacency, age-stacking pickles/sourdough/fossil, sell-through jam) — combos read as identities, not noise. Deterministic seeded RNG with a pure, DOM-free engine is why the test suite can prove "every rule kind fires and pays what it says."

Weaker points: on the free location several focused archetypes win at 88–98% (Things that improve with age 98%, Sweet stall 94%), so Green's challenge is thin for an optimiser once an archetype is known — acceptable for cozy, worth a note. The event deck's 30 events are real modifiers (they enter `modsFor`), not flavour-only. Egg-crate issue: none found — `sanitizeRun` even repairs a mid-market save whose spins are exhausted.

## Ranked defects

1. **City Square unwinnable; Harbour a cliff** (evidence above). Selling an unlock whose two locations a competent strategy cannot beat (Square) or can barely beat (Harbour) is a refund/1-star generator and fails the roster's fairness standard.
2. **No player arrangement + free stock offers** — core-loop deviation from the brief and from the listing's own copy.
3. **Store pack incomplete** — no feature graphic, no screenshot set in `store/`.
4. **Billing fallback label names another game** ("The rest of the century") and the `KTL_BILLING` fallback in `game.js`.
5. **Free-location top archetypes over-tuned** (94–98% win) — minor; revisit after the Square/Harbour pass.
6. Listing full description uses "No ads" and "complete and free" phrasing; the brief's promo-word ban was written for the short description (which is clean), but the same Play featuring filter can read the full text — reword to be safe.

## Top 3 fixes

1. **Retune Harbour and City Square before anything ships, with a harness gate:** e.g. Square to 5 browses/day and/or a lower shop price and softer weeks 9–12 rent; re-run `sim/harness.js 50 <loc> 3` per location and require ≥12/22 viable archetypes and greedy ≥15% on each before the build is called balanced. (The repo's own HANDOFF log already schedules this pass.)
2. **Restore the brief's agency or change the promise:** either let the player place/pin stock on the 15-space stall (even a simple "arrange at dawn" drag/tap-swap step — the engine's grid is already explicit), or rewrite the brief/listing copy so nothing claims arrangement. In the same pass, charge coins for wholesaler offers (symbols already carry prices) or explicitly re-decide the dawn step in HANDOFF.
3. **Finish the store pack:** 1024×500 feature graphic from real game art, and 4+ staged screenshots captured through `window.__openstall` (shot 1 = mid-browse stall with a combo paying out), filed in `store/` next to the listing.

## Verdict

**Ship after fixes — Overall 7/10.** The free game is complete, well-engineered, and fun-shaped; the paid content is not yet balanced and the store pack is not finished. Nothing here needs a rework of the engine or the design skeleton.
