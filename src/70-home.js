/* ============================ HOME ============================
   The home screen is built from the registry, so an activity appears here
   purely by being in ACTIVITIES — no markup to add, no handler to wire.

   An activity may optionally declare `section` (a heading it groups under —
   omit it and the activity renders in the plain, unheaded row at the top,
   exactly as before this existed) and `date` ("YYYY-MM-DD", so it sorts
   correctly as text). Inside a section, cards always sort oldest date first;
   activities with no section are never sorted by date, only by registry order.
   ============================================================== */
function buildCard(act){
  const card = el("div","card"); card.id = "card-" + act.id;
  card.appendChild(el("div","ic", act.icon));
  card.appendChild(el("div","nm", act.name));

  const row = el("div","lvrow");
  const minus = el("button","lvbtn","−"); minus.dataset.kind = act.id; minus.dataset.dir = "-1";
  const label = el("div","lv"); label.id = "lv-" + act.id;
  const plus  = el("button","lvbtn","+"); plus.dataset.kind = act.id; plus.dataset.dir = "1";
  row.append(minus, label, plus);
  card.appendChild(row);

  const play = el("button","playbtn","▶ PLAY"); play.dataset.kind = act.id;
  card.appendChild(play);

  minus.addEventListener("click", ()=>changeLevel(act.id, -1));
  plus .addEventListener("click", ()=>changeLevel(act.id,  1));
  play .addEventListener("click", ()=>{
    goFullscreen(); keepAwake();   // PLAY is a real user gesture, so both are allowed here
    if(isEnabled(act.id)) startSession(act.id);
  });
  return card;
}
function buildHomeCards(){
  const wrap = $("#homeCards");
  wrap.innerHTML = "";

  const cardRow = (acts)=>{
    const row = el("div","cards");
    acts.forEach(act => row.appendChild(buildCard(act)));
    wrap.appendChild(row);
  };

  cardRow(ACTIVITIES.filter(act => !act.section));

  const sections = [];
  ACTIVITIES.forEach(act=>{
    if(!act.section) return;
    let sec = sections.find(s => s.name === act.section);
    if(!sec){ sec = { name: act.section, acts: [] }; sections.push(sec); }
    sec.acts.push(act);
  });
  sections.forEach(sec=>{
    sec.acts.sort((a, b)=> (a.date || "").localeCompare(b.date || ""));
    wrap.appendChild(el("div","section-heading", sec.name));
    cardRow(sec.acts);
  });
}
function changeLevel(id, dir){
  const act = activityById(id);
  const cur = levelOf(id);
  const next = Math.min(act.maxLevel(), Math.max(1, cur + dir));
  if(next === cur) return;
  setLevelOf(id, next);
  progress.perLevel[id+":"+next] = {n:0, indep:0, hits:0};
  save();
  updateHomeLabels();
}
function updateHomeLabels(){
  ACTIVITIES.forEach(act=>{
    const lv = levelOf(act.id);
    const label = $("#lv-" + act.id);
    if(label){
      const max = act.maxLevel();
      label.innerHTML = act.levelLabel(lv) +
        `<br><span style="font-size:10px;opacity:.65">Level ${lv}/${max}</span>`;
    }
    const card = $("#card-" + act.id);
    if(card) card.classList.toggle("off", !isEnabled(act.id));
    const play = document.querySelector('.playbtn[data-kind="'+act.id+'"]');
    if(play) play.disabled = !isEnabled(act.id);
  });
}
function renderHomeAssist(){
  const c = $("#assistToggleHome"); c.innerHTML = "";
  c.appendChild(toggle(S.assistedMode, v=>{ S.assistedMode = v; save(); }));
}
function goHome(){
  sess = null;
  updateHomeLabels();
  renderHomeAssist();
  show("#home");
}
function endSession(){
  progress.sessions.push({
    at: new Date().toISOString(), kind: sess.kind,
    level: levelOf(sess.kind),
    correct: sess.correct, misses: sess.misses, prompts: sess.prompts,
    firstTry: sess.clean, secs: Math.round((Date.now()-sess.started)/1000)
  });
  if(progress.sessions.length > 400) progress.sessions = progress.sessions.slice(-400);
  save();
  $("#doneLine").textContent = sess.correct + " right today";
  show("#done");
}
$("#doneHome").addEventListener("click", goHome);
$("#back").addEventListener("click", ()=>{ if(sess && sess.correct) endSession(); else goHome(); });
