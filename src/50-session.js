/* ============================ SESSION ============================
   Owns the play loop, and with it everything an activity would otherwise
   have to reimplement: the reward schedule and token strip, the assisted
   hand-hint, independence tracking, mastery/auto-advance, and moving on to
   the next round.

   THE ACTIVITY CONTRACT
   ---------------------
   An activity is a plain object:

     {
       id:        "pattern",               // stable; also the progress key
       name:      "PATTERNS",              // home card title
       icon:      "🔷🔶🔷",                 // home card icon
       maxLevel:  () => 40,                // how tall its ladder is
       levelLabel:(level) => "AB · Colour", // home card subtitle
       settingsHint:(level) => "…",        // blurb under its Settings stepper
       startRound:(level, api) => { … },   // draw one round into api.stage
       section:   "Toondemy Games",        // optional — groups under this heading on
                                            // the home screen instead of the plain row
       date:      "2025-01-02"             // optional — "YYYY-MM-DD"; within a section,
                                            // cards always sort oldest first (src/70-home.js)
     }

   startRound gets an `api` and is responsible for nothing but this round:

     api.stage        the (already emptied) #stage element to draw into
     api.level        the level being played
     api.attempts()   consecutive wrong tries on whatever he's working on now
     api.refocus()    he's switched to a different piece; restart prompting
     api.miss()       record a wrong try — returns the new attempt count
     api.hint(el)     offer the assisted-mode hand at el (it waits a few seconds)
     api.solved(tag)  this round is complete and correct

   The shell works out on its own how the round counts, so no activity can get
   it wrong or forget to do it:
     no wrong tries, hand never appeared  -> INDEPENDENT, counts toward moving up
     no wrong tries, but the hand appeared -> PROMPTED, counts neither way
     any wrong try                        -> counts against
   Prompted rounds have to be neutral, not failures: the hand is the app's own
   offer of help, and counting it as a miss is what used to drop him a level
   for getting every answer right.
   ================================================================ */
let sess = null;

function activityById(id){ return ACTIVITIES.find(a => a.id === id) || ACTIVITIES[0]; }

function startSession(id){
  sess = {
    kind: id, correct:0, misses:0, prompts:0, started:Date.now(),
    sinceReward:0, target:rewardTarget(), attempts:0, clean:0, asked:0
  };
  show("#play");
  renderTokens();
  wmLevel = null;           // fresh session: never flash "level up" on the first read
  nextRound();
}
/* ---- level + block-progress readout, for a parent watching ----
   Reads the exact counters evaluateMastery() itself keeps (src/40-mastery.js),
   so this can never disagree with when the level actually moves — nothing
   here decides that, it only reports it. */
let wmLevel = null;
function updateLevelWatermark(){
  const wm = $("#lvWatermark");
  if(!sess || !wm) return;
  const act = activityById(sess.kind);
  const lvl = levelOf(act.id);
  const p = (progress.perLevel && progress.perLevel[act.id + ":" + lvl]) || {n:0, indep:0, hits:0};
  const blockSize = S.itemsPerSession;
  const needed = lvl < bestLevel(act.id) ? 1 : 2;     // familiar ground passes on one good block

  wm.innerHTML = "";
  wm.appendChild(el("span","lvw-level","Level " + lvl));
  // the level-change flash is bookkept before any early return, so toggling
  // auto-advance off and on again can't leave a stale level behind and flash
  if(wmLevel !== null && lvl !== wmLevel){
    wm.classList.add("up");
    setTimeout(()=>wm.classList.remove("up"), 1400);
  }
  wmLevel = lvl;
  if(!S.autoAdvance) return;                          // nothing is climbing; a bare level is the whole story

  /* One star per answer in the block. Gold means he got it on his own, which
     is what actually counts toward moving up; grey means it counted but he
     needed the hand or had a miss first. Hollow is still to come. The order is
     gold-then-grey rather than the order they happened — these are the running
     totals evaluateMastery() keeps, not a timeline. */
  const stars = el("span","lvw-stars");
  for(let i=0;i<blockSize;i++){
    const cls = i < p.indep ? "lvw-star on" : (i < p.n ? "lvw-star dim" : "lvw-star");
    stars.appendChild(el("span", cls, i < p.n ? "★" : "☆"));
  }
  wm.appendChild(stars);

  // and one dot per full block still needed before the level moves
  if(needed > 1){
    const blocks = el("span","lvw-blocks");
    for(let i=0;i<needed;i++) blocks.appendChild(el("span", i < (p.hits||0) ? "on" : "", "●"));
    wm.appendChild(blocks);
  }

}
function rewardTarget(){
  const n = S.rewardEvery;
  if(S.schedule === "fixed") return n;
  const lo = Math.max(1, n-1), hi = n+1;
  return lo + rnd(hi-lo+1);
}
function renderTokens(){
  const t = $("#tokens"); t.innerHTML = "";
  for(let i=0;i<sess.target;i++){
    const d = el("div","tok"+(i<sess.sinceReward?" full":""));
    t.appendChild(d);
  }
}
function scoreCorrect(){
  sess.correct++; sess.sinceReward++;
  const toks = $("#tokens").children;
  const t = toks[sess.sinceReward-1];
  if(t){ t.classList.add("full","pop"); setTimeout(()=>t.classList.remove("pop"),260); }
}
function afterCorrect(){
  // Play never auto-stops — he keeps going until a parent taps back.
  if(sess.sinceReward >= sess.target){ setTimeout(showReward, 500); return; }
  setTimeout(nextRound, 550);
}
function nextRound(){
  sess.roundDone = false; sess.roundMisses = 0;
  sess.attempts = 0; sess.asked++; sess.hintShownThisRound = false;
  const act = activityById(sess.kind);
  const stage = $("#stage"); stage.innerHTML = "";
  updateLevelWatermark();
  act.startRound(levelOf(act.id), roundApi(act, stage));
}
function roundApi(act, stage){
  return {
    stage,
    level: levelOf(act.id),
    attempts(){ return sess.attempts; },
    refocus(){ sess.attempts = 0; },
    hint(target){ showHint(target); },
    miss(){
      sess.misses++; sess.attempts++; sess.roundMisses++;
      if(sess.attempts >= S.dimAfter) sess.prompts++;
      return sess.attempts;
    },
    solved(tag){
      if(sess.roundDone) return;
      const independent = (sess.roundMisses === 0 && !sess.hintShownThisRound);
      const prompted    = (sess.roundMisses === 0 &&  sess.hintShownThisRound);
      if(independent) sess.clean++;
      sess.roundDone = true;
      if(tag) logTagStat(act.id, tag, independent);
      scoreCorrect();
      if(!prompted) evaluateMastery(act.id, independent);   // a prompted round moves nothing
      updateLevelWatermark();                                // reflect this round's contribution right away
      afterCorrect();
    }
  };
}
