/* ============================ BOOT ============================ */
document.addEventListener("contextmenu", e=>e.preventDefault());
document.addEventListener("gesturestart", e=>e.preventDefault());

/* ---- keep him inside the app as far as a web page is allowed to ----
   A page can't block the address bar, the tab switcher or the home button —
   browsers stop that on purpose. Screen Pinning (Android) or Guided Access
   (iPad) is what actually locks the tablet; the Settings panel explains how.
   What we CAN do: go fullscreen so there's no browser furniture to tap, keep
   the screen awake, swallow the back gesture, and kill pull-to-refresh. */
function goFullscreen(){
  const d = document.documentElement;
  if(document.fullscreenElement) return;
  const req = d.requestFullscreen || d.webkitRequestFullscreen;
  if(req) { try{ const p = req.call(d, {navigationUI:"hide"}); if(p && p.catch) p.catch(()=>{}); }catch(e){} }
}
// Back / swipe-back returns to the home screen instead of leaving the app.
history.pushState({lr:1}, "");
window.addEventListener("popstate", ()=>{
  history.pushState({lr:1}, "");        // immediately re-arm so back never pops us out
  if($("#gate").classList.contains("on") || $("#settings").classList.contains("on")){ goHome(); return; }
  if($("#play").classList.contains("on") || $("#reward").classList.contains("on")){
    clearTimeout(rewardTimer);
    if(sess && sess.correct) endSession(); else goHome();
    return;
  }
  goHome();
});
let wake = null;
async function keepAwake(){
  try{ if(navigator.wakeLock && !wake) wake = await navigator.wakeLock.request("screen"); }catch(e){}
}
document.addEventListener("visibilitychange", ()=>{
  if(document.visibilityState === "visible"){ wake = null; keepAwake(); }
});
keepAwake();
loadCustom().then(()=>{ buildHomeCards(); goHome(); });
