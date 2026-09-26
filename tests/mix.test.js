/* Mix: one sitting, several games.
 *
 * The thing that could go wrong here is invisible rather than noisy. Mix is a
 * session MODE, not an activity — `sess.kind` becomes whichever game the round
 * belongs to — and if that routing were wrong, a Patterns round played inside
 * Mix would bank its mastery against "mix" instead of Patterns. Nothing would
 * look broken; his levels would simply stop moving, and the record of what he
 * can do would quietly be wrong. So that is what this leans on hardest.
 *
 * Also checked: one-shot games never turn up (they are whole games with an
 * ending, not rounds), a game switched off in Settings never turns up, and the
 * reward stays on the sitting's own block rather than being pulled to one
 * round the moment a word game comes around.
 */
const fs = require("fs");
const path = require("path");
const { bootApp, Runner, ROOT } = require("./_harness");

const R = new Runner("mix");
const check = (c, m) => R.check(c, m);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BLOCK = 4;

/* Reach the internals the same way progress.test.js does: splice a hook onto
   the end of the app's IIFE. __hintTarget is whatever the round offered the
   hand at — the right answer — so a round can be played without each game's
   own private notion of correctness being duplicated here. */
const base = fs.readFileSync(path.join(ROOT, "dist", "app.html"), "utf8");
const HOOK = `
const __realShowHint = showHint;
showHint = function(t){ window.__hintTarget = t; return __realShowHint(t); };
window.__tns = { get sess(){ return sess; }, MIX_RUN, MIX_ID, mixPool, levelOf };
`;
const html = base.replace(/\n\n\}\)\(\);\n<\/script>\n?$/, "\n" + HOOK + "\n})();\n</script>\n");
check(html !== base, "the test hook spliced into the built page");

/* Only the games that share the slot-and-options shape are left on, so one
   mover plays all of them; the rest are switched off, which doubles as the
   check that Mix honours Settings. */
const ON = ["pattern", "count", "match", "wordfill"];
const OFF = ["sort", "seriate", "trace", "odd", "wordfind"];
const enabled = {};
OFF.forEach((id) => { enabled[id] = false; });

const { window, errors } = bootApp({
  html,
  localStorage: {
    settings: { assistedMode: false, itemsPerSession: BLOCK, rewardEvery: BLOCK, enabled },
    progress: { sessions: [], perLevel: {}, best: {} },
  },
});
const doc = window.document;
const $ = (s) => doc.querySelector(s);
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
  const x = zones.indexOf(zone) * 1000 + 30;
  node.dispatchEvent(ptr("pointerdown", 0, 0));
  node.dispatchEvent(ptr("pointermove", x, 30));
  node.dispatchEvent(ptr("pointerup", x, 30));
}

(async () => {
  const T = window.__tns;
  await sleep(150);

  check(!!$("#card-mix"), "Mix has a card on the home screen");
  check(T.mixPool().every((a) => !a.oneShot),
    "a one-shot game is never in the pool — it is a whole game with an ending, not a round");
  check(T.mixPool().map((a) => a.id).sort().join() === ON.slice().sort().join(),
    `the pool is exactly the games switched on (${T.mixPool().map((a) => a.id).join()})`);

  click($("#card-mix"));
  check(T.sess && T.sess.mix, "tapping it starts a mixed sitting");
  check(doc.querySelectorAll("#tokens .tok").length === BLOCK,
    "which keeps the ordinary block of rounds before a reward, even though a word game in the pool asks for one");

  /* Play a stretch of rounds, noting which game each belonged to. */
  const order = [];
  for (let n = 0; n < 24; n++) {
    if (!$("#play").classList.contains("on")) { await sleep(20); n--; continue; }
    const right = window.__hintTarget;
    const zone = doc.querySelector("#stage .slot.dropzone:not([data-full])");
    if (!right || !zone || !right.isConnected) { await sleep(20); n--; continue; }
    order.push(T.sess.kind);
    dropOn(right, zone);
    await sleep(30);
  }

  const seen = new Set(order);
  check(seen.size > 1, `a sitting really does move between games (${[...seen].join(", ")})`);
  check([...seen].every((id) => ON.indexOf(id) >= 0),
    "and only ever to games that are switched on");
  check([...seen].every((id) => id !== T.MIX_ID), "no round is ever attributed to Mix itself");

  // no game runs longer than MIX_RUN before it hands over
  let run = 1, longest = 1;
  for (let i = 1; i < order.length; i++) {
    run = order[i] === order[i - 1] ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  check(longest <= T.MIX_RUN,
    `it switches at least every ${T.MIX_RUN} rounds, so the task has to be recognised again (longest run ${longest})`);

  /* THE ONE THAT MATTERS: the mastery those rounds earned went to the real
     games, at their own levels — not into a "mix" bucket where it would be
     lost and his levels would silently stop moving. */
  const saved = JSON.parse(window.localStorage.getItem("lr_state_v1") || "{}");
  const keys = Object.keys((saved.progress || {}).perLevel || {});
  check(keys.length > 0, `the rounds were banked somewhere (${keys.join(", ")})`);
  check(keys.every((k) => k.indexOf(T.MIX_ID + ":") !== 0),
    "nothing is banked against Mix — it is a way to play, not a thing to get good at");
  check(keys.every((k) => ON.indexOf(k.split(":")[0]) >= 0),
    "every key belongs to a real game that was actually played");
  order.forEach((id) => {
    check(keys.some((k) => k.split(":")[0] === id),
      `${id} rounds played in the mix were credited to ${id}`);
  });

  R.finish(errors);
})();
