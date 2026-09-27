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
const SETTINGS_REV = 3;
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
  /* Six digits. Three is short enough for a 4-year-old to land on by pressing
     things, and the one screen behind this gate is the one that can undo his
     levels and turn parent mode on. */
  gate: "280407",
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
    // rev 2 -> 3: the passcode went from three digits to six. Only move a save
    // that still holds the old default — a code a parent chose for themselves
    // is theirs, and silently changing it would lock them out.
    if(!(o.rev >= 3) && o.gate === "135") S.gate = DEFAULTS.gate;
  }
  S.rev = SETTINGS_REV;
  // Which level he was on mid-climb doesn't carry over; where he STARTS is
  // worked out from his best, in startLevelFor() below.
  S.levels = {};
}
function save(force){
  try {
    /* While the sandbox is open the parent's own settings still go through —
       they are theirs — but everything about HIM is written back exactly as it
       was when the sandbox opened. `force` is for the one deliberate exception,
       see resetProgress() below. */
    if(sandbox && !force){
      const snap = JSON.parse(sandboxSnap);
      localStorage.setItem(KEY, JSON.stringify({
        settings: Object.assign({}, S, { levels: snap.levels }),
        progress: snap.progress
      }));
      return;
    }
    localStorage.setItem(KEY, JSON.stringify({settings:S, progress:progress}));
  } catch(e){}
}

/* ---- PARENT MODE IS A SANDBOX -----------------------------------------------
   A parent checking whether a game still works plays real rounds, and a real
   round writes four things about him: the block counters mastery runs on, the
   level the game is sitting on, the tag breakdowns, and the sitting log.

   The quiet one is `best`. Pass a block at level 20 while testing and every
   launch afterwards starts him two below THAT (see startLevelFor above), so
   the next morning he opens a game far past anything he has actually done,
   gets nothing right, and nothing anywhere looks broken. Stepping a game up to
   test it has a smaller version of the same problem: it leaves the game there
   when the tablet is handed back.

   So this guards the DOOR rather than each writer. save() is the only thing
   that reaches storage, so gating it covers every writer there is — including
   the ones a future activity adds. Checks inside evaluateMastery(),
   logTagStat() and the session log instead would work today and leak the first
   time progress is written from somewhere nobody thought to guard, which is
   exactly how the deferred-callback bugs got in before sessionGuard() put them
   behind one question.

   Both halves are load-bearing. The save() gate keeps storage clean if the
   tablet is simply closed mid-test; the snapshot puts back what the testing
   changed in MEMORY, so a level stepped to 20 snaps back when parent mode
   closes rather than being handed over along with the tablet.

   And it deliberately never persists — it is a `let` here and not a key of S.
   If parent mode could survive a relaunch, the tablet might open in it one
   morning and record none of his session: the very failure this exists to
   prevent, inverted. */
let sandbox = false, sandboxSnap = null;
function sandboxOn(){ return sandbox; }
function startSandbox(){
  if(sandbox) return;
  sandboxSnap = JSON.stringify({ progress: progress, levels: S.levels });
  sandbox = true;
}
function endSandbox(){
  if(!sandbox) return;
  sandbox = false;
  const snap = JSON.parse(sandboxSnap);
  progress = snap.progress;
  S.levels = snap.levels;
  sandboxSnap = null;
  save();
}
/* Clearing his record is the one progress write that really is the parent's,
   so it goes through the sandbox — and becomes the baseline the sandbox
   restores, or closing parent mode afterwards would hand back the progress
   they had just deliberately cleared. */
function resetProgress(){
  progress = { sessions:[], perLevel:{}, tagStats:{}, best:{} };
  S.levels = {};
  if(sandbox) sandboxSnap = JSON.stringify({ progress: progress, levels: S.levels });
  save(true);
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

/* A ladder can get SHORTER between releases — Sky went from 18 levels to a
   single fixed game — and progress.best remembers the old frontier. Every
   activity clamps its own level internally so nothing crashes, but unclamped
   here it still showed a parent "Level 97/38" on the card and in the corner,
   and left mastery unable to ever advance him again (curLevel < maxLevel is
   false forever) until someone noticed and tapped the stepper.

   Clamped on the way out rather than healed in storage: if the ladder grows
   back, the best he actually reached is still there to pick up from. Wrapped
   because the registry is defined below this file in build order — a level
   read before it exists simply isn't clamped, which is the old behaviour. */
function clampToLadder(id, level){
  try { return Math.min(level, activityById(id).maxLevel()); }
  catch(e){ return level; }
}
/* per-activity accessors — an unknown id reads as his start level, switched on */
function levelOf(id){ return clampToLadder(id, (S.levels && S.levels[id]) || startLevelFor(id)); }
function setLevelOf(id, v){ (S.levels || (S.levels = {}))[id] = v; }
function isEnabled(id){ return (S.enabled || {})[id] !== false; }
function setEnabled(id, on){ (S.enabled || (S.enabled = {}))[id] = !!on; }

load();
