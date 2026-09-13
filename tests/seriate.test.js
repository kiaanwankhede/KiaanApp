/* Order: ladder shape, round generation, and the confound guards.
 *
 * The one that matters most is the colour guard. If colour tracked size rank
 * even slightly, he could learn "the red one goes on the end" and score full
 * marks without ever comparing sizes — the same failure the sorting activity
 * randomises against. */
const { pureContext, bootApp, Runner } = require("./_harness");
const { SERIATE_LEVELS, seriateEntry, buildSeriate, SERIATE_SLOTS, SERIATE_MIN_SCALE,
        SERIATE_RATIOS, scaleOfItem, COLORS } =
  pureContext(["20-stimuli.js", "activities/seriate.js"],
    ["SERIATE_LEVELS", "seriateEntry", "buildSeriate", "SERIATE_SLOTS", "SERIATE_MIN_SCALE",
     "SERIATE_RATIOS", "scaleOfItem", "COLORS"]);

const R = new Runner("seriate");
const check = (c, m) => R.check(c, m);
const near = (a, b) => Math.abs(a - b) < 1e-6;

/* ---- the ladder ---- */
check(SERIATE_LEVELS.length === 20, "the ladder has 20 levels");
let prev = -Infinity;
SERIATE_LEVELS.forEach((e, i) => {
  check(e.load >= prev, `level ${i + 1} (${e.name}) is not easier than the one before`);
  prev = e.load;
});
check(seriateEntry(1).gaps === 1, "level 1 asks for a single piece");
check(seriateEntry(1).guides === true, "level 1 shows the guide silhouettes");
check(seriateEntry(SERIATE_LEVELS.length).gaps === SERIATE_SLOTS, "the top level is a full staircase");
check(seriateEntry(0).gaps === 1 && seriateEntry(999).gaps === SERIATE_SLOTS, "level lookup clamps to the ladder");

/* a hole in the middle has to appear — it's the transitive judgement, and if
   every hole sat at an end "put the fattest one last" would score perfectly */
check(SERIATE_LEVELS.some(e => e.where === "middle"), "some levels put the hole in the middle");
check(SERIATE_LEVELS.some(e => e.material === "bar") &&
      SERIATE_LEVELS.some(e => e.material === "shape") &&
      SERIATE_LEVELS.some(e => e.material === "mixed"), "all three materials are used");

/* ---- every level, many rounds ---- */
for (let lv = 1; lv <= SERIATE_LEVELS.length; lv++) {
  const e = seriateEntry(lv);
  const tag = `L${lv} ${e.name}`;
  const rankColours = {};        // colour seen at each size rank, across rounds
  const gapSeen = new Set();

  for (let t = 0; t < 120; t++) {
    const r = buildSeriate(lv);

    check(r.scales.length === SERIATE_SLOTS && r.pieces.length === SERIATE_SLOTS,
      `${tag}: always five steps`);

    // sizes ascend, are distinct, stay visible, and step by the level's ratio
    let ok = true, visible = true, stepped = true;
    for (let i = 1; i < r.scales.length; i++) {
      if (!(r.scales[i] > r.scales[i - 1])) ok = false;
      if (Math.abs(r.scales[i] / r.scales[i - 1] - SERIATE_RATIOS[e.steps]) > 0.02) stepped = false;
    }
    if (r.scales[0] < SERIATE_MIN_SCALE - 1e-9) visible = false;
    if (r.scales[SERIATE_SLOTS - 1] > 1.0000001) visible = false;
    check(ok, `${tag}: sizes strictly ascend`);
    check(stepped, `${tag}: each step is the level's ratio`);
    check(visible, `${tag}: nothing smaller than the visibility floor, nothing over 1`);

    // the pieces carry the scales they're supposed to
    check(r.pieces.every((p, i) => near(scaleOfItem(p), r.scales[i])), `${tag}: pieces match their slots`);

    // gaps
    check(r.gaps.length === e.gaps, `${tag}: ${e.gaps} hole(s)`);
    check(r.gaps.every(g => g >= 0 && g < SERIATE_SLOTS), `${tag}: holes are on the staircase`);
    check(new Set(r.gaps).size === r.gaps.length, `${tag}: no repeated hole`);
    r.gaps.forEach(g => gapSeen.add(g));

    // the tray must contain a piece for every hole, and offer a real choice
    r.gaps.forEach(g => {
      check(r.tray.some(it => near(scaleOfItem(it), r.scales[g])), `${tag}: the piece for hole ${g} is offered`);
    });
    check(r.tray.length >= Math.min(3, SERIATE_SLOTS), `${tag}: at least three things to choose between`);

    // distractors sit BETWEEN the real sizes, never equal to one already standing
    r.tray.forEach(it => {
      const s = scaleOfItem(it);
      const isReal = r.scales.some(x => near(x, s));
      const isWanted = r.gaps.some(g => near(r.scales[g], s));
      check(isWanted || !isReal, `${tag}: a wrong option never duplicates a placed size`);
    });

    // full staircases must not arrive already sorted
    if (e.gaps === SERIATE_SLOTS) {
      const sorted = r.tray.every((it, i) => i === 0 || scaleOfItem(r.tray[i - 1]) < scaleOfItem(it));
      check(!sorted, `${tag}: the tray isn't handed over already in order`);
    }

    // material
    if (e.material === "bar") check(r.pieces.every(p => p.k === "bar"), `${tag}: bars`);
    else check(r.pieces.every(p => p.k === "shape"), `${tag}: shapes`);
    if (e.material === "shape") {
      check(new Set(r.pieces.map(p => p.shape)).size === 1, `${tag}: one shape for the whole round`);
    }

    r.pieces.forEach((p, i) => { (rankColours[i] = rankColours[i] || []).push(p.color); });
  }

  // colour also has to vary WITHIN a round, not just across them — five picks
  // from five colours averages well over three distinct, so a round that fixed
  // one colour per round (or per rank) would fall straight through this
  const distinctPerRound = Object.values(rankColours)[0].map((_, t) =>
    new Set(Object.keys(rankColours).map((r) => rankColours[r][t])).size);
  const avgDistinct = distinctPerRound.reduce((a, b) => a + b, 0) / distinctPerRound.length;
  check(avgDistinct > 2.5, `${tag}: pieces within a round take different colours (avg ${avgDistinct.toFixed(2)})`);

  // THE GUARD: colour must not predict size rank
  for (let rank = 0; rank < SERIATE_SLOTS; rank++) {
    const seen = new Set(rankColours[rank]);
    check(seen.size >= Math.min(4, Object.keys(COLORS).length),
      `${tag}: rank ${rank} takes many colours, so colour can't stand in for size`);
  }
  // and holes must move around, or position alone would give the game away
  if (e.gaps === 1 && e.where === "mixed") {
    check(gapSeen.size >= 3, `${tag}: the hole moves around the staircase`);
  }
  if (e.gaps === 1 && e.where === "middle") {
    check(gapSeen.size >= 2 && !gapSeen.has(0) && !gapSeen.has(SERIATE_SLOTS - 1),
      `${tag}: the middle hole is genuinely in the middle`);
  }
}

/* ---- and the same thing as a page you can actually play ---- */
const { window, errors } = bootApp();
const doc = window.document;
const $ = (s) => doc.querySelector(s);
const click = (el) => el.dispatchEvent(new window.Event("click", { bubbles: true }));
const scaleOf = (node) => node._item.k === "bar" ? node._item.scale : node._item.size;

// jsdom has no PointerEvent, so stand one up with the fields the drag code reads
function pointer(type, x, y) {
  const e = new window.Event(type, { bubbles: true, cancelable: true });
  e.pointerId = 1; e.clientX = x; e.clientY = y;
  return e;
}
function dragTo(node, x, y) {
  node.dispatchEvent(pointer("pointerdown", 0, 0));
  node.dispatchEvent(pointer("pointermove", x, y));
  node.dispatchEvent(pointer("pointerup", x, y));
}

setTimeout(() => {
  check(!!$("#card-seriate"), "Order gets a home card straight from the registry");

  click(doc.querySelector('.playbtn[data-kind="seriate"]'));
  check($("#play").classList.contains("on"), "Order starts a session");
  check($("#stage .steps").children.length === SERIATE_SLOTS, "the staircase is always five wide");
  check($("#stage .tray .opt"), "pieces are offered in the tray");

  const live = () => Array.from(doc.querySelectorAll(".dropzone")).filter((z) => z.dataset.full !== "1");
  check(live().length === 1, "exactly one hole accepts a drop at a time");

  const slot = $("#stage .steps .slot");
  const tiles = Array.from(doc.querySelectorAll("#stage .tray .opt .tile"));
  const bySize = tiles.slice().sort((a, b) => scaleOf(b) - scaleOf(a));
  // level 1 is a single hole at the big end, so the tallest piece is the answer
  const right = bySize[0], wrong = bySize[bySize.length - 1];
  check(scaleOf(right) > scaleOf(wrong), "the tray offers a genuine choice, not one piece");

  dragTo(wrong, 0, 0);
  check(!slot.classList.contains("done"), "a wrong piece does not fill the hole");
  check(!!$("#stage .tray .opt"), "and nothing is taken away for getting it wrong");

  dragTo(right, 0, 0);
  check(slot.classList.contains("done"), "the right piece fills the hole");
  check(!!slot.querySelector(".tile"), "and the piece is left standing in it");
  check(doc.querySelectorAll("#tokens .tok.full").length === 1, "finishing the staircase earns one token");
  check(live().length === 0, "with the staircase full there is nothing left to drop into");

  R.finish(errors);
}, 150);
