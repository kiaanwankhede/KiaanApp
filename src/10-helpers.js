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
function clearHint(){ if(hintTimer){ clearTimeout(hintTimer); hintTimer=null; } $("#hintlayer").innerHTML=""; }
function showHint(target){
  if(!S.assistedMode || !target) return;
  if(sess) sess.hintShownThisRound = true; // a prompted correct answer doesn't count as independent mastery
  clearHint();
  requestAnimationFrame(()=>{
    const r = target.getBoundingClientRect();
    const h = el("div","hint-hand","👆");
    h.style.left = (r.left + r.width/2) + "px";
    h.style.top  = (r.top + r.height*0.2) + "px";
    $("#hintlayer").appendChild(h);
    hintTimer = setTimeout(clearHint, 3200);
  });
}
document.addEventListener("pointerdown", clearHint, true);

