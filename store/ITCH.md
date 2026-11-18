# itch.io page — Open Stall

A draft for an itch.io page that hosts the free web part of the game and points
to the full game on Google Play. Nothing here is published; the steps below are
for Taylor to follow by hand.

The zip is built with the marketing tools, outside this repo:
`python3 tools/itch_pack.py <this repo> openstall-itch.zip` (index.html at the
root, plus `js/`, `icons/`, the stylesheet and the manifest; nothing from
`android/`, `tests/`, `sim/` or `store/`). In a plain browser the build plays
the Village Green in full and shows the other markets as part of the Google
Play edition, so the itch page works as a free demo.

## Upload

1. https://itch.io/game/new (a free account; verify the email first).
2. **Kind of project:** HTML. Upload `openstall-itch.zip` and tick
   **This file will be played in the browser**.
3. **Embed options:** viewport **360 × 640** (portrait); tick **Mobile
   friendly** (orientation: portrait) and **Fullscreen button**. Leave
   *Automatically start on page load* on. SharedArrayBuffer: off (not used).
4. **Pricing:** *No payments* (a free web demo; the full game is on Google Play).
5. **Visibility:** *Draft* until the page below is filled, then *Public*.

## Page

**Title** (the project name)

    Open Stall

**Short description or tagline** (the line under the title)

    A cozy market-stall roguelite. Lay out the stall, find the combos, buy the shop on the square.

**Classification:** Games · **Kind of project:** HTML

**Genre:** Simulation (also Strategy)

**Tags** (ten at most; itch's own vocabulary)

    Cozy, Roguelite, Management, Simulation, Strategy, Shop Keeper, Singleplayer, Casual, Offline, Mobile

**Made with:** JavaScript, HTML5

**Languages:** English · **Inputs:** Mouse, Touchscreen

**Accessibility:** large text, high contrast and reduce motion, in the settings.

**Links:** the full game on Google Play:
https://play.google.com/store/apps/details?id=com.taugustincst.openstall

**Description** (itch takes Markdown)

    **One trestle table. Twelve Saturdays. A shop on the square for sale.**

    Open Stall is a cozy market sim and roguelite builder. Buy stock from the
    wholesaler after each browse and lay it out on a fifteen-space stall. What
    sits next to what decides what the customers spend: honey beside the tea,
    jam that sells through the fruit next to it, candles on a foggy day, a row
    of bread. Before they come, the stall shows what your layout will take.

    **Find the combos.** Every item has one rule in plain words, and charms
    bend the rules. Five kinds of weather and thirty market-day events change
    what sells. Every combo you trigger goes in the journal.

    **Pay the fee.** The stall fee climbs every Saturday. Buy the shop before
    the twelfth Saturday, or go bust and try a new season.

    **This web version is the free part of the game:** the Village Green, in
    full, season after season. The full game, with Harbour Market, City Square,
    the endless Free Market and the rest of the stock and charms, is on Google
    Play:
    https://play.google.com/store/apps/details?id=com.taugustincst.openstall

    No ads, no account, nothing downloaded after the page. Progress stays in
    your browser.

**Screenshots:** the raw phone shots in this folder (`screenshot-01-stall.png`
to `screenshot-04-markets.png`), or the captioned ones in `store/play/`.

**Cover image:** 630 × 500; crop `feature-graphic-1024x500.png` around the
stall, or make one from `screenshot-01-stall.png`.
