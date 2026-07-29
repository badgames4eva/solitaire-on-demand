# Solitaire on Demand — project instructions

Klondike Solitaire for Connected TV (Fire TV / Android TV first), built
remote-first for D-pad + OK at a 10-foot viewing distance. Vanilla HTML/CSS/JS,
no build step. Sibling project to `words_on_demand`, which shares its
conventions — when a pattern is unclear, look at how that repo does it.

See [README.md](README.md) for the feature list, difficulty table, file
structure, and keyboard shortcuts. This file is the stuff you can't infer from
reading the code.

## Non-negotiable constraints

- **Remote-first.** Everything must be reachable by 4-way D-pad + OK. No pointer,
  no free cursor, no mouse-only control. A `onclick=` handler with no key path is
  a bug — on a TV it's simply unreachable.
- **10-foot UI.** Oversized text and controls, unmistakable high-contrast focus.
  The app sizes for desktop in the base CSS rules, then **scales up** in
  `@media (min-width: 1920px)` and `(min-width: 2560px)` blocks. New screens must
  add their own overrides there or they render desktop-tiny on an actual TV.
- **No precision timing.** Discrete, turn-based selection only (~100ms remote latency).
- **Ads are voluntary only.** See below.
- **Keep it general-audience.** A child-directed classification forfeits ad
  revenue (COPPA).

## Deploy

The live site is **Cloudflare Workers serving static assets from Git** — not
Cloudflare Pages, not GitHub Pages. **Pushing to `main` IS the deploy** (~1 min).
Live at <https://solitaireondemand.badgames4eva.com>, linked from the
`badgames4eva.com` landing page (separate repo: `badgames4eva_site`).

- How to tell it's this setup: `server: cloudflare` **and a zero-byte 404 body**
  (Pages serves a styled HTML 404).
- Keep the `Klondike` branch synced to `main` (`git branch -f Klondike main`).
  `Klondike` was the newer build before main caught up; they're aligned now.
- **Run `node run-tests.js` before pushing** — it's the gate, exits non-zero on failure.

### The service-worker cache trap

**Bump all three cache names in `sw.js` on every deploy.** A registered service
worker keeps serving its cached copy until the cache *name* changes, so returning
and PWA-installed players stay on the old build indefinitely — the deploy looks
live to you (fresh browser, no SW) and stale to them.

Also keep `STATIC_FILES` in `sw.js` in sync with the `<script>`/`<link>` tags in
`index.html`. A file loaded there but missing from that list fails offline.
(`sound-manager.js` was missing for a while — that's how this was found.)

## Remote / focus architecture

Read [FIRE_TV_REMOTE_REFERENCE.md](FIRE_TV_REMOTE_REFERENCE.md) for keycodes.
Two traps that have each caused real bugs:

**1. The focus scanner is screen-scoped.** `TVRemoteHandler.updateFocusableElements()`
only accepts elements that are *both* `.focusable` **and** inside `.screen.active`.
An overlay appended to `document.body` can therefore **never** join the focus list
no matter what class you give it — it must own its own D-pad handling (Left/Right,
Select, Back, capture-phase so keys don't leak to the board behind it, and cleanup
on dismiss so it stops swallowing input). The exit-confirmation modal in `ui.js`
is the reference implementation. Also: `handleSelect()` clicks the remote's own
`focusedElement` pointer, so adding a `.focused` class by hand makes something
*look* focused while Select does nothing — call `setFocus()` instead, and re-scan
first if the element was hidden when the screen opened.

**2. Multiple listeners see the same key.** There are independent `keydown`
listeners in `app.js`, `game.js`, and `ui.js`, and `stopPropagation()` does **not**
stop other listeners on the same `document` node. One physical Back press can
arrive 2–3 times. `handleBackButton()` debounces on `this.lastBackAt` for exactly
this reason — without it, pass 1 navigates and pass 2 opens the Exit dialog.
This whole layer is overdue for a simplification pass down to a single switch like
`words_on_demand`'s `game.js`; `tv-remote.js` self-documents as "MOSTLY UNUSED"
and has a dead Android-keycode block (`handleKeyPress` is only ever called with
one argument).

**`window.SolitaireNative.onBack()`** is the bridge for the Fire OS / Android TV
wrapper, which consumes KEYCODE_BACK natively so it never reaches the page as a
keydown. It **must stay synchronous** — the wrapper reads the returned boolean to
decide whether to show its own exit dialog, so a promise or deferred callback
reads as "not handled".

## Ads

The only ad is **voluntary**: the "❤ Support the Game" button on the main menu
plays one short ad the player opted into. **Never** force an ad mid-game, between
deals, or on launch — the game is fully playable having never seen one.

The whole integration is one seam, `js/ads.js`. It plays a placeholder countdown
today; set `AD_CONFIG.vastTag` (and load an IMA HTML5 SDK) to go live with no
other code change. Append `&npa=1` for non-personalized ads — the store listings
declare NPA and a tag without it makes that declaration false. See
`words_on_demand`'s `ADS_SETUP.md` for account setup.

## Deliberate absences — don't "restore" these

- **No update prompt.** Removed on purpose: this is a hosted web app, so a reload
  already fetches the newest files and the SW's `activate` handler swaps caches on
  next load. An "update available" banner just interrupts to ask permission for
  something that happens for free.
- **No save / continue-game.** Deliberately removed (caused blank-board bugs);
  commented-out call sites remain in `app.js`.
- **No Spider Solitaire.** Was added and reverted twice.

## Known gaps

- **No privacy page.** Blocks store submission (both stores require a reachable
  privacy URL) and is why the landing page doesn't link one for this game yet.
- **`app-descriptions.md` overstates the app** — it advertises save/continue and
  cloud sync, which this code no longer has. Fix before submitting anywhere.
- Tests cover pure rule logic only (`card.js`, `deck.js`, `difficulty.js`). The
  DOM, remote, and sound layers need a real device and stay a manual check.
