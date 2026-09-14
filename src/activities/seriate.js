/* ============================ ACTIVITY: ORDER ============================
   "Finish the steps" — a staircase of five pieces, smallest to biggest, with
   some of them missing. Drag the right piece into each hole.

   THE STAIRCASE
   -------------
   The staircase is ALWAYS five slots wide. What changes is how many of them
   are empty: one at first, then two, three, four, and finally all five, which
   is full seriation. Keeping the width fixed means the screen looks the same
   at every level — only the number of holes changes — so climbing the ladder
   never means learning a new layout.

   With four of five already placed, the ordering rule is visible on screen and
   he can read it off the gradient. The early levels are a completion task, and
   the support fades by taking pieces away rather than by changing the task.

   Gap positions vary: if the hole were always the big end, "put the fattest one
   on the right" would score perfectly without any ordering at all. A hole in
   the MIDDLE is the real target — that piece has to be bigger than its left
   neighbour and smaller than its right one at the same time.

   STAGES, NOT ONE SORTED LIST
   ---------------------------
   Unlike Patterns and Sorting, this ladder is grouped into stages, and each
   stage adds exactly one new thing to look past:

     1. plain bars      one colour, one shape — height is the ONLY difference
     2. coloured bars   every piece a different colour
     3. shapes          area instead of length; one colour again at first
     4. mixed shapes    a different shape on every piece
     5. pictures        one fruit / animal / vehicle per round, at five sizes
     6. tiny steps      the sizes close together

   That breaks the "order by real difficulty, not by structure" rule on
   purpose: the easiest coloured round sits behind the hardest plain one. It
   came from playing the first version, where colour changed piece to piece on
   the very first level — two things changing at once, when the first levels
   have to change exactly one. Inside a stage, levels are still ordered by load.

   Colour is either the same for the whole round ("one") or random on every
   piece ("each"). Both are safe against him ordering by colour: the danger is
   colour TRACKING size, and a colour that never changes tracks nothing. What
   is never allowed is a colour that goes with a position.

   Pictures use one kind per round — five apples, never an apple beside a
   banana. Emoji fill their boxes unevenly, so across kinds a "bigger" banana
   can look smaller than an apple and the right answer stops being clear.
   ========================================================================= */

const SERIATE_SLOTS = 5;
const SERIATE_RATIOS = { wide:1.30, mid:1.18, tight:1.10 };
const SERIATE_MIN_SCALE = 0.30;          // below this a piece is too small to judge
const SERIATE_PICTURES = [].concat(THEMES.fruits, THEMES.animals, THEMES.vehicles);

const SERIATE_LEVELS = [
  // 1 — plain bars: one colour, one shape, height is all there is
  { stage:1, load:-0.8, name:"Bars · last one · guides",  gaps:1, where:"bigEnd",   spread:"far",  material:"bar", colour:"one",  steps:"wide", guides:true },
  { stage:1, load: 0.0, name:"Bars · last one",           gaps:1, where:"bigEnd",   spread:"far",  material:"bar", colour:"one",  steps:"wide" },
  { stage:1, load: 0.2, name:"Bars · first one",          gaps:1, where:"smallEnd", spread:"far",  material:"bar", colour:"one",  steps:"wide" },
  { stage:1, load: 0.8, name:"Bars · one in the middle",  gaps:1, where:"middle",   spread:"far",  material:"bar", colour:"one",  steps:"wide" },
  { stage:1, load: 1.6, name:"Bars · 2 gaps",             gaps:2, where:"mixed",    spread:"far",  material:"bar", colour:"one",  steps:"wide" },
  { stage:1, load: 2.4, name:"Bars · 3 gaps",             gaps:3, where:"mixed",    spread:"far",  material:"bar", colour:"one",  steps:"wide" },
  { stage:1, load: 2.5, name:"Bars · all 5 · guides",     gaps:5, where:"all",      spread:"far",  material:"bar", colour:"one",  steps:"wide", guides:true },
  { stage:1, load: 3.2, name:"Bars · all 5",              gaps:5, where:"all",      spread:"far",  material:"bar", colour:"one",  steps:"wide" },

  // 2 — coloured bars: the same staircase, colour now changes piece to piece
  { stage:2, load: 2.2, name:"Colour bars · one gap",     gaps:1, where:"mixed",    spread:"near", material:"bar", colour:"each", steps:"mid" },
  { stage:2, load: 3.2, name:"Colour bars · 2 gaps",      gaps:2, where:"mixed",    spread:"near", material:"bar", colour:"each", steps:"mid" },
  { stage:2, load: 3.4, name:"Colour bars · 3 gaps",      gaps:3, where:"mixed",    spread:"far",  material:"bar", colour:"each", steps:"mid" },
  { stage:2, load: 4.1, name:"Colour bars · 4 gaps",      gaps:4, where:"mixed",    spread:"far",  material:"bar", colour:"each", steps:"mid" },
  { stage:2, load: 4.2, name:"Colour bars · all 5",       gaps:5, where:"all",      spread:"far",  material:"bar", colour:"each", steps:"mid" },

  // 3 — shapes: area instead of length. Back to one colour while that's new.
  { stage:3, load: 0.4, name:"Shapes · last one",         gaps:1, where:"bigEnd",   spread:"far",  material:"shape", colour:"one",  steps:"wide" },
  { stage:3, load: 1.2, name:"Shapes · one in the middle",gaps:1, where:"middle",   spread:"far",  material:"shape", colour:"one",  steps:"wide" },
  { stage:3, load: 3.3, name:"Shapes · 3 gaps",           gaps:3, where:"mixed",    spread:"far",  material:"shape", colour:"one",  steps:"mid" },
  { stage:3, load: 4.1, name:"Shapes · all 5",            gaps:5, where:"all",      spread:"far",  material:"shape", colour:"one",  steps:"mid" },
  { stage:3, load: 4.6, name:"Colour shapes · all 5",     gaps:5, where:"all",      spread:"far",  material:"shape", colour:"each", steps:"mid" },

  // 4 — mixed shapes: a different shape on every piece
  { stage:4, load: 4.1, name:"Mixed shapes · 2 gaps",     gaps:2, where:"mixed",    spread:"near", material:"mixed", colour:"each", steps:"mid" },
  { stage:4, load: 4.3, name:"Mixed shapes · 3 gaps",     gaps:3, where:"mixed",    spread:"far",  material:"mixed", colour:"each", steps:"mid" },
  { stage:4, load: 5.1, name:"Mixed shapes · all 5",      gaps:5, where:"all",      spread:"far",  material:"mixed", colour:"each", steps:"mid" },

  // 5 — pictures: one fruit / animal / vehicle per round, at five sizes
  { stage:5, load: 1.8, name:"Pictures · one in the middle", gaps:1, where:"middle", spread:"far", material:"picture", colour:"one", steps:"wide" },
  { stage:5, load: 3.9, name:"Pictures · 3 gaps",         gaps:3, where:"mixed",    spread:"far",  material:"picture", colour:"one", steps:"mid" },
  { stage:5, load: 4.7, name:"Pictures · all 5",          gaps:5, where:"all",      spread:"far",  material:"picture", colour:"one", steps:"mid" },

  // 6 — tiny steps: the sizes close together
  { stage:6, load: 4.8, name:"Colour bars · all 5 · tiny steps",  gaps:5, where:"all", spread:"far", material:"bar",   colour:"each", steps:"tight" },
  { stage:6, load: 5.7, name:"Mixed shapes · all 5 · tiny steps", gaps:5, where:"all", spread:"far", material:"mixed", colour:"each", steps:"tight" }
];
// stage first, then load inside the stage — stable, so declaration order breaks ties
SERIATE_LEVELS.sort((a,b)=> (a.stage - b.stage) || (a.load - b.load));
function seriateEntry(lv){ return SERIATE_LEVELS[Math.min(Math.max(lv,1), SERIATE_LEVELS.length) - 1]; }

const scaleOfItem = (it)=> it.k==="shape" ? it.size : it.scale;
const round4 = (n)=> Math.round(n*10000)/10000;

/* Five sizes in geometric steps, biggest exactly 1 so it fills its tile. */
function seriateScales(ratio){
  const out = [];
  for(let i=0;i<SERIATE_SLOTS;i++) out.push(round4(Math.pow(ratio, i - (SERIATE_SLOTS-1))));
  return out;
}

/* What's fixed for a whole round: its one colour, its one shape, its picture.
   A level decides which of those it holds still and which vary per piece. */
function seriateRoundLook(){
  return { colour: pick(Object.keys(COLORS)), shape: pick(SHAPES), picture: pick(SERIATE_PICTURES) };
}
function seriatePiece(e, scale, look){
  if(e.material === "picture") return { k:"em", ch:look.picture, scale:scale };
  const color = e.colour === "each" ? pick(Object.keys(COLORS)) : look.colour;
  if(e.material === "bar") return { k:"bar", color:color, scale:scale };
  return { k:"shape", shape: e.material==="mixed" ? pick(SHAPES) : look.shape, color:color, size:scale };
}

function seriateGapPositions(e){
  const all = [0,1,2,3,4];
  if(e.gaps >= SERIATE_SLOTS) return all;
  if(e.gaps === 1){
    if(e.where === "bigEnd")   return [SERIATE_SLOTS-1];
    if(e.where === "smallEnd") return [0];
    if(e.where === "middle")   return [pick([1,2,3])];
    return [pick(all)];
  }
  return shuffle(all).slice(0, e.gaps).sort((a,b)=>a-b);
}

/* Wrong options are sized BETWEEN the real steps, never equal to one of them —
   a distractor that matches a piece already standing in the staircase reads as
   a duplicate rather than as a wrong answer. "near" offers the ones closest in
   size to the right answer, "far" the ones furthest from it. */
function seriateDistractorScales(want, scales){
  const mids = [];
  for(let i=0;i<scales.length-1;i++) mids.push(round4(Math.sqrt(scales[i]*scales[i+1])));
  mids.push(round4(Math.max(SERIATE_MIN_SCALE, scales[0]/1.4)));
  return mids.sort((a,b)=>Math.abs(a-want) - Math.abs(b-want));   // closest first
}

function buildSeriate(lv){
  const e = seriateEntry(lv);
  const scales = seriateScales(SERIATE_RATIOS[e.steps]);
  const look = seriateRoundLook();
  const pieces = scales.map(s=>seriatePiece(e, s, look));
  const gaps = seriateGapPositions(e);

  const want = scales[gaps[0]];
  const tray = gaps.map(i=>pieces[i]);
  const extra = Math.max(3, gaps.length) - gaps.length;   // always a real choice to make
  if(extra > 0){
    let cand = seriateDistractorScales(want, scales);
    if(e.spread !== "near") cand = cand.slice().reverse();   // "far" takes the least similar
    // wrong options wear the round's look too, so on a one-colour level they
    // differ from the right answer in size and nothing else
    cand.slice(0, extra).forEach(s=>tray.push(seriatePiece(e, s, look)));
  }

  // never hand him the answer already laid out in order
  let shown = shuffle(tray), guard = 0;
  while(guard++ < 25 && shown.length > 1 &&
        shown.every((it,i)=> i===0 || scaleOfItem(shown[i-1]) < scaleOfItem(it))) shown = shuffle(tray);

  return { entry:e, scales, pieces, gaps, tray:shown, head:"Finish the steps" };
}

const SERIATION = {
  id: "seriate",
  name: "ORDER",
  icon: "📶",
  maxLevel: ()=> SERIATE_LEVELS.length,
  levelLabel: (lv)=> seriateEntry(lv).name,
  settingsHint: (lv)=>{
    const e = seriateEntry(lv);
    const missing = e.gaps >= SERIATE_SLOTS ? "The whole staircase is empty."
                  : e.gaps === 1 ? "One piece is missing." : e.gaps + " pieces are missing.";
    const look = e.material === "picture" ? " Five of the same picture, in different sizes."
               : e.colour === "one" ? " Every piece is the same colour, so size is the only difference."
               : " Colours change from piece to piece.";
    return "Five steps, smallest to biggest. " + missing + look +
           (e.guides ? " Faint outlines show what goes where." : "");
  },

  startRound(level, api){
    const r = buildSeriate(level);
    const e = r.entry;
    const st = api.stage;
    st.appendChild(el("div","prompt-line", r.head));

    const px = 76;                       // every tile is the same box, so only the drawing differs
    const row = el("div","seq steps");
    const slotAt = [];
    r.scales.forEach((s,i)=>{
      if(r.gaps.indexOf(i) === -1){
        row.appendChild(itemNode(r.pieces[i], px));
        slotAt.push(null);
        return;
      }
      const slot = el("div","slot dropzone");
      slot.style.setProperty("--t", px+"px");
      slot.dataset.full = "1";           // holes are opened one at a time, left to right
      if(e.guides){
        const ghost = itemNode(Object.assign({}, r.pieces[i], { color:"#c9d4e3" }), px);
        ghost.classList.add("ghost");
        slot.appendChild(ghost);
      }
      row.appendChild(slot);
      slotAt.push(slot);
    });
    st.appendChild(row);

    let idx = 0;                                     // which hole is live
    const wantNow = ()=> r.scales[r.gaps[idx]];
    const openNext = ()=>{
      slotAt.forEach(s=>{ if(s) s.dataset.full = "1"; });
      const s = slotAt[r.gaps[idx]];
      if(s) delete s.dataset.full;                   // the only zone a drop can land in
    };

    const tray = el("div","tray");
    let hintNode = null;
    r.tray.forEach(it=>{
      const wrap = el("div","opt");
      const node = itemNode(it, px);
      wrap.appendChild(node);
      if(hintNode === null && scaleOfItem(it) === r.scales[r.gaps[0]]) hintNode = node;
      makeDraggable(node, (zone)=>{
        if(!zone) return;
        if(scaleOfItem(it) === wantNow()){
          zone.innerHTML = "";
          zone.appendChild(itemNode(it, px));
          zone.classList.add("done");
          zone.dataset.full = "1";
          wrap.classList.add("gone");
          idx++;
          api.refocus();                             // next hole starts its own prompting
          tray.querySelectorAll(".opt").forEach(o=>o.classList.remove("dim","pick"));
          if(idx >= r.gaps.length) api.solved(e.material);
          else openNext();
        } else {
          const attempts = api.miss();
          const fits = (o)=> o.firstChild && o.firstChild._item &&
                             scaleOfItem(o.firstChild._item) === wantNow();
          if(attempts >= S.dimAfter) tray.querySelectorAll(".opt").forEach(o=>{ if(!fits(o)) o.classList.add("dim"); });
          if(attempts >= S.showAfter) tray.querySelectorAll(".opt").forEach(o=>{ if(fits(o)) o.classList.add("pick"); });
        }
      });
      tray.appendChild(wrap);
    });
    st.appendChild(tray);

    openNext();
    api.hint(hintNode);
  }
};
