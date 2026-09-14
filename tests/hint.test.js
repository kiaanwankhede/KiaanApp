/* The assisted-mode hand.
 *
 * WHEN it appears. It waits a few seconds, and that gap is his chance to
 * answer on his own — a round answered before the hand counts toward moving
 * up. It used to appear the instant a round began, which made every round in
 * assisted mode "prompted": he could never move up, and a block with nothing
 * counted read as 0% and dropped him. Touching anything first means he's
 * started, and the hand stays away. (progress.test.js checks what that does to
 * his level; this checks the hand itself.)
 *
 * WHERE it appears. It lives in a position:fixed layer at measured pixel
 * coordinates, which go stale the moment the viewport changes under it: the
 * first PLAY of every launch asks for fullscreen, the browser chrome goes away
 * a few frames later, and everything reflows downward. This pins the hand to
 * the element instead of to the numbers. */
const { bootApp, Runner } = require("./_harness");

const R = new Runner("hint");
const check = (c, m) => R.check(c, m);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const HAND_WAIT = 3000;

const { window, errors } = bootApp();
const doc = window.document;
const $ = (s) => doc.querySelector(s);
const click = (el) => el.dispatchEvent(new window.Event("click", { bubbles: true }));

// jsdom does no layout, so stand in for it: every element reports this rect,
// and moving it is exactly what a fullscreen swap does to the real page.
let RECT = { left: 100, top: 400, width: 80, height: 80 };
window.Element.prototype.getBoundingClientRect = function () {
  return { ...RECT, right: RECT.left + RECT.width, bottom: RECT.top + RECT.height, x: RECT.left, y: RECT.top };
};
const expectedTop = () => RECT.top + RECT.height * 0.2;
const expectedLeft = () => RECT.left + RECT.width / 2;
const hand = () => $("#hintlayer .hint-hand");

(async () => {
  await sleep(150);

  /* ---- when ---- */
  click(doc.querySelector('.playbtn[data-kind="pattern"]'));
  await sleep(1000);
  check(!hand(), "the hand does not appear the moment a round starts — he gets time to try");
  await sleep(HAND_WAIT - 1000 + 150);
  check(!!hand(), "if he hasn't started, the hand appears after the wait");

  /* ---- where ---- */
  check(hand() && hand().style.top === expectedTop() + "px", "the hand starts on the element it points at");

  // the viewport changes out from under it — fullscreen, or a rotate
  RECT = { left: 100, top: 560, width: 80, height: 80 };
  window.dispatchEvent(new window.Event("resize"));
  await sleep(60);
  check(!!hand(), "the hand survives the viewport change");
  check(hand() && hand().style.top === expectedTop() + "px",
    "the hand follows the element down when going fullscreen reflows the page");
  check(hand() && hand().style.left === expectedLeft() + "px", "and stays horizontally centred on it");

  // a hand with nothing to point at must not be left behind
  const target = $("#stage .options .opt div");
  if (target && target.parentNode) target.parentNode.removeChild(target);
  RECT = { left: 300, top: 300, width: 80, height: 80 };
  window.dispatchEvent(new window.Event("resize"));
  check(hand() ? hand().style.top !== "300px" : true,
    "a detached target does not drag the hand to a stale position");

  /* Sorting points at a bin, which is tall enough that the shell's
     20%-of-height anchor lands on the colour dot and label rather than on
     the drop area — it read as hovering above the bin. It must point at
     the drop zone instead. */
  const BIN = { left: 100, top: 200, width: 150, height: 170 };
  const DROP = { left: 110, top: 290, width: 130, height: 70 };
  window.Element.prototype.getBoundingClientRect = function () {
    const r = this.classList && this.classList.contains("drop") ? DROP : BIN;
    return { ...r, right: r.left + r.width, bottom: r.top + r.height, x: r.left, y: r.top };
  };
  click($("#back"));
  await sleep(60);
  click(doc.querySelector('.playbtn[data-kind="sort"]'));
  await sleep(HAND_WAIT + 150);
  check(!!$("#stage .bins .bin .drop"), "a sorting round draws bins with drop zones");
  const top = hand() && parseFloat(hand().style.top);
  check(top === DROP.top + DROP.height * 0.2, "the sorting hand points into the bin's drop area, not at its label");
  check(top > BIN.top + BIN.height * 0.2, "which is lower than the bin-anchored position it used to use");

  /* ---- touching first cancels it ---- */
  click($("#back"));
  await sleep(60);
  click(doc.querySelector('.playbtn[data-kind="seriate"]'));
  await sleep(1000);
  doc.dispatchEvent(new window.Event("pointerdown", { bubbles: true }));   // he reaches for a piece
  await sleep(HAND_WAIT);
  check(!hand(), "once he's touched something, the hand stays away for that round");

  R.finish(errors);
})();
