/* ============================ SETTINGS ============================ */
function stepper(val, lo, hi, onChange){
  const w = el("div","stepper");
  const m = el("button",null,"−"), v = el("div","val", String(val)), p = el("button",null,"+");
  m.addEventListener("click", ()=>{ if(val>lo){ val--; v.textContent=val; onChange(val); } });
  p.addEventListener("click", ()=>{ if(val<hi){ val++; v.textContent=val; onChange(val); } });
  w.append(m,v,p); return w;
}
function toggle(on, onChange){
  const s = el("div","sw"+(on?" on":"")); s.appendChild(el("i"));
  s.addEventListener("click", ()=>{ on=!on; s.classList.toggle("on",on); onChange(on); });
  return s;
}
function seg(opts, cur, onChange){
  const w = el("div","seg");
  opts.forEach(o=>{
    const b = el("button", o.v===cur?"on":"", o.t);
    b.addEventListener("click", ()=>{ w.querySelectorAll("button").forEach(x=>x.classList.remove("on")); b.classList.add("on"); onChange(o.v); });
    w.appendChild(b);
  });
  return w;
}
function row(labelText, control, hintText){
  const r = el("div","row");
  r.appendChild(el("label",null,labelText));
  if(control) r.appendChild(control);      // a row can be label + blurb, with nothing to set
  if(hintText) r.appendChild(el("div","hint",hintText));
  return r;
}
function group(title){ const g = el("div","sgroup"); g.appendChild(el("h3",null,title)); return g; }

async function openSettings(){
  await loadCustom();
  const b = $("#setBody"); b.innerHTML="";

  /* mode — first, because it changes what the other settings are FOR */
  const g0 = group("Mode");
  g0.appendChild(row("Parent mode", toggle(sandboxOn(), v=>{
    if(v) startSandbox(); else endSandbox();
    applyMode(); updateHomeLabels();
  }),
    "Off is his screen: the level steppers under each tile are hidden, so the only thing to tap is the game " +
    "itself, and everything he does counts. On shows the steppers and lets you try the games yourself without " +
    "any of it reaching his record \u2014 the levels, the blocks behind them, the breakdowns and the session log " +
    "all go back to exactly how they were the moment you turn it off. It never survives closing the app, so the " +
    "tablet always opens on his screen."));
  b.appendChild(g0);

  /* rewards */
  const g1 = group("Rewards");
  g1.appendChild(row("Reward after", stepper(S.rewardEvery,1,10,v=>{S.rewardEvery=v;save();}), "How many correct answers earn one animal."));
  g1.appendChild(row("Schedule", seg([{v:"fixed",t:"Fixed"},{v:"variable",t:"Variable"}], S.schedule, v=>{S.schedule=v;save();}),
    "Fixed is predictable. Variable randomises around the number above and holds interest longer."));
  g1.appendChild(row("Use built-in reward pictures", toggle(S.useEmojiPack, v=>{S.useEmojiPack=v;save();bag=[];}),
    "153 real photographs: animals, sea creatures, fruits, vegetables, food, vehicles, things around the " +
    "house, nature, toys, clothes and body parts. Photographs rather than cartoons on purpose — this screen " +
    "is where a word gets attached to the thing it names, and a picture of an actual dog carries over to the " +
    "dog in the street in a way a drawing of one doesn't. Turn off once you have added enough of your own. " +
    "For something specific — your fridge, his cup, a face he knows — a photo you add below always wins."));
  b.appendChild(g1);

  /* session */
  const g2 = group("Session");
  g2.appendChild(row("Answers per confirmation block", stepper(S.itemsPerSession,4,30,v=>{S.itemsPerSession=v;save();}),
    "Play never stops on its own — he keeps going until you tap back. This just sets how many correct answers " +
    "make up one \"block\" for levelling: two good blocks in a row move him up, and the stars in the corner " +
    "during play show how far through a block he is."));
  g2.appendChild(row("Dim wrong choices after", stepper(S.dimAfter,1,5,v=>{S.dimAfter=v;save();}), "Misses before the wrong options fade out."));
  g2.appendChild(row("Show the answer after", stepper(S.showAfter,1,6,v=>{S.showAfter=v;save();}), "Misses before the correct target is highlighted."));
  g2.appendChild(row("Assisted mode", toggle(S.assistedMode, v=>{S.assistedMode=v;save();renderHomeAssist();}),
    "A hand briefly points to the right answer at the start of each round. Also on the home screen."));
  b.appendChild(g2);

  /* activities */
  const g3 = group("Activities");
  /* What these switches add up to, said where the choice is made. Switched off
     means GONE from his screen rather than greyed — the whole point is a short,
     fixed set of tiles that is the same every morning — so the count is the
     only place a parent can see what he will actually be handed. */
  const onNow = ACTIVITIES.filter(a => isEnabled(a.id));
  const tally = el("div","hint",
    onNow.length + " of " + ACTIVITIES.length + " on his screen" +
    (onNow.length ? "" : " — he will have nothing to tap") +
    (mixPool().length >= 2 ? ", plus Mix" : ". Mix needs two games switched on"));
  if(!onNow.length) tally.classList.add("note", "warn");
  g3.appendChild(tally);
  // one pair of rows per registered activity — nothing here names an activity
  ACTIVITIES.forEach(act=>{
    const label = act.name.charAt(0) + act.name.slice(1).toLowerCase();
    g3.appendChild(row(label, toggle(isEnabled(act.id), v=>{
      setEnabled(act.id, v); save();
      updateHomeLabels();          // his screen changes shape, so refresh it now
      const n = ACTIVITIES.filter(x => isEnabled(x.id)).length;
      tally.textContent = n + " of " + ACTIVITIES.length + " on his screen" +
        (n ? "" : " — he will have nothing to tap") +
        (mixPool().length >= 2 ? ", plus Mix" : ". Mix needs two games switched on");
      tally.classList.toggle("note", !n);
      tally.classList.toggle("warn", !n);
    })));
    // a one-shot game is one fixed game by definition, so a stepper from 1 to 1
    // would be a dead control — it gets its blurb with nothing to set
    g3.appendChild(act.oneShot
      ? row(label + " — how it plays", null, act.settingsHint(1))
      : row(label + " level",
          stepper(levelOf(act.id), 1, act.maxLevel(), v=>{ setLevelOf(act.id, v); save(); }),
          act.settingsHint(levelOf(act.id))));
  });
  g3.appendChild(row("Move levels automatically", toggle(S.autoAdvance,v=>{S.autoAdvance=v;save();}),
    Math.ceil(0.8*S.itemsPerSession) + " of " + S.itemsPerSession + " INDEPENDENT correct (no hint, no prior miss) " +
    "in a block moves up — but only once that's happened in two blocks in a row, so one lucky block can't push him " +
    "ahead. Levels he has already reached before only need one good block, which is what makes the warm-up at the " +
    "start of each session quick. Under half a block moves down right away, unless \"Never drop a level\" below is " +
    "on. Play keeps going the whole time; nothing pauses for this."));
  g3.appendChild(row("Never drop a level", toggle(S.neverDemote, v=>{S.neverDemote=v;save();}),
    "On by default. A rough block (under half of it independent) just resets the count toward the next level up instead of moving " +
    "him back down a level."));
  b.appendChild(g3);

  /* animals */
  const g4 = group("Animal photos");
  const addWrap = el("div","row");
  const fileIn = el("input"); fileIn.type="file"; fileIn.accept="image/*"; fileIn.multiple=true; fileIn.style.display="none";
  const addBtn = el("button","minibtn","+ Add photos");
  addBtn.addEventListener("click", ()=>fileIn.click());
  fileIn.addEventListener("change", async ()=>{
    for(const f of fileIn.files){ await dbAdd({word: wordFromFile(f.name), blob: f}); }
    bag = []; openSettings();
  });
  addWrap.append(el("label",null, CUSTOM.length + " photo" + (CUSTOM.length===1?"":"s") + " on this tablet"), addBtn);
  addWrap.appendChild(el("div","hint","File name becomes the word shown. A file called zebra.jpg shows ZEBRA. Photos stay on this tablet and work offline."));
  g4.appendChild(addWrap);
  g4.appendChild(fileIn);
  const grid = el("div","animals");
  CUSTOM.forEach(c=>{
    const a = el("div","anim");
    const th = el("div","th");
    const im = el("img"); im.src = c.url; th.appendChild(im);
    const x = el("div","x","×");
    x.addEventListener("click", async ()=>{ await dbDel(c.id); bag=[]; openSettings(); });
    th.appendChild(x);
    a.appendChild(th); a.appendChild(el("div",null,c.word));
    grid.appendChild(a);
  });
  if(CUSTOM.length) g4.appendChild(grid);
  b.appendChild(g4);

  /* progress */
  const g5 = group("Progress");

  /* Where he actually is, per game. The session list below is a log — it says
     what happened, one sitting at a time, and you cannot see from it that he
     has been sitting on level 10 of something for a fortnight. This is the
     standing picture: where he is now, the best he has ever held, and how much
     of it he has done. "Best" is what a fresh launch picks up from (two levels
     below it, WARM_UP_DROP in 00-state.js), so a game whose best lags far
     behind where he plays is a game whose mornings are being wasted. */
  /* THIS WEEK, against last week. The standing picture below says where he is;
     this says whether any of it is moving, which is the question actually
     being asked. Every figure carries what it was doing before, because a
     total on its own ("312 rounds") tells a parent nothing they can act on.

     Deliberately four numbers and no chart: this is a settings panel read on a
     phone, the figures are one-per-week rather than a series, and a sparkline
     of four points is decoration. Status colour is reserved for the one thing
     that means "look at this" — and never carries meaning on its own, the
     words say it too. */
  const wk = recentWindow(7);
  const wkRow = (label, now, prev, fmt, points)=>{
    const r = el("div","stat");
    r.appendChild(el("span", null, label));
    const right = el("span");
    right.appendChild(el("b", null, fmt(now)));
    if(prev > 0){
      /* A count moves by a share of itself; a SHARE moves by points. Saying
         64% is "up 28%" on 50% is arithmetic nobody wants to undo in their
         head, and it reads as a bigger jump than it is. */
      const d = points ? now - prev : Math.round(((now - prev) / prev) * 100);
      const how = points ? Math.abs(d) + " points" : Math.abs(d) + "%";
      const tag = el("span","trend " + (d > 0 ? "up" : d < 0 ? "down" : ""),
        d === 0 ? " · same as last week"
                : " · " + (d > 0 ? "up " : "down ") + how + " on last week");
      right.appendChild(tag);
    } else if(now > 0){
      right.appendChild(el("span","trend", " · nothing the week before"));
    }
    r.appendChild(right);
    g5.appendChild(r);
  };
  if(wk.now.sittings || wk.prev.sittings){
    const head = el("div","hint","THIS WEEK");
    head.style.fontWeight = "700";
    g5.appendChild(head);
    wkRow("Sittings", wk.now.sittings, wk.prev.sittings, n => String(n));
    wkRow("Time", Math.round(wk.now.secs / 60), Math.round(wk.prev.secs / 60), n => n + " min");
    wkRow("Rounds answered", wk.now.rounds, wk.prev.rounds, n => String(n));
    const share = (b)=> b.rounds ? Math.round((b.clean / b.rounds) * 100) : 0;
    wkRow("Answered alone", share(wk.now), share(wk.prev), n => n + "%", true);
  }

  const summary = activityStats();
  if(summary.length){
    const head = el("div","hint","EACH GAME");
    head.style.fontWeight = "700";
    head.style.marginTop = "10px";
    g5.appendChild(head);
    g5.appendChild(el("div","hint",
      "Where he is · how long he has been there · best he has held · answered alone"));
    /* Games he has never opened get one shared line at the end rather than
       three lines each. Ten identical blocks saying the same nothing is the
       same noise the tag breakdown had, one level up — and it pushes the games
       he IS playing off the screen. */
    const untouched = [];
    summary.forEach(a=>{
      if(!a.rounds && !a.atLevel && !gameMovement(a.id, 7)){ untouched.push(a.name); return; }
      const r = el("div","stat");
      r.appendChild(el("span", null, a.name + (a.oneShot ? "" : "  L" + a.level + "/" + a.max)));
      const alone = a.rounds ? Math.round((a.clean / a.rounds) * 100) + "%" : "—";
      /* The number that changes what you'd do about it: answers given at the
         level he is on right now. A big one beside a low percentage is a level
         to step him down from; a big one beside a high percentage means the
         climb is stalling for some other reason. */
      const here = a.oneShot ? "" : a.atLevel + " here · ";
      r.appendChild(el("span", null,
        here + (a.oneShot ? "" : "best " + a.best + " · ") + a.rounds + " rounds · " + alone));
      g5.appendChild(r);

      /* How far along this game's own ladder he is. One hue, no scale of its
         own, and the figure it draws is already written in the row above it —
         the bar is there to be read at a glance down a column of games, not to
         carry anything the words don't. */
      if(!a.oneShot && a.max > 1){
        const m = el("div","meter");
        const fill = el("i");
        fill.style.width = Math.max(2, Math.round((a.level / a.max) * 100)) + "%";
        m.appendChild(fill);
        g5.appendChild(m);
      }

      /* And the one line a parent can act on. Order matters: a game he has
         stopped playing is worth saying before anything about levels, since
         nothing else on this screen shows absence. */
      const mv = a.oneShot ? null : gameMovement(a.id, 7);
      let note = null;
      if(!mv) note = "never played";
      else if(mv.idleDays >= 7) note = "not played for " + mv.idleDays + " days";
      else if(mv.sittings && mv.to > mv.from) note = "up " + (mv.to - mv.from) + " level" + (mv.to - mv.from > 1 ? "s" : "") + " this week";
      else if(mv.sittings && mv.to < mv.from) note = "down " + (mv.from - mv.to) + " level" + (mv.from - mv.to > 1 ? "s" : "") + " this week";
      else if(!a.oneShot && a.atLevel >= S.itemsPerSession * 4 && a.rounds && (a.clean / a.rounds) < 0.6)
        note = "stuck on level " + a.level + " — worth stepping down";
      else if(mv.sittings) note = "same level this week";
      if(note){
        const w = el("div","hint note" + (/stuck|not played|never/.test(note) ? " warn" : ""), note);
        g5.appendChild(w);
      }
    });
    if(untouched.length){
      const r = el("div","stat");
      r.appendChild(el("span", null, "Never played"));
      r.appendChild(el("span", null, untouched.length + " game" + (untouched.length > 1 ? "s" : "")));
      g5.appendChild(r);
      g5.appendChild(el("div","hint note", untouched.join(" · ")));
    }
  }

  const last = progress.sessions.slice(-12).reverse();
  if(!last.length) g5.appendChild(el("div","hint","No sessions yet."));
  last.forEach(s=>{
    const r = el("div","stat");
    const d = new Date(s.at);
    const lvl = activityById(s.kind).levelLabel(s.level);
    r.appendChild(el("span",null, d.toLocaleDateString() + " " + d.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) + " · " + s.kind + " " + lvl));
    r.appendChild(el("span",null, s.firstTry + "/" + s.correct + " independent · " + s.prompts + " prompts · " + Math.max(1,Math.round(s.secs/60)) + "m"));
    g5.appendChild(r);
  });
  // per-tag breakdown, for any activity that tags its rounds (Patterns tags
  // real-object rounds by theme, Trace tags each stroke by name, Word find
  // every word it has shown). Purely informational — nothing gates on it.
  const allTags = progress.tagStats || {};
  Object.keys(allTags).forEach(actId=>{
    const forAct = allTags[actId];
    const keys = Object.keys(forAct);
    if(!keys.length) return;
    const head = el("div","hint", activityById(actId).name.toLowerCase().replace(/^./,c=>c.toUpperCase()) +
      ", by kind (independent / seen):");
    head.style.marginTop = "4px";
    g5.appendChild(head);
    /* Weakest first, and only a handful. What an activity tags with is its own
       business — Word find tags every word it has ever shown and Trace every
       stroke by name — so left uncapped this one loop can put the better part
       of two hundred rows between a parent and everything else on the screen.
       The ones worth reading are the ones he gets wrong, so they go at the top
       and the rest are counted rather than listed. */
    const TAG_ROWS = 6;
    const ranked = keys
      .filter(t => forAct[t] && forAct[t].n)
      .sort((a, b)=>{
        const sa = forAct[a].indep / forAct[a].n, sb = forAct[b].indep / forAct[b].n;
        return (sa - sb) || (forAct[b].n - forAct[a].n);
      });
    ranked.slice(0, TAG_ROWS).forEach(t=>{
      const st2 = forAct[t];
      const r = el("div","stat");
      r.appendChild(el("span",null, t[0].toUpperCase()+t.slice(1)));
      r.appendChild(el("span",null, st2.indep + "/" + st2.n + " (" + Math.round(100*st2.indep/st2.n) + "%)"));
      g5.appendChild(r);
    });
    if(ranked.length > TAG_ROWS){
      const more = el("div","hint note", "+ " + (ranked.length - TAG_ROWS) + " more, all doing better than these");
      g5.appendChild(more);
    }
  });
  const expRow = el("div","row");
  const expBtn = el("button","minibtn","Export data");
  const ta = el("textarea"); ta.style.display="none"; ta.readOnly = true;
  expBtn.addEventListener("click", ()=>{
    ta.value = JSON.stringify({settings:S, progress:progress}, null, 2);
    ta.style.display = "block"; ta.select();
    try{ navigator.clipboard.writeText(ta.value); }catch(e){}
  });
  const clrBtn = el("button","minibtn","Reset progress");
  let armed = false;
  clrBtn.addEventListener("click", ()=>{
    if(!armed){ armed = true; clrBtn.textContent = "Tap again to reset"; setTimeout(()=>{armed=false;clrBtn.textContent="Reset progress";},3000); return; }
    resetProgress(); openSettings();
  });
  expRow.append(expBtn, clrBtn);
  g5.appendChild(expRow);
  g5.appendChild(ta);
  b.appendChild(g5);

  /* code */
  const g6 = group("Passcode");
  const codeRow = el("div","row");
  const codeIn = el("input"); codeIn.type="tel"; codeIn.value = S.gate; codeIn.maxLength = 12;
  codeIn.style.cssText = "width:150px;padding:9px;border:1px solid var(--line);border-radius:10px;font-size:17px;text-align:center";
  codeIn.addEventListener("change", ()=>{ const v = codeIn.value.replace(/\D/g,""); if(v.length>=3){ S.gate = v; save(); } else codeIn.value = S.gate; });
  codeRow.append(el("label",null,"Settings passcode"), codeIn);
  codeRow.appendChild(el("div","hint",
    "Long-press the ⚙️ on the home screen for 1 second to get here. Three digits or more, and worth keeping " +
    "long: this is the only thing between him and the screen that can change his levels or turn parent mode " +
    "on. There is no way to recover a forgotten code except clearing the app's data, which takes his progress " +
    "with it — use Export data above first if you are changing it."));
  g6.appendChild(codeRow);
  b.appendChild(g6);

  /* keeping him in the app */
  const g7 = group("Keeping him in the app");
  const lockRow = el("div","row");
  lockRow.appendChild(el("div","hint",
    "<b>1. Add it to the home screen.</b> In Chrome tap ⋮ → <i>Add to Home screen</i> (on iPad, Share → " +
    "<i>Add to Home Screen</i>). Launched from that icon it opens with no address bar and no tabs at all — " +
    "there is nothing for him to tap his way out through. This is the single biggest thing you can do." +
    "<br><br>" +
    "<b>2. Lock the tablet to it.</b> A web page isn't allowed to block the home button or the app switcher, " +
    "so the tablet has to do that part:" +
    "<br>• <b>Android</b> — Settings → Security → <i>App pinning</i> (sometimes <i>Screen pinning</i>). Turn it " +
    "on with “ask for PIN before unpinning”, open this app, then pin it from the recent-apps view. Leaving it " +
    "then needs your PIN." +
    "<br>• <b>iPad</b> — Settings → Accessibility → <i>Guided Access</i>. Turn it on, set a passcode, then " +
    "triple-click the side button inside this app. Nothing else on the tablet is reachable until you " +
    "triple-click and enter the passcode." +
    "<br><br>" +
    "Inside the app itself: tapping PLAY now goes fullscreen, the back gesture only ever returns to the home " +
    "screen rather than leaving, pull-to-refresh is off, and the screen won't dim while he's playing."));
  g7.appendChild(lockRow);
  b.appendChild(g7);

  show("#settings");
}
$("#setBack").addEventListener("click", goHome);
$("#fullBtn").addEventListener("click", ()=>{
  const d = document.documentElement;
  if(!document.fullscreenElement && d.requestFullscreen) d.requestFullscreen().catch(()=>{});
  else if(document.exitFullscreen) document.exitFullscreen().catch(()=>{});
});
