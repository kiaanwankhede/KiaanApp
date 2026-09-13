/* ============================ GATE ============================ */
let pressTimer = null, entered = "";
$("#gear").addEventListener("pointerdown", ()=>{
  pressTimer = setTimeout(()=>{ entered=""; drawGate(); show("#gate"); }, 1200);
});
["pointerup","pointerleave","pointercancel"].forEach(ev=>
  $("#gear").addEventListener(ev, ()=>clearTimeout(pressTimer)));
function drawGate(){
  $("#gateDots").textContent = "•".repeat(entered.length);
  const k = $("#gateKeys"); k.innerHTML="";
  ["1","2","3","4","5","6","7","8","9","⌫","0",""].forEach(d=>{
    const b = el("button", null, d);
    if(d==="") b.style.visibility="hidden";
    b.addEventListener("click", ()=>{
      if(d==="⌫") entered = entered.slice(0,-1);
      else entered += d;
      if(entered.length >= S.gate.length){
        if(entered === S.gate){ openSettings(); return; }
        entered = "";
      }
      drawGate();
    });
    k.appendChild(b);
  });
}
$("#gateCancel").addEventListener("click", goHome);
