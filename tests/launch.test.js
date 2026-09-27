/* What a fresh launch picks up.
 *
 * Two rules live here, both of which only show themselves on the SECOND visit,
 * which is exactly the kind of thing that goes unnoticed until it's wrong:
 *
 *   - he starts two levels below his best, not at Level 1 and not at whatever
 *     level he happened to be mid-climb on when the tablet was closed
 *   - a confirmation block is 5 answers, and an existing save that still holds
 *     the old default of 10 is moved to 5 once — while a block size a parent
 *     chose themselves is left alone
 *   - a best saved from a LONGER ladder is clamped to the ladder that exists
 *     now. Ladders do get shorter between releases (Sky went from 18 levels to
 *     a single fixed game), and unclamped that showed a parent "Level 97/40"
 *     and left mastery unable to advance him ever again.
 *   - the settings passcode. It is the only thing between him and the screen
 *     that can change his levels or turn parent mode on, so it ships long; a
 *     tablet still carrying the old three-digit default is moved on once, and
 *     a code a parent chose themselves is never touched — silently replacing
 *     that would lock them out of their own tablet.
 */
const fs = require("fs");
const path = require("path");
const { bootApp, Runner, ROOT } = require("./_harness");

/* Read the shipped default out of the source rather than repeating it here, so
   these check what the passcode has to BE — long, migrated, never clobbered —
   rather than which digits it happens to be today. */
const STATE_SRC = fs.readFileSync(path.join(ROOT, "src", "00-state.js"), "utf8");
const SHIPPED_GATE = (STATE_SRC.match(/\n\s*gate:\s*"(\d+)"/) || [])[1];
const SHIPPED_REV = Number((STATE_SRC.match(/const SETTINGS_REV\s*=\s*(\d+)/) || [])[1]);

const R = new Runner("launch");
const check = (c, m) => R.check(c, m);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Boot with a given save file, then read what the home screen offers and what
   a started session shows in its star readout. */
async function launch(settings, progress) {
  const { window, errors } = bootApp({
    localStorage: { settings: settings || {}, progress: progress || { sessions: [], perLevel: {} } },
  });
  await sleep(150);
  const doc = window.document;
  const card = doc.querySelector("#lv-pattern").textContent;
  doc.querySelector('.playbtn[data-kind="pattern"]').dispatchEvent(new window.Event("click", { bubbles: true }));
  await sleep(60);
  return {
    errors,
    card,
    level: Number((card.match(/Level (\d+)/) || [])[1]),
    stars: doc.querySelectorAll("#lvWatermark .lvw-star").length,
  };
}

/* The parent gate: boot with a given save, long-press the gear, type a code,
   and say whether the settings screen opened. */
async function gate(settings, digits) {
  const { window, errors } = bootApp({
    localStorage: { settings: settings || {}, progress: { sessions: [], perLevel: {} } },
  });
  await sleep(150);
  const doc = window.document;
  // the gear's press timer is 1.2 real seconds; five milliseconds will do here
  const realST = window.setTimeout.bind(window);
  window.setTimeout = (fn, ms, ...rest) => realST(fn, Math.min(ms || 0, 5), ...rest);
  doc.querySelector("#gear").dispatchEvent(new window.Event("pointerdown", { bubbles: true }));
  await sleep(40);
  digits.split("").forEach((d) => {
    const key = Array.from(doc.querySelectorAll("#gateKeys button")).find((b) => b.textContent === d);
    if (key) key.dispatchEvent(new window.Event("click", { bubbles: true }));
  });
  await sleep(40);
  return { errors, open: doc.querySelector("#settings").classList.contains("on") };
}

(async () => {
  const errs = [];

  // ---- where he starts ----
  let r = await launch({}, { sessions: [], perLevel: {} });
  errs.push(...r.errors);
  check(r.level === 1, `a first-ever launch starts at Level 1 (got ${r.level})`);

  r = await launch({}, { sessions: [], perLevel: {}, best: { pattern: 7 } });
  errs.push(...r.errors);
  check(r.level === 5, `a best of 7 picks up at Level 5, two below (got ${r.level})`);

  r = await launch({}, { sessions: [], perLevel: {}, best: { pattern: 2 } });
  errs.push(...r.errors);
  check(r.level === 1, `a best of 2 floors at Level 1 rather than 0 (got ${r.level})`);

  // the level he was mid-climb on is NOT where he resumes — only his best counts
  r = await launch({ levels: { pattern: 20 } }, { sessions: [], perLevel: {}, best: { pattern: 7 } });
  errs.push(...r.errors);
  check(r.level === 5, `a saved mid-climb level of 20 is ignored in favour of best-2 (got ${r.level})`);

  // a best from a ladder that has since got shorter can't leave him on a level
  // that no longer exists — Patterns has 40
  r = await launch({}, { sessions: [], perLevel: {}, best: { pattern: 99 } });
  errs.push(...r.errors);
  check(r.level === 40, `a best of 99 on a 40-level ladder reads as Level 40, not 97 (got ${r.level})`);
  check(/Level 40\/40/.test(r.card), `and the card doesn't offer a level that isn't there (got "${r.card.replace(/\s+/g, " ")}")`);

  // ---- how big a block is ----
  r = await launch({ itemsPerSession: 10 }, null);            // an old save, no rev
  errs.push(...r.errors);
  check(r.stars === 5, `an old save still on 10 answers a block is moved to 5 (got ${r.stars} stars)`);

  r = await launch({ itemsPerSession: 8 }, null);             // a parent's own choice
  errs.push(...r.errors);
  check(r.stars === 8, `a block size a parent chose is left alone (got ${r.stars} stars)`);

  r = await launch({ itemsPerSession: 10, rev: 2 }, null);    // already migrated, then set back to 10 on purpose
  errs.push(...r.errors);
  check(r.stars === 10, `10 chosen deliberately after the move stays at 10 (got ${r.stars} stars)`);

  r = await launch({}, null);                                  // a brand-new save
  errs.push(...r.errors);
  check(r.stars === 5, `a fresh install gets 5 answers a block (got ${r.stars} stars)`);

  // ---- the settings passcode ----
  check(!!SHIPPED_GATE && SHIPPED_GATE.length >= 6,
    `the shipped passcode is long enough that pressing keys doesn't land on it (${(SHIPPED_GATE || "").length} digits)`);

  let g = await gate({}, SHIPPED_GATE);
  errs.push(...g.errors);
  check(g.open, "a fresh install opens on the shipped passcode");

  g = await gate({}, "135");
  errs.push(...g.errors);
  check(!g.open, "the old three-digit code does not open a fresh install");

  g = await gate({ gate: "135" }, SHIPPED_GATE);      // an old tablet, no rev
  errs.push(...g.errors);
  check(g.open, "a tablet still carrying the old default is moved on to the new one");

  g = await gate({ gate: "246" }, "246");             // a code a parent chose
  errs.push(...g.errors);
  check(g.open, "a passcode a parent set themselves still opens the gate");

  g = await gate({ gate: "246" }, SHIPPED_GATE);
  errs.push(...g.errors);
  check(!g.open, "and is NOT quietly replaced by the new default, which would lock them out");

  /* The case the rev bump exists for, and the one the checks above miss: a
     parent who deliberately sets the code back to the old default after the
     move. Their save is stamped at the current rev, so the migration must not
     fire again — without the bump it would, every launch, and they would be
     locked out of their own tablet by a code they had just chosen. */
  g = await gate({ gate: "135", rev: SHIPPED_REV }, "135");
  errs.push(...g.errors);
  check(g.open, `"135" chosen deliberately after the move stays (rev ${SHIPPED_REV})`);

  R.finish(errs);
})();
