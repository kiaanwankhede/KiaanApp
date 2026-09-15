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
  "\n;({ evaluateMastery, reset, get S(){return S;}, get progress(){return progress;} });";
const ctx = vm.createContext({ console, Object, Math });
const M = vm.runInContext(code, ctx);

const block = (rate, id) => { for (let i = 0; i < M.S.itemsPerSession; i++) M.evaluateMastery(id || "pattern", i < rate); };
const lvl = (id) => (M.S.levels[id || "pattern"] || 1);

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
