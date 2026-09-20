/* ============================ HOME ============================
   The home screen is built from the registry, so an activity appears here
   purely by being in ACTIVITIES — no markup to add, no handler to wire.

   An activity may optionally declare `section` (a heading it groups under —
   omit it and the activity renders in the plain, unheaded row at the top,
   exactly as before this existed) and `date` ("YYYY-MM-DD", so it sorts
   correctly as text). Inside a section, cards are grouped one more level
   down by that exact date — several games on the same date share one date
   heading and sit side by side under it — and the date groups themselves
   always sort oldest first. Activities with no section are never grouped or
   sorted by date, only listed in registry order, exactly as before any of
   this existed.

   An activity may also declare `oneShot: true` — a single fixed game with
   no ladder (Toondemy's own games: they recreate one specific lesson video
   exactly, not a graded curriculum on top of it). Its card gets no level
   stepper, since there is nowhere for it to step to.
   ============================================================== */
function formatSectionDate(iso){
  if(!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return d + " " + MONTHS[m - 1] + " " + y;
}
function buildCard(act){
  const card = el("div","card"); card.id = "card-" + act.id;
  card.appendChild(el("div","ic", act.icon));
  card.appendChild(el("div","nm", act.name));

  if(!act.oneShot){
    const row = el("div","lvrow");
    const minus = el("button","lvbtn","−"); minus.dataset.kind = act.id; minus.dataset.dir = "-1";
    const label = el("div","lv"); label.id = "lv-" + act.id;
    const plus  = el("button","lvbtn","+"); plus.dataset.kind = act.id; plus.dataset.dir = "1";
    row.append(minus, label, plus);
    card.appendChild(row);
    minus.addEventListener("click", ()=>changeLevel(act.id, -1));
    plus .addEventListener("click", ()=>changeLevel(act.id,  1));
  }

  const play = el("button","playbtn","▶ PLAY"); play.dataset.kind = act.id;
  card.appendChild(play);

  play .addEventListener("click", ()=>{
    goFullscreen(); keepAwake();   // PLAY is a real user gesture, so both are allowed here
    if(isEnabled(act.id)) startSession(act.id);
  });
  return card;
}
/* Pure grouping, kept free of the DOM so it can be tested on its own —
   activities in registry order for the plain row and within a date group;
   sections in order of first appearance; date groups oldest first. */
function groupHomeSections(activities){
  const plain = activities.filter(act => !act.section);
  const sections = [];
  activities.forEach(act=>{
    if(!act.section) return;
    let sec = sections.find(s => s.name === act.section);
    if(!sec){ sec = { name: act.section, dates: [] }; sections.push(sec); }
    let grp = sec.dates.find(g => g.date === act.date);
    if(!grp){ grp = { date: act.date, acts: [] }; sec.dates.push(grp); }
    grp.acts.push(act);
  });
  sections.forEach(sec => sec.dates.sort((a, b)=> (a.date || "").localeCompare(b.date || "")));
  return { plain, sections };
}
/* The activity after this one in its own section, in the same oldest-first
   order the home screen lists them — wraps back to the first past the last.
   null if this activity has no section, or is the only thing in it. */
function nextInSection(act){
  if(!act.section) return null;
  const sec = groupHomeSections(ACTIVITIES).sections.find(s => s.name === act.section);
  if(!sec) return null;
  const flat = [];
  sec.dates.forEach(grp => flat.push(...grp.acts));
  if(flat.length < 2) return null;
  const idx = flat.findIndex(a => a.id === act.id);
  return idx === -1 ? null : flat[(idx + 1) % flat.length];
}
function buildHomeCards(){
  const wrap = $("#homeCards");
  wrap.innerHTML = "";

  const cardRow = (acts)=>{
    const row = el("div","cards");
    acts.forEach(act => row.appendChild(buildCard(act)));
    wrap.appendChild(row);
  };

  const { plain, sections } = groupHomeSections(ACTIVITIES);
  cardRow(plain);
  sections.forEach(sec=>{
    wrap.appendChild(el("div","section-heading", sec.name));
    sec.dates.forEach(grp=>{
      wrap.appendChild(el("div","date-heading", formatSectionDate(grp.date)));
      cardRow(grp.acts);
    });
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
