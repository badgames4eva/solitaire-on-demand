/**
 * Ad seam — the one place ads live.
 *
 * Solitaire on Demand's only ad is VOLUNTARY: the player taps "Support the Game"
 * on the main menu to watch one short ad on purpose. There are NO ads forced
 * mid-game, between deals, or on launch — the game is fully playable having never
 * seen one. This mirrors the "ads only at natural, opt-in break points" rule the
 * sibling game (words_on_demand) follows, and keeps the app clear of the
 * consent-banner / child-audience headaches that forced advertising invites.
 *
 * Like words_on_demand's playAd(), this is a deliberate seam for the real
 * per-platform ad SDK. Today it plays a PLACEHOLDER countdown so the browser
 * demo, the Cloudflare deploy, and the device build all work with zero ad
 * infrastructure. To go live, set AD_CONFIG.vastTag and load an IMA HTML5 SDK;
 * the code path is gated so a missing tag simply falls back to the placeholder.
 */
const AD_CONFIG = {
  // Placeholder countdown length (seconds). A real creative's own length wins
  // once vastTag is set; this only drives the fake bar.
  supportSeconds: 15,

  // Google Ad Manager VAST tag URL. null → placeholder. Paste the tag here to
  // go live (append &npa=1 for non-personalized ads — see the sibling repo's
  // ADS_SETUP.md; the store listings declare NPA and a tag without it makes
  // that declaration false).
  vastTag: null,

  // D-pad safety net. The IMA HTML5 SDK has no documented TV/remote support, so
  // if a real creative ever freezes, reveal the Continue button after this long
  // so a remote-only player is never trapped on the ad screen. Set well above a
  // normal creative length so it can't be used to skip a legitimate ad.
  escapeAfterMs: 32000,
};

/**
 * Play the voluntary support ad, then call onDone().
 *
 * @param {object} deps  { showScreen, returnTo, soundManager, focusElement }
 *   - showScreen(id): switch to a .screen by id (UIManager.showScreen)
 *   - returnTo: screen id to come back to when the ad finishes (usually 'main-menu')
 *   - soundManager: optional, for a small "thanks" cue
 *   - focusElement(el): hand real D-pad focus to a newly revealed element. Required
 *     for the Continue button: the remote clicks its OWN focusedElement pointer, so
 *     adding a .focused class here would only LOOK focused while Select did nothing.
 * @param {function} onDone  called once when the player leaves the ad screen
 */
function playSupportAd(deps, onDone) {
  const { showScreen, returnTo = "main-menu", soundManager, focusElement } = deps || {};

  // One ad at a time. A stray double-activation (click + Enter, lingering timer)
  // must not stack two countdowns or, on a real SDK, invoke it re-entrantly.
  if (playSupportAd._playing) return;
  playSupportAd._playing = true;

  const bar = document.getElementById("support-ad-bar");
  const count = document.getElementById("support-ad-count");
  const continueBtn = document.getElementById("support-ad-continue");
  const thanks = document.getElementById("support-ad-thanks");

  // resume() is the single terminal path: every branch (countdown done, escape
  // button, error) funnels through it, so it can only fire once and always
  // clears the latch and hands control back.
  let resumed = false;
  const resume = () => {
    if (resumed) return;
    resumed = true;
    playSupportAd._playing = false;
    clearInterval(tick);
    clearTimeout(escapeTimer);
    if (typeof onDone === "function") onDone();
    else if (typeof showScreen === "function") showScreen(returnTo);
  };

  // Fresh state each time.
  if (bar) bar.style.width = "0%";
  if (continueBtn) continueBtn.hidden = true;
  if (thanks) thanks.hidden = true;

  if (typeof showScreen === "function") showScreen("support-ad-screen");

  // When the countdown ends, thank the player and reveal a focusable Continue
  // button rather than auto-navigating — on a voluntary ad the player should
  // decide when to leave, and an explicit button is always remote-reachable.
  const finish = () => {
    if (bar) bar.style.width = "100%";
    if (count) count.textContent = "0";
    if (thanks) thanks.hidden = false;
    if (continueBtn) {
      // Unhide FIRST — the remote's focus scan skips hidden elements, so it has
      // to be visible before we ask for focus.
      continueBtn.hidden = false;
      if (typeof focusElement === "function") {
        focusElement(continueBtn);
      } else {
        // No focus bridge supplied: fall back to the class + DOM focus so the
        // button is at least visibly highlighted and clickable.
        continueBtn.classList.add("focused");
        if (continueBtn.focus) continueBtn.focus();
      }
    }
    if (soundManager && soundManager.autoComplete) soundManager.autoComplete();
  };

  const seconds = AD_CONFIG.supportSeconds;
  let elapsed = 0;
  if (count) count.textContent = seconds;

  const tick = setInterval(() => {
    elapsed += 0.1;
    const pct = Math.min(100, (elapsed / seconds) * 100);
    if (bar) bar.style.width = pct + "%";
    if (count) count.textContent = String(Math.max(0, Math.ceil(seconds - elapsed)));
    if (elapsed >= seconds) {
      clearInterval(tick);
      finish();
    }
  }, 100);

  // Safety net for the real-SDK future: if a live creative overran/froze, this
  // reveals the escape button early. Harmless for the placeholder (finish()
  // reveals the same button first).
  const escapeTimer = setTimeout(finish, AD_CONFIG.escapeAfterMs);

  // Continue button resumes play. Wired here so the seam owns its own control;
  // it's also a [data-action] fallthrough in case this misses.
  if (continueBtn) {
    continueBtn.onclick = resume;
  }

  // Expose resume so UIManager's Back handler can end the ad cleanly too.
  playSupportAd._resume = resume;
}

// Export for the headless test runner and any module consumer.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { AD_CONFIG, playSupportAd };
}
