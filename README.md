# Open Stall

**A cozy builder about running a market stall.** Buy produce, baked goods, preserves, flowers, crafts and curios from the wholesaler and lay them out on a fifteen-space stall. Each Saturday the customers browse; what you stocked and how you laid it out decides what they spend. Pay the escalating stall fee, engineer absurd combos, and buy the shop on the square before the twelfth week, or go bust.

Free to install on Google Play. The Village Green plays in full at no cost; one in-app purchase (`full_unlock`, $4.99) opens Harbour Market, City Square, the endless Free Market and the last two tiers of stock and charms. No ads, no accounts, fully offline.

Status: **v1.1.0 (free with one unlock) built 2026-11-09**, not submitted. Google Play steps: [PLAY.md](PLAY.md). Brief and living log: [HANDOFF.md](HANDOFF.md). Plan and verification: [tasks/todo.md](tasks/todo.md). Repo rename to `open-stall` at ship time (Tj's call).

Owner: Tj (Taylor Augustin) / AugustInnovations LLC.

## The game

- **One market day:** you lay out the stall (fifteen spaces; tap an item, then a space; the rest wait in the boxes) and it shows what the layout will take. The customers browse five times, each browse paying by the rules of what is next to what. After every browse the wholesaler offers three items at their price: buy one or none. At dusk, read the ledger, buy a charm, sell back what does not fit for half its price, pay the fee.
- **120 items** in six families, each with one plain-language rule shown on tap. **80 charms**. Five weathers with a forecast. Thirty day-events.
- **Three markets** with their own fee schedules and a shop price (Village Green 1300, Harbour Market 1450, City Square 1150 with four browses a day instead of five). Harbour's bottom row is the quayside (double on a dry day, half in the wet); City Square posts an order each morning for two kinds of stock side by side, paid each browse it stands.
- **Combo journal:** every combo ever triggered, with its rule. **Pool tiers** unlock permanently: reach week 6, buy the shop, buy the chandlery. Never power for money.
- **Free Market:** after buying the shop, keep trading with the fee climbing until it cannot be paid.
- Portrait, one-handed, large-text, high-contrast and reduce-motion options. No gambling vocabulary anywhere (the test suite checks).

## Code

| File | What it is |
| --- | --- |
| `js/data.js` | All content: families, weather, locations, symbols, charms, events, combo archetypes. |
| `js/engine.js` | Rules engine: deterministic (seeded), no DOM, runs in Node and the browser. |
| `js/game.js` | UI, save, flow, test API. |
| `js/billing.js` | The one-time unlock through Google Play (the app's `AndroidBilling` bridge, `android/play/.../PlayBilling.java`). Shown as unavailable outside the Play app. |
| `sim/harness.js` | Balance harness: `node sim/harness.js 50 green 1` plays ~1,200 seasons (random, greedy, one focused player per archetype) and reports win-rate, coin curves, combo usage and the viable-archetype count. Exit code 2 below the 15-archetype kill rule (`MIN_VIABLE=12` for Harbour and Square in CI). `SHOP=`, `RENTX=` and `SPINS=` try other numbers without editing data. |
| `tests/engine.test.js` · `tests/smoke.js` | Engine unit tests; Playwright smoke test (works over `file://`). |
| `tools/make-icons.js` | Icons via the test API. |
| `tools/tap-through.js` | Emulator tap-through of the Play edition with real touches (CI, `android.yml`). |

`window.__openstall`: `start(loc, seed)`, `setWeek`, `setWeather`, `give`, `stock([...])`, `charm(id)`, `browse`, `take(i)`, `skip`, `pay`, `setTier`, `arrange(from, to)`, `reshowOffer`, `billing`, `save`, `reset`. There is no hook that unlocks the full game.

Save: `localStorage` key `openstall.v1` = `{ run, meta, settings }`, every field sanitized and clamped on load; an unparseable save is copied to `openstall.v1.backup` and the game starts fresh.

## Balance (harness, 2026-11-09, `npm run harness`)

| Market | Runs | Random | Greedy by payout | Focused on one archetype |
| --- | --- | --- | --- | --- |
| Village Green (tier ≤1) | 50 | 0% | 88% | 20 of 22 viable, 17 signature combos, top 90–94% |
| Harbour Market (tier ≤3) | 30 | 0% | 77% | 16 of 22 viable, 14 combos |
| City Square (tier ≤3, four browses) | 30 | 0% | 73% | 16 of 22 viable, 12 combos |

Viable means a focused win-rate of 25% or more. The harness lays the stall out with the same arranger the game offers, so these numbers assume a player who lays out for the rules.

## Publishing

A free app on Google Play with one in-app unlock (`android/play`, see `PLAY.md`). Pages deploys only the store page from `main` (`site/index.html`, the privacy policy `privacy.html` and the store graphics), not the playable game. Store copy: `store/listing.md`.
