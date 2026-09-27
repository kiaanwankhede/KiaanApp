/* Shape fit.
 *
 * Two things decide whether a round is fair, and both are checked here over
 * every level many times over.
 *
 * ONE PIECE FITS. A wrong piece that would actually drop into the hole is a
 * round he loses for being right — the same failure Finish the word avoids by
 * refusing a decoy letter that spells another real word. `fitSameShape()`
 * decides it the way the game does, congruent BY ROTATION, so a mirror image
 * is correctly a wrong piece and not a trick.
 *
 * AND NOTHING ELSE SINGLES IT OUT. Same colour always; same area except at the
 * levels where size is the question; and at turn levels every piece lies at an
 * angle, not just the right one, or "the one that isn't wonky" answers part of
 * the round without any shape being compared.
 *
 * The third thing this holds is the promise made to a four-year-old: the
 * ladder starts at the plainest possible round, and the two ideas that ask the
 * most — a mirror, and a hole that takes two pieces — stay in its top half.
 */
const { pureContext, bootApp, Runner } = require("./_harness");
const T = pureContext(["20-stimuli.js", "activities/fit.js"],
  ["FIT_LEVELS", "FIT_CUTS", "FIT_PAIRS", "FIT_OTHERS", "FIT_DECOY_LOAD", "fitPlan", "fitBuild",
   "fitSameShape", "fitArea", "fitEdges", "fitBox", "fitFlip", "fitTurn", "fitCentred",
   "fitSamePlace", "fitDecoys", "FIT"]);

const R = new Runner("fit");
const check = (c, m) => R.check(c, m);

/* ---- the ladder, and the promise that it stays gentle ---- */
const L = T.FIT_LEVELS;
check(L.length === T.FIT.maxLevel(), "maxLevel matches the ladder it was built from");
check(L.every((p, i) => i === 0 || p.load >= L[i - 1].load),
  "sorted by load, like Sorting's, Odd one out's and Where is it?'s");
check(L[0].choices === 2 && L[0].decoy === "other" && !L[0].turn && L[0].parts === 1,
  "level 1 is the plainest round there is: two choices, a plainly different wrong shape, nothing turned");
check(L.every((p) => p.choices > p.parts),
  "every level offers more pieces than the hole takes, so there is always something to reject");

const firstMirror = L.findIndex((p) => p.decoy === "mirror");
const firstPair = L.findIndex((p) => p.parts === 2);
check(firstMirror > L.length / 2,
  `a mirror image never turns up in the easier half — first at level ${firstMirror + 1} of ${L.length}`);
check(firstPair > L.length / 2,
  `nor does a hole that takes two pieces — first at level ${firstPair + 1} of ${L.length}`);
check(L.length >= 20,
  `the ladder climbs in small steps rather than a few big ones (${L.length} levels)`);

/* ---- the cuts themselves ---- */
function signedArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}
const ALL_CUTS = Object.assign({}, T.FIT_CUTS, T.FIT_PAIRS);
Object.keys(ALL_CUTS).forEach((k) => {
  const cut = ALL_CUTS[k];
  cut.gaps.forEach((g, i) => {
    const b = T.fitBox(g);
    check(b.x >= 0 && b.y >= 0 && b.x + b.w <= 100 && b.y + b.h <= 100,
      `${k}: hole ${i + 1} is on the board`);
    check(b.w > 8 && b.h > 8, `${k}: hole ${i + 1} is big enough to aim at (${Math.round(b.w)}x${Math.round(b.h)})`);
    check(signedArea(g) > 0, `${k}: hole ${i + 1} is wound the same way as every other shape here`);
  });
  check(signedArea(cut.solid) !== 0, `${k}: the shape it is cut from has an area`);
  // the flag that decides whether a mirror decoy is fair must tell the truth
  const g = T.fitCentred(cut.gaps[0]);
  const mirrorDiffers = !T.fitSameShape(T.fitFlip(g), g);
  check(mirrorDiffers === !!cut.flip,
    `${k}: flip:${!!cut.flip} matches reality — a mirror of this piece ${mirrorDiffers ? "really is" : "is not"} a different piece`);
  // and a turnable piece must have an angle that actually shows
  if (cut.turn) {
    const visible = [90, 180, 270].filter((d) => !T.fitSamePlace(T.fitCentred(T.fitTurn(g, d)), g));
    check(visible.length > 0, `${k}: turning this piece is visible, so a turn level using it means something`);
  }
});
Object.keys(T.FIT_PAIRS).forEach((k) => {
  const gs = T.FIT_PAIRS[k].gaps.map(T.fitCentred);
  check(gs.length === 2, `${k}: two holes`);
  check(T.fitSameShape(gs[0], gs[1]),
    `${k}: both halves are the same piece, so either one goes in either side`);
});
Object.keys(T.FIT_OTHERS).forEach((k) => {
  check(signedArea(T.FIT_OTHERS[k]) > 0, `the "${k}" decoy shape is wound the same way as the holes`);
});

/* ---- every level, many rounds ---- */
const seenCut = {};
L.forEach((plan, li) => {
  const level = li + 1;
  for (let i = 0; i < 120; i++) {
    const r = T.fitBuild(plan);
    seenCut[r.cut] = (seenCut[r.cut] || 0) + 1;

    check(r.opts.length === plan.choices, `level ${level}: ${plan.choices} pieces to choose from`);
    const rights = r.opts.filter((o) => o.fits);
    check(rights.length === plan.parts,
      `level ${level}: exactly ${plan.parts} of them fit (${rights.length})`);
    check(r.answerAt.length === plan.parts && r.answerAt.every((j) => r.opts[j].fits),
      `level ${level}: the answers point at the pieces that fit`);

    // THE GUARD: no wrong piece would drop into the hole
    const right = rights[0].pts;
    r.opts.forEach((o) => {
      if (o.fits) {
        check(T.fitSameShape(o.pts, right), `level ${level}: every piece that fits really is the same piece`);
      } else {
        check(!T.fitSameShape(o.pts, right),
          `level ${level}: a wrong piece would ALSO fit the hole — the round has two right answers (${plan.decoy})`);
      }
    });
    // ...and no two choices are the same piece as each other
    for (let a = 0; a < r.opts.length; a++) {
      for (let b = a + 1; b < r.opts.length; b++) {
        if (r.opts[a].fits && r.opts[b].fits) continue;
        check(!T.fitSameShape(r.opts[a].pts, r.opts[b].pts),
          `level ${level}: two of the choices are the same shape`);
      }
    }

    // size may only be a tell where size IS the question
    const wanted = T.fitArea(right);
    r.opts.forEach((o) => {
      const off = Math.abs(T.fitArea(o.pts) - wanted) / wanted;
      if (plan.decoy === "size") {
        check(o.fits || off > 0.15,
          `level ${level}: a "wrong size" piece is actually a different size (off by ${(off * 100) | 0}%)`);
      } else {
        check(off < 0.12,
          `level ${level}: every piece is the same size, so "the big one" can't answer it (off by ${(off * 100) | 0}%)`);
      }
    });

    // turning: any piece that CAN be seen to be turned, is. A wrong piece of
    // the same family left sitting square-on would say "not this one" without
    // a single shape being compared with the hole.
    if (plan.turn) {
      r.opts.forEach((o) => {
        const canShow = [90, 180, 270].some((d) =>
          !T.fitSamePlace(T.fitCentred(T.fitTurn(o.pts, d)), T.fitCentred(o.pts)));
        if (!canShow) return;                       // a disc looks the same at every angle
        check(!T.fitSamePlace(o.draw, T.fitCentred(o.pts)),
          `level ${level}: a piece is sitting square-on at a turn level`);
      });
    } else {
      check(r.opts.every((o) => o.spin === 0), `level ${level}: nothing is turned at this level`);
    }

    // the mirror only appears where it is a fair decoy
    if (plan.decoy === "mirror") {
      check(ALL_CUTS[r.cut].flip,
        `level ${level}: a mirror round only ever uses a piece whose mirror really is a different piece`);
      check(r.opts.some((o) => !o.fits && T.fitSameShape(T.fitFlip(o.pts), right)),
        `level ${level}: one of the wrong pieces really is the mirror of the right one`);
    }
  }
});
Object.keys(ALL_CUTS).forEach((k) =>
  check(seenCut[k] > 0, `the "${k}" hole really gets used (${seenCut[k] || 0} times)`));

/* A decoy kind that quietly ran out and handed back fewer pieces than the
   level asked for would shrink the round without anything looking broken. */
["other", "size", "ratio", "mirror"].forEach((kind) => {
  Object.keys(T.FIT_CUTS).forEach((k) => {
    if (kind === "mirror" && !T.FIT_CUTS[k].flip) return;
    const g = T.fitCentred(T.FIT_CUTS[k].gaps[0]);
    check(T.fitDecoys(kind, g, 3).length === 3, `${kind} decoys for the ${k} piece: three distinct ones exist`);
  });
});

/* ---- the page ---- */
const { window, errors } = bootApp({
  localStorage: { settings: { assistedMode: false }, progress: { sessions: [], perLevel: {}, best: {} } },
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
  zone.__rect = { left: 0, top: 0, width: 60, height: 60 };
  window.Element.prototype.getBoundingClientRect = function () {
    const r = this.__rect || { left: -5000, top: 0, width: 0, height: 0 };
    return Object.assign({}, r, { right: r.left + r.width, bottom: r.top + r.height, x: r.left, y: r.top });
  };
  node.dispatchEvent(ptr("pointerdown", 0, 0));
  node.dispatchEvent(ptr("pointermove", 30, 30));
  node.dispatchEvent(ptr("pointerup", 30, 30));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  await sleep(150);
  check(!!$("#card-fit") && /SHAPE FIT/.test($("#card-fit").textContent), "it gets its own home card");

  click(doc.querySelector('.playbtn[data-kind="fit"]'));
  const board = $("#stage .fitboard");
  check(!!board && !!board.querySelector(".fitshape"), "the shape he is completing is drawn");
  const holes = Array.from(doc.querySelectorAll("#stage .fitgap.dropzone"));
  check(holes.length === 1, "with one hole in it at level 1");
  check(!!holes[0].querySelector(".fitslot"),
    "and the hole is drawn as the outline of the piece that fills it — nothing has to be remembered");

  const tiles = Array.from(doc.querySelectorAll("#stage .options .opt .tile"));
  check(tiles.length === 2, "two pieces to choose from at level 1");
  check(tiles.every((t) => t._item.k === "svg" && /<svg/.test(t._item.svg)),
    "each piece is a drawing the activity composed, rebuildable from _item so a drag can carry it");
  const fills = new Set(tiles.map((t) => (t._item.svg.match(/fill="([^"]+)"/) || [])[1]));
  check(fills.size === 1, `every piece is the same colour, so colour can never be the tell (${[...fills].join()})`);

  const right = tiles.find((t) => t._item.fits);
  const wrong = tiles.find((t) => !t._item.fits);
  check(!!right && !!wrong, "one of them fits and one doesn't");

  dropOn(wrong, holes[0]);
  check(holes[0].dataset.full !== "1", "the wrong piece doesn't go in");
  check($("#play").classList.contains("on"), "and nothing ends — he's still on the same round");
  dropOn(wrong, holes[0]);
  check(doc.querySelectorAll("#stage .options .opt.dim").length >= 1,
    "after a couple of tries the wrong ones fade, the same help every other game gives");

  dropOn(right, holes[0]);
  check(holes[0].dataset.full === "1", "the piece that fits goes in");
  check(holes[0].classList.contains("done"), "and the hole is filled in rather than left as an outline");
  check(doc.querySelectorAll("#tokens .tok.full").length === 1, "the round counts");

  const saved = JSON.parse(window.localStorage.getItem("lr_state_v1") || "{}");
  const tags = Object.keys(((saved.progress || {}).tagStats || {}).fit || {});
  check(tags.length === 1, `the round is tagged with which hole it was, so Settings can show which land ("${tags[0]}")`);

  R.finish(errors);
})();
