/* ============================ MASTERY ============================
   Moving up and down the ladder. This is activity-agnostic: it works off an
   activity id and that activity's own maxLevel, so every activity added from
   here on inherits the same gating without a line of extra code.

   Rule: play never stops. Answers are counted in blocks of S.itemsPerSession
   (per level, per activity). 8/10-equivalent (>=80%) INDEPENDENT-correct (no
   hint, no prior miss) in a block counts as one confirmation; two such blocks
   IN A ROW advance a level — a single lucky block can't push him ahead, but he
   never has to leave and come back for the second confirmation. Any block under
   50% resets the streak; with S.neverDemote (the default) that's all it does,
   otherwise it also drops him back a level. A block that is neither a clear
   pass nor a clear fail (50–79%) always just resets the streak, demotion or not.

   WARM-UP RULE: the app restarts at Level 1 every launch, so ground he has
   already covered before only needs ONE good block to pass back through —
   otherwise re-climbing would cost hundreds of answers every single session.
   Only genuinely new ground still needs two consecutive confirmations.
   ================================================================ */
function bestLevel(id){
  const b = progress.best || (progress.best = {});
  return b[id] || 1;
}
function noteBestLevel(id, lv){
  const b = progress.best || (progress.best = {});
  if(lv > (b[id]||1)) b[id] = lv;
}
function evaluateMastery(id, independent){
  if(!S.autoAdvance) return;
  const act = activityById(id);
  const curLevel = levelOf(id);
  const maxLevel = act.maxLevel();
  const blockSize = S.itemsPerSession;
  const needed = curLevel < bestLevel(id) ? 1 : 2;   // familiar ground vs new ground
  const key = id + ":" + curLevel;
  let p = progress.perLevel[key] || {n:0, indep:0, hits:0};
  p.n++; if(independent) p.indep++;
  if(p.n >= blockSize){
    const rate = p.indep / p.n;
    if(rate < 0.5 && curLevel > 1){
      if(!S.neverDemote) setLevelOf(id, curLevel - 1);
      p = {n:0,indep:0,hits:0};
    } else if(rate >= 0.8){
      /* Holding a level is showing it, so it counts as a best in its own right
         — not only the level he is promoted INTO. Recording it only on
         promotion left two holes that both ended with him back on Level 1 the
         next morning having already proved far more: the top of a ladder can
         never be advanced past, so mastering it recorded nothing at all; and a
         level a parent set the stepper to recorded nothing until he climbed
         off it. Moving the stepper alone still proves nothing — he has to pass
         a block there. And this cannot fast-track the climb: `needed` compares
         curLevel against the best, so a best equal to curLevel still asks for
         two consecutive blocks. */
      noteBestLevel(id, curLevel);
      p.hits = (p.hits||0) + 1;
      if(p.hits >= needed && curLevel < maxLevel){
        setLevelOf(id, curLevel + 1);
        noteBestLevel(id, curLevel + 1);
        p = {n:0,indep:0,hits:0};
      } else {
        p.n = 0; p.indep = 0; // one confirmation banked; next block can confirm the level-up
      }
    } else {
      p.n = 0; p.indep = 0; p.hits = 0; // a so-so block resets the streak, doesn't demote
    }
  }
  progress.perLevel[key] = p;
  save();
}
/* The standing picture of every activity, for the Progress panel — kept here
   beside the counters it reads rather than being worked out inside the panel,
   and free of the DOM so it can be tested directly.

   `rounds` and `clean` come from the session log, which records one row per
   sitting; `level` and `best` come from the live state, so a game he has never
   played still shows where a launch would start him. Sorted by how far behind
   his best the game is being played, so anything whose mornings are being
   wasted floats to the top. */
function activityStats(){
  const played = {};
  (progress.sessions || []).forEach(s=>{
    const a = played[s.kind] || (played[s.kind] = { rounds:0, clean:0, secs:0 });
    a.rounds += s.correct || 0;
    a.clean  += s.firstTry || 0;
    a.secs   += s.secs || 0;
  });
  return ACTIVITIES.map(act=>{
    const p = played[act.id] || { rounds:0, clean:0, secs:0 };
    const level = levelOf(act.id);
    return {
      id: act.id, name: act.name, oneShot: !!act.oneShot,
      level, max: act.maxLevel(), best: bestLevel(act.id),
      rounds: p.rounds, clean: p.clean, secs: p.secs,
      behind: act.oneShot ? -1 : bestLevel(act.id) - level
    };
  }).sort((a, b)=> b.behind - a.behind);
}

/* Optional per-round tagging. An activity passes a tag to api.solved() when a
   round belongs to a sub-category worth tracking separately — Patterns uses it
   for which real-object theme came up — and Settings surfaces the breakdown. */
function logTagStat(id, tag, independent){
  const all = progress.tagStats || (progress.tagStats = {});
  const forAct = all[id] || (all[id] = {});
  const s = forAct[tag] || {n:0, indep:0};
  s.n++; if(independent) s.indep++;
  forAct[tag] = s;
}
