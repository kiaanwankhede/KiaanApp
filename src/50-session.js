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
       date:      "2025-01-02",            // optional — "YYYY-MM-DD"; within a section,
                                            // cards always sort oldest first (src/70-home.js)
       oneShot:   true,                    // optional — a single fixed game, no level ladder:
                                            // no stepper on its card, the reward shows the
                                            // moment its one round solves (not after a block),
                                            // and the reward screen offers Repeat / Next
                                            // instead of counting straight into another round
       rewardEveryRound: true               // optional — the reward is due after every round
                                            // rather than after a block of them. For an
                                            // activity where the reward IS the content (Word
                                            // find teaches the very words the reward screen
                                            // shows), waiting five rounds would put the
                                            // picture on screen long after he'd forgotten
                                            // which word earned it. Still a normal ladder:
                                            // stepper, mastery and Settings all unchanged.
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
  const target = rewardTargetFor(activityById(id));
  sess = {
    kind: id, correct:0, misses:0, prompts:0, started:Date.now(),
    sinceReward:0, target, attempts:0, clean:0, asked:0
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
  if(act.oneShot){ wm.innerHTML = ""; return; }          // nothing here is levelling
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
/* How many correct rounds this activity owes before its reward. Two activities
   ask for one: a one-shot game, whose single round IS the whole game, and one
   that rewards every round because the reward is its content. Everything else
   gets the parent's block setting. */
function rewardTargetFor(act){
  if(act.oneShot || act.rewardEveryRound) return 1;
  return rewardTarget();
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
  // Play never auto-stops — he keeps going until a parent taps back. Both of
  // these are the session's own, so a tap back in the gap stops them rather
  // than having them land on a screen he has already left.
  if(sess.sinceReward >= sess.target){ laterInSession(showReward, 500); return; }
  laterInSession(nextRound, 550);
}
function nextRound(){
  sess.roundDone = false; sess.roundMisses = 0;
  sess.attempts = 0; sess.asked++; sess.hintShownThisRound = false;
  const act = activityById(sess.kind);
  const stage = $("#stage"); stage.innerHTML = "";
  updateLevelWatermark();
  act.startRound(levelOf(act.id), roundApi(act, stage));
}
/* ---- a one-shot game made of several scenes ----
   Sky and Nine both run through a few fixed scenes in order, and both wanted
   the same two things neither should own itself:

   A BEAT AFTER A SCENE IS FINISHED. Both used to swap scenes in the same tick
   the last line landed, so the engine's little pop — the picture at the end
   growing, the ninth bee settling into its hive — was wiped off the screen in
   the same frame it started. He finished something and the screen just
   changed. SCENE_GAP_MS leaves it there long enough to be seen.

   AND A QUIET NOTE OF WHERE HE IS. A one-shot game has no levels, so the
   corner readout has nothing to report — but twelve lines with no sense of
   how many are left is worse than no game at all. It gets "Scene 2 of 4"
   instead, in the same quiet corner, on the same terms: a report for a
   parent watching, never anything the flow depends on.

   A scene draws itself into api.stage and calls its own api.solved() when it
   is complete. Only the last one finishes the round for real. Misses and
   hints pass straight through untouched, so a mistake in scene one still
   means the whole game wasn't independent. */
const SCENE_GAP_MS = 900;
function playScenes(api, scenes, tag){
  const live = sessionGuard();          // tapping back mid-beat must not draw the next scene
  let idx = 0;
  const draw = ()=>{
    if(!live()) return;
    api.stage.innerHTML = "";
    noteScene(idx + 1, scenes.length);
    scenes[idx](Object.assign({}, api, {
      solved(){
        idx++;
        if(idx >= scenes.length){ api.solved(tag); return; }
        laterInSession(draw, SCENE_GAP_MS);
      }
    }));
  };
  draw();
}
function noteScene(n, total){
  const wm = $("#lvWatermark");
  if(!wm || total < 2) return;
  wm.innerHTML = "";
  wm.appendChild(el("span","lvw-level","Scene " + n + " of " + total));
  const dots = el("span","lvw-blocks");
  for(let i=0;i<total;i++) dots.appendChild(el("span", i < n - 1 ? "on" : "", "●"));
  wm.appendChild(dots);
}
/* ---- nothing deferred outlives the session it belonged to ----
   A parent can tap back at any moment, including the half second between a
   right answer and whatever comes next, and a finger can still be holding a
   tile when they do. Everything that runs later — a drop that lands after
   the fact, the timer carrying play into the next round, the next scene of a
   one-shot game — asks this first.

   Both halves came from real failures, found by driving the page:
     - letting go of a dragged tile after tapping back threw outright
       ("Cannot set properties of null"), because the drop still called
       api.miss() and the session was gone;
     - tapping back the instant a Word find round solved put the reward
       screen up OVER the "N right today" screen half a second later, so the
       parent's own tap was overridden. Word find rewards every round, so
       that window was open on every single round of it.

   `sess` going null covers going home; `over` covers ending a session, which
   deliberately keeps sess alive to write its record. */
function sessionGuard(){
  const mine = sess;
  return ()=> !!mine && sess === mine && !mine.over;
}
function laterInSession(fn, ms){
  const live = sessionGuard();
  return setTimeout(()=>{ if(live()) fn(); }, ms);
}

function roundApi(act, stage){
  const live = sessionGuard();
  return {
    stage,
    level: levelOf(act.id),
    attempts(){ return live() ? sess.attempts : 0; },
    refocus(){ if(live()) sess.attempts = 0; },
    hint(target){ if(live()) showHint(target); },
    miss(){
      if(!live()) return 0;
      sess.misses++; sess.attempts++; sess.roundMisses++;
      if(sess.attempts >= S.dimAfter) sess.prompts++;
      return sess.attempts;
    },
    solved(tag){
      if(!live() || sess.roundDone) return;
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
