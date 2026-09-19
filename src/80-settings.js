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
  r.appendChild(control);
  if(hintText) r.appendChild(el("div","hint",hintText));
  return r;
}
function group(title){ const g = el("div","sgroup"); g.appendChild(el("h3",null,title)); return g; }

async function openSettings(){
  await loadCustom();
  const b = $("#setBody"); b.innerHTML="";

  /* rewards */
  const g1 = group("Rewards");
  g1.appendChild(row("Reward after", stepper(S.rewardEvery,1,10,v=>{S.rewardEvery=v;save();}), "How many correct answers earn one animal."));
  g1.appendChild(row("Schedule", seg([{v:"fixed",t:"Fixed"},{v:"variable",t:"Variable"}], S.schedule, v=>{S.schedule=v;save();}),
    "Fixed is predictable. Variable randomises around the number above and holds interest longer."));
  g1.appendChild(row("Use built-in reward pictures", toggle(S.useEmojiPack, v=>{S.useEmojiPack=v;save();bag=[];}),
    "152 real photographs: animals, sea creatures, fruits, vegetables, food, vehicles, things around the " +
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
  // one pair of rows per registered activity — nothing here names an activity
  ACTIVITIES.forEach(act=>{
    g3.appendChild(row(act.name.charAt(0) + act.name.slice(1).toLowerCase(),
      toggle(isEnabled(act.id), v=>{ setEnabled(act.id, v); save(); })));
    g3.appendChild(row(act.name.charAt(0) + act.name.slice(1).toLowerCase() + " level",
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
  // real-object rounds by theme, Trace tags each stroke by name). Purely
  // informational — nothing gates on it.
  const allTags = progress.tagStats || {};
  Object.keys(allTags).forEach(actId=>{
    const forAct = allTags[actId];
    const keys = Object.keys(forAct);
    if(!keys.length) return;
    const head = el("div","hint", activityById(actId).name.toLowerCase().replace(/^./,c=>c.toUpperCase()) +
      ", by kind (independent / seen):");
    head.style.marginTop = "4px";
    g5.appendChild(head);
    keys.forEach(t=>{
      const st2 = forAct[t]; if(!st2 || !st2.n) return;
      const r = el("div","stat");
      r.appendChild(el("span",null, t[0].toUpperCase()+t.slice(1)));
      r.appendChild(el("span",null, st2.indep + "/" + st2.n + " (" + Math.round(100*st2.indep/st2.n) + "%)"));
      g5.appendChild(r);
    });
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
    progress = {sessions:[], perLevel:{}, tagStats:{}, best:{}}; save(); openSettings();
  });
  expRow.append(expBtn, clrBtn);
  g5.appendChild(expRow);
  g5.appendChild(ta);
  b.appendChild(g5);

  /* code */
  const g6 = group("Passcode");
  const codeRow = el("div","row");
  const codeIn = el("input"); codeIn.type="tel"; codeIn.value = S.gate; codeIn.maxLength = 6;
  codeIn.style.cssText = "width:110px;padding:9px;border:1px solid var(--line);border-radius:10px;font-size:17px;text-align:center";
  codeIn.addEventListener("change", ()=>{ const v = codeIn.value.replace(/\D/g,""); if(v.length>=3){ S.gate = v; save(); } else codeIn.value = S.gate; });
  codeRow.append(el("label",null,"Settings passcode"), codeIn);
  codeRow.appendChild(el("div","hint","Long-press the ⚙️ on the home screen for 1 second to get here."));
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
