/* ============================ STATE ============================
   Settings and progress, persisted to localStorage.

   Per-activity values (which level he's on, whether an activity is switched
   on) are keyed by activity id rather than being named fields, so adding an
   activity needs no change here at all. Both accessors default sensibly for
   an id that has never been seen before, which is what makes a brand-new
   activity work on first run.
   ================================================================ */
const KEY = "lr_state_v1";
const DEFAULTS = {
  rewardEvery: 3,
  schedule: "fixed",          // fixed | variable
  itemsPerSession: 10,
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
  }
  // Every fresh launch starts back at Level 1 for every activity. Auto-advance
  // can climb during a sitting, but that shouldn't silently carry over to the
  // next time the app is opened — a parent can still jump straight to a harder
  // level from the home screen or Settings.
  S.levels = {};
}
function save(){
  try { localStorage.setItem(KEY, JSON.stringify({settings:S, progress:progress})); } catch(e){}
}

/* per-activity accessors — an unknown id reads as level 1, switched on */
function levelOf(id){ return (S.levels && S.levels[id]) || 1; }
function setLevelOf(id, v){ (S.levels || (S.levels = {}))[id] = v; }
function isEnabled(id){ return (S.enabled || {})[id] !== false; }
function setEnabled(id, on){ (S.enabled || (S.enabled = {}))[id] = !!on; }

load();
