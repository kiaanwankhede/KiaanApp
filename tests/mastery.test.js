/* Mastery: the level-up / level-down rule, and the warm-up shortcut through
   ground he has already covered. Runs the real evaluateMastery from src
   against a stub registry, so the arithmetic is tested, not re-implemented. */
const { Runner } = require("./_harness");
const R = new Runner("mastery");
const check = (c, m) => R.check(c, m);

const PRELUDE = `
let S, progress;
function save(){}
const ACTIVITIES = [{ id:"pattern", maxLevel:()=>40 }, { id:"sort", maxLevel:()=>18 }];
function activityById(id){ return ACTIVITIES.find(a=>a.id===id); }
function levelOf(id){ return (S.levels && S.levels[id]) || 1; }
function setLevelOf(id,v){ (S.levels || (S.levels={}))[id] = v; }
function reset(best, itemsPerSession, neverDemote){
  S = { autoAdvance:true, itemsPerSession: itemsPerSession||10, levels:{}, neverDemote: !!neverDemote };
  progress = { perLevel:{}, best: best ? {pattern:best} : {} };
}
`;

const vm = require("vm");
const fs = require("fs");
const path = require("path");
const SRC = path.resolve(__dirname, "..", "src");
const code =
  PRELUDE +
  fs.readFileSync(path.join(SRC, "40-mastery.js"), "utf8") +
  "\n;({ evaluateMastery, reset, setLevelOf, get S(){return S;}, get progress(){return progress;} });";
const ctx = vm.createContext({ console, Object, Math });
const M = vm.runInContext(code, ctx);

const block = (rate, id) => { for (let i = 0; i < M.S.itemsPerSession; i++) M.evaluateMastery(id || "pattern", i < rate); };
const lvl = (id) => (M.S.levels[id || "pattern"] || 1);

/* --- what counts as a BEST, and why it is not only auto-advance ---
   A best is what a fresh launch picks up from (startLevelFor in 00-state.js:
   two levels below it). Recording one only when he advances PAST a level left
   two holes that both end with him back on Level 1 next morning, having
   already proved he can do far more:
     - the top of a ladder can never be advanced past, so mastering it recorded
       nothing at all;
     - a level a parent set the stepper to and he then proved recorded nothing
       until he climbed off it.
   Holding a level is showing it, so holding it records it. Moving the stepper
   by hand still records nothing on its own — he has to pass a block there. */
M.reset(0, 5);
M.setLevelOf("pattern", 2);
for (let i = 0; i < 5; i++) M.evaluateMastery("pattern", true);
check(M.progress.best.pattern === 2, "a good block at a level records that level as his best");
// (level 1 needs no recording of its own — it is already the floor a launch
// starts from, so noteBestLevel leaves it alone)

// the top of the ladder: nothing to advance into, but he has plainly shown it
M.reset(0, 5);
M.setLevelOf("pattern", 40);                      // a parent put him at the top
for (let i = 0; i < 5; i++) M.evaluateMastery("pattern", true);
check(lvl() === 40, "he stays at the top of the ladder — there is nowhere above it");
check(M.progress.best.pattern === 40,
  "and mastering the top level records it, so the next launch starts near it rather than at Level 1");

// a level a parent chose, proved before he has climbed off it
M.reset(0, 5);
M.setLevelOf("pattern", 10);
for (let i = 0; i < 5; i++) M.evaluateMastery("pattern", true);
check(M.progress.best.pattern === 10,
  "a level the stepper was moved to and then actually proved counts as his best");

// ...but the stepper alone still proves nothing
M.reset(0, 5);
M.setLevelOf("pattern", 10);
check(!M.progress.best.pattern, "moving the stepper without playing records nothing");
for (let i = 0; i < 5; i++) M.evaluateMastery("pattern", i < 1);   // a bad block
check(!M.progress.best.pattern, "and a block he did badly at records nothing either");

/* --- how long he has been on this level ---
   n, indep and hits are block counters: they zero at every block boundary,
   which is right for deciding a level and useless for noticing he has been
   sitting on one for a fortnight. `seen` never resets, and it is what lets the
   Progress panel tell "he is on level 12" apart from "he has answered sixty
   rounds at level 12 and is still there". */
M.reset(0, 5);
for (let i = 0; i < 12; i++) M.evaluateMastery("pattern", i % 5 === 0);   // scrappy blocks
check(M.progress.perLevel["pattern:1"].seen === 12,
  `every answer at a level is counted for good (got ${M.progress.perLevel["pattern:1"].seen})`);
check(M.progress.perLevel["pattern:1"].n < 12, "while the block counter itself keeps resetting");

// it survives a level-up: the new level starts its own count from zero
M.reset(0, 5);
for (let i = 0; i < 10; i++) M.evaluateMastery("pattern", true);          // two clean blocks -> level 2
check(lvl() === 2, "two clean blocks move him up");
check(M.progress.perLevel["pattern:1"].seen === 10, "the level he left keeps its total");
check(!M.progress.perLevel["pattern:2"], "and the level he arrived at has no history yet");

// and a demotion doesn't wipe the record of how much he did there
M.reset(0, 5);
M.setLevelOf("pattern", 3);
for (let i = 0; i < 5; i++) M.evaluateMastery("pattern", false);         // a bad block
check(M.progress.perLevel["pattern:3"].seen === 5,
  "a rough block still leaves the count of what he answered there");

// --- new ground needs two consecutive good blocks ---
M.reset();
block(9);
check(lvl() === 1, "a brand-new level does not advance on one good block");
check(M.progress.perLevel["pattern:1"].hits === 1, "the first confirmation is banked, not lost at the block boundary");
block(9);
check(lvl() === 2, "a second consecutive good block advances the level");

// --- continuous play keeps climbing without leaving and coming back ---
M.reset();
for (let b = 0; b < 6; b++) block(9);
check(lvl() === 4, "three pairs of good blocks advance three levels in one uninterrupted run");

// --- a bad block demotes at once ---
M.reset();
M.S.levels.pattern = 5;
block(3);
check(lvl() === 4, "a block under 50% demotes immediately");

// --- a middling block breaks the streak but does not demote ---
M.reset();
M.S.levels.pattern = 5;
block(9);
block(6);
check(lvl() === 5, "a 60% block does not demote");
check(M.progress.perLevel["pattern:5"].hits === 0, "a 60% block resets the confirmation streak");
block(9); block(9);
check(lvl() === 6, "two fresh good blocks after a reset still advance");

// --- block size follows the setting ---
M.reset(null, 20);
block(9);
check(lvl() === 1, "with a 20-answer block, 9 independent (45%) is a fail not a pass");

// --- warm-up: familiar ground passes on one block, the frontier still needs two ---
M.reset(12);
block(9);
check(lvl() === 2, "a level he has reached before advances after ONE good block");
block(9);
check(lvl() === 3, "warm-up keeps moving at one block per level");
M.reset(12);
M.S.levels.pattern = 11;
block(9);
check(lvl() === 12, "the last familiar level still passes on one block");
block(9);
check(lvl() === 12, "at his frontier one block is no longer enough");
block(9);
check(lvl() === 13, "the frontier needs two consecutive blocks, then advances");
check(M.progress.best.pattern === 13, "his best level moves up with him");

// --- neverDemote: the streak still resets, the level just doesn't drop ---
M.reset(null, 10, true);
M.S.levels.pattern = 5;
block(3);
check(lvl() === 5, "with neverDemote on, a block under 50% does not drop the level");
check(M.progress.perLevel["pattern:5"].n === 0, "but the confirmation streak still resets, same as a demoting miss");
block(9); block(9);
check(lvl() === 6, "and climbing back out still needs two full good blocks, exactly as if it had demoted");

// --- each activity has its own ladder height ---
M.reset();
M.S.levels.sort = 18;
for (let b = 0; b < 4; b++) block(10, "sort");
check(lvl("sort") === 18, "an activity never advances past its own maxLevel");

R.finish();
