/* How many: ladder shape, round generation, and the two shortcut guards.
 *
 *   - matching the PATTERN instead of the number: from stage 2 on the right
 *     card is never laid out like the top one, and on "different pattern"
 *     levels neither is any wrong card — otherwise "pick the odd one" works
 *   - matching HOW FULL A CARD LOOKS: from stage 4 on, neither total colour
 *     nor dot size may point at the answer much better than chance
 *
 * Plus: exactly one right answer, dots that fit and never overlap, one colour
 * per round, and wording that keeps changing. */
const { pureContext, bootApp, Runner } = require("./_harness");
const { COUNT_LEVELS, countEntry, buildCount, COUNT_OPTIONS, COUNT_WORDS } =
  pureContext(["20-stimuli.js", "activities/count.js"],
    ["COUNT_LEVELS", "countEntry", "buildCount", "COUNT_OPTIONS", "COUNT_WORDS"]);

const R = new Runner("count");
const check = (c, m) => R.check(c, m);
const ROUNDS = 300;
const firstIdx = (f) => COUNT_LEVELS.findIndex(f);
const lastIdx = (f) => COUNT_LEVELS.map(f).lastIndexOf(true);

const countOf = (it) => (it.k === "set" ? it.n : Number(it.text));
const area = (c) => c.pts.reduce((a, p) => a + p.r * p.r, 0);
const meanR = (c) => c.pts.reduce((a, p) => a + p.r, 0) / c.pts.length;
const samePts = (a, b) => a.pts.length === b.pts.length && a.pts.every((p, i) => p.x === b.pts[i].x && p.y === b.pts[i].y);

/* ---- the ladder ---- */
check(COUNT_LEVELS.length === 21, "the ladder has 21 levels");
let prevStage = 0, prevLoad = -Infinity;
COUNT_LEVELS.forEach((e, i) => {
  check(e.stage >= prevStage, `level ${i + 1} (${e.name}) isn't in an earlier stage than the one before`);
  if (e.stage !== prevStage) prevLoad = -Infinity;
  check(e.load >= prevLoad, `level ${i + 1} (${e.name}) is not easier than the one before it in its stage`);
  prevStage = e.stage; prevLoad = e.load;
});
check(countEntry(1).layout === "same" && countEntry(1).range[1] === 3, "level 1 is 1 to 3, laid out alike");
check(COUNT_LEVELS.filter((e) => e.stage === 1).every((e) => e.layout === "same" && e.ask === "dots"),
  "stage 1 is dots laid out alike, nothing else");
check(firstIdx((e) => e.ask !== "dots") > lastIdx((e) => e.stage <= 2), "numbers only arrive after both dot stages");
check(firstIdx((e) => e.size) > lastIdx((e) => e.stage <= 3), "dot sizes only start to vary in stage 4");
check(COUNT_LEVELS.every((e) => !e.pics || e.stage === 5), "pictures belong to stage 5 only");
check(COUNT_LEVELS.every((e) => e.range[1] <= 5 || e.stage === 6), "numbers above 5 are kept for the last stage");
check(COUNT_LEVELS.some((e) => e.range[1] === 10), "the ladder goes up to 10");
check(countEntry(0) === countEntry(1) && countEntry(999) === countEntry(COUNT_LEVELS.length), "level lookup clamps to the ladder");

/* ---- every level, many rounds ---- */
let lastTemplate = null;
for (let lv = 1; lv <= COUNT_LEVELS.length; lv++) {
  const e = countEntry(lv);
  const tag = `L${lv} ${e.name}`;
  const templates = new Set();
  let areaWins = 0, sizeWins = 0, strategyRounds = 0, trapHeld = 0;
  const seenTargets = new Set();

  for (let t = 0; t < ROUNDS; t++) {
    const r = buildCount(lv);
    const cards = [r.sample].concat(r.options);
    const sets = cards.filter((c) => c.k === "set");
    seenTargets.add(r.target);

    // one right answer, distinct choices, all in range
    check(r.options.length === COUNT_OPTIONS, `${tag}: ${COUNT_OPTIONS} cards to choose from`);
    const counts = r.options.map(countOf);
    check(new Set(counts).size === counts.length, `${tag}: no two choices have the same number`);
    check(counts.filter((n) => n === r.target).length === 1, `${tag}: exactly one choice is right`);
    check(countOf(r.answer) === r.target && r.options.indexOf(r.answer) !== -1, `${tag}: the answer is among the choices`);
    check(counts.every((n) => n >= e.range[0] && n <= e.range[1]), `${tag}: every choice is within ${e.range[0]}–${e.range[1]}`);
    check(countOf(r.sample) === r.target, `${tag}: the top card shows the target`);
    if (e.spread === "near") check(counts.every((n) => Math.abs(n - r.target) <= 2), `${tag}: close numbers really are close`);

    // what's asked
    const asked = r.ask;
    if (asked === "numToDots") check(r.sample.k === "text" && r.options.every((o) => o.k === "set"), `${tag}: a number, find the dots`);
    if (asked === "dotsToNum") check(r.sample.k === "set" && r.options.every((o) => o.k === "text"), `${tag}: dots, find the number`);
    if (asked === "dots") check(cards.every((c) => c.k === "set"), `${tag}: dots to dots`);
    if (e.ask !== "numBoth") check(asked === e.ask, `${tag}: asks what the level says`);

    // every set: the right number of points, inside the card, never overlapping
    sets.forEach((c) => {
      check(c.pts.length === c.n, `${tag}: a card of ${c.n} shows ${c.n}`);
      check(c.pts.every((p) => p.x - p.r >= 0 && p.y - p.r >= 0 && p.x + p.r <= 100 && p.y + p.r <= 100),
        `${tag}: nothing hangs off the edge of a card`);
      let apart = true;
      for (let i = 0; i < c.pts.length; i++)
        for (let j = i + 1; j < c.pts.length; j++)
          if (Math.hypot(c.pts[i].x - c.pts[j].x, c.pts[i].y - c.pts[j].y) < c.pts[i].r + c.pts[j].r) apart = false;
      check(apart, `${tag}: no two dots or pictures overlap, so each one can be counted`);
      if (c.pts[0].ch && c.layout === "scatter") {
        let roomy = true;
        for (let i = 0; i < c.pts.length; i++)
          for (let j = i + 1; j < c.pts.length; j++)
            if (Math.hypot(c.pts[i].x - c.pts[j].x, c.pts[i].y - c.pts[j].y) < c.pts[i].r * 2 + 6) roomy = false;
        check(roomy, `${tag}: scattered pictures keep extra room, so wide ones like a bus never touch`);
      }
    });

    // one colour for the whole round
    check(new Set(sets.map((c) => c.color)).size <= 1, `${tag}: every card in a round is the same colour`);

    // the pattern shortcut
    if (asked === "dots") {
      if (e.layout === "same") {
        check(samePts(r.answer, r.sample), `${tag}: stage 1 — the right card is laid out exactly like the top one`);
      } else if (r.target >= 2) {
        // one dot is one dot however it's placed, so this is checked from 2 up
        check(!samePts(r.answer, r.sample), `${tag}: the right card is never a copy of the top card's layout`);
      }
      if (e.layout === "different") {
        check(r.options.every((o) => o.layout !== r.sample.layout),
          `${tag}: no choice — right or wrong — shares the top card's layout, so "the odd one out" can't work`);
      }
    }

    // sizes
    if (!e.size && !e.pics) {
      check(new Set(sets.flatMap((c) => c.pts.map((p) => p.r))).size <= 1, `${tag}: every dot the same size`);
    }
    if (e.size && asked === "dots") {
      strategyRounds++;
      const closest = (f) => r.options.reduce((b, o) => (Math.abs(f(o) - f(r.sample)) < Math.abs(f(b) - f(r.sample)) ? o : b));
      if (closest(area) === r.answer) areaWins++;
      if (closest(meanR) === r.answer) sizeWins++;
      if (e.size === "trap") {
        const decoy = r.options.some((o) => o !== r.answer && Math.abs(area(o) - area(r.sample)) / area(r.sample) < 0.01);
        const clear = Math.abs(area(r.answer) - area(r.sample)) / area(r.sample) >= 0.25;
        if (decoy && clear) trapHeld++;
      }
    }

    // pictures
    if (e.pics === "same") {
      check(new Set(sets.flatMap((c) => c.pts.map((p) => p.ch))).size === 1, `${tag}: the same picture on every card`);
    }
    if (e.pics === "different") {
      const kindOf = (c) => c.pts[0].ch;
      check(sets.every((c) => new Set(c.pts.map((p) => p.ch)).size === 1), `${tag}: one kind of picture per card`);
      check(r.options.every((o) => kindOf(o) !== kindOf(r.sample)),
        `${tag}: no choice shares the top card's picture, so "pick the other kind" can't work`);
    }
    if (e.pics === "mixed") {
      check(sets.every((c) => c.n < 2 || new Set(c.pts.map((p) => p.ch)).size === c.n), `${tag}: every picture on a card is different`);
    }
    if (!e.pics) check(sets.every((c) => c.pts.every((p) => !p.ch)), `${tag}: dots, not pictures`);

    // the words change, and never repeat back to back
    const template = asked === "numToDots" ? r.head.replace(String(r.target), "{n}") : r.head;
    check(COUNT_WORDS[asked].indexOf(template) !== -1, `${tag}: "${r.head}" is one of the ways of asking`);
    check(template !== lastTemplate, `${tag}: the same words never come twice in a row`);
    lastTemplate = template;
    templates.add(template);
  }

  check(seenTargets.size === e.range[1] - e.range[0] + 1, `${tag}: every number in the range comes up`);
  check(templates.size >= 3, `${tag}: at least three different ways of asking turn up`);

  if (e.size) {
    // chance is 1 in 3, and the generator aims at exactly that; 45% is four
    // standard deviations above it at 300 rounds, so passing this means the
    // shortcut really isn't there. (A first version with plain random sizes
    // let "looks as full" win 51% of the time.)
    check(areaWins / strategyRounds < 0.45,
      `${tag}: "looks as full" finds the answer only ${(100 * areaWins / strategyRounds).toFixed(0)}% of the time`);
    check(sizeWins / strategyRounds < 0.45,
      `${tag}: "dots the same size" finds the answer only ${(100 * sizeWins / strategyRounds).toFixed(0)}% of the time`);
  }
  if (e.size === "trap") {
    check(trapHeld === strategyRounds, `${tag}: every round has a wrong card with exactly the top card's colour (${trapHeld}/${strategyRounds})`);
    check(areaWins === 0, `${tag}: "looks as full" is always wrong here`);
  }
}

/* ---- and the same thing as a page you can play ---- */
const { window, errors } = bootApp();
const doc = window.document;
const $ = (s) => doc.querySelector(s);
const click = (el) => el.dispatchEvent(new window.Event("click", { bubbles: true }));
function pointer(type) {
  const e = new window.Event(type, { bubbles: true, cancelable: true });
  e.pointerId = 1; e.clientX = 0; e.clientY = 0;
  return e;
}
const dragIn = (node) => ["pointerdown", "pointermove", "pointerup"].forEach((t) => node.dispatchEvent(pointer(t)));

setTimeout(() => {
  const card = $("#card-count");
  check(!!card, "How many gets a home card straight from the registry");
  check(/COUNT|HOW MANY/.test(card.textContent), "the card is called COUNT or HOW MANY");

  click(doc.querySelector('.playbtn[data-kind="count"]'));
  check($("#play").classList.contains("on"), "a session starts");
  const sample = $("#stage .count-pair .tile");
  const slot = $("#stage .count-pair .slot");
  check(!!sample && !!slot, "the top card sits beside an empty slot");
  const opts = Array.from(doc.querySelectorAll("#stage .options .opt .tile"));
  check(opts.length === COUNT_OPTIONS, "three cards to choose from");

  const right = opts.find((o) => o._item.n === sample._item.n);
  const wrong = opts.find((o) => o !== right);
  dragIn(wrong);
  check(!slot.classList.contains("done"), "a wrong card doesn't fill the slot");
  check(!!doc.querySelector("#stage .options .opt:not(.gone)"), "and nothing is taken away for it");
  dragIn(right);
  check(slot.classList.contains("done") && !!slot.querySelector(".tile"), "the right card lands beside the top one");
  check(doc.querySelectorAll("#tokens .tok.full").length === 1, "and earns a token");

  /* ...and the round says what KIND of question it was. This is the game with
     the most stages and it used to tag nothing, so the Progress panel could
     report 40% here without saying whether it was the dots, the numerals or
     reading one against the other — the difference between "step him down" and
     "he just needs the numerals". */
  const saved = JSON.parse(window.localStorage.getItem("lr_state_v1") || "{}");
  const tags = ((saved.progress || {}).tagStats || {}).count || {};
  const names = Object.keys(tags);
  check(names.length === 1, `the round was tagged with what it asked (got ${names.join(", ") || "nothing"})`);
  check(names[0] && names[0] !== "null" && /[a-z]/.test(names[0]),
    `and the tag is words a parent reads, not a field name ("${names[0]}")`);

  R.finish(errors);
}, 150);
