# Lessons (Open Stall)

- Local ports are denied in the build sandbox: drive Playwright over `file://`; the service worker simply does not register there (guarded in game.js).
- CSS `transform` animations override an SVG element's `transform` attribute; wrap the animated element in a `<g transform>`.
- A planted corrupt save is overwritten by the game's `pagehide` save on reload; plant it with `addInitScript` in a fresh browser context instead.
- GitHub Pages must be enabled by Tj in Settings → Pages → Source: GitHub Actions; the workflow token cannot create the site. Logged FOR TJ.
- Modifier records mix `n` (amount) and `p` (percent); a summing helper that only reads `n` yields NaN coins. Read both fields explicitly.
- Linear, uncapped "age" bonuses dominate every strategy by mid-season; cap them (AGE_CAP = 6) so other combos can be the signature.
- A self-spawning starter symbol (postcards) floods the stock and every archetype's combo signature; starters must be inert.
- Balance is a cliff, not a slope: a 20% rent change swung focused win-rates from ~95% to 0%. Change one lever at a time and re-run the harness.
