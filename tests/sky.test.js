/* Sky: reuses Trace's engine wholesale (traceTracker, the board, the pointer
 * wiring — all exercised hard already in trace.test.js), so this only checks
 * what's actually new here: the eight hand-picked line coordinates stay on
 * the board, go top to bottom, and are long enough to be worth tracing, and
 * that a round on the real page draws a themed start/end picture and finishes
 * like any other trace. */
const { pureContext, bootApp, Runner } = require("./_harness");
const T = pureContext(["20-stimuli.js", "36-trace-engine.js", "activities/sky.js"],
  ["SKY_SHAPES", "SKY_LEVELS", "skyEntry", "buildSky", "TRACE_W", "TRACE_H"]);

const R = new Runner("sky");
const check = (c, m) => R.check(c, m);
const SHAPES = Object.keys(T.SKY_SHAPES);

SHAPES.forEach((k) => {
  const s = T.SKY_SHAPES[k];
  check(s.strokes.length === 1, `${k}: a single line, start to end`);
  s.paths.forEach((p) => {
    check(p.every((q) => q.x >= 4 && q.x <= T.TRACE_W - 4 && q.y >= 4 && q.y <= T.TRACE_H - 4), `${k}: stays on the board`);
    check(p.slice(1).every((q, j) => Math.hypot(q.x - p[j].x, q.y - p[j].y) <= 1.0001), `${k}: evenly spaced`);
    check(p.length > 30, `${k}: long enough to be worth tracing`);
    check(p[p.length - 1].y > p[0].y, `${k}: top to bottom, like every other line in this app`);
  });
  check(!!s.marker && !!s.marker.emoji, `${k}: has a picture waiting at the end`);
  check(!!s.startMark && !!s.startMark.emoji, `${k}: has a picture at the start`);
});

// every level's shapes exist and share a guide type
T.SKY_LEVELS.forEach((e, i) => {
  check(e.shapes.every((k) => T.SKY_SHAPES[k]), `level ${i + 1} (${e.name}): every shape it lists is real`);
  check(["road", "dotted", "dots"].includes(e.guide), `level ${i + 1} (${e.name}): a real guide type`);
});

/* ---- the page ---- */
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
  check(!!$("#card-sky") && /SKY/.test($("#card-sky").textContent), "Sky gets a home card called SKY");
  click(doc.querySelector('.playbtn[data-kind="sky"]'));
  const board = $("#stage .trace-board");
  check(!!board, "a tracing board is drawn, same as Trace");
  check(!!board.querySelector(".trace-start"), "with a green dot to start on");
  check(!!board.querySelector("text[pointer-events='none']"), "and a themed picture sitting at the start, out of the way of touch");

  const pts = board._trace.stroke().pts;
  const go = (type, q) => board.dispatchEvent(ptr(type, q));
  go("pointerdown", pts[0]);
  pts.forEach((q) => go("pointermove", q));
  go("pointerup", pts[pts.length - 1]);

  check(doc.querySelectorAll("#tokens .tok.full").length === 1, "tracing all the way down finishes the round and earns a token");
  check(!board.querySelector(".trace-start"), "the green dot is gone, since there's nothing left to trace");
  check(!!board.querySelector("text.trace-won"), "the picture at the end pops, the same way Trace's star does");

  R.finish(errors);
})();
