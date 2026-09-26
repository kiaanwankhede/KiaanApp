/* Finish the word.
 *
 * The generator is where this one can go quietly wrong, so it is run DOM-free
 * over every word at every level, checking the two guards that make a round
 * fair:
 *
 *   - every wrong letter is the SAME KIND as the right one. Offer a vowel
 *     among consonants and "pick the only vowel on screen" answers every
 *     medial-vowel round without knowing the word at all.
 *   - no wrong letter turns the word into another word this app teaches. A gap
 *     with two defensible answers, only one of which is accepted, is a round he
 *     loses for being right.
 *
 * Then the page: the photograph really is up (it is this game's prompt, not its
 * reward — the opposite of Word find, and for a stated reason), the gap is in
 * the right place for the level, dragging the right letter in finishes the
 * round, and a wrong one is met with help rather than a failure.
 */
const fs = require("fs");
const path = require("path");
const { pureContext, bootApp, Runner, SRC } = require("./_harness");

/* Same PHOTO_PACK the build inlines, so the pure context sees the real pool —
   without it CHAKLI (a photo but deliberately no emoji stand-in) drops out. */
const PHOTO_KEYS = fs.readdirSync(path.join(SRC, "photos"))
  .filter((f) => f.endsWith(".webp"))
  .map((f) => f.replace(/\.webp$/, "").replace(/-/g, " ").toUpperCase());
const PHOTO_PRELUDE = "const PHOTO_PACK = " +
  JSON.stringify(PHOTO_KEYS.reduce((o, k) => ((o[k] = "data:,"), o), {})) + ";";

const T = pureContext(["30-rewards.js", "activities/wordfill.js"],
  ["WFILL_STAGES", "WFILL_STEPS", "WFILL_LEVELS", "wfillPlan", "wfillBuild", "wfillGaps",
   "WFILL_VOWELS", "WORDFILL", "wordsOfLength", "EMOJI_PACK"],
  PHOTO_PRELUDE);

const R = new Runner("wordfill");
const check = (c, m) => R.check(c, m);
const VOWEL = new Set(T.WFILL_VOWELS);

/* ---- the ladder ---- */
check(T.WFILL_LEVELS.length === T.WORDFILL.maxLevel(), "maxLevel matches the ladder it was built from");
check(T.WFILL_STAGES.every((n, i) => i === 0 || n > T.WFILL_STAGES[i - 1]),
  "stages get longer, never shorter");
check(T.WFILL_STEPS[0].at === "start" && T.WFILL_STEPS[1].at === "end",
  "the gap starts on the first letter, then the last — the order children pick sounds up in");
check(T.WFILL_STEPS[T.WFILL_STEPS.length - 1].at === "mid",
  "and ends on the middle letter, which is the one that stays hard");
const optCounts = T.WFILL_STEPS.map((s) => s.opts);
check(optCounts.every((n, i) => i === 0 || n >= optCounts[i - 1]),
  "the number of choices never goes down as the ladder goes up");

/* ---- where the gap may sit ---- */
check(T.wfillGaps("CAT", "start").join() === "0", "start puts the gap on the first letter");
check(T.wfillGaps("CAT", "end").join() === "2", "end puts it on the last");
check(T.wfillGaps("CAT", "mid").join() === "1", "a three-letter word has exactly one middle letter");
check(T.wfillGaps("TIGER", "mid").join() === "1,2,3", "a longer word's middle is everything but the ends");

/* ---- every level, every word ---- */
const known = new Set(T.EMOJI_PACK.map((p) => p[0]));
let built = 0, gaps = { start: 0, end: 0, mid: 0 };
T.WFILL_LEVELS.forEach((plan, li) => {
  const level = li + 1;
  const words = T.wordsOfLength(plan.len);
  check(words.length > 0, `level ${level}: has ${plan.len}-letter words to draw on`);
  words.forEach((word) => {
    const r = T.wfillBuild(word, plan);
    if (!r) { check(false, `level ${level} / ${word}: a fair round could be built`); return; }
    built++;
    gaps[plan.step.at]++;

    check(r.pos >= 0 && r.pos < word.length, `level ${level} / ${word}: the gap is on a letter of the word`);
    check(T.wfillGaps(word, plan.step.at).indexOf(r.pos) >= 0,
      `level ${level} / ${word}: the gap is where this level says it should be`);
    check(r.answer === word[r.pos], `level ${level} / ${word}: the right letter is the one that was taken out`);
    check(r.options.length === plan.step.opts, `level ${level} / ${word}: ${plan.step.opts} letters to choose from`);
    check(r.options.filter((c) => c === r.answer).length === 1,
      `level ${level} / ${word}: the right letter is in there exactly once`);
    check(new Set(r.options).size === r.options.length,
      `level ${level} / ${word}: no letter is offered twice`);

    // guard 1: same kind, so "pick the only vowel" never answers it
    const kinds = new Set(r.options.map((c) => VOWEL.has(c)));
    check(kinds.size === 1,
      `level ${level} / ${word}: every choice is the same kind as the answer (${r.options.join("")})`);

    // guard 2: no wrong letter spells another word he has a picture for
    r.options.forEach((ch) => {
      if (ch === r.answer) return;
      const other = word.slice(0, r.pos) + ch + word.slice(r.pos + 1);
      check(!known.has(other),
        `level ${level} / ${word}: putting ${ch} in the gap doesn't spell ${other}, which is also a word here`);
    });
  });
});
check(built > 500, `built a round for every word at every level (${built})`);
check(gaps.start > 0 && gaps.end > 0 && gaps.mid > 0,
  `all three gap positions really get used (start ${gaps.start}, end ${gaps.end}, mid ${gaps.mid})`);

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
/* jsdom does no layout: give the slot a spot so a drop can aim at it. */
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
  check(!!$("#card-wordfill") && /FINISH THE WORD/.test($("#card-wordfill").textContent),
    "Finish the word gets its own home card");
  check(!!$("#lv-wordfill"), "and a level stepper — it is a graded ladder");

  click(doc.querySelector('.playbtn[data-kind="wordfill"]'));
  check(!!$("#stage .wfillshot"),
    "the photograph is on screen — it is this game's prompt, since C_T alone could be any of several words");
  const tiles = Array.from(doc.querySelectorAll("#stage .wfillword > *"));
  const slot = $("#stage .slot.dropzone");
  check(!!slot, "one letter of the word is a gap");
  check(tiles.indexOf(slot) === 0, "at level 1 the gap is on the FIRST letter");
  check(tiles.length === 3, "and the word is three letters long at the bottom of the ladder");
  const letters = Array.from(doc.querySelectorAll("#stage .options .opt .tile"));
  check(letters.length === 2, "two letters to choose from");
  check(new Set(letters.map((t) => t._item.text)).size === 2, "and they're different letters");

  /* Which letter is right can be read straight off the page, and guard 2 is
     what makes that exact: exactly one of the choices completes a word this app
     teaches, because a second one that did would be an unfair round. */
  const shown = tiles.map((t) => (t === slot ? null : t._item.text));
  const candidate = (ch) => shown.map((c) => (c === null ? ch : c)).join("");
  const right = letters.find((t) => known.has(candidate(t._item.text)));
  check(!!right, `exactly one choice completes a real word (${letters.map((t) => candidate(t._item.text)).join(" / ")})`);
  const wrong = letters.find((t) => t !== right);

  // a wrong one first: it must help, not punish
  dropOn(wrong, slot);
  check(slot.dataset.full !== "1", "a wrong letter doesn't fill the gap");
  check($("#play").classList.contains("on"), "and nothing ends — he's still on the same round");
  dropOn(wrong, slot);
  check(doc.querySelectorAll("#stage .options .opt.dim").length >= 1,
    "after a couple of tries the wrong letters dim, the same help every other game gives");

  dropOn(right, slot);
  check(slot.dataset.full === "1", "the right letter fills the gap");
  check(doc.querySelectorAll("#tokens .tok.full").length === 1, "and the round counts");

  R.finish(errors);
})();
