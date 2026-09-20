/* Sky: reuses Trace's engine wholesale (traceTracker, the board, the pointer
 * wiring — all exercised hard already in trace.test.js), so this only checks
 * what's actually new here: each theme's three parallel lines stay on the
 * board, go top to bottom, are long enough to be worth tracing and don't
 * overlap each other, and that a round on the real page needs all three
 * finished — not just one — before it counts as solved. */
const { pureContext, bootApp, Runner } = require("./_harness");
const T = pureContext(["20-stimuli.js", "36-trace-engine.js", "activities/sky.js"],
  ["SKY_SHAPES", "SKY_THEMES", "SKY_LEVELS", "skyEntry", "buildSky", "TRACE_W", "TRACE_H"]);

const R = new Runner("sky");
const check = (c, m) => R.check(c, m);

T.SKY_THEMES.forEach((k) => {
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

// every level names a real theme and a real guide type
T.SKY_LEVELS.forEach((e, i) => {
  check(!!T.SKY_SHAPES[e.theme], `level ${i + 1} (${e.name}): names a real theme`);
  check(["road", "dotted", "dots"].includes(e.guide), `level ${i + 1} (${e.name}): a real guide type`);
});
check(T.SKY_LEVELS.length === T.SKY_THEMES.length * 3, "three sublevels per theme, no more — no ladder invented on top of the four scenes");

/* ---- date grouping on the home screen ----
   Two throwaway activities sharing Sky's own section: one lands on the same
   date as Sky (must share Sky's date heading and sit beside it, not get one
   of its own), one lands later (its date heading must sort after Sky's). */
const groupingHtml = (()=>{
  const fs = require("fs");
  const path = require("path");
  const build = require("../tools/build");
  const FAKES = `
const FAKE_SAME_DATE = { id:"fakesame", name:"Same day", icon:"🎈", maxLevel:()=>1,
  levelLabel:()=>"", settingsHint:()=>"", section:"Toondemy Games", date:"2025-01-02",
  startRound(level, api){ api.stage.appendChild(el("div","prompt-line","x")); } };
const FAKE_LATER = { id:"fakelater", name:"Later day", icon:"🎉", maxLevel:()=>1,
  levelLabel:()=>"", settingsHint:()=>"", section:"Toondemy Games", date:"2025-01-09",
  startRound(level, api){ api.stage.appendChild(el("div","prompt-line","x")); } };
`;
  const tmp = path.join(build.SRC, "activities", "__sky_test_fakes.js");
  fs.writeFileSync(tmp, FAKES);
  try {
    build.ACTIVITY_FILES.push("activities/__sky_test_fakes.js");
    return build.buildBody().replace(
      /const ACTIVITIES\s*=\s*\[([^\]]*)\];/,
      "const ACTIVITIES = [$1, FAKE_SAME_DATE, FAKE_LATER ];"
    );
  } finally {
    fs.unlinkSync(tmp);
  }
})();
const { window: gwin } = bootApp({ html: groupingHtml });

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

  const gdoc = gwin.document;
  const dateHeads = Array.from(gdoc.querySelectorAll(".date-heading")).map((h) => h.textContent);
  check(dateHeads.filter((t) => t === "2 Jan 2025").length === 1,
    "two games on the same date share exactly one date heading, not one each");
  const jan2Row = gdoc.querySelector(".date-heading") && gdoc.querySelector(".date-heading").nextElementSibling;
  check(!!jan2Row && jan2Row.querySelector("#card-sky") && jan2Row.querySelector("#card-fakesame"),
    "and both their cards sit in that one row");
  check(dateHeads.indexOf("2 Jan 2025") < dateHeads.indexOf("9 Jan 2025"),
    "date headings sort oldest first");

  check(!!$("#card-sky") && /Emergent writing slanting lines/.test($("#card-sky").textContent), "Sky gets its own home card");
  check(/Toondemy Games/.test(doc.querySelector(".section-heading").textContent), "sits under the Toondemy Games section heading");
  check(/2 Jan 2025/.test(doc.querySelector(".date-heading").textContent), "and its own date heading, since the date isn't in the card title");
  click(doc.querySelector('.playbtn[data-kind="sky"]'));
  const board = $("#stage .trace-board");
  check(!!board, "a tracing board is drawn, same as Trace");
  check(!!board.querySelector(".trace-start"), "with a green dot to start on");
  check(!!board.querySelector("text[pointer-events='none']"), "and a themed picture sitting at the start, out of the way of touch");
  check(board.querySelectorAll("polyline").length >= 6, "all three lines' guides are drawn up front, not revealed one at a time");

  const go = (type, q) => board.dispatchEvent(ptr(type, q));
  const traceCurrentStroke = () => {
    const pts = board._trace.stroke().pts;
    go("pointerdown", pts[0]);
    pts.forEach((q) => go("pointermove", q));
    go("pointerup", pts[pts.length - 1]);
  };

  traceCurrentStroke();
  check(board._trace.stroke().index === 1, "finishing the first line moves on to the second, not the whole round");
  check(doc.querySelectorAll("#tokens .tok.full").length === 0, "and it doesn't count as solved yet — one line of three isn't the round");
  check(!!board.querySelector(".trace-start"), "the green dot is still there, now on the second line");

  traceCurrentStroke();
  check(board._trace.stroke().index === 2, "second line done moves on to the third");
  check(doc.querySelectorAll("#tokens .tok.full").length === 0, "still not solved — two of three");

  traceCurrentStroke();
  check(doc.querySelectorAll("#tokens .tok.full").length === 1, "the third and last line finishes the round and earns a token");
  check(!board.querySelector(".trace-start"), "the green dot is gone, since there's nothing left to trace");
  check(!!board.querySelector("text.trace-won"), "the picture at the end pops, the same way Trace's star does");

  R.finish(errors);
})();
