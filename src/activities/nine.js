/* ============================ ACTIVITY: NINE ============================
   Drag a bee to every empty hive — or a ladybird to every empty leaf —
   until all nine are full.

   Recreates a second Toondemy lesson ("revision of number 9"): nine empty
   slots on screen, a supply of the right little creature to drag into them
   one at a time, a number badge overhead. The source app reads the number
   aloud, bursts confetti and drops in a mascot on finishing — none of that
   here, per the same rule Sky follows: the number badge is a still text
   tile, filling a hive draws nothing more than the shell's own quiet token,
   and there is no audio anywhere in this app, full stop.

   THE MECHANIC IS SORTING'S, NOT A NEW ONE
   -----------------------------------------
   Nine identical dropzones, a tray of draggables, drop the right one in an
   open zone — that is exactly Sorting's tray-and-bins pattern, just with
   every zone accepting the same one thing instead of a different rule per
   bin. Reusing it (same CSS, same makeDraggable, same dataset.full
   bookkeeping the shared drag engine already skips a full zone for) means
   nothing new had to be taught to the tablet just to fill nine hives.

   ONLY WHAT THE LESSON ACTUALLY SHOWS
   ------------------------------------
   The video is one lesson about the number 9, in two scenes (bees, then
   ladybirds) — not a curriculum for every number, and Sky's own feedback was
   about inventing too much on top of a source rather than too little. So
   this stays two themes at a fixed nine, not a 1-to-9 ladder that would
   duplicate How Many's job. The one thing added beyond the two scenes is
   this app's own habit of guarding against a shortcut: at the harder level
   of each theme a couple of decoy bugs sit in the tray too, so filling every
   hive takes noticing which creature it actually is, not just dragging
   whatever is nearest.
   ========================================================================= */

const NINE_N = 9;
const NINE_THEMES = {
  bee:     { ch:"🐝", decoy:"🦟", tint:"#f0b429", slot:"hive", slots:"hives" },
  ladybug: { ch:"🐞", decoy:"🐛", tint:"#2e9e44", slot:"leaf", slots:"leaves" }
};

const NINE_LEVELS = [
  { theme:"bee",     decoys:0, name:"Nine bees" },
  { theme:"bee",     decoys:2, name:"Nine bees · spot the odd bug" },
  { theme:"ladybug", decoys:0, name:"Nine ladybirds" },
  { theme:"ladybug", decoys:2, name:"Nine ladybirds · spot the odd bug" }
];
function nineEntry(lv){ return NINE_LEVELS[Math.min(Math.max(lv,1), NINE_LEVELS.length) - 1]; }

function buildNine(level){
  const e = nineEntry(level);
  const theme = NINE_THEMES[e.theme];
  const items = [];
  for(let i=0;i<NINE_N;i++) items.push({k:"em", ch:theme.ch, correct:true});
  for(let i=0;i<e.decoys;i++) items.push({k:"em", ch:theme.decoy, correct:false});
  return { entry:e, theme, items: shuffle(items) };
}

const NINE = {
  id: "nine",
  name: "Revision of number 9",
  section: "Toondemy Games",
  date: "2026-01-02",
  icon: "🐝🐞",
  maxLevel: ()=> NINE_LEVELS.length,
  levelLabel: (lv)=> nineEntry(lv).name,
  settingsHint: (lv)=>{
    const e = nineEntry(lv);
    const theme = NINE_THEMES[e.theme];
    const s = "He drags a " + (e.theme === "bee" ? "bee" : "ladybird") + " into every empty " + theme.slot +
      " until all nine are full.";
    return e.decoys ? s + " A couple of decoy bugs sit in the tray too, so he has to look at each one before dragging it."
                     : s;
  },

  startRound(level, api){
    const r = buildNine(level);
    const st = api.stage;
    st.appendChild(el("div","prompt-line", "Fill all nine " + r.theme.slots));

    const numeral = el("div","seq");
    numeral.appendChild(itemNode({k:"text", text:"9", color:r.theme.tint}, 56));
    st.appendChild(numeral);

    const binRow = el("div","bins many");
    const binEls = [];
    for(let i=0;i<NINE_N;i++){
      const d = el("div","bin dropzone");
      d.style.setProperty("--bin-bg", hexToRgba(r.theme.tint, 0.12));
      d.style.setProperty("--bin-border", r.theme.tint);
      const drop = el("div","drop"); d.appendChild(drop);
      d._drop = drop;
      binEls.push(d);
      binRow.appendChild(d);
    }
    st.appendChild(binRow);

    const px = 56;
    const tray = el("div","tray");
    let left = NINE_N, focusKey = null, hintNode = null;
    r.items.forEach(it=>{
      const wrap = el("div","opt");
      const node = itemNode(it, px);
      wrap.appendChild(node);
      if(it.correct && !hintNode) hintNode = node;
      node.addEventListener("pointerdown", ()=>{
        if(focusKey !== itemKey(it)){ focusKey = itemKey(it); api.refocus(); }
      });
      makeDraggable(node, (zone)=>{
        if(!zone) return;
        if(it.correct){
          zone.dataset.full = "1";
          zone.classList.add("done");
          zone._drop.appendChild(itemNode(it, 36));
          wrap.remove();
          api.refocus();
          left--;
          if(left === 0) api.solved(r.entry.theme);
        } else {
          api.miss();
        }
      });
      tray.appendChild(wrap);
    });
    st.appendChild(tray);
    if(hintNode) api.hint(hintNode);
  }
};
