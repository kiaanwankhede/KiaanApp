/* ============================ DRAG ============================ */
let drag = null;
function makeDraggable(node, onDrop){
  node.style.touchAction = "none";
  node.addEventListener("pointerdown", e=>{
    if(drag) return;
    e.preventDefault();
    const r = node.getBoundingClientRect();
    const size = parseFloat(getComputedStyle(node).getPropertyValue("--t")) || r.width;
    const ghost = itemNode(node._item, size);
    ghost.style.left = r.left + r.width/2 + "px";
    ghost.style.top  = r.top  + r.height/2 + "px";
    $("#draglayer").appendChild(ghost);
    node.classList.add("drag-src");
    drag = { node, ghost, onDrop, id:e.pointerId, w:r.width };
    try{ node.setPointerCapture(e.pointerId); }catch(err){}
  });
  node.addEventListener("pointermove", e=>{
    if(!drag || drag.id !== e.pointerId) return;
    e.preventDefault();
    drag.ghost.style.left = e.clientX + "px";
    drag.ghost.style.top  = (e.clientY - drag.w*0.55) + "px";
    highlight(e.clientX, e.clientY - drag.w*0.55);
  });
  const end = e=>{
    if(!drag || drag.id !== e.pointerId) return;
    const zone = nearestZone(e.clientX, e.clientY - drag.w*0.55);
    const d = drag; drag = null;
    d.ghost.remove(); d.node.classList.remove("drag-src");
    clearHighlight();
    d.onDrop(zone, d.node);
  };
  node.addEventListener("pointerup", end);
  node.addEventListener("pointercancel", end);
}
function zones(){ return Array.from(document.querySelectorAll(".dropzone")); }
function dist(r,x,y){
  const dx = x < r.left ? r.left - x : (x > r.right ? x - r.right : 0);
  const dy = y < r.top ? r.top - y : (y > r.bottom ? y - r.bottom : 0);
  return Math.hypot(dx,dy);
}
function nearestZone(x,y){
  let best=null, bd=1e9;
  zones().forEach(z=>{
    if(z.dataset.full==="1") return;
    const d = dist(z.getBoundingClientRect(), x, y);
    if(d < bd){ bd=d; best=z; }
  });
  return bd <= 70 ? best : null;
}
function highlight(x,y){
  const n = nearestZone(x,y);
  zones().forEach(z=>z.classList.toggle("near", z===n));
}
function clearHighlight(){ zones().forEach(z=>z.classList.remove("near")); }
