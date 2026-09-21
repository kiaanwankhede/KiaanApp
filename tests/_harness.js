/* Shared test plumbing.
 *
 *   pureContext(files)  — evaluate src modules in a bare VM context, so the
 *                         generation logic can be tested without a DOM.
 *   bootApp(opts)       — load the built page in jsdom with the browser bits
 *                         jsdom lacks (IndexedDB, wake lock, fullscreen) stubbed.
 *   Runner              — tiny check/report helper.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

const RANDOM_PRELUDE = `
const rnd = n => (Math.random()*n)|0;
const pick = a => a[rnd(a.length)];
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]];} return a; }
`;

/**
 * Evaluate the given src files (plus the shared random helpers) in a fresh
 * context and hand back the named top-level bindings.
 *
 * Top-level `const` in a VM script lives in the realm's lexical scope rather
 * than on the context object, so the names to lift out are listed explicitly
 * and returned as the value of the script's last expression.
 */
function pureContext(files, exportNames, prelude) {
  const code =
    [RANDOM_PRELUDE, prelude || ""]
      .concat(files.map((f) => fs.readFileSync(path.join(SRC, f), "utf8")))
      .join("\n") +
    "\n;({ " + exportNames.join(", ") + " });";
  const ctx = vm.createContext({ console, Math, Object, Array, Set, Map, JSON, String, Number, Date });
  return vm.runInContext(code, ctx, { filename: files.join(" + ") });
}

/**
 * How many activities the registry lists. Derived rather than hard-coded so
 * that adding an activity stays the three one-line changes CLAUDE.md promises
 * — a test that needs editing too would make that claim false.
 */
function registeredActivities() {
  const src = fs.readFileSync(path.join(SRC, "60-registry.js"), "utf8");
  const inside = src.match(/const ACTIVITIES\s*=\s*\[([^\]]*)\]/)[1];
  return inside.split(",").map((s) => s.trim()).filter(Boolean);
}

function FakeReq() { this.onsuccess = null; this.onerror = null; this.onupgradeneeded = null; }
function fakeStore() {
  return {
    getAll() { const r = new FakeReq(); setTimeout(() => { r.result = []; if (r.onsuccess) r.onsuccess(); }, 0); return r; },
    add() { const r = new FakeReq(); setTimeout(() => { r.result = 1; if (r.onsuccess) r.onsuccess(); }, 0); return r; },
    delete() { const r = new FakeReq(); setTimeout(() => { if (r.onsuccess) r.onsuccess(); }, 0); return r; },
  };
}

/**
 * Boot the built page in jsdom.
 * opts.html        — page body to load (defaults to dist/app.html)
 * opts.localStorage— object written to localStorage BEFORE the app script runs
 * Returns { window, errors, spies }.
 */
function bootApp(opts = {}) {
  const { JSDOM, VirtualConsole } = require("jsdom");
  const html = opts.html || fs.readFileSync(path.join(ROOT, "dist", "app.html"), "utf8");
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push("jsdomError: " + e.message));

  const dom = new JSDOM(`<!doctype html><html><head></head><body>${html}</body></html>`, {
    runScripts: "dangerously",
    url: "https://example.com/",
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(window) {
      window.indexedDB = {
        open() {
          const q = new FakeReq();
          setTimeout(() => {
            q.result = { createObjectStore: () => ({}), transaction: () => ({ objectStore: fakeStore }) };
            if (q.onupgradeneeded) q.onupgradeneeded();
            if (q.onsuccess) q.onsuccess();
          }, 0);
          return q;
        },
      };
      window.URL.createObjectURL = () => "blob://fake";
      window.URL.revokeObjectURL = () => {};
      if (opts.localStorage) {
        try { window.localStorage.setItem("lr_state_v1", JSON.stringify(opts.localStorage)); } catch (e) {}
      }
    },
  });

  const { window } = dom;
  window.addEventListener("error", (e) =>
    errors.push("window error: " + (e.error ? e.error.stack || e.error.message : e.message)));

  const spies = { fullscreen: 0, wakeLock: 0 };
  window.document.documentElement.requestFullscreen = function () { spies.fullscreen++; return Promise.resolve(); };
  Object.defineProperty(window.document, "fullscreenElement", { get: () => null, configurable: true });
  window.navigator.wakeLock = { request: async () => { spies.wakeLock++; return { release() {} }; } };

  return { window, errors, spies };
}

class Runner {
  constructor(name) { this.name = name; this.failures = 0; this.checks = 0; this.quiet = process.env.VERBOSE !== "1"; }
  check(cond, msg) {
    this.checks++;
    if (!cond) { this.failures++; console.error("  FAIL:", msg); }
    else if (!this.quiet) console.log("  ok:", msg);
  }
  finish(extraErrors) {
    if (extraErrors && extraErrors.length) {
      extraErrors.forEach((e) => console.error("  RUNTIME ERROR:", e));
      this.failures += extraErrors.length;
    }
    const ok = this.failures === 0;
    console.log(`${ok ? "PASS" : "FAIL"}  ${this.name}  (${this.checks} checks${ok ? "" : ", " + this.failures + " failed"})`);
    process.exit(ok ? 0 : 1);
  }
}

module.exports = { pureContext, bootApp, Runner, ROOT, SRC, registeredActivities };
