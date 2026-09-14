/* Order: ladder shape, round generation, and the confound guards.
 *
 * Two things matter most.
 *
 * Stage 1 must change NOTHING but height. The first version put a different
 * colour on every piece from level 1, so there were two things changing at
 * once; playing it made clear the first levels have to change exactly one.
 *
 * And wherever colour does vary, it must not track size rank. If it did, he
 * could learn "the red one goes on the end" and score full marks without ever
 * comparing sizes — the same failure the sorting activity randomises against. */
const { pureContext, bootApp, Runner } = require("./_harness");
const { SERIATE_LEVELS, seriateEntry, buildSeriate, SERIATE_SLOTS, SERIATE_MIN_SCALE,
        SERIATE_RATIOS, scaleOfItem, COLORS } =
  pureContext(["20-stimuli.js", "activities/seriate.js"],
    ["SERIATE_LEVELS", "seriateEntry", "buildSeriate", "SERIATE_SLOTS", "SERIATE_MIN_SCALE",
     "SERIATE_RATIOS", "scaleOfItem", "COLORS"]);

const R = new Runner("seriate");
const check = (c, m) => R.check(c, m);
const near = (a, b) => Math.abs(a - b) < 1e-6;
const firstIdx = (f) => SERIATE_LEVELS.findIndex(f);
const lastIdx = (f) => SERIATE_LEVELS.map(f).lastIndexOf(true);

/* ---- the ladder ---- */
check(SERIATE_LEVELS.length === 26, "the ladder has 26 levels");

// grouped into stages, and ordered by load inside each stage
let prevStage = 0, prevLoad = -Infinity;
SERIATE_LEVELS.forEach((e, i) => {
  check(e.stage >= prevStage, `level ${i + 1} (${e.name}) isn't in an earlier stage than the one before`);
  if (e.stage !== prevStage) prevLoad = -Infinity;
  check(e.load >= prevLoad, `level ${i + 1} (${e.name}) is not easier than the one before it in its stage`);
  prevStage = e.stage; prevLoad = e.load;
});

check(seriateEntry(1).gaps === 1 && seriateEntry(1).guides === true, "level 1 asks for one piece, with guides");
check(seriateEntry(SERIATE_LEVELS.length).gaps === SERIATE_SLOTS, "the top level is a full staircase");
check(seriateEntry(0).gaps === 1 && seriateEntry(999).gaps === SERIATE_SLOTS, "level lookup clamps to the ladder");

// the whole first stage is plain bars — one colour, one shape
const stage1 = SERIATE_LEVELS.filter((e) => e.stage === 1);
check(stage1.length >= 6, "the plain stage is long enough to get solid on before anything changes");
check(stage1.every((e) => e.material === "bar" && e.colour === "one"), "stage 1 changes height and nothing else");
check(stage1.some((e) => e.gaps === SERIATE_SLOTS), "stage 1 reaches a full staircase before moving on");

// each new variation arrives only after the one before it
const lastPlain = lastIdx((e) => e.stage === 1);
check(firstIdx((e) => e.colour === "each") > lastPlain, "colour variation only starts after every plain level");
check(firstIdx((e) => e.material !== "bar") > firstIdx((e) => e.colour === "each"), "shapes only start after coloured bars");
check(firstIdx((e) => e.material === "mixed") > firstIdx((e) => e.material === "shape"), "mixed shapes come after single shapes");
check(firstIdx((e) => e.material === "picture") > firstIdx((e) => e.material === "mixed"), "pictures come after mixed shapes");
const topStage = SERIATE_LEVELS[SERIATE_LEVELS.length - 1].stage;
check(SERIATE_LEVELS.every((e) => e.steps !== "tight" || e.stage === topStage), "tiny steps are kept for the last stage");
// a new material starts on one colour, so it never arrives together with colour variation
check(SERIATE_LEVELS.find((e) => e.material === "shape").colour === "one", "shapes arrive on one colour first");

/* a hole in the middle has to appear — it's the transitive judgement, and if
   every hole sat at an end "put the fattest one last" would score perfectly */
check(stage1.some((e) => e.where === "middle"), "the plain stage already puts a hole in the middle");

/* ---- every level, many rounds ---- */
for (let lv = 1; lv <= SERIATE_LEVELS.length; lv++) {
  const e = seriateEntry(lv);
  const tag = `L${lv} ${e.name}`;
  const rankColours = {};        // colour seen at each size rank, across rounds
  const roundColours = new Set();
  const gapSeen = new Set();

  for (let t = 0; t < 120; t++) {
    const r = buildSeriate(lv);
    const everything = r.pieces.concat(r.tray);

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

    check(r.pieces.every((p, i) => near(scaleOfItem(p), r.scales[i])), `${tag}: pieces match their slots`);

    // gaps
    check(r.gaps.length === e.gaps, `${tag}: ${e.gaps} hole(s)`);
    check(r.gaps.every((g) => g >= 0 && g < SERIATE_SLOTS), `${tag}: holes are on the staircase`);
    check(new Set(r.gaps).size === r.gaps.length, `${tag}: no repeated hole`);
    r.gaps.forEach((g) => gapSeen.add(g));

    // the tray must contain a piece for every hole, and offer a real choice
    r.gaps.forEach((g) => {
      check(r.tray.some((it) => near(scaleOfItem(it), r.scales[g])), `${tag}: the piece for hole ${g} is offered`);
    });
    check(r.tray.length >= 3, `${tag}: at least three things to choose between`);

    // distractors sit BETWEEN the real sizes, never equal to one already standing
    r.tray.forEach((it) => {
      const s = scaleOfItem(it);
      const isReal = r.scales.some((x) => near(x, s));
      const isWanted = r.gaps.some((g) => near(r.scales[g], s));
      check(isWanted || !isReal, `${tag}: a wrong option never duplicates a placed size`);
    });

    if (e.gaps === SERIATE_SLOTS) {
      const sorted = r.tray.every((it, i) => i === 0 || scaleOfItem(r.tray[i - 1]) < scaleOfItem(it));
      check(!sorted, `${tag}: the tray isn't handed over already in order`);
    }

    // material — checked on the tray too, since wrong options must match the round
    if (e.material === "bar") check(everything.every((p) => p.k === "bar"), `${tag}: bars, tray included`);
    if (e.material === "shape" || e.material === "mixed") check(everything.every((p) => p.k === "shape"), `${tag}: shapes, tray included`);
    if (e.material === "shape") {
      check(new Set(everything.map((p) => p.shape)).size === 1, `${tag}: one shape for the whole round, tray included`);
    }
    if (e.material === "picture") {
      check(everything.every((p) => p.k === "em"), `${tag}: pictures`);
      check(new Set(everything.map((p) => p.ch)).size === 1,
        `${tag}: one kind of picture per round, tray included — never an apple beside a banana`);
    }

    // colour
    if (e.material !== "picture") {
      if (e.colour === "one") {
        const cols = new Set(everything.map((p) => p.color));
        check(cols.size === 1, `${tag}: one colour for the whole round, tray included`);
        roundColours.add([...cols][0]);
      } else {
        r.pieces.forEach((p, i) => { (rankColours[i] = rankColours[i] || []).push(p.color); });
      }
    }
  }

  if (e.material !== "picture" && e.colour === "one") {
    // held still within a round, but not the same round after round
    check(roundColours.size >= 3, `${tag}: the colour changes between rounds, just never within one`);
  }

  if (e.material !== "picture" && e.colour === "each") {
    // colour varies WITHIN a round — five picks from five colours averages well
    // over three distinct, so a round that quietly fixed its colour would fall through
    const distinctPerRound = rankColours[0].map((_, t) =>
      new Set(Object.keys(rankColours).map((rk) => rankColours[rk][t])).size);
    const avgDistinct = distinctPerRound.reduce((a, b) => a + b, 0) / distinctPerRound.length;
    check(avgDistinct > 2.5, `${tag}: pieces within a round take different colours (avg ${avgDistinct.toFixed(2)})`);

    // THE GUARD: colour must not predict size rank
    for (let rank = 0; rank < SERIATE_SLOTS; rank++) {
      check(new Set(rankColours[rank]).size >= Math.min(4, Object.keys(COLORS).length),
        `${tag}: rank ${rank} takes many colours, so colour can't stand in for size`);
    }
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
const scaleOf = (node) => scaleOfItem(node._item);

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

  // level 1 on screen: every real piece, standing or in the tray, one colour
  const onScreen = Array.from(doc.querySelectorAll("#stage .tile")).filter((t) => !t.classList.contains("ghost"));
  check(new Set(onScreen.map((t) => t._item.color)).size === 1,
    "on level 1 every piece on screen is the same colour — height is the only difference");

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
