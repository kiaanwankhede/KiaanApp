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
/* A soft colour per game, and the same one forever.

   Nine white boxes differing only by emoji is the weakest identifier there is
   for someone who cannot read the names — colour plus picture is a far faster
   one, and "the green one" is how he will actually find Order. Fixed per id
   rather than by position in the registry, so adding an activity never shuffles
   the colours he has already learned.

   All of them are pale on purpose. The screen used to carry nine saturated blue
   PLAY pills, which were the loudest thing on it; a wash at this lightness
   gives each tile an identity without raising the contrast of the page. An id
   with no colour here falls back to plain white and works exactly as before —
   adding an activity stays the three one-line changes CLAUDE.md promises. */
const CARD_TINTS = {
  pattern:  "#eaf1fd",     // blue
  sort:     "#e9f5ef",     // green
  seriate:  "#fdf0e6",     // peach
  count:    "#fdf8e3",     // butter
  trace:    "#f1edfb",     // lavender
  match:    "#fdeef1",     // rose
  wordfind: "#e7f3f6",     // teal
  sky:      "#fdf4e4",     // sand
  nine:     "#eff6ea"      // leaf
};

/* The tile IS the button. There used to be a separate PLAY pill inside the
   card, which meant his one decision competed with four other things in the
   same box and the actual target was the smallest of them. Now the whole tile
   is what he taps, and the parent's level control sits BELOW it, outside the
   tile — two audiences, two places, no risk of a stray tap on "+" doing
   nothing when he meant to start the game. */
function buildCard(act){
  const cell = el("div","cardcell");

  const card = el("button","card playbtn"); card.id = "card-" + act.id;
  card.dataset.kind = act.id;
  card.style.setProperty("--tint", CARD_TINTS[act.id] || "var(--card)");
  card.appendChild(el("div","ic", act.icon));
  card.appendChild(el("div","nm", act.name));
  card.addEventListener("click", ()=>{
    goFullscreen(); keepAwake();   // a tap on the tile is a real user gesture, so both are allowed
    if(isEnabled(act.id)) startSession(act.id);
  });
  cell.appendChild(card);

  if(!act.oneShot){
    const row = el("div","lvrow");
    const minus = el("button","lvbtn","−"); minus.dataset.kind = act.id; minus.dataset.dir = "-1";
    const label = el("div","lv"); label.id = "lv-" + act.id;
    const plus  = el("button","lvbtn","+"); plus.dataset.kind = act.id; plus.dataset.dir = "1";
    row.append(minus, label, plus);
    cell.appendChild(row);
    minus.addEventListener("click", ()=>changeLevel(act.id, -1));
    plus .addEventListener("click", ()=>changeLevel(act.id,  1));
  }

  return cell;
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
      label.innerHTML = "";
      label.appendChild(el("span","lv-n", "Level " + lv + "/" + act.maxLevel()));
      const what = act.levelLabel(lv);
      if(what) label.appendChild(el("span","lv-what", what));
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
  // The session is over, but sess stays alive to write its record — so mark it,
  // or the timers still in flight from the last right answer (see
  // sessionGuard() in 50-session.js) would go on firing into the screen the
  // parent has just left.
  if(sess) sess.over = true;
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
