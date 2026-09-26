/* Where is it?
 *
 * One guard decides whether a round means anything: every choice must be the
 * SAME thing in the SAME container in the SAME colour, so the only difference
 * between them is where the thing sits. Let the objects vary and "find the one
 * with the red ball" answers the round without a thought about position — the
 * shortcut this app spends most of its design budget closing.
 *
 * The other half is the top of the ladder, which is the reason to build this
 * at all: there the choices are made of DIFFERENT things from the picture he
 * is matching, so nothing is shared but the relation and the relation is the
 * only thing left to match on.
 */
const { pureContext, bootApp, Runner } = require("./_harness");
const T = pureContext(["20-stimuli.js", "activities/where.js"],
  ["WHERE_LEVELS", "WHERE_POOLS", "WHERE_CONTAINERS", "WHERE_THINGS", "wherePlan",
   "whereBuild", "wherePoint", "whereSVG", "WHERE", "COLORS"]);

const R = new Runner("where");
const check = (c, m) => R.check(c, m);

/* ---- the ladder ---- */
check(T.WHERE_LEVELS.length === T.WHERE.maxLevel(), "maxLevel matches the ladder it was built from");
check(T.WHERE_LEVELS.every((p, i) => i === 0 || p.load >= T.WHERE_LEVELS[i - 1].load),
  "sorted by load, like Sorting's and Odd one out's");
check(T.WHERE_LEVELS[0].swap === "same" && T.WHERE_LEVELS[0].choices === 2,
  "it starts at the plainest round: two choices, made of the same things as the picture above");
check(T.WHERE_LEVELS[T.WHERE_LEVELS.length - 1].swap === "swapBoth",
  "and ends where nothing is shared with the picture but the relation itself");
check(T.WHERE_LEVELS.every((p) => p.choices <= p.pool.length),
  "no level ever asks for more choices than it has positions to fill them with");

/* ---- the drawing puts things where it says ---- */
Object.keys(T.WHERE_CONTAINERS).forEach((k) => {
  const c = T.WHERE_CONTAINERS[k];
  const at = (pos) => T.wherePoint(pos, c);
  check(at("on").y < c.top, `${k}: "on" sits above its top edge`);
  check(at("under").y > c.bottom, `${k}: "under" sits below its bottom edge`);
  check(at("beside").x > c.right, `${k}: "beside" sits past its right edge`);
  check(at("in").y > c.top && at("in").y < c.bottom, `${k}: "in" sits between its edges`);
  ["in", "on", "under", "beside"].forEach((pos) => {
    const p = at(pos);
    check(p.x - 10 >= 0 && p.x + 10 <= 100 && p.y - 10 >= 0 && p.y + 10 <= 100,
      `${k}: "${pos}" stays on the tile (${Math.round(p.x)},${Math.round(p.y)})`);
  });
  // a thing inside must be drawn over its container, or the container hides it
  const inside = T.whereSVG({ container: k, thing: "circle", colour: "red", pos: "in" });
  const onTop = T.whereSVG({ container: k, thing: "circle", colour: "red", pos: "on" });
  check(inside.indexOf("<rect") < inside.indexOf("<circle") || inside.indexOf("<path") < inside.indexOf("<circle"),
    `${k}: a thing IN it is drawn after the container, so it isn't painted over`);
  check(onTop.indexOf("<circle") < onTop.indexOf("<rect") || onTop.indexOf("<circle") < onTop.indexOf("<path"),
    `${k}: a thing ON it is drawn before the container, so it tucks behind the rim`);
});

/* ---- every level, many rounds ---- */
const seenPos = {};
T.WHERE_LEVELS.forEach((plan, li) => {
  const level = li + 1;
  for (let i = 0; i < 150; i++) {
    const r = T.whereBuild(plan);
    seenPos[r.pos] = (seenPos[r.pos] || 0) + 1;

    check(r.scenes.length === plan.choices, `level ${level}: ${plan.choices} choices`);
    check(r.answerAt >= 0 && r.answerAt < plan.choices, `level ${level}: the answer is one of them`);
    check(r.scenes[r.answerAt].pos === r.ref.pos,
      `level ${level}: the answer really is arranged like the picture above`);

    // THE GUARD: only the position may differ between choices
    const kinds = new Set(r.scenes.map((s) => s.container + "/" + s.thing + "/" + s.colour));
    check(kinds.size === 1,
      `level ${level}: every choice is the same thing in the same container in the same colour (${[...kinds].join(" | ")})`);
    const positions = r.scenes.map((s) => s.pos);
    check(new Set(positions).size === positions.length,
      `level ${level}: no position is offered twice, or two choices would both be right`);
    check(positions.every((p) => plan.pool.indexOf(p) >= 0),
      `level ${level}: every position comes from the ones this level uses`);

    // and what the level claims about the objects is true
    const below = r.scenes[0];
    if (plan.swap === "same") {
      check(below.thing === r.ref.thing && below.container === r.ref.container && below.colour === r.ref.colour,
        `level ${level}: the choices are made of the same things as the picture above`);
    } else {
      check(below.thing !== r.ref.thing,
        `level ${level}: the choices use a different thing, so the object can't be matched instead of the arrangement`);
      check(below.colour !== r.ref.colour, `level ${level}: and a different colour`);
    }
    if (plan.swap === "swapBoth") {
      check(below.container !== r.ref.container,
        `level ${level}: the container differs too — nothing is shared but the relation`);
    } else {
      check(below.container === r.ref.container, `level ${level}: the container is the same one`);
    }
  }
});
["in", "on", "under", "beside"].forEach((p) =>
  check(seenPos[p] > 0, `"${p}" really gets asked for (${seenPos[p] || 0} times)`));

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
  check(!!$("#card-where") && /WHERE IS IT/.test($("#card-where").textContent), "it gets its own home card");

  click(doc.querySelector('.playbtn[data-kind="where"]'));
  check(!/\b(in|on|under|beside|above|below)\b/i.test($("#stage .prompt-line").textContent),
    `nothing on screen names a position — it is matching an arrangement ("${$("#stage .prompt-line").textContent}")`);
  const ref = $("#stage .seq .tile");
  const slot = $("#stage .slot.dropzone");
  check(!!ref && !!slot, "a picture to match, and one space to put the match in");
  const tiles = Array.from(doc.querySelectorAll("#stage .options .opt .tile"));
  check(tiles.length === 2, "two choices at level 1");
  check(tiles.every((t) => t._item.k === "svg" && /<svg/.test(t._item.svg)),
    "each choice is a drawing the activity composed, rebuildable from _item so a drag can carry it");

  const right = tiles.find((t) => t._item.where.pos === ref._item.where.pos);
  const wrong = tiles.find((t) => t !== right);
  check(!!right && !!wrong, "one of them is arranged like the picture, one isn't");

  dropOn(wrong, slot);
  check(slot.dataset.full !== "1", "the wrong arrangement doesn't fill the space");
  check($("#play").classList.contains("on"), "and nothing ends — he's still on the same round");
  dropOn(wrong, slot);
  check(doc.querySelectorAll("#stage .options .opt.dim").length >= 1,
    "after a couple of tries the wrong ones dim, the same help every other game gives");

  dropOn(right, slot);
  check(slot.dataset.full === "1", "the matching one goes in");
  check(doc.querySelectorAll("#tokens .tok.full").length === 1, "and the round counts");

  const saved = JSON.parse(window.localStorage.getItem("lr_state_v1") || "{}");
  const tags = Object.keys(((saved.progress || {}).tagStats || {}).where || {});
  check(tags.length === 1 && ["in", "on", "under", "beside"].indexOf(tags[0]) >= 0,
    `the round is tagged with which position it asked for, so Settings can show which land ("${tags[0]}")`);

  R.finish(errors);
})();
