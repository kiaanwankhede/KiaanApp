/* Nine: the tray-and-bins mechanic is Sorting's, already tested hard there,
 * and Toondemy's session-level behaviour (reward timing, Repeat/Next) is
 * covered generically in progress.test.js. This checks what's actually new
 * here: nine slots and the right item/decoy counts for each scene, and that
 * a real round on the page chains both scenes — bees, then ladybirds —
 * before it counts as solved, not just the first one. */
const { pureContext, bootApp, Runner } = require("./_harness");
const T = pureContext(["activities/nine.js"],
  ["NINE_N", "NINE_DECOYS", "NINE_SPARE", "NINE_THEMES", "NINE_ORDER", "buildNineScene"]);

const R = new Runner("nine");
const check = (c, m) => R.check(c, m);

check(T.NINE_N === 9, "nine slots, matching the lesson's own number");
check(T.NINE_ORDER.length === 2, "two scenes — bees, then ladybirds — matching the video");

check(T.NINE_SPARE > 0, "the tray holds spares, so emptying it and filling the nine aren't the same act");

T.NINE_ORDER.forEach((k) => {
  const t = T.NINE_THEMES[k];
  check(t.ch !== t.decoy, `${k}: the decoy is a different creature from the real one`);
  check(/<svg/.test(t.art()), `${k}: the empty slot has its own drawn art, not a blank box`);
  for (let i = 0; i < 50; i++) {
    const r = T.buildNineScene(k);
    const correct = r.items.filter((it) => it.correct);
    const wrong = r.items.filter((it) => !it.correct);
    check(correct.length === T.NINE_N + T.NINE_SPARE, `${k}: nine to place plus ${T.NINE_SPARE} spare`);
    check(wrong.length === T.NINE_DECOYS, `${k}: exactly ${T.NINE_DECOYS} decoys, every time — no easier version without them`);
    check(correct.every((it) => it.ch === t.ch), `${k}: every correct item is the theme's own creature`);
    check(wrong.every((it) => it.ch === t.decoy), `${k}: every decoy is the theme's own decoy`);
  }
});

/* ---- the page: both scenes chain within one round ---- */
const { window, errors } = bootApp();
const doc = window.document;
const $ = (s) => doc.querySelector(s);
const click = (el) => el.dispatchEvent(new window.Event("click", { bubbles: true }));
function ptr(win, type, q) {
  const e = new win.Event(type, { bubbles: true, cancelable: true });
  e.pointerId = 1; e.clientX = q.x; e.clientY = q.y;
  return e;
}
function dropOn(win, node, zone) {
  const zones = Array.from(win.document.querySelectorAll(".dropzone"));
  zones.forEach((z, i) => { z.__rect = { left: i * 1000, top: 0, width: 60, height: 60 }; });
  win.Element.prototype.getBoundingClientRect = function () {
    const r = this.__rect || { left: -1000, top: 0, width: 0, height: 0 };
    return Object.assign({}, r, { right: r.left + r.width, bottom: r.top + r.height, x: r.left, y: r.top });
  };
  const x = zones.indexOf(zone) * 1000 + 30, y = 30;
  node.dispatchEvent(ptr(win, "pointerdown", { x: 0, y: 0 }));
  node.dispatchEvent(ptr(win, "pointermove", { x, y }));
  node.dispatchEvent(ptr(win, "pointerup", { x, y }));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  await sleep(150);
  check(!!$("#card-nine") && /Revision of number 9/.test($("#card-nine").textContent), "Nine gets its own home card");
  check(/Toondemy Games/.test(doc.querySelector(".section-heading").textContent), "sits in the Toondemy Games section");
  check(!$("#lv-nine"), "no level stepper — Nine is one fixed game, not a ladder");

  click(doc.querySelector('.playbtn[data-kind="nine"]'));
  check(doc.querySelectorAll("#stage .numslot.dropzone").length === 9, "nine empty slots for the first scene");
  check(!!doc.querySelector("#stage .numslot svg"), "each slot is drawn as the hive it is, not left blank");
  check(doc.querySelectorAll("#stage .tray .opt").length === 9 + 3 + 2,
    "tray holds the nine needed, the spares and the decoys");
  check(/Scene 1 of 2/.test($("#lvWatermark").textContent), "the corner says which scene he's on, since there are no levels to report");

  const fillScene = () => {
    for (let n = 0; n < 9; n++) {
      const opts = Array.from(doc.querySelectorAll("#stage .tray .opt .tile"));
      const slots = Array.from(doc.querySelectorAll("#stage .numslot.dropzone")).filter((b) => b.dataset.full !== "1");
      dropOn(window, opts.find((t) => t._item.correct), slots[0]);
    }
  };

  // a decoy first: it must glide back AND say something, not sit there silently
  const decoy = Array.from(doc.querySelectorAll("#stage .tray .opt .tile")).find((t) => !t._item.correct);
  const openSlot = doc.querySelector("#stage .numslot.dropzone");
  dropOn(window, decoy, openSlot);
  dropOn(window, decoy, openSlot);
  check(openSlot.dataset.full !== "1", "a decoy never fills a slot");
  check(doc.querySelectorAll("#stage .tray .opt.dim").length === 2,
    "after a couple of tries the decoys dim — the same help every other game gives");
  dropOn(window, decoy, openSlot);
  check(!!doc.querySelector("#stage .tray .opt.pick"), "and a try later a right one is outlined");

  fillScene();
  check(doc.querySelectorAll("#tokens .tok.full").length === 0, "nine bees placed, but no token yet — the ladybird scene is still to come");
  check(doc.querySelectorAll("#stage .numslot.dropzone:not([data-full])").length === 0,
    "the finished scene stays on screen for a beat rather than being wiped mid-pop");

  await sleep(1200);                                     // the shell's beat between scenes
  check(/Scene 2 of 2/.test($("#lvWatermark").textContent), "then the corner moves on to scene two");
  check(/leaves/.test($("#stage .prompt-line").textContent), "and it's the ladybird scene now, not bees again");

  fillScene();
  check(doc.querySelectorAll("#tokens .tok.full").length === 1, "the ninth ladybird — the last of the second scene — finishes the round and earns the token");

  R.finish(errors);
})();
