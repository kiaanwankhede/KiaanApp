/* Trace: the strokes, the ladder, the judge, and the page.
 *
 * The judge (traceTracker) is where fairness lives, so it's tested hardest,
 * on every shape at every tolerance:
 *   - following the line — exactly, or with a wobbly hand — finishes, no misses
 *   - a palm landing away from the green dot is ignored
 *   - lifting halfway and carrying on works; restarting somewhere else doesn't
 *   - no shortcuts: jumping to the end, cutting across a circle, or going round
 *     the wrong way never finishes it
 *   - wandering well off the line is one miss per wander, never more
 *   - progress never goes backwards */
const { pureContext, bootApp, Runner } = require("./_harness");
const T = pureContext(["20-stimuli.js", "activities/trace.js"],
  ["TRACE_LEVELS", "traceEntry", "TRACE_SHAPES", "TRACE_TOL", "traceTracker", "buildTrace",
   "TRACE_W", "TRACE_H", "LINES", "CURVES", "JOINED", "SLANTED"]);

const R = new Runner("trace");
const check = (c, m) => R.check(c, m);
const SHAPES = Object.keys(T.TRACE_SHAPES);
const TOLS = Object.values(T.TRACE_TOL);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/* ---- the strokes: inside the board, evenly spaced, going the right way ---- */
SHAPES.forEach((k) => {
  const s = T.TRACE_SHAPES[k];
  s.paths.forEach((p, i) => {
    check(p.every((q) => q.x >= 4 && q.x <= T.TRACE_W - 4 && q.y >= 4 && q.y <= T.TRACE_H - 4), `${k}: stroke ${i + 1} stays on the board`);
    check(p.slice(1).every((q, j) => dist(q, p[j]) <= 1.0001), `${k}: stroke ${i + 1} points are evenly spaced`);
    check(p.length > 30, `${k}: stroke ${i + 1} is long enough to be worth tracing`);
  });
});
const P = (k, i = 0) => T.TRACE_SHAPES[k].paths[i];
const first = (p) => p[0], last = (p) => p[p.length - 1];
const rising = (p, f) => p.slice(1).every((q, j) => f(q) >= f(p[j]) - 1e-9);
const closed = (p) => dist(first(p), last(p)) < 0.5;

["down", "downLong"].forEach((k) => check(rising(P(k), (q) => q.y) && P(k).every((q) => q.x === P(k)[0].x), `${k}: straight down, top to bottom`));
["across", "acrossLong"].forEach((k) => check(rising(P(k), (q) => q.x) && P(k).every((q) => q.y === P(k)[0].y), `${k}: straight across, left to right`));
check(rising(P("hill"), (q) => q.x) && P("hill")[5].y < first(P("hill")).y, "hill: left to right, going up first");
check(rising(P("bowl"), (q) => q.x) && P("bowl")[5].y > first(P("bowl")).y, "bowl: left to right, going down first");
check(first(P("cCurve")).x > 95 && first(P("cCurve")).y < 30 && last(P("cCurve")).x > 95 && last(P("cCurve")).y > 70,
  "C curve: starts top right and ends bottom right");
check(P("cCurve")[5].y < first(P("cCurve")).y, "C curve: goes up and over first — the way c is written");
check(rising(P("wave"), (q) => q.x) && P("wave")[5].y < first(P("wave")).y, "wave: left to right, up first");
const circ = P("circle");
check(Math.abs(first(circ).y - Math.min(...circ.map((q) => q.y))) < 0.01, "circle: starts at the very top");
check(circ[5].x < first(circ).x, "circle: goes left from the top — the way o is written");
check(closed(circ), "circle: ends where it started");
check(rising(P("plus", 0), (q) => q.y) && rising(P("plus", 1), (q) => q.x), "plus: down first, then across");
check(rising(P("zigzag"), (q) => q.x), "zigzag: left to right");
check(P("corner")[10].y > first(P("corner")).y, "corner: goes down first");
check(closed(P("square")) && P("square")[10].y > first(P("square")).y, "square: goes down first and closes up");
["slash", "backslash"].forEach((k) => check(rising(P(k), (q) => q.y), `${k}: top to bottom`));
check(rising(P("cross", 0), (q) => q.y) && rising(P("cross", 1), (q) => q.y), "X: both strokes top to bottom");
check(closed(P("triangle")) && Math.abs(first(P("triangle")).y - Math.min(...P("triangle").map((q) => q.y))) < 0.01,
  "triangle: starts at the top and closes up");

/* ---- the ladder ---- */
check(T.TRACE_LEVELS.length === 23, "the ladder has 23 levels");
let prevStage = 0, prevLoad = -Infinity;
T.TRACE_LEVELS.forEach((e, i) => {
  check(e.stage >= prevStage, `level ${i + 1} (${e.name}) isn't in an earlier stage than the one before`);
  if (e.stage !== prevStage) prevLoad = -Infinity;
  check(e.load >= prevLoad, `level ${i + 1} (${e.name}) is not easier than the one before it in its stage`);
  prevStage = e.stage; prevLoad = e.load;
});
const inStage = (n) => T.TRACE_LEVELS.filter((e) => e.stage === n);
const onlyFrom = (n, set) => inStage(n).every((e) => e.shapes.every((s) => set.indexOf(s) !== -1));
check(onlyFrom(1, T.LINES), "stage 1 is lines only");
check(onlyFrom(2, T.CURVES), "stage 2 is curves only");
check(onlyFrom(3, ["circle"]), "stage 3 is the circle");
check(onlyFrom(4, T.JOINED), "stage 4 is joined strokes");
check(onlyFrom(5, T.SLANTED), "stage 5 is slants");
check(T.traceEntry(1).shapes.join() === "down" && T.traceEntry(1).guide === "road", "level 1 is one down line, on the road");
const ORDER = { road: 0, dotted: 1, dots: 2 };
[1, 2, 3, 4, 5].forEach((n) => {
  const g = inStage(n).map((e) => ORDER[e.guide]);
  check(g[0] === 0, `stage ${n} starts on the road`);
  check(g.every((v, i) => i === 0 || v >= g[i - 1]), `stage ${n} only ever fades its support: road, then dotted, then dots`);
});
check(T.TRACE_TOL.road > T.TRACE_TOL.dotted && T.TRACE_TOL.dotted > T.TRACE_TOL.dots, "how far off still counts narrows as the support fades");

// rounds: every shape of a level comes up, and never the same one twice running
for (let lv = 1; lv <= T.TRACE_LEVELS.length; lv++) {
  const e = T.traceEntry(lv), seen = new Set();
  let prev = null, repeat = false;
  for (let t = 0; t < 200; t++) {
    const r = T.buildTrace(lv);
    seen.add(r.shape);
    if (e.shapes.length > 1 && r.shape === prev) repeat = true;
    prev = r.shape;
  }
  check(seen.size === e.shapes.length, `L${lv} ${e.name}: every shape in it comes up`);
  check(!repeat, `L${lv} ${e.name}: never the same shape twice in a row`);
}

/* ---- the judge ---- */
function run(pts, tol, moves) {
  const tr = T.traceTracker(pts, tol);
  let misses = 0, accepted = false;
  moves.forEach(([kind, q]) => {
    let res;
    if (kind === "down") { res = tr.down(q.x, q.y); if (res.accepted) accepted = true; }
    else if (kind === "move") res = tr.move(q.x, q.y);
    else tr.up();
    if (res && res.miss) misses++;
  });
  return { tr, misses, accepted };
}
const follow = (pts, from = 0, to = pts.length - 1, jit = 0, tol = 0) =>
  pts.slice(from, to + 1).map((q) => {
    if (!jit) return ["move", q];
    const a = Math.random() * 2 * Math.PI, r = Math.random() * jit * tol;
    return ["move", { x: q.x + r * Math.cos(a), y: q.y + r * Math.sin(a) }];
  });
// a point well away from where he's up to — beyond the miss line for every nearby point
function away(pts, i, tol) {
  const a = pts[Math.max(0, i - 2)], b = pts[Math.min(pts.length - 1, i + 2)];
  const tx = b.x - a.x, ty = b.y - a.y, n = Math.hypot(tx, ty) || 1;
  return { x: pts[i].x - (ty / n) * tol * 4.5, y: pts[i].y + (tx / n) * tol * 4.5 };
}

SHAPES.forEach((k) => {
  T.TRACE_SHAPES[k].paths.forEach((pts, si) => {
    TOLS.forEach((tol) => {
      const tag = `${k}${T.TRACE_SHAPES[k].paths.length > 1 ? " stroke " + (si + 1) : ""} @${tol}`;
      const end = pts.length - 1, mid = Math.floor(end / 2);

      let r = run(pts, tol, [["down", pts[0]], ...follow(pts)]);
      check(r.tr.done && r.misses === 0, `${tag}: following the line exactly finishes it, no misses`);

      r = run(pts, tol, [["down", pts[0]], ...follow(pts, 0, end, 0.6, tol)]);
      check(r.tr.done && r.misses === 0, `${tag}: a wobbly hand that stays near the line finishes it, no misses`);

      r = run(pts, tol, [["down", { x: pts[0].x + tol * 1.3 + 12, y: pts[0].y }]]);
      check(!r.accepted, `${tag}: a touch away from the green dot (a palm) doesn't start anything`);

      r = run(pts, tol, [["down", pts[0]], ...follow(pts, 0, mid), ["up"], ["down", pts[end]]]);
      check(!r.tr.done && !r.tr.drawing, `${tag}: after lifting, he can't restart from the far end`);
      r.tr.down(r.tr.at().x, r.tr.at().y);
      follow(pts, r.tr.k).forEach(([, q]) => r.tr.move(q.x, q.y));
      check(r.tr.done, `${tag}: after lifting, he carries on from where he stopped`);

      r = run(pts, tol, [["down", pts[0]], ["move", pts[end]], ["move", pts[end]]]);
      check(!r.tr.done, `${tag}: jumping to the end doesn't finish it`);

      if (closed(pts)) {
        // Going the wrong way ends by running back over the start of the line,
        // and a few points get picked up on that last stretch (the circle
        // measured about 15%). It must never finish, and never get far.
        r = run(pts, tol, [["down", pts[0]], ...follow(pts.slice().reverse())]);
        check(!r.tr.done && r.tr.k < pts.length * 0.25,
          `${tag}: going round the wrong way never finishes it (got ${Math.round(100 * r.tr.k / pts.length)}% along)`);
      }
      if (k === "circle") {
        const across = pts[mid];
        r = run(pts, tol, [["down", pts[0]], ["move", { x: (pts[0].x + across.x) / 2, y: (pts[0].y + across.y) / 2 }], ["move", across], ...follow(pts, mid)]);
        check(!r.tr.done, `${tag}: cutting straight across the circle doesn't count`);
      }

      const third = Math.floor(end / 3);
      r = run(pts, tol, [["down", pts[0]], ...follow(pts, 0, third),
        ["move", away(pts, third, tol)], ["move", away(pts, third, tol)],        // one wander...
        ...follow(pts, third, 2 * third),
        ["move", away(pts, 2 * third, tol)],                                    // ...and another
        ...follow(pts, 2 * third)]);
      check(r.misses === 2 && r.tr.done, `${tag}: two wanders off the line are exactly two misses, and he still finishes`);

      // (at a sharp point like the zigzag's, both sides sit within reach of each
      // other, so going back can even claim a little — forgiving, never a loss)
      r = run(pts, tol, [["down", pts[0]], ...follow(pts, 0, mid)]);
      const kMid = r.tr.k;
      follow(pts, 0, mid).reverse().forEach(([, q]) => r.tr.move(q.x, q.y));
      check(r.tr.k >= kMid, `${tag}: going back over the line never undoes progress`);

      // ending beside the star rather than exactly on it still finishes
      r = run(pts, tol, [["down", pts[0]], ...follow(pts, 0, end - 4), ["move", { x: pts[end].x + tol * 0.7, y: pts[end].y }]]);
      check(r.tr.done, `${tag}: finishing right beside the star counts — no getting stuck at 98%`);
    });
  });
});

/* ---- the page ---- */
const { window, errors } = bootApp();
const doc = window.document;
const $ = (s) => doc.querySelector(s);
const click = (el) => el.dispatchEvent(new window.Event("click", { bubbles: true }));
// jsdom does no layout: the board is 160x100 at the origin, so a screen pixel is a board unit
window.Element.prototype.getBoundingClientRect = function () {
  const on = this.classList && this.classList.contains("trace-board");
  return on ? { left: 0, top: 0, width: 160, height: 100, right: 160, bottom: 100, x: 0, y: 0 }
            : { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0, x: 0, y: 0 };
};
function ptr(type, q, pointerType) {
  const e = new window.Event(type, { bubbles: true, cancelable: true });
  e.pointerId = pointerType === "touch" ? 7 : 1; e.clientX = q.x; e.clientY = q.y; e.pointerType = pointerType || "mouse";
  return e;
}
function stroke(board, pts, pointerType) {
  board.dispatchEvent(ptr("pointerdown", pts[0], pointerType));
  pts.forEach((q) => board.dispatchEvent(ptr("pointermove", q, pointerType)));
  board.dispatchEvent(ptr("pointerup", pts[pts.length - 1], pointerType));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  await sleep(150);
  check(!!$("#card-trace") && /TRACE/.test($("#card-trace").textContent), "Trace gets a home card called TRACE");
  click(doc.querySelector('.playbtn[data-kind="trace"]'));
  const board = $("#stage .trace-board");
  check(!!board, "a tracing board is drawn");
  check(!!board.querySelector(".trace-start"), "with a green dot to start on");
  check(!!board.querySelector("polygon"), "and a star to finish at");
  const s = board._trace.stroke();
  check(s.index === 0 && s.k === 0, "level 1 starts at the beginning of its line");
  check(board.querySelectorAll("polyline[stroke='#8fa1ba']").length >= 1, "the road has arrows showing the way");

  stroke(board, [{ x: 150, y: 95 }, { x: 140, y: 90 }]);
  check(board.querySelectorAll("polyline[stroke-width='4.5']").length === 0, "a palm landing away from the dot draws nothing");

  const pts = board._trace.stroke().pts;
  stroke(board, pts);
  check(doc.querySelectorAll("#tokens .tok.full").length === 1, "tracing the line to the star finishes the round and earns a token");
  check(board.querySelectorAll("polyline[stroke-width='4.5']").length >= 1, "and his crayon line is left on the board");

  // once a real pen has been seen, fingers and palms stop counting
  await sleep(700);                                              // next round
  const b2 = $("#stage .trace-board"), p2 = b2._trace.stroke().pts;
  b2.dispatchEvent(ptr("pointerdown", { x: 1, y: 1 }, "pen"));   // the pen touches down somewhere harmless
  b2.dispatchEvent(ptr("pointerup", { x: 1, y: 1 }, "pen"));
  stroke(b2, p2, "touch");
  check(b2._trace.stroke().k === 0, "with a real pen about, a finger or palm on the line does nothing");
  stroke(b2, p2, "pen");
  check(doc.querySelectorAll("#tokens .tok.full").length === 2, "and the pen itself traces as normal");

  R.finish(errors);
})();
