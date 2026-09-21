/* Word find.
 *
 * The grid generator is where everything that could go quietly wrong lives, so
 * it gets hammered DOM-free: every level, every word of that level's length,
 * checking the word is placed the way reading goes, lands on the board, fills
 * every cell, and — the one that matters most — turns up exactly ONCE. A fill
 * that happens to spell the word a second time would hand him a run that looks
 * right, sits somewhere else, and (before the uniqueness check existed) was a
 * coin flip between "found it" and a miss for a correct answer.
 *
 * Then the page: the letters above the grid and NO photograph beside them (it
 * is the reward for finding them, and showing it up front gave away its own
 * reveal), the cue that teaches the game on the first levels and fades, a real
 * sweep across the letters, and the reward being the word he just found rather
 * than a stranger from the shuffle bag.
 */
const fs = require("fs");
const path = require("path");
const { pureContext, bootApp, Runner, SRC } = require("./_harness");

/* The word pool is whatever a picture can be shown for, so the pure context
   needs the same PHOTO_PACK the build inlines — stand-in URLs, real keys, from
   the real files, by the same "the file name is the word" rule tools/build.js
   uses. Without it CHAKLI (a photo but deliberately no emoji stand-in) would
   look unreachable here while being perfectly findable in the app. */
const PHOTO_KEYS = fs.readdirSync(path.join(SRC, "photos"))
  .filter((f) => f.endsWith(".webp"))
  .map((f) => f.replace(/\.webp$/, "").replace(/-/g, " ").toUpperCase());
const PHOTO_PRELUDE = "const PHOTO_PACK = " +
  JSON.stringify(PHOTO_KEYS.reduce((o, k) => ((o[k] = "data:,"), o), {})) + ";";

const T = pureContext(["30-rewards.js", "activities/wordfind.js"],
  ["WF_STAGES", "WF_LEVELS", "wfPlan", "wfWords", "wfBuild", "wfCount", "wfRuns", "wfAt", "EMOJI_PACK", "WORDFIND",
   "WF_CUE_LEVELS"],
  PHOTO_PRELUDE);

const R = new Runner("wordfind");
const check = (c, m) => R.check(c, m);

/* ---- the ladder ---- */
check(T.WF_LEVELS.length === T.WORDFIND.maxLevel(), "maxLevel matches the ladder it was built from");
check(T.WF_LEVELS.length > 20, `a ladder long enough to work through the vocabulary (${T.WF_LEVELS.length} levels)`);

const lens = T.WF_STAGES.map((s) => s.len);
check(lens.every((n, i) => i === 0 || n > lens[i - 1]), "stages get longer, never shorter — word length is the spine of the ladder");
T.WF_STAGES.forEach((s) => {
  check(s.cols >= s.len, `${s.len}-letter stage: the grid is wide enough for the word to fit across it`);
  check(s.steps[0] === "dir-h", `${s.len}-letter stage: starts on across-only, the easiest direction`);
  check(s.cols * s.rows <= 72, `${s.len}-letter stage: ${s.cols}x${s.rows} is a board he can scan, not a wall of letters`);
  // the hard fillers are earned, not handed out at the bottom of the ladder
  if (s.len <= 4) check(s.steps.indexOf("near") < 0, `${s.len}-letter stage: no near-miss runs this early`);
});

/* The teaching cue is the first few levels, not a permanent crutch, and it is
   on or off by absolute level so a longer word never re-teaches the game. */
check(T.WF_CUE_LEVELS >= 1 && T.WF_CUE_LEVELS <= 6,
  `the cue is gone within the first few levels rather than propping him up all the way (last cued level ${T.WF_CUE_LEVELS})`);

/* ---- coverage: the whole saved vocabulary is in play ---- */
const eligible = T.EMOJI_PACK.map((p) => p[0]).filter((w) => !/[^A-Z]/.test(w) && w.length >= 3);
const reachable = new Set();
T.WF_STAGES.forEach((s) => T.wfWords(s.len).forEach((w) => reachable.add(w)));
check(eligible.length >= 148, `most of the pack is single-word and long enough to hide (${eligible.length} of ${T.EMOJI_PACK.length})`);
const missed = eligible.filter((w) => !reachable.has(w));
check(missed.length === 0, "every single-word entry with a picture is reachable as a target somewhere on the ladder" +
  (missed.length ? " — missing " + missed.join(" ") : ""));
// and the three that are out are out on purpose, not by accident
const out = T.EMOJI_PACK.map((p) => p[0]).filter((w) => !reachable.has(w));
check(out.every((w) => w.indexOf(" ") >= 0 || w.length < 3),
  "the only words left out are the ones with a space in them or shorter than three letters (got " + out.join(", ") + ")");

/* ---- the grid, every level, every word ---- */
let built = 0;
T.WF_LEVELS.forEach((plan, li) => {
  const level = li + 1;
  const words = T.wfWords(plan.stage.len);
  check(words.length > 0, `level ${level}: has words of its own length to draw on`);
  words.forEach((word) => {
    const b = T.wfBuild(word, plan);
    if (!b) { check(false, `level ${level} / ${word}: a grid could be built at all`); return; }
    built++;
    const g = b.grid;
    check(g.cells.length === plan.stage.cols * plan.stage.rows, `level ${level} / ${word}: the grid is the stage's size`);
    check(g.cells.every((ch) => /^[A-Z]$/.test(ch)), `level ${level} / ${word}: every cell holds a letter — no blanks left over`);

    // the answer: on the board, the right letters, and going the way reading goes
    check(b.answer.length === word.length, `level ${level} / ${word}: the answer is as long as the word`);
    check(b.answer.every((p) => p.r >= 0 && p.r < g.rows && p.c >= 0 && p.c < g.cols),
      `level ${level} / ${word}: the whole answer is on the board`);
    check(b.answer.map((p) => T.wfAt(g, p.r, p.c)).join("") === word,
      `level ${level} / ${word}: the cells it points at actually spell the word`);
    const across = b.answer.every((p) => p.r === b.answer[0].r);
    const down = b.answer.every((p) => p.c === b.answer[0].c);
    check(across || down, `level ${level} / ${word}: straight, never diagonal`);
    if (across) check(b.answer.every((p, i) => i === 0 || p.c === b.answer[i - 1].c + 1),
      `level ${level} / ${word}: across runs left to right, never backwards`);
    if (down) check(b.answer.every((p, i) => i === 0 || p.r === b.answer[i - 1].r + 1),
      `level ${level} / ${word}: down runs top to bottom, never upwards`);
    if (plan.step === "dir-h") check(across, `level ${level} / ${word}: an across-only level hides it across`);
    if (down) check(g.rows >= word.length, `level ${level} / ${word}: only hidden downwards where it actually fits`);

    // the one that matters: exactly one findable copy
    check(T.wfCount(g, word) === 1, `level ${level} / ${word}: the word is in there exactly once, so the run he finds is the run that counts`);

    // the guards this level claims to add
    const firsts = g.cells.filter((ch) => ch === word[0]).length;
    if (plan.step === "decoy" || plan.step === "filler" || plan.step === "near") {
      check(firsts > 1, `level ${level} / ${word}: its first letter appears more than once, so spotting that letter isn't the answer`);
    }
    if (plan.step === "filler" || plan.step === "near") {
      const own = new Set(word.split(""));
      const share = g.cells.filter((ch) => own.has(ch)).length / g.cells.length;
      check(share > 0.5, `level ${level} / ${word}: the board is mostly the word's own letters, so its letters don't stand out (${(share * 100) | 0}%)`);
    }
    if (plan.step === "near") {
      // a run that starts like the word and then doesn't — somewhere other than the answer
      const pre = word.slice(0, Math.min(word.length - 1, Math.max(2, word.length - 2)));
      const lures = T.wfRuns(g, pre.length + 1, ["h", "v"]).filter((run) => {
        const s = run.map((p) => T.wfAt(g, p.r, p.c)).join("");
        return s.slice(0, pre.length) === pre && s !== word.slice(0, pre.length + 1);
      });
      check(lures.length > 0, `level ${level} / ${word}: a run starts like the word and then changes, so the end has to be read too`);
    }
  });
});
check(built > 400, `built a grid for every word at every level (${built} grids)`);

/* ---- the page ---- */
const { window, errors } = bootApp();
const doc = window.document;
const $ = (s) => doc.querySelector(s);
const click = (el) => el.dispatchEvent(new window.Event("click", { bubbles: true }));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  await sleep(150);
  check(!!$("#card-wordfind") && /WORD FIND/.test($("#card-wordfind").textContent), "Word find gets its own home card");
  check(!$("#card-wordfind").closest(".section-heading"), "it sits in the plain row, not under Toondemy Games");
  check(!!$("#lv-wordfind"), "and it has a level stepper — this is a graded ladder, not a one-shot game");

  click(doc.querySelector('.playbtn[data-kind="wordfind"]'));
  const grid = $("#stage .wfgrid");
  check(!!grid, "a grid of letters is drawn");
  check(!$("#stage img") && !$("#stage .wfshot"),
    "and NO photograph above it — the picture is what finding the word earns, not a clue that gives away its own reveal");
  const spell = Array.from(doc.querySelectorAll("#stage .wfspell span"));
  let word = spell.map((s) => s.textContent).join("");
  check(spell.length >= 3 && /^[A-Z]+$/.test(word), `the letters to match are on screen (${word})`);
  check(doc.querySelectorAll("#stage .wfcell.tip").length === word.length,
    "level 1 lightly highlights the whole word where it sits — with no picture to go on, the first levels have to teach what the game is");

  /* …and it really does fade. Back home, step the level, play again. */
  const home = () => {
    click($("#back"));
    const done = $("#doneHome");
    if (done) click(done);
  };
  const tips = () => doc.querySelectorAll("#stage .wfcell.tip").length;
  let onLevel = 1;
  const playLevel = (want) => {
    home();
    const plus = doc.querySelector('.lvbtn[data-kind="wordfind"][data-dir="1"]');
    for (; onLevel < want; onLevel++) click(plus);
    click(doc.querySelector('.playbtn[data-kind="wordfind"]'));
  };
  playLevel(T.WF_CUE_LEVELS);
  const lastCued = Array.from(doc.querySelectorAll("#stage .wfspell span")).length;
  check(tips() === lastCued,
    `level ${T.WF_CUE_LEVELS}: still the whole word, not just its first letter — the last of the teaching levels`);
  playLevel(T.WF_CUE_LEVELS + 1);
  check(tips() === 0, `level ${T.WF_CUE_LEVELS + 1}: no highlight at all — by now he knows what the game is`);

  // and play out this uncued level for real
  const grid2 = $("#stage .wfgrid");
  const cols = Number(grid2.style.getPropertyValue("--wf-cols"));
  const cells = Array.from(grid2.children);
  // a new level is a new word — everything below is about THIS round
  word = Array.from(doc.querySelectorAll("#stage .wfspell span")).map((x) => x.textContent).join("");
  check(/^[A-Z]{3,}$/.test(word), `and its letters are on screen to match (${word})`);
  check(cells.length % cols === 0 && cells.length / cols >= 4, "the grid is a whole number of rows");
  check(cells.every((c) => /^[A-Z]$/.test(c.textContent)), "every cell shows one letter");
  check(doc.querySelectorAll("#tokens .tok").length === 1,
    "one token, not five — the reward is due the moment he finds a word, since the picture IS what this game teaches");

  // a sweep needs geometry; jsdom has none, so give the grid a rect of its own
  const rows = cells.length / cols;
  grid2.getBoundingClientRect = () => ({ left: 0, top: 0, width: cols * 10, height: rows * 10, right: cols * 10, bottom: rows * 10, x: 0, y: 0 });
  const pt = (type, r, c) => {
    const e = new window.Event(type, { bubbles: true, cancelable: true });
    e.pointerId = 1; e.clientX = c * 10 + 5; e.clientY = r * 10 + 5;
    grid2.dispatchEvent(e);
  };
  const at = (r, c) => cells[r * cols + c].textContent;

  // find the word on the board the way he does — by looking
  let answer = null;
  for (let r = 0; r < rows && !answer; r++) for (let c = 0; c + word.length <= cols && !answer; c++) {
    if (Array.from({ length: word.length }, (_, i) => at(r, c + i)).join("") === word) {
      answer = Array.from({ length: word.length }, (_, i) => ({ r, c: c + i }));
    }
  }
  for (let c = 0; c < cols && !answer; c++) for (let r = 0; r + word.length <= rows && !answer; r++) {
    if (Array.from({ length: word.length }, (_, i) => at(r + i, c)).join("") === word) {
      answer = Array.from({ length: word.length }, (_, i) => ({ r: r + i, c }));
    }
  }
  check(!!answer, "the word really is on the board where he can find it");

  // a wrong sweep first: it must not be treated as a find, and must not punish him
  pt("pointerdown", 0, 0);
  pt("pointermove", 0, 1);
  pt("pointerup", 0, 1);
  check(doc.querySelectorAll("#stage .wfcell.won").length === 0, "a two-letter sweep is not a find");
  check($("#play").classList.contains("on"), "and nothing ends — he's still on the same round");

  // enough wrong tries and the help arrives, the same two steps as everywhere else
  for (let i = 0; i < 6; i++) { pt("pointerdown", 0, 0); pt("pointermove", 0, 1); pt("pointerup", 0, 1); }
  check(doc.querySelectorAll("#stage .wfcell.dim").length > 0, "after a few tries the search narrows to the line the word is on");
  check(doc.querySelectorAll("#stage .wfcell.pick").length === word.length, "and then the word itself is outlined");

  // now sweep it BACKWARDS along the right cells: he found it, so it counts
  const a = answer[0], z = answer[answer.length - 1];
  pt("pointerdown", z.r, z.c);
  pt("pointermove", a.r, a.c);
  pt("pointerup", a.r, a.c);
  check(doc.querySelectorAll("#stage .wfcell.won").length === word.length,
    "sweeping the right cells the other way still counts — refusing a correct find would be a failure state");
  check(doc.querySelectorAll("#stage .wfspell span.won").length === word.length,
    "and the spelling above lights up too, so the found word is shown on screen straight away");

  // the reward is the word he just found, not a stranger from the bag
  await sleep(900);                    // showReward is 500ms behind the solve
  check($("#reward").classList.contains("on"), "the reward comes immediately, not after a block of five");
  check(Array.from(doc.querySelectorAll("#rwWord span")).map((s) => s.textContent).join("") === word,
    "and it shows the word he just found");

  R.finish(errors);
})();
