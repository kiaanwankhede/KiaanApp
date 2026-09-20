/* Sky: reuses Trace's engine wholesale (traceTracker, the board, the pointer
 * wiring — all exercised hard already in trace.test.js), so this checks what's
 * actually new here: the four themes' three parallel lines each stay on the
 * board, run top to bottom and don't overlap, and that a real round on the
 * page chains all four scenes — sun, rain, kite, plane — before it counts as
 * solved, not just the first one. Toondemy's session-level behaviour (reward
 * timing, Repeat/Next) is covered generically in progress.test.js. */
const { pureContext, bootApp, Runner } = require("./_harness");
const T = pureContext(["20-stimuli.js", "36-trace-engine.js", "activities/sky.js"],
  ["SKY_SHAPES", "SKY_ORDER", "TRACE_W", "TRACE_H"]);

const R = new Runner("sky");
const check = (c, m) => R.check(c, m);

check(T.SKY_ORDER.length === 4, "four scenes, matching the four the video shows");
T.SKY_ORDER.forEach((k) => {
  const s = T.SKY_SHAPES[k];
  check(s.strokes.length === 3, `${k}: three parallel lines, matching the source material`);
  s.paths.forEach((p, i) => {
    check(p.every((q) => q.x >= 4 && q.x <= T.TRACE_W - 4 && q.y >= 4 && q.y <= T.TRACE_H - 4), `${k} line ${i + 1}: stays on the board`);
    check(p.slice(1).every((q, j) => Math.hypot(q.x - p[j].x, q.y - p[j].y) <= 1.0001), `${k} line ${i + 1}: evenly spaced`);
    check(p.length > 30, `${k} line ${i + 1}: long enough to be worth tracing`);
    check(p[p.length - 1].y > p[0].y, `${k} line ${i + 1}: top to bottom, like every other line in this app`);
  });
  const slope = (p) => (p[p.length - 1].y - p[0].y) / (p[p.length - 1].x - p[0].x);
  const slopes = s.strokes.map((raw) => slope([raw[0], raw[raw.length - 1]]));
  check(slopes.every((sl) => Math.abs(sl - slopes[0]) < 0.01), `${k}: all three lines run parallel`);
  const starts = s.strokes.map((raw) => raw[0].x).sort((a, b) => a - b);
  check(starts.every((x, i) => i === 0 || x - starts[i - 1] >= 20), `${k}: the three lines are spread apart, not stacked on each other`);
  check(!!s.marker && !!s.marker.emoji, `${k}: has a picture waiting at the end`);
  check(!!s.startMark && !!s.startMark.emoji, `${k}: has a picture at the start`);
});
// every theme's picture and starting picture is its own — no scene borrows another's
const markers = T.SKY_ORDER.map((k) => T.SKY_SHAPES[k].marker.emoji);
check(new Set(markers).size === markers.length, "every scene ends at its own picture, not a repeat of another's");

/* ---- the page: all four scenes chain within one round ---- */
const { window, errors } = bootApp();
const doc = window.document;
const $ = (s) => doc.querySelector(s);
const click = (el) => el.dispatchEvent(new window.Event("click", { bubbles: true }));
window.Element.prototype.getBoundingClientRect = function () {
  const on = this.classList && this.classList.contains("trace-board");
  return on ? { left: 0, top: 0, width: 160, height: 100, right: 160, bottom: 100, x: 0, y: 0 }
            : { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0, x: 0, y: 0 };
};
function ptr(type, q) {
  const e = new window.Event(type, { bubbles: true, cancelable: true });
  e.pointerId = 1; e.clientX = q.x; e.clientY = q.y; e.pointerType = "touch";
  return e;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  await sleep(150);
  check(!!$("#card-sky") && /Emergent writing slanting lines/.test($("#card-sky").textContent), "Sky gets its own home card");
  check(/Toondemy Games/.test(doc.querySelector(".section-heading").textContent), "sits under the Toondemy Games section heading");
  check(!$("#lv-sky"), "no level stepper — Sky is one fixed game, not a ladder");

  click(doc.querySelector('.playbtn[data-kind="sky"]'));

  const traceOneStroke = () => {
    const board = $("#stage .trace-board");
    const pts = board._trace.stroke().pts;
    const go = (type, q) => board.dispatchEvent(ptr(type, q));
    go("pointerdown", pts[0]);
    pts.forEach((q) => go("pointermove", q));
    go("pointerup", pts[pts.length - 1]);
  };
  const seenHeads = new Set();
  for (let i = 0; i < 12; i++) {
    seenHeads.add($("#stage .prompt-line").textContent);
    check(doc.querySelectorAll("#tokens .tok.full").length === 0,
      `stroke ${i + 1} of 12: no token yet — the game isn't done until every scene is`);
    traceOneStroke();
  }
  check(seenHeads.size === 4, "all four scenes' prompts were shown in one playthrough (got " + seenHeads.size + ")");
  check(doc.querySelectorAll("#tokens .tok.full").length === 1, "the twelfth line — the last of the fourth scene — finishes the round and earns the token");

  R.finish(errors);
})();
