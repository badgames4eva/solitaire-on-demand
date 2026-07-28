/* Solitaire on Demand — logic tests.
 *
 * Framework-free, no build step, same house style as words_on_demand. These
 * assertions run in TWO places against the REAL js/ source:
 *   - node run-tests.js  → headless, exits non-zero on failure (the push gate)
 *   - tests.html         → green/red readout in a browser
 *
 * Scope: the PURE game-rule logic — Card placement rules, Deck construction and
 * dealing, and DifficultyManager settings. These are the parts that decide
 * whether a move is legal and whether a deal is well-formed, so a regression
 * here is a real gameplay bug. DOM/remote/sound code is deliberately out of
 * scope: it needs a live document and is a manual check on the device.
 *
 * The runner exposes the classes as globals (Card, Deck, DifficultyManager,
 * HintSystem) before this file runs — see run-tests.js / tests.html.
 */
(function () {
  "use strict";

  // --- tiny assert kit -----------------------------------------------------
  const results = [];
  function test(name, fn) {
    try {
      fn();
      results.push({ name, ok: true });
    } catch (err) {
      results.push({ name, ok: false, err: err && err.message ? err.message : String(err) });
    }
  }
  function eq(actual, expected, msg) {
    if (actual !== expected) {
      throw new Error((msg ? msg + ": " : "") + `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }
  function ok(cond, msg) { if (!cond) throw new Error(msg || "expected truthy"); }
  function notOk(cond, msg) { if (cond) throw new Error(msg || "expected falsy"); }

  // Helper: build a specific card face-up (tableau/foundation rules assume the
  // card being placed is visible; face state doesn't affect the rule itself).
  const card = (rank, suit) => new Card(rank, suit);

  // ==========================================================================
  // Card — color + identity
  // ==========================================================================
  test("Card: hearts/diamonds are red, clubs/spades are black", () => {
    ok(card(5, "hearts").isRed());
    ok(card(5, "diamonds").isRed());
    ok(card(5, "clubs").isBlack());
    ok(card(5, "spades").isBlack());
    notOk(card(5, "hearts").isBlack());
    notOk(card(5, "spades").isRed());
  });

  test("Card: rank names map A/J/Q/K correctly", () => {
    eq(card(1, "spades").getRankName(), "A");
    eq(card(11, "spades").getRankName(), "J");
    eq(card(12, "spades").getRankName(), "Q");
    eq(card(13, "spades").getRankName(), "K");
    eq(card(7, "spades").getRankName(), "7");
  });

  test("Card: id is stable and unique per suit+rank", () => {
    eq(card(1, "spades").id, "spades-1");
    eq(card(13, "hearts").id, "hearts-13");
  });

  test("Card: getValue caps face cards at 10, Ace is 1", () => {
    eq(card(1, "clubs").getValue(), 1);
    eq(card(9, "clubs").getValue(), 9);
    eq(card(10, "clubs").getValue(), 10);
    eq(card(11, "clubs").getValue(), 10); // Jack
    eq(card(13, "clubs").getValue(), 10); // King
  });

  test("Card: clone copies rank/suit/faceUp but is a distinct object", () => {
    const c = card(4, "hearts"); c.faceUp = true;
    const d = c.clone();
    ok(c !== d, "clone must be a new object");
    eq(d.rank, 4); eq(d.suit, "hearts"); eq(d.faceUp, true);
    d.faceUp = false;
    eq(c.faceUp, true, "mutating the clone must not touch the original");
  });

  test("Card: toJSON/fromJSON round-trips", () => {
    const c = card(12, "diamonds"); c.faceUp = true;
    const back = Card.fromJSON(c.toJSON());
    eq(back.rank, 12); eq(back.suit, "diamonds"); eq(back.faceUp, true); eq(back.id, "diamonds-12");
  });

  // ==========================================================================
  // Card — tableau placement (alternating color, descending rank)
  // ==========================================================================
  test("Tableau: only a King may start an empty column", () => {
    ok(card(13, "spades").canPlaceOnTableau(null), "King on empty = legal");
    notOk(card(12, "spades").canPlaceOnTableau(null), "Queen on empty = illegal");
    notOk(card(1, "spades").canPlaceOnTableau(null), "Ace on empty = illegal");
  });

  test("Tableau: legal move is one lower AND alternating color", () => {
    // red 6 on black 7 → legal
    ok(card(6, "hearts").canPlaceOnTableau(card(7, "spades")));
    ok(card(6, "diamonds").canPlaceOnTableau(card(7, "clubs")));
    // black 6 on red 7 → legal
    ok(card(6, "clubs").canPlaceOnTableau(card(7, "hearts")));
  });

  test("Tableau: same color is rejected even at the right rank", () => {
    notOk(card(6, "hearts").canPlaceOnTableau(card(7, "diamonds")), "red on red");
    notOk(card(6, "spades").canPlaceOnTableau(card(7, "clubs")), "black on black");
  });

  test("Tableau: wrong rank is rejected even with alternating color", () => {
    notOk(card(5, "hearts").canPlaceOnTableau(card(7, "spades")), "two lower");
    notOk(card(8, "hearts").canPlaceOnTableau(card(7, "spades")), "higher");
    notOk(card(7, "hearts").canPlaceOnTableau(card(7, "spades")), "same rank");
  });

  // ==========================================================================
  // Card — foundation placement (same suit, ascending from Ace)
  // ==========================================================================
  test("Foundation: only an Ace may start an empty pile", () => {
    ok(card(1, "hearts").canPlaceOnFoundation([]));
    notOk(card(2, "hearts").canPlaceOnFoundation([]));
    notOk(card(13, "hearts").canPlaceOnFoundation([]));
  });

  test("Foundation: next card must be same suit and one higher", () => {
    const pile = [card(1, "hearts")]; // Ace of hearts down
    ok(card(2, "hearts").canPlaceOnFoundation(pile), "2♥ on A♥");
    notOk(card(2, "spades").canPlaceOnFoundation(pile), "wrong suit");
    notOk(card(3, "hearts").canPlaceOnFoundation(pile), "skips a rank");
    notOk(card(1, "hearts").canPlaceOnFoundation(pile), "same rank");
  });

  test("Foundation: builds all the way to King in suit", () => {
    const pile = [];
    for (let r = 1; r <= 13; r++) {
      ok(card(r, "clubs").canPlaceOnFoundation(pile), `${r}♣ should go up`);
      pile.push(card(r, "clubs"));
    }
    eq(pile.length, 13);
  });

  // ==========================================================================
  // Deck — construction, shuffle integrity, deal shape
  // ==========================================================================
  test("Deck: builds exactly 52 unique cards, 13 per suit", () => {
    const d = new Deck();
    eq(d.cards.length, 52);
    const ids = new Set(d.cards.map((c) => c.id));
    eq(ids.size, 52, "all ids unique");
    for (const suit of ["hearts", "diamonds", "clubs", "spades"]) {
      eq(d.cards.filter((c) => c.suit === suit).length, 13, `13 ${suit}`);
    }
  });

  test("Deck: shuffle preserves the exact multiset of 52 cards", () => {
    const d = new Deck();
    const before = d.cards.map((c) => c.id).sort();
    d.shuffle();
    const after = d.cards.map((c) => c.id).sort();
    eq(d.cards.length, 52, "count unchanged");
    eq(JSON.stringify(after), JSON.stringify(before), "same cards, no dupes/drops");
  });

  test("Deal: 7 tableau columns of increasing size totalling 28 cards", () => {
    const { tableau } = new Deck().deal();
    eq(tableau.length, 7);
    let total = 0;
    for (let i = 0; i < 7; i++) {
      eq(tableau[i].length, i + 1, `column ${i} has ${i + 1} cards`);
      total += tableau[i].length;
    }
    eq(total, 28, "28 cards dealt to the tableau");
  });

  test("Deal: only the bottom card of each column is face up", () => {
    const { tableau } = new Deck().deal();
    for (let col = 0; col < 7; col++) {
      const column = tableau[col];
      for (let row = 0; row < column.length; row++) {
        const shouldBeUp = row === column.length - 1;
        eq(column[row].faceUp, shouldBeUp, `col ${col} row ${row}`);
      }
    }
  });

  test("Deal: stock holds the remaining 24 cards, foundation empty, no dupes", () => {
    const { tableau, stock, foundation, waste } = new Deck().deal();
    eq(stock.length, 24, "52 - 28 = 24 in stock");
    eq(waste.length, 0, "waste starts empty");
    eq(foundation.length, 4, "four foundation piles");
    foundation.forEach((p, i) => eq(p.length, 0, `foundation ${i} empty`));
    // every one of the 52 cards appears exactly once across tableau+stock
    const all = [...tableau.flat(), ...stock].map((c) => c.id);
    eq(all.length, 52, "52 cards in play");
    eq(new Set(all).size, 52, "no card dealt twice");
  });

  // ==========================================================================
  // DifficultyManager — settings + undo gating
  // ==========================================================================
  test("Difficulty: defaults to medium", () => {
    eq(new DifficultyManager().currentDifficulty, "medium");
  });

  test("Difficulty: setDifficulty accepts known levels, rejects unknown", () => {
    const dm = new DifficultyManager();
    ok(dm.setDifficulty("hard")); eq(dm.currentDifficulty, "hard");
    notOk(dm.setDifficulty("impossible"), "unknown level rejected");
    eq(dm.currentDifficulty, "hard", "rejected level does not change state");
  });

  test("Difficulty: draw count is 1 on easy/medium, 3 on hard", () => {
    const dm = new DifficultyManager();
    dm.setDifficulty("easy"); eq(dm.getDrawCount(), 1);
    dm.setDifficulty("medium"); eq(dm.getDrawCount(), 1);
    dm.setDifficulty("hard"); eq(dm.getDrawCount(), 3);
  });

  test("Difficulty: feature flags differ across levels", () => {
    const dm = new DifficultyManager();
    dm.setDifficulty("easy");
    ok(dm.canShowHints() && dm.canAutoComplete() && dm.isFeatureEnabled("winnableDeals"));
    dm.setDifficulty("hard");
    notOk(dm.canShowHints(), "no hints on hard");
    notOk(dm.canAutoComplete(), "no auto-complete on hard");
    notOk(dm.isFeatureEnabled("winnableDeals"), "no winnable guarantee on hard");
  });

  test("Difficulty: score multiplier floors the result", () => {
    const dm = new DifficultyManager();
    dm.setDifficulty("easy");  eq(dm.calculateScore(100), 80);  // ×0.8
    dm.setDifficulty("medium"); eq(dm.calculateScore(100), 100); // ×1.0
    dm.setDifficulty("hard");  eq(dm.calculateScore(100), 150); // ×1.5
    dm.setDifficulty("easy");  eq(dm.calculateScore(101), 80);  // floor(80.8)
  });

  test("Difficulty: canUndo respects the per-level limit", () => {
    const dm = new DifficultyManager();
    dm.setDifficulty("easy");   // unlimited (-1)
    ok(dm.canUndo(0)); ok(dm.canUndo(999), "easy never runs out of undos");
    dm.setDifficulty("medium"); // limit 10
    ok(dm.canUndo(9), "9 < 10 allowed");
    notOk(dm.canUndo(10), "10th blocks");
    notOk(dm.canUndo(11));
    dm.setDifficulty("hard");   // limit 3
    ok(dm.canUndo(2));
    notOk(dm.canUndo(3), "hard blocks at 3");
  });

  // --- expose results ------------------------------------------------------
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  const summary = { total: results.length, passed, failed: failed.length, results };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = summary;                 // node runner reads this
  }
  if (typeof window !== "undefined") {
    window.SOLITAIRE_TEST_RESULTS = summary;  // browser harness reads this
  }
})();
