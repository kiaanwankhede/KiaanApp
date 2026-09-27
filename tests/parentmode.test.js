/* Parent mode is a sandbox.
 *
 * A parent checking whether a game still works plays real rounds, and a real
 * round writes four things about him: the block counters mastery runs on, the
 * level the game is sitting on, the tag breakdowns, and the sitting log. The
 * quiet one is `best` — pass a block at level 20 while testing and every
 * launch afterwards starts him two below THAT, so the next morning he opens a
 * game far past anything he has done and nothing looks broken.
 *
 * So this file plays the SAME rounds twice. In parent mode nothing about him
 * may change, on disk or in memory. In child mode all of it must change — that
 * half is what stops the test passing because the mover silently did nothing.
 */
const fs = require("fs");
const path = require("path");
const { bootApp, Runner, ROOT } = require("./_harness");

const R = new Runner("parentmode");
const check = (c, m) => R.check(c, m);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BLOCK = 4;

const base = fs.readFileSync(path.join(ROOT, "dist", "app.html"), "utf8");
const HOOK = `
const __realShowHint = showHint;
showHint = function(t){ window.__hintTarget = t; return __realShowHint(t); };
window.__tns = {
  startSandbox, endSandbox, sandboxOn, resetProgress, applyMode,
  levelOf, changeLevel, get progress(){ return progress; }, get S(){ return S; }
};
`;
const html = base.replace(/\n\n\}\)\(\);\n<\/script>\n?$/, "\n" + HOOK + "\n})();\n</script>\n");
check(html !== base, "the test hook spliced into the built page");

/* A record that looks like a few weeks of mornings, so there is something real
   to corrupt rather than an empty store that can't show the difference. */
const SEED = {
  sessions: [{ at: "2026-09-01T08:00:00.000Z", kind: "pattern", level: 6, correct: 9, misses: 1, prompts: 0, firstTry: 8, secs: 300 }],
  perLevel: { "pattern:6": { n: 2, indep: 2, hits: 1, seen: 44 } },
  best: { pattern: 6 },
  tagStats: { pattern: { AB: { n: 12, indep: 10 } } },
};

const { window, errors } = bootApp({
  html,
  localStorage: {
    settings: { assistedMode: false, itemsPerSession: BLOCK, rewardEvery: 50, autoAdvance: true, neverDemote: false },
    progress: JSON.parse(JSON.stringify(SEED)),
  },
});
const doc = window.document;
const $ = (s) => doc.querySelector(s);
const T = window.__tns;
// The app's own waits (next round, the reward screen's auto-continue) run at
// 2ms here, so a block is a few hundred milliseconds instead of half a minute.
const realST = window.setTimeout.bind(window);
window.setTimeout = (fn, ms, ...rest) => realST(fn, Math.min(ms || 0, 2), ...rest);
const click = (el) => el.dispatchEvent(new window.Event("click", { bubbles: true }));
function ptr(type, x, y) {
  const e = new window.Event(type, { bubbles: true, cancelable: true });
  e.pointerId = 1; e.clientX = x; e.clientY = y;
  return e;
}
function dropOn(node, zone) {
  Array.from(doc.querySelectorAll(".dropzone")).forEach((z, i) => {
    z.__rect = { left: i * 1000, top: 0, width: 60, height: 60 };
  });
  window.Element.prototype.getBoundingClientRect = function () {
    const r = this.__rect || { left: -5000, top: 0, width: 0, height: 0 };
    return Object.assign({}, r, { right: r.left + r.width, bottom: r.top + r.height, x: r.left, y: r.top });
  };
  const zones = Array.from(doc.querySelectorAll(".dropzone"));
  node.dispatchEvent(ptr("pointerdown", 0, 0));
  node.dispatchEvent(ptr("pointermove", zones.indexOf(zone) * 1000 + 30, 30));
  node.dispatchEvent(ptr("pointerup", zones.indexOf(zone) * 1000 + 30, 30));
}
const stored = () => JSON.parse(window.localStorage.getItem("lr_state_v1") || "{}");
const storedProgress = () => JSON.stringify(stored().progress || {});
const storedLevels = () => JSON.stringify((stored().settings || {}).levels || {});

/* Play a whole block of Pattern rounds, right every time. */
async function playBlock(n) {
  click(doc.querySelector('.playbtn[data-kind="pattern"]'));
  let done = 0, guard = 0;
  while (done < n && guard++ < 500) {
    await sleep(3);
    if (!$("#play").classList.contains("on")) continue;
    const right = window.__hintTarget;
    const zone = $("#stage .slot.dropzone:not([data-full])");
    if (!right || !zone || !right.isConnected) continue;
    dropOn(right, zone);
    done++;
    await sleep(6);
  }
  click($("#back"));            // ends the sitting, which is what writes the log row
  await sleep(10);
  click($("#doneHome"));
  await sleep(10);
  return done;
}

(async () => {
  await sleep(150);

  /* ---- the mode itself ---- */
  check(!T.sandboxOn(), "the app opens on HIS screen, never in parent mode");
  check(!("sandbox" in T.S) && !("parentMode" in T.S),
    "parent mode is not a setting, so it cannot survive a relaunch and silently swallow a morning");
  check(!doc.body.classList.contains("parentmode"), "and the home screen is in child mode");
  check(doc.querySelectorAll(".lvrow").length > 0,
    "the level strips are still built — child mode hides them, so no grid he has learned is rebuilt");
  check(!!$("#parentBanner"), "the banner exists, ready to say when the mode is on");

  /* ---- IN PARENT MODE: nothing about him may change ---- */
  const diskBefore = storedProgress(), levelsBefore = storedLevels();
  const memBefore = JSON.stringify(T.progress);

  T.startSandbox(); T.applyMode();
  check(T.sandboxOn() && doc.body.classList.contains("parentmode"),
    "turning it on puts the home screen into parent mode");

  T.changeLevel("pattern", 1);
  T.changeLevel("pattern", 1);
  const testingAt = T.levelOf("pattern");
  check(testingAt > 1, `a parent can step a game up to test it (now level ${testingAt})`);

  const played = await playBlock(BLOCK + 2);
  check(played === BLOCK + 2, `a parent really did play ${played} rounds`);

  check(storedProgress() === diskBefore,
    "nothing he owns reached storage: blocks, best, breakdowns and the session log all as they were");
  check(storedLevels() === levelsBefore,
    "and nor did the level the game was stepped to — closing the tablet mid-test leaves his record clean");

  /* settings ARE the parent's, so those go through */
  T.S.dimAfter = 5;
  T.changeLevel("pattern", 1);           // anything that calls save() will do
  check((stored().settings || {}).dimAfter === 5,
    "a setting the parent changes while testing still saves — the settings are theirs");
  check(storedProgress() === diskBefore, "and saving it still didn't carry his progress with it");

  /* ---- LEAVING PARENT MODE: memory goes back too ---- */
  T.endSandbox(); T.applyMode();
  check(!T.sandboxOn() && !doc.body.classList.contains("parentmode"), "turning it off returns to his screen");
  check(JSON.stringify(T.progress) === memBefore,
    "his record in memory is back to exactly what it was before the testing");
  check(T.levelOf("pattern") <= testingAt - 2 || T.levelOf("pattern") === 1,
    `the game snapped back off the level it was tested at (now ${T.levelOf("pattern")})`);
  check(storedProgress() === diskBefore, "and storage is still untouched");

  /* ---- THE OTHER HALF: in child mode the very same rounds must count ---- */
  const playedReal = await playBlock(BLOCK + 2);
  check(playedReal === BLOCK + 2, "the same block played again, this time as him");
  const after = stored().progress || {};
  check(JSON.stringify(after) !== diskBefore,
    "THIS time it was written — otherwise the checks above would pass on a mover that does nothing");
  check((after.sessions || []).length === SEED.sessions.length + 1, "the sitting is in the log");
  const keys = Object.keys(after.perLevel || {});
  check(keys.some((k) => k.indexOf("pattern:") === 0 && (after.perLevel[k].seen || 0) > 0),
    "the block counters moved");

  /* ---- reset is the one progress write that IS the parent's ---- */
  T.startSandbox(); T.applyMode();
  T.resetProgress();
  check(JSON.stringify(stored().progress.best || {}) === "{}",
    "clearing his record from inside parent mode really clears it");
  T.endSandbox(); T.applyMode();
  check(JSON.stringify(stored().progress.best || {}) === "{}" && !(T.progress.best || {}).pattern,
    "and leaving parent mode doesn't hand back the record they just deliberately cleared");

  R.finish(errors);
})();
