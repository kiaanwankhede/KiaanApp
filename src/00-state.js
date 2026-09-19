/* ============================ STATE ============================
   Settings and progress, persisted to localStorage.

   Per-activity values (which level he's on, whether an activity is switched
   on) are keyed by activity id rather than being named fields, so adding an
   activity needs no change here at all. Both accessors default sensibly for
   an id that has never been seen before, which is what makes a brand-new
   activity work on first run.
   ================================================================ */
const KEY = "lr_state_v1";
/* Bumped when a DEFAULT changes in a way an existing save should pick up.
   Without this, changing a default here would do nothing on the tablet: save()
   writes every key of S, so an old save already carries the old value and
   Object.assign below would keep winning with it. */
const SETTINGS_REV = 2;
const DEFAULTS = {
  rev: SETTINGS_REV,
  rewardEvery: 3,
  schedule: "fixed",          // fixed | variable
  itemsPerSession: 5,         // answers per confirmation block
  dimAfter: 2,
  showAfter: 3,
  autoAdvance: true,
  neverDemote: true,          // a rough block resets the count toward the next level up rather than dropping him
  useEmojiPack: true,
  assistedMode: true,
  gate: "135",
  levels: {},                 // { <activityId>: level }
  enabled: {}                 // { <activityId>: false }  — absent means on
};
/* How far below his best a fresh launch picks up. Re-climbing from Level 1
   every session cost hundreds of answers; starting cold at his frontier skips
   the warm-up he clearly benefits from. Two levels back is the compromise, and
   the mastery rule already clears ground he has passed before in one good
   block each rather than two. */
const WARM_UP_DROP = 2;
let S, progress;
function load(){
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(KEY) || "null"); } catch(e){}
  S = Object.assign({}, DEFAULTS, (raw && raw.settings) || {});
  S.levels = Object.assign({}, S.levels);
  S.enabled = Object.assign({}, S.enabled);
  progress = (raw && raw.progress) || { sessions: [], perLevel: {} };
  // Carry across anything saved by the older named-field version.
  if(raw && raw.settings){
    const o = raw.settings;
    if(o.patternsOn === false) S.enabled.pattern = false;
    if(o.sortingOn  === false) S.enabled.sort    = false;
    // rev 1 -> 2: a confirmation block went from 10 answers to 5. Only move a
    // save that still holds the old default, so a block size a parent chose
    // themselves is never overwritten.
    if(!(o.rev >= 2) && o.itemsPerSession === 10) S.itemsPerSession = 5;
  }
  S.rev = SETTINGS_REV;
  // Which level he was on mid-climb doesn't carry over; where he STARTS is
  // worked out from his best, in startLevelFor() below.
  S.levels = {};
}
function save(){
  try { localStorage.setItem(KEY, JSON.stringify({settings:S, progress:progress})); } catch(e){}
}

/* Where a fresh launch picks up for one activity: two levels below the best he
   has actually reached, floored at Level 1. Reads progress.best directly (the
   same store bestLevel() in 40-mastery.js keeps) so this file stays
   self-contained. Only auto-advance records a best — moving the stepper by
   hand doesn't, since that's a parent's choice rather than something he has
   shown he can do. */
function startLevelFor(id){
  const best = (progress.best && progress.best[id]) || 1;
  return Math.max(1, best - WARM_UP_DROP);
}

/* per-activity accessors — an unknown id reads as his start level, switched on */
function levelOf(id){ return (S.levels && S.levels[id]) || startLevelFor(id); }
function setLevelOf(id, v){ (S.levels || (S.levels = {}))[id] = v; }
function isEnabled(id){ return (S.enabled || {})[id] !== false; }
function setEnabled(id, on){ (S.enabled || (S.enabled = {}))[id] = !!on; }

load();
