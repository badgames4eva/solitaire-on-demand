#!/usr/bin/env node
/* Headless test runner for Solitaire on Demand. Loads the REAL logic classes
 * (card.js, deck.js, difficulty.js) plus tests.js into one sandbox with a
 * minimal DOM/window stub, prints pass/fail, and exits non-zero on any failure
 * so it can gate a push / CI. No dependencies, no build step — same shape as
 * words_on_demand/run-tests.js.
 *
 * Only the pure-logic files are loaded here. ui.js / app.js / tv-remote.js /
 * sound-manager.js need a live DOM and Web Audio and are a manual check on the
 * device; game-state.js is intentionally left out too (it leans on the UI
 * manager). The rule logic that decides legal moves lives in the files below.
 */
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const DIR = __dirname;
const load = (f) => fs.readFileSync(path.join(DIR, f), "utf8");

// --- minimal browser stubs ------------------------------------------------
// The logic classes touch the DOM only in their render helpers (createElement,
// querySelectorAll for card backs). The tests never call those, but the class
// bodies reference `document` at definition/static-init time, so it must exist.
const noop = () => {};
function makeEl() {
  return {
    className: "", innerHTML: "", dataset: {}, style: {},
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    appendChild: noop, setAttribute: noop,
    querySelectorAll: () => [], querySelector: () => null,
  };
}
const documentStub = {
  createElement: makeEl,
  querySelectorAll: () => [],
  querySelector: () => null,
  documentElement: { style: { setProperty: noop, removeProperty: noop } },
  addEventListener: noop,
  body: { appendChild: noop, classList: { add: noop, remove: noop } },
};

const sandbox = {
  module: undefined,      // set per-file below so each file's export guard fires
  console,
  document: documentStub,
  window: undefined,      // classes guard on `typeof window`; keep it undefined here
  navigator: { userAgent: "node" },
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

// Load a class file and hoist its class(es) into the shared sandbox scope.
// Each file ends with `if (module.exports) module.exports = ...`, so we give it
// a fresh module, run it, then copy the export(s) onto the global sandbox so
// later files and tests.js can see them as bare globals (Card, Deck, …).
function loadClass(file) {
  sandbox.module = { exports: {} };
  vm.runInContext(load(file), sandbox, { filename: file });
  const exp = sandbox.module.exports;
  if (typeof exp === "function") {
    sandbox[exp.name] = exp;                 // single class, e.g. Card
  } else if (exp && typeof exp === "object") {
    for (const k of Object.keys(exp)) sandbox[k] = exp[k]; // { DifficultyManager, HintSystem }
  }
}

try {
  loadClass("js/card.js");        // Card  (Deck depends on it)
  loadClass("js/deck.js");        // Deck
  loadClass("js/difficulty.js");  // DifficultyManager + HintSystem
} catch (err) {
  console.error("Failed to load solitaire logic:", err && err.stack ? err.stack : err);
  process.exit(2);
}

// Run the tests in the same context so they see Card/Deck/DifficultyManager.
sandbox.module = { exports: {} };
vm.runInContext(load("tests.js"), sandbox, { filename: "tests.js" });
const summary = sandbox.module.exports;

// --- report ---------------------------------------------------------------
for (const r of summary.results) {
  if (r.ok) console.log("  ✓ " + r.name);
  else console.log("  ✗ " + r.name + "\n      " + r.err);
}
console.log("");
if (summary.failed === 0) {
  console.log(`${summary.passed}/${summary.total} passed — all green`);
  process.exit(0);
} else {
  console.log(`${summary.passed}/${summary.total} passed, ${summary.failed} FAILED`);
  process.exit(1);
}
