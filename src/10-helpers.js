/* Small DOM helpers, screen switching, and the assisted-mode hand hint. */
/* ============================ HELPERS ============================ */
const $ = s => document.querySelector(s);
const el = (tag, cls, html) => { const d=document.createElement(tag); if(cls)d.className=cls; if(html!=null)d.innerHTML=html; return d; };
const rnd = n => (Math.random()*n)|0;
const pick = a => a[rnd(a.length)];
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]];} return a; }
function show(id){ clearHint(); document.querySelectorAll(".screen").forEach(s=>s.classList.remove("on")); $(id).classList.add("on"); }

/* ---- assisted-mode hand hint ----
   The hand waits HINT_DELAY_MS before it appears, and that gap is his chance to
   answer on his own. A round he answers before the hand shows up counts toward
   moving up; once the hand has appeared the round counts neither for nor
   against him (see solved() in 50-session.js). Touching anything before then
   means he's started, and the hand stays away for that round.

   It used to appear the instant a round began. Every round was then "prompted",
   so with assisted mode on no round could ever count: he could never move up,
   and a block with nothing counted read as 0% and dropped him a level even when
   every answer was right. */
const HINT_DELAY_MS = 3000;
let hintTimer = null, hintWait = null;
let hintTarget = null;
function clearHint(){
  if(hintTimer){ clearTimeout(hintTimer); hintTimer=null; }
  if(hintWait){ clearTimeout(hintWait); hintWait=null; }
  hintTarget = null;
  $("#hintlayer").innerHTML="";
}
/* The hand sits in a fixed layer at measured pixel coordinates, so it has to be
   re-measured whenever the viewport moves underneath it rather than trusted
   once. The first PLAY of a launch is exactly that case: it asks for
   fullscreen, the browser chrome goes away a few frames later, everything
   reflows downward, and a hand placed before that is left pointing above what
   it meant to point at. Rotating the tablet does the same thing. */
function placeHint(){
  const h = $("#hintlayer").firstElementChild;
  if(!h || !hintTarget || !hintTarget.isConnected) return;
  const r = hintTarget.getBoundingClientRect();
  h.style.left = (r.left + r.width/2) + "px";
  h.style.top  = (r.top + r.height*0.2) + "px";
}
function showHint(target){
  if(!S.assistedMode || !target) return;
  clearHint();
  hintTarget = target;
  hintWait = setTimeout(()=>{
    hintWait = null;
    if(hintTarget !== target || !target.isConnected) return;   // he started, or the round moved on
    if(sess) sess.hintShownThisRound = true;   // from here on a right answer was prompted, not his own
    requestAnimationFrame(()=>{
      if(hintTarget !== target) return;     // cleared while we waited for the frame
      $("#hintlayer").appendChild(el("div","hint-hand","👆"));
      placeHint();
      hintTimer = setTimeout(clearHint, 3200);
    });
  }, HINT_DELAY_MS);
}
// resize covers the fullscreen swap and rotation; the extra frame catches
// browsers that fire it before the new layout has settled.
function repositionHint(){ placeHint(); requestAnimationFrame(placeHint); }
window.addEventListener("resize", repositionHint);
window.addEventListener("orientationchange", repositionHint);
document.addEventListener("fullscreenchange", repositionHint);
document.addEventListener("webkitfullscreenchange", repositionHint);
document.addEventListener("pointerdown", clearHint, true);

