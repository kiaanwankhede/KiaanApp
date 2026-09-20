/* ============================ ACTIVITY: NINE ============================
   Drag a bee to every empty hive, then a ladybird to every empty leaf,
   until both are full.

   Recreates a Toondemy lesson ("revision of number 9"): nine empty slots on
   screen, a supply of the right little creature to drag into them one at a
   time, a number badge overhead — then the same again with a second
   creature. The source app reads the number aloud, bursts confetti and
   drops in a mascot on finishing each scene; none of that here, per the
   same rule Sky follows: the number badge is a still text tile, filling a
   hive draws nothing more than the shell's own quiet token, and there is no
   audio anywhere in this app, full stop.

   ONE GAME, NOT A LADDER
   -----------------------
   Nine is a Toondemy game (`oneShot: true`, see src/50-session.js and
   src/70-home.js): it recreates the lesson exactly, both scenes back to
   back the way the video shows them, at a fixed nine. No level stepper, no
   easier or harder version — the reward comes once the ladybird scene
   finishes too, with Repeat and Next on the shell's reward screen. The two
   scenes are chained inside this one startRound the same way Sky chains its
   four: the first scene's "done" starts the second instead of finishing the
   round, and only the second calls api.solved() for real.

   THE MECHANIC IS SORTING'S, NOT A NEW ONE
   -----------------------------------------
   Nine identical dropzones, a tray of draggables, drop the right one in an
   open zone — that is exactly Sorting's tray-and-bins pattern, just with
   every zone accepting the same one thing instead of a different rule per
   bin. Reusing it (same CSS, same makeDraggable, same dataset.full
   bookkeeping the shared drag engine already skips a full zone for) means
   nothing new had to be taught to the tablet just to fill nine hives.

   A couple of decoy bugs always sit in the tray alongside the nine real
   ones — not something the source video shows, but this app's own habit
   (see "Guard against latching" in CLAUDE.md) of never leaving a shortcut
   like "just drag whatever's nearest" sitting there unguarded.
   ========================================================================= */

const NINE_N = 9;
const NINE_DECOYS = 2;
const NINE_THEMES = {
  bee:     { ch:"🐝", decoy:"🦟", tint:"#f0b429", slots:"hives" },
  ladybug: { ch:"🐞", decoy:"🐛", tint:"#2e9e44", slots:"leaves" }
};
const NINE_ORDER = ["bee","ladybug"];

function buildNineScene(themeKey){
  const theme = NINE_THEMES[themeKey];
  const items = [];
  for(let i=0;i<NINE_N;i++) items.push({k:"em", ch:theme.ch, correct:true});
  for(let i=0;i<NINE_DECOYS;i++) items.push({k:"em", ch:theme.decoy, correct:false});
  return { theme, items: shuffle(items) };
}

const NINE = {
  id: "nine",
  name: "Revision of number 9",
  section: "Toondemy Games",
  date: "2026-01-02",
  oneShot: true,
  icon: "🐝🐞",
  maxLevel: ()=> 1,
  levelLabel: ()=> "",
  settingsHint: ()=>
    "He drags a bee into every empty hive, then a ladybird into every empty leaf, until all nine of each " +
    "are full. A couple of decoy bugs sit in the tray both times, so he has to look at each one before " +
    "dragging it.",

  startRound(level, api){
    const st = api.stage;

    const playScene = (idx)=>{
      st.innerHTML = "";
      const themeKey = NINE_ORDER[idx];
      const r = buildNineScene(themeKey);

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
            if(left === 0){
              if(idx + 1 < NINE_ORDER.length) playScene(idx + 1);
              else api.solved("bees and ladybirds");
            }
          } else {
            api.miss();
          }
        });
        tray.appendChild(wrap);
      });
      st.appendChild(tray);
      if(hintNode) api.hint(hintNode);
    };

    playScene(0);
  }
};
