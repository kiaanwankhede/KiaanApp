/* Odd one out.
 *
 * One thing decides whether a round here is fair or broken, and it is the
 * opposite of this app's usual guard: everything that ISN'T the rule must be
 * unable to single anything out. Randomise colour while the rule is shape and
 * the odd shape may also be the only red one — two defensible answers, one
 * accepted, and he loses a round for being right.
 *
 * So the generator is run DOM-free over thousands of rounds at every level,
 * checking both halves:
 *   - exactly ONE item differs on the rule, and every other shares it;
 *   - on every other attribute, no value appears exactly once — held identical,
 *     or spread two-and-two, never three-and-one.
 *
 * Plus the one a generator gets wrong quietly: the odd one must not favour a
 * position. "It's usually the last" would answer the game without looking.
 */
const { pureContext, bootApp, Runner } = require("./_harness");
const T = pureContext(["20-stimuli.js", "activities/odd.js"],
  ["ODD_LEVELS", "ODD_COUNTS", "ODD_RULE_LOAD", "oddPlan", "oddBuild", "oddSpread",
   "ODD", "COLORS", "SHAPES", "THEMES", "MIXED_THEMES"]);

const R = new Runner("odd");
const check = (c, m) => R.check(c, m);

/* ---- the ladder ---- */
check(T.ODD_LEVELS.length === T.ODD.maxLevel(), "maxLevel matches the ladder it was built from");
check(T.ODD_LEVELS.length >= 18, `a ladder with room to grow into (${T.ODD_LEVELS.length} levels)`);
check(T.ODD_LEVELS.every((p, i) => i === 0 || p.load >= T.ODD_LEVELS[i - 1].load),
  "sorted by load, so an easy rule on a crowded board is never walled off behind a hard one");
check(T.ODD_LEVELS[0].rule === "colour" && T.ODD_LEVELS[0].items === 4 && !T.ODD_LEVELS[0].varied,
  "level 1 is the plainest round there is: colour, four things, nothing else varying");
check(T.ODD_LEVELS.every((p) => p.rule !== "category" || !p.varied),
  "a category round never claims to vary attributes it hasn't got");
// every rule and every board size really is reachable
["colour", "shape", "size", "category"].forEach((rule) =>
  check(T.ODD_LEVELS.some((p) => p.rule === rule), `${rule} rounds are somewhere on the ladder`));
T.ODD_COUNTS.forEach((n) =>
  check(T.ODD_LEVELS.some((p) => p.items === n), `${n}-item boards are somewhere on the ladder`));

/* ---- the spread helper, which is what makes a varied round fair ---- */
[4, 5, 6].forEach((n) => {
  for (let i = 0; i < 300; i++) {
    const out = T.oddSpread(["a", "b", "c", "d", "e"], n);
    const counts = {};
    out.forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
    check(out.length === n, `oddSpread gives back ${n} values`);
    check(Object.values(counts).every((c) => c >= 2),
      `oddSpread never leaves a value on its own (${n}: ${out.join("")})`);
  }
});

/* ---- every level, many rounds ---- */
const ATTRS = ["color", "shape", "size"];
const KEY = { colour: "color", shape: "shape", size: "size" };
const seenAt = {};
T.ODD_LEVELS.forEach((plan, li) => {
  const level = li + 1;
  seenAt[level] = new Array(plan.items).fill(0);
  for (let i = 0; i < 200; i++) {
    const r = T.oddBuild(plan);
    check(r.items.length === plan.items, `level ${level}: ${plan.items} things on the board`);
    check(r.oddAt >= 0 && r.oddAt < plan.items, `level ${level}: the odd one is one of them`);
    seenAt[level][r.oddAt]++;

    if (plan.rule === "category") {
      const odd = r.items[r.oddAt];
      const rest = r.items.filter((_, j) => j !== r.oddAt);
      check(rest.every((it) => T.THEMES[r.theme].indexOf(it.ch) >= 0),
        `level ${level}: every other thing really is a ${r.theme}`);
      check(T.THEMES[r.oddTheme].indexOf(odd.ch) >= 0 && r.oddTheme !== r.theme,
        `level ${level}: and the odd one is from a different kind`);
      check(new Set(r.items.map((it) => it.ch)).size === r.items.length,
        `level ${level}: no picture is repeated, so "the only one that's not a twin" doesn't answer it`);
      continue;
    }

    const ruleKey = KEY[plan.rule];
    // GUARD 1: exactly one differs on the rule
    const ruleVals = r.items.map((it) => it[ruleKey]);
    const oddVal = ruleVals[r.oddAt];
    check(ruleVals.filter((v) => v === oddVal).length === 1,
      `level ${level}: exactly one item has the odd ${plan.rule}`);
    check(new Set(ruleVals.filter((_, j) => j !== r.oddAt)).size === 1,
      `level ${level}: and every other item shares the same ${plan.rule}`);

    // GUARD 2: nothing else can single anything out
    ATTRS.forEach((key) => {
      if (key === ruleKey) return;
      const counts = {};
      r.items.forEach((it) => { counts[it[key]] = (counts[it[key]] || 0) + 1; });
      const alone = Object.keys(counts).filter((v) => counts[v] === 1);
      check(alone.length === 0,
        `level ${level}: ${key} can't single anything out either (${r.items.map((it) => it[key]).join(",")})`);
      if (!plan.varied) {
        check(Object.keys(counts).length === 1,
          `level ${level}: with nothing varying, ${key} is the same on every item`);
      }
    });
  }
});

/* The one a generator gets wrong quietly. If the odd one drifted towards a
   position, "it's usually the last" would answer the game without looking. */
Object.keys(seenAt).forEach((level) => {
  const at = seenAt[level];
  const expected = 200 / at.length;
  check(at.every((n) => n > expected * 0.4),
    `level ${level}: the odd one turns up in every position, not a favourite (${at.join("/")})`);
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
  check(!!$("#card-odd") && /ODD ONE OUT/.test($("#card-odd").textContent), "Odd one out gets its own home card");
  check(!!$("#lv-odd"), "and a level stepper");

  click(doc.querySelector('.playbtn[data-kind="odd"]'));
  check(/different/i.test($("#stage .prompt-line").textContent), "it asks which one is different");
  const slot = $("#stage .slot.dropzone");
  check(!!slot, "there is one space to put it in");
  const tiles = Array.from(doc.querySelectorAll("#stage .options .opt .tile"));
  check(tiles.length === 4, "four things to choose between at level 1");

  /* Level 1 holds everything but colour still, so the odd one is simply the
     tile whose colour only appears once — the same thing he does by eye. */
  const colourOf = (t) => t._item.color;
  const tally = {};
  tiles.forEach((t) => { tally[colourOf(t)] = (tally[colourOf(t)] || 0) + 1; });
  const right = tiles.find((t) => tally[colourOf(t)] === 1);
  check(!!right, "exactly one of them is a different colour");
  check(new Set(tiles.map((t) => t._item.shape)).size === 1, "and they are all the same shape, so only colour singles one out");

  const wrong = tiles.find((t) => t !== right);
  dropOn(wrong, slot);
  check(slot.dataset.full !== "1", "dropping one that belongs doesn't fill the space");
  check($("#play").classList.contains("on"), "and nothing ends — he is still on the same round");
  dropOn(wrong, slot);
  check(doc.querySelectorAll("#stage .options .opt.dim").length >= 1,
    "after a couple of tries the ones that belong dim, the same help every other game gives");

  dropOn(right, slot);
  check(slot.dataset.full === "1", "the odd one goes in");
  check(doc.querySelectorAll("#tokens .tok.full").length === 1, "and the round counts");

  R.finish(errors);
})();
