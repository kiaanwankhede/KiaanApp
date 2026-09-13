/* Small DOM helpers, screen switching, and the assisted-mode hand hint. */
/* ============================ HELPERS ============================ */
const $ = s => document.querySelector(s);
const el = (tag, cls, html) => { const d=document.createElement(tag); if(cls)d.className=cls; if(html!=null)d.innerHTML=html; return d; };
const rnd = n => (Math.random()*n)|0;
const pick = a => a[rnd(a.length)];
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]];} return a; }
function show(id){ clearHint(); document.querySelectorAll(".screen").forEach(s=>s.classList.remove("on")); $(id).classList.add("on"); }

/* ---- assisted-mode hand hint ---- */
let hintTimer = null;
let hintTarget = null;
function clearHint(){
  if(hintTimer){ clearTimeout(hintTimer); hintTimer=null; }
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
  if(sess) sess.hintShownThisRound = true; // a prompted correct answer doesn't count as independent mastery
  clearHint();
  hintTarget = target;
  requestAnimationFrame(()=>{
    if(hintTarget !== target) return;     // cleared while we waited for the frame
    $("#hintlayer").appendChild(el("div","hint-hand","👆"));
    placeHint();
    hintTimer = setTimeout(clearHint, 3200);
  });
}
// resize covers the fullscreen swap and rotation; the extra frame catches
// browsers that fire it before the new layout has settled.
function repositionHint(){ placeHint(); requestAnimationFrame(placeHint); }
window.addEventListener("resize", repositionHint);
window.addEventListener("orientationchange", repositionHint);
document.addEventListener("fullscreenchange", repositionHint);
document.addEventListener("webkitfullscreenchange", repositionHint);
document.addEventListener("pointerdown", clearHint, true);

