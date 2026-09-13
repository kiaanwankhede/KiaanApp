/* ============================ ACTIVITY: ORDER ============================
   "Finish the steps" — a staircase of five pieces, smallest to biggest, with
   some of them missing. Drag the right piece into each hole.

   THE LADDER
   ----------
   The staircase is ALWAYS five slots wide. What changes is how many of them
   are empty: one at first, then two, three, four, and finally all five, which
   is full seriation. Keeping the width fixed means the screen looks the same
   at every level — only the number of holes changes — so climbing the ladder
   never means learning a new layout.

   With four of five already placed, the ordering rule is visible on screen and
   he can read it off the gradient. That is the point: the early levels are a
   completion task, and the support fades by taking pieces away rather than by
   changing what the task looks like.

   Five axes, each scored into an explicit load, and the list is sorted by that
   load — so a hard judgement on one hole sits next to an easy one on three
   holes rather than being walled off behind it:

     gaps        1 -> 5            how many decisions, and how much is visible
     where       end -> middle     a hole at the end asks for the biggest or
                                   smallest; a hole in the MIDDLE asks for the
                                   piece that is bigger than its left neighbour
                                   AND smaller than its right one, which is the
                                   transitive judgement and the real target
     spread      far -> near       how close the wrong options are in size
     material    bars -> shapes    length (one dimension) before area (two)
     steps       wide -> tight     how far apart the sizes are

   Colour is random on every piece at every level, so it can never become the
   thing he orders on. Gap positions vary too: if the hole were always the big
   end, "put the fattest one on the right" would score perfectly without any
   ordering at all.
   ========================================================================= */

const SERIATE_SLOTS = 5;
const SERIATE_RATIOS = { wide:1.30, mid:1.18, tight:1.10 };
const SERIATE_MIN_SCALE = 0.30;          // below this a piece is too small to judge

const SERIATE_LEVELS = [
  { load:-0.8, name:"Bars · last one · guides", gaps:1, where:"bigEnd",   spread:"far",  material:"bar",   steps:"wide",  guides:true },
  { load: 0.0, name:"Bars · last one",          gaps:1, where:"bigEnd",   spread:"far",  material:"bar",   steps:"wide"  },
  { load: 0.2, name:"Bars · first one",         gaps:1, where:"smallEnd", spread:"far",  material:"bar",   steps:"wide"  },
  { load: 0.8, name:"Bars · one in the middle", gaps:1, where:"middle",   spread:"far",  material:"bar",   steps:"wide"  },
  { load: 1.4, name:"Bars · middle · close sizes", gaps:1, where:"middle", spread:"near", material:"bar",  steps:"wide"  },
  { load: 1.6, name:"Bars · 2 gaps",            gaps:2, where:"mixed",    spread:"far",  material:"bar",   steps:"wide"  },
  { load: 2.1, name:"Shapes · one gap · close sizes", gaps:1, where:"mixed", spread:"near", material:"shape", steps:"mid" },
  { load: 2.4, name:"Bars · all 5 · guides",    gaps:5, where:"all",      spread:"far",  material:"bar",   steps:"wide", guides:true },
  { load: 2.7, name:"Bars · 2 gaps · close sizes", gaps:2, where:"mixed", spread:"near", material:"bar",   steps:"mid"   },
  { load: 3.1, name:"Shapes · 2 gaps · close sizes", gaps:2, where:"mixed", spread:"near", material:"shape", steps:"mid" },
  { load: 3.2, name:"Bars · all 5",             gaps:5, where:"all",      spread:"far",  material:"bar",   steps:"wide"  },
  { load: 3.5, name:"Bars · 3 gaps",            gaps:3, where:"mixed",    spread:"near", material:"bar",   steps:"mid"   },
  { load: 3.9, name:"Shapes · 3 gaps",          gaps:3, where:"mixed",    spread:"near", material:"shape", steps:"mid"   },
  { load: 4.1, name:"Shapes · all 5",           gaps:5, where:"all",      spread:"far",  material:"shape", steps:"mid"   },
  { load: 4.2, name:"Bars · 4 gaps",            gaps:4, where:"mixed",    spread:"near", material:"bar",   steps:"mid"   },
  { load: 4.3, name:"Bars · all 5 · tiny steps",gaps:5, where:"all",      spread:"far",  material:"bar",   steps:"tight" },
  { load: 4.4, name:"Mixed shapes · 3 gaps",    gaps:3, where:"mixed",    spread:"near", material:"mixed", steps:"mid"   },
  { load: 4.6, name:"Shapes · 4 gaps",          gaps:4, where:"mixed",    spread:"near", material:"shape", steps:"mid"   },
  { load: 4.6, name:"Mixed shapes · all 5",     gaps:5, where:"all",      spread:"far",  material:"mixed", steps:"mid"   },
  { load: 5.2, name:"Mixed shapes · all 5 · tiny steps", gaps:5, where:"all", spread:"far", material:"mixed", steps:"tight" }
];
SERIATE_LEVELS.sort((a,b)=>a.load - b.load);   // stable, so declaration order breaks ties
function seriateEntry(lv){ return SERIATE_LEVELS[Math.min(Math.max(lv,1), SERIATE_LEVELS.length) - 1]; }

const scaleOfItem = (it)=> it.k==="bar" ? it.scale : it.size;
const round4 = (n)=> Math.round(n*10000)/10000;

/* Five sizes in geometric steps, biggest exactly 1 so it fills its tile. */
function seriateScales(ratio){
  const out = [];
  for(let i=0;i<SERIATE_SLOTS;i++) out.push(round4(Math.pow(ratio, i - (SERIATE_SLOTS-1))));
  return out;
}

function seriatePiece(material, scale, roundShape){
  const cols = Object.keys(COLORS);
  // colour is random per piece throughout — it must never predict position
  if(material === "bar") return { k:"bar", color:pick(cols), scale:scale };
  return { k:"shape", shape: material==="mixed" ? pick(SHAPES) : roundShape, color:pick(cols), size:scale };
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
  const roundShape = pick(SHAPES);                 // one shape per round unless "mixed"
  const pieces = scales.map(s=>seriatePiece(e.material, s, roundShape));
  const gaps = seriateGapPositions(e);

  const want = scales[gaps[0]];
  const tray = gaps.map(i=>pieces[i]);
  const extra = Math.max(3, gaps.length) - gaps.length;   // always a real choice to make
  if(extra > 0){
    let cand = seriateDistractorScales(want, scales);
    if(e.spread !== "near") cand = cand.slice().reverse();   // "far" takes the least similar
    cand.slice(0, extra).forEach(s=>tray.push(seriatePiece(e.material, s, roundShape)));
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
    return "Five steps, smallest to biggest. " + missing +
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
