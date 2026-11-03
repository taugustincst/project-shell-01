# Open Stall

**A cozy builder about running a market stall.** Stock a five-shelf stall with produce, baked goods, preserves, flowers, crafts and curios. Each Saturday the customers browse; what you stocked and how it sits together decides what they spend. Pay the escalating stall fee, engineer absurd combos, and buy the shop on the square before the twelfth week, or go bust.

A paid download on Google Play with the whole game included: all three markets, the endless Free Market and the full stock pool. No in-app purchases, no ads, no accounts, fully offline.

Status: **v1.0.0 draft built 2026-11-03**, not submitted. Brief and living log: [HANDOFF.md](HANDOFF.md). Plan and verification: [tasks/todo.md](tasks/todo.md). Repo rename to `open-stall` at ship time (Tj's call).

Owner: Tj (Taylor Augustin) / AugustInnovations LLC.

## The game

- **One market day:** the stall is laid out at random from your stock (fifteen spaces; the rest wait in the boxes), the customers browse five times, each browse pays by the rules of what is next to what. After every browse the wholesaler offers three items: take one or none. At dusk, read the ledger, buy a charm, sell what does not fit, pay the fee.
- **120 items** in six families, each with one plain-language rule shown on tap. **80 charms**. Five weathers with a forecast. Thirty day-events.
- **Three markets** with their own fee schedules and a shop price; the City Square gives four browses instead of five.
- **Combo journal:** every combo ever triggered, with its rule. **Pool tiers** unlock permanently: reach week 6, buy the shop, buy the chandlery. Never power for money.
- **Free Market:** after buying the shop, keep trading with the fee climbing until it cannot be paid.
- Portrait, one-handed, large-text, high-contrast and reduce-motion options. No gambling vocabulary anywhere (the test suite checks).

## Code

| File | What it is |
| --- | --- |
| `js/data.js` | All content: families, weather, locations, symbols, charms, events, combo archetypes. |
| `js/engine.js` | Rules engine: deterministic (seeded), no DOM, runs in Node and the browser. |
| `js/game.js` | UI, save, flow, test API. |
| `sim/harness.js` | Balance harness: `node sim/harness.js 50 green 1` plays ~1,200 seasons (random, greedy, one focused player per archetype) and reports win-rate, coin curves, combo usage and the viable-archetype count. Exit code 2 below the 15-archetype kill rule. |
| `tests/engine.test.js` · `tests/smoke.js` | Engine unit tests; Playwright smoke test (works over `file://`). |
| `tools/make-icons.js` | Icons and the staged store screenshot via the test API. |

`window.__openstall`: `start(loc, seed)`, `setWeek`, `setWeather`, `give`, `stock([...])`, `charm(id)`, `browse`, `take(i)`, `skip`, `pay`, `setTier`, `save`, `reset`.

Save: `localStorage` key `openstall.v1` = `{ run, meta, settings }`, every field sanitized and clamped on load; an unparseable save is copied to `openstall.v1.backup` and the game starts fresh.

## Balance (harness, 50 runs per strategy, Village Green, tier ≤1 pool)

| Player | Win-rate |
| --- | --- |
| Random picks | 6% |
| Greedy by payout | 50% |
| Focused on one archetype | 34–98%, 19 of 22 archetypes viable, 15 distinct signature combos |

Harbour and Square are harder for the same heuristics (7 and 0 viable); the tier-3 pool's weather locks and extra browses are what those markets are built around, and the harness does not yet play them. Week-4 balance pass still to do.

## Publishing

A paid app on Google Play with the whole game packed inside it (`android/play`, see `PLAY.md`). Pages deploys only the store page from `main` (`site/index.html`, the privacy policy `privacy.html` and the store graphics), not the playable game. Store copy: `store/listing.md`.
