/* Auto-progress, end to end.
 *
 * mastery.test.js checks the level-up arithmetic with "independent" handed in
 * directly. That left the part that actually matters untested: whether playing
 * real rounds on the real page feeds it the right answers. This plays every
 * activity the way he does — dragging pieces into place — and watches the
 * level move.
 *
 * Each activity runs seven ways:
 *   1. assisted off, every answer right                  -> climbs
 *   2. assisted ON, answers before the hand appears      -> climbs
 *   3. assisted ON, waits for the hand every round,
 *      started at level 5                                -> neither climbs nor drops
 *   4. assisted off, a mistake every round, demotion
 *      explicitly turned back on                          -> drops a level
 *   5. assisted ON, same, demotion turned back on          -> drops a level
 *   6. assisted off, a mistake every round, the real
 *      shipped default (neverDemote true)                 -> does NOT drop
 *
 * Plus the corner readout (#lvWatermark, src/50-session.js) is checked against
 * scenario 1: that it counts a block's rounds as he goes, and shows the new
 * level the moment a level-up actually lands.
 *
 * Written after finding that with assisted mode on (the default) all three
 * games could never move up, and dropped him a level for a block of all-right
 * answers: the hand appeared the instant each round began, so every round was
 * "prompted" and a block with nothing counted read as 0%. */
const fs = require("fs");
const path = require("path");
const { bootApp, Runner, ROOT, registeredActivities } = require("./_harness");

const R = new Runner("progress");
const check = (c, m) => R.check(c, m);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BLOCK = 3;   // itemsPerSession — small so a level-up is six rounds, not twenty

/* Reach a few internals by splicing a hook onto the end of the app's IIFE, the
   same way contract.test.js splices in a fake activity. The showHint wrapper
   records what the round's hint points at — the right answer — whether or not
   assisted mode then goes on to draw the hand. */
const base = fs.readFileSync(path.join(ROOT, "dist", "app.html"), "utf8");
const HOOK = `
const __realShowHint = showHint;
showHint = function(t){ window.__hintTarget = t; return __realShowHint(t); };
window.__tns = { levelOf, get sess(){ return sess; },
  HINT_DELAY_MS: typeof HINT_DELAY_MS === "number" ? HINT_DELAY_MS : 3000,
  seriateScales, SERIATE_RATIOS, seriateEntry };
`;
const html = base.replace(/\n\n\}\)\(\);\n<\/script>\n?$/, "\n" + HOOK + "\n})();\n</script>\n");
check(html !== base, "the test hook spliced into the built page");

function boot(settings) {
  const { window, errors } = bootApp({
    html,
    localStorage: {
      // neverDemote deliberately left out unless a scenario passes it — leaving
      // it out is exactly how a real save file looks before this setting
      // existed, so it exercises the real DEFAULTS fallback (true) in 00-state.js
      settings: Object.assign({ itemsPerSession: BLOCK, rewardEvery: 50, autoAdvance: true }, settings),
      progress: { sessions: [], perLevel: {}, best: {} },
    },
  });
  // The app's own delays (next round, reward screen) run at 2ms. The hand's
  // wait runs at 40ms — still well behind a quick answer, so "before the hand"
  // and "after the hand" stay distinct without each round taking 3 real seconds.
  const realST = window.setTimeout.bind(window);
  const handWait = window.__tns.HINT_DELAY_MS;
  window.setTimeout = (fn, ms, ...rest) => realST(fn, ms === handWait ? 40 : Math.min(ms || 0, 2), ...rest);
  // jsdom does no layout: give every drop zone its own spot so a drop can aim
  window.Element.prototype.getBoundingClientRect = function () {
    const r = this.__rect || { left: 0, top: 0, width: 0, height: 0 };
    return Object.assign({}, r, { right: r.left + r.width, bottom: r.top + r.height, x: r.left, y: r.top });
  };
  return { window, errors };
}


/* The corner readout renders as stars, not text: one star per answer in the
   block, gold for the ones he got on his own. */
function readWatermark(win) {
  const wm = win.document.querySelector("#lvWatermark");
  if (!wm) return null;
  const q = (sel) => wm.querySelectorAll(sel).length;
  return {
    level: (wm.querySelector(".lvw-level") || {}).textContent,
    stars: q(".lvw-star"),
    gold: q(".lvw-star.on"),
    grey: q(".lvw-star.dim"),
    blocks: q(".lvw-blocks span"),
    blocksDone: q(".lvw-blocks .on"),
  };
}

const click = (win, el) => el.dispatchEvent(new win.Event("click", { bubbles: true }));
function pointer(win, type, x, y) {
  const e = new win.Event(type, { bubbles: true, cancelable: true });
  e.pointerId = 1; e.clientX = x; e.clientY = y;
  return e;
}
function dropOn(win, node, zone) {
  const zones = Array.from(win.document.querySelectorAll(".dropzone"));
  zones.forEach((z, i) => { z.__rect = { left: i * 1000, top: 0, width: 60, height: 60 }; });
  const x = zones.indexOf(zone) * 1000 + 30, y = 30;
  node.dispatchEvent(pointer(win, "pointerdown", 0, 0));
  node.dispatchEvent(pointer(win, "pointermove", x, y));
  node.dispatchEvent(pointer(win, "pointerup", x, y));
}

/* For each activity: the right move right now, and a wrong one to make. */
const SOLVE = {
  pattern(win) {
    const d = win.document;
    const zone = d.querySelector("#stage .slot.dropzone");
    const opts = Array.from(d.querySelectorAll("#stage .options .opt:not(.gone) .tile"));
    const right = win.__hintTarget;
    if (!zone || zone.dataset.full === "1" || opts.indexOf(right) === -1) return null;
    const wrong = opts.find((o) => o !== right);
    return { right: [right, zone], wrong: wrong && [wrong, zone] };
  },
  sort(win) {
    const d = win.document;
    const node = d.querySelector("#stage .tray .opt .tile");
    const bins = Array.from(d.querySelectorAll("#stage .bin.dropzone"));
    if (!node || !bins.length) return null;
    const right = bins.find((b) => b._bin.test(node._item));
    const wrong = bins.find((b) => !b._bin.test(node._item));
    return { right: [node, right], wrong: wrong && [node, wrong] };
  },
  count(win) { return SOLVE.pattern(win); },     // same shape: one slot, cards to pick from
  match(win) { return SOLVE.pattern(win); },     // same shape: one slot, cards to pick from
  nine(win) {
    const d = win.document;
    const opts = Array.from(d.querySelectorAll("#stage .tray .opt .tile"));
    const bins = Array.from(d.querySelectorAll("#stage .bin.dropzone")).filter((b) => b.dataset.full !== "1");
    if (!opts.length || !bins.length) return null;
    const right = opts.find((t) => t._item.correct);
    const wrong = opts.find((t) => !t._item.correct);
    return { right: right && [right, bins[0]], wrong: wrong && [wrong, bins[0]] };
  },
  seriate(win) {
    const d = win.document, T = win.__tns;
    const row = d.querySelector("#stage .steps");
    const live = row && Array.from(row.querySelectorAll(".dropzone")).find((z) => z.dataset.full !== "1");
    if (!live) return null;
    const e = T.seriateEntry(T.levelOf("seriate"));
    const want = T.seriateScales(T.SERIATE_RATIOS[e.steps])[Array.from(row.children).indexOf(live)];
    const sc = (n) => (n._item.k === "shape" ? n._item.size : n._item.scale);
    const tiles = Array.from(d.querySelectorAll("#stage .tray .opt:not(.gone) .tile"));
    const right = tiles.find((t) => sc(t) === want);
    const wrong = tiles.find((t) => sc(t) !== want);
    return right ? { right: [right, live], wrong: wrong && [wrong, live] } : null;
  },
};

/* Trace isn't a drop: trace the current stroke from where he's up to, first
   wandering well off the line if this round should have a mistake in it. */
function traceTurn(win, withMiss) {
  const board = win.document.querySelector("#stage .trace-board");
  const s = board._trace.stroke(), tol = board._trace.tol;
  board.__rect = { left: 0, top: 0, width: 160, height: 100 };     // a screen pixel is a board unit
  const at = s.pts[s.k];
  const go = (type, q) => {
    const e = pointer(win, type, q.x, q.y);
    board.dispatchEvent(e);
  };
  if (withMiss) {
    go("pointerdown", at);
    go("pointermove", { x: at.x, y: at.y + (at.y < 50 ? 1 : -1) * tol * 4.5 });
    go("pointerup", at);
  }
  go("pointerdown", at);
  s.pts.slice(s.k).forEach((q) => go("pointermove", q));
  go("pointerup", s.pts[s.pts.length - 1]);
}

async function play(win, kind, rounds, miss, waitForHand) {
  const T = win.__tns;
  let missed = -1, guard = 0;
  while (T.sess && T.sess.correct < rounds && guard++ < 5000) {
    await sleep(3);
    if (!win.document.querySelector("#play").classList.contains("on")) continue;   // reward screen
    if (kind === "trace" || kind === "sky") {
      const board = win.document.querySelector("#stage .trace-board");
      if (!board || !board._trace || !board.querySelector(".trace-start")) continue;
      if (waitForHand && !T.sess.hintShownThisRound) continue;
      const doMiss = miss && missed !== T.sess.asked;
      traceTurn(win, doMiss);
      if (doMiss) missed = T.sess.asked;
      continue;
    }
    const mv = SOLVE[kind](win);
    if (!mv || !mv.right[1]) continue;                                              // between rounds
    if (waitForHand && !T.sess.hintShownThisRound) continue;                        // sit and wait for the hand
    if (miss && missed !== T.sess.asked && mv.wrong) {
      dropOn(win, mv.wrong[0], mv.wrong[1]);                                        // one mistake per round
      missed = T.sess.asked;
      continue;
    }
    dropOn(win, mv.right[0], mv.right[1]);
  }
  return guard < 5000;
}

async function scenario(kind, { assisted, startAt = 1, rounds, miss = false, waitForHand = false, neverDemote }) {
  const { window, errors } = boot({ assistedMode: assisted, neverDemote });
  await sleep(150);
  const plus = window.document.querySelector(`.lvbtn[data-kind="${kind}"][data-dir="1"]`);
  for (let i = 1; i < startAt; i++) click(window, plus);
  // startAt is a wish, not a guarantee: an activity shorter than startAt levels
  // clamps at its own top, same as the stepper does for real, so every check
  // below compares against where play actually began rather than a literal.
  const startLevel = window.__tns.levelOf(kind);
  click(window, window.document.querySelector(`.playbtn[data-kind="${kind}"]`));
  const finished = await play(window, kind, rounds, miss, waitForHand);
  const level = window.__tns.levelOf(kind);
  return { window, errors, finished, level, startLevel };
}

(async () => {
  const kinds = registeredActivities().map((c) =>
    ({ PATTERNS: "pattern", SORTING: "sort", SERIATION: "seriate", COUNTING: "count", TRACING: "trace", MATCHING: "match", SKY: "sky", NINE: "nine" }[c]));
  check(kinds.every(Boolean), "every registered activity has a solver here");
  const allErrors = [];

  for (const kind of kinds) {
    // 1 — assisted off, perfect play: two good blocks climb a level
    let r = await scenario(kind, { assisted: false, rounds: BLOCK * 2 });
    allErrors.push(...r.errors);
    check(r.finished, `${kind}: the game played through`);
    check(r.level === 2, `${kind}: assisted OFF, every answer right -> moves up (got level ${r.level})`);
    const wmUp = readWatermark(r.window);
    check(wmUp && wmUp.level === "Level 2" && wmUp.gold === 0 && wmUp.stars === BLOCK,
      `${kind}: the readout shows the new level with a fresh row of stars the moment it moves up` +
        ` (got ${JSON.stringify(wmUp)})`);
    click(r.window, r.window.document.querySelector("#back"));
    click(r.window, r.window.document.querySelector("#doneHome"));
    check(/Level 2\//.test(r.window.document.querySelector(`#lv-${kind}`).textContent),
      `${kind}: the home card shows the level he climbed to`);

    // readout — mid-block: one round in, before anything has moved
    r = await scenario(kind, { assisted: false, rounds: 1 });
    allErrors.push(...r.errors);
    const wmMid = readWatermark(r.window);
    check(wmMid && wmMid.level === "Level 1" && wmMid.stars === BLOCK && wmMid.gold === 1 && wmMid.grey === 0,
      `${kind}: one round in, one star of ${BLOCK} is gold (got ${JSON.stringify(wmMid)})`);
    check(wmMid && wmMid.blocks === 2 && wmMid.blocksDone === 0,
      `${kind}: and two block dots wait to be filled before the level moves (got ${JSON.stringify(wmMid)})`);

    // 2 — assisted ON, answering before the hand shows: climbs just the same
    r = await scenario(kind, { assisted: true, rounds: BLOCK * 2 });
    allErrors.push(...r.errors);
    check(r.level === 2, `${kind}: assisted ON, answers before the hand -> moves up (got level ${r.level})`);

    // 3 — assisted ON, waiting for the hand every round: help moves nothing
    r = await scenario(kind, { assisted: true, startAt: 5, rounds: BLOCK * 2, waitForHand: true });
    allErrors.push(...r.errors);
    check(r.finished, `${kind}: the hand did come, every round`);
    check(r.level === r.startLevel,
      `${kind}: assisted ON, waits for the hand -> neither up nor dropped (got level ${r.level}, started at ${r.startLevel})`);

    // 4 — assisted off, a mistake every round, demotion explicitly turned back on
    r = await scenario(kind, { assisted: false, startAt: 5, rounds: BLOCK, miss: true, neverDemote: false });
    allErrors.push(...r.errors);
    check(r.level === r.startLevel - 1,
      `${kind}: assisted OFF, a mistake every round, demotion on -> drops a level (got level ${r.level}, started at ${r.startLevel})`);

    // 5 — assisted ON, same, demotion turned back on: mistakes still count
    r = await scenario(kind, { assisted: true, startAt: 5, rounds: BLOCK, miss: true, neverDemote: false });
    allErrors.push(...r.errors);
    check(r.level === r.startLevel - 1,
      `${kind}: assisted ON, a mistake every round, demotion on -> drops a level (got level ${r.level}, started at ${r.startLevel})`);

    // 6 — the real shipped default: neverDemote left unset, so it falls through
    // to DEFAULTS.neverDemote = true in 00-state.js. A mistake every round must
    // NOT drop him, which is the whole point of this feature.
    r = await scenario(kind, { assisted: false, startAt: 5, rounds: BLOCK, miss: true });
    allErrors.push(...r.errors);
    check(r.level === r.startLevel,
      `${kind}: with the real default (never drop a level), a mistake every round does not drop him (got level ${r.level}, started at ${r.startLevel})`);
  }

  R.finish(allErrors);
})();
