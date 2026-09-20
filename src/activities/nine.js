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
   scenes are handed to playScenes() the same way Sky's four are: the shell
   runs them in order, leaves the finished one on screen long enough to be
   seen, and notes "Scene 1 of 2" quietly in the corner.

   THE MECHANIC IS SORTING'S, NOT A NEW ONE
   -----------------------------------------
   Nine dropzones, a tray of draggables, drop the right one in an open zone —
   that is Sorting's tray-and-bins pattern, just with every zone accepting
   the same one thing instead of a different rule per bin. Same drag, same
   `dataset.full` bookkeeping the shared drag engine already uses to skip a
   full zone, same escalating help when he's stuck.

   THE SLOT IS DRAWN AS THE THING IT IS
   -------------------------------------
   Nine blank boxes asked him to take "hive" and "leaf" on trust from the
   prompt line, which a 4-year-old who can't read cannot do. Each empty slot
   is now the hive or the leaf itself — flat, plain shapes that have to read
   at thumb size on a tablet, not illustrations — and the creature settles
   onto it, which is also what the lesson's own art does.

   TWO GUARDS THE SOURCE DOESN'T HAVE
   -----------------------------------
   Both are this app's own habits (see "Guard against latching" and "No
   failure states" in CLAUDE.md), not the video's:

   A couple of decoy bugs always sit in the tray, so filling every hive
   takes noticing which creature it is rather than dragging whatever is
   nearest — and dropping one now dims the decoys after `S.dimAfter` tries
   and outlines a right one after `S.showAfter`, the same escalating help
   every other activity gives. It used to do nothing at all, which is the
   one thing this app never does.

   And the tray holds a few MORE bees than there are hives. With exactly
   nine of each, emptying the tray and filling the nine were the same act,
   so the nine-ness of it was never actually load-bearing; with spares he
   has to stop when the hives are full.
   ========================================================================= */

const NINE_N = 9;
const NINE_DECOYS = 2;
const NINE_SPARE = 3;          // more creatures than slots, so "empty the tray" isn't the game

/* Flat slot art, drawn rather than borrowed from emoji: there is no "empty
   hive" or "bare leaf" glyph, and a faded bee standing in for a hive would
   have taught the wrong thing entirely. */
function nineHiveSVG(){
  const band = (x, y, w, h)=>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${(h/2).toFixed(1)}" fill="#f7c344" stroke="#e0a92c" stroke-width="2"/>`;
  return `<svg viewBox="0 0 100 100" width="100%" height="100%">` +
    band(13, 62, 74, 21) + band(17, 45, 66, 20) + band(23, 29, 54, 19) + band(31, 15, 38, 18) +
    `<ellipse cx="50" cy="72" rx="11" ry="9" fill="#8a6a1f" opacity=".85"/></svg>`;
}
function nineLeafSVG(){
  return `<svg viewBox="0 0 100 100" width="100%" height="100%">` +
    `<path d="M50 8 C 92 32, 92 70, 50 94 C 8 70, 8 32, 50 8 Z" fill="#6cc356" stroke="#3f9430" stroke-width="3"/>` +
    `<path d="M50 16 L50 88" stroke="#3f9430" stroke-width="3" stroke-linecap="round"/></svg>`;
}

const NINE_THEMES = {
  bee:     { ch:"🐝", decoy:"🦟", tint:"#f0b429", slots:"hives",  art: nineHiveSVG },
  ladybug: { ch:"🐞", decoy:"🐛", tint:"#2e9e44", slots:"leaves", art: nineLeafSVG }
};
const NINE_ORDER = ["bee","ladybug"];

function buildNineScene(themeKey){
  const theme = NINE_THEMES[themeKey];
  const items = [];
  for(let i=0;i<NINE_N + NINE_SPARE;i++) items.push({k:"em", ch:theme.ch, correct:true});
  for(let i=0;i<NINE_DECOYS;i++) items.push({k:"em", ch:theme.decoy, correct:false});
  return { theme, items: shuffle(items) };
}

/* One scene: nine of this theme's slots, and a tray to fill them from.
   Calls api.solved() once the ninth is in — playScenes() decides whether
   that means the next scene or the end of the game. */
function renderNineScene(api, themeKey){
  const r = buildNineScene(themeKey);
  const st = api.stage;

  st.appendChild(el("div","prompt-line", "Fill all nine " + r.theme.slots));
  const badge = el("div","seq");
  badge.appendChild(itemNode({k:"text", text:"9", color:r.theme.tint}, 56));
  st.appendChild(badge);

  const slotRow = el("div","numslots");
  for(let i=0;i<NINE_N;i++){
    const d = el("div","numslot dropzone");
    d.innerHTML = r.theme.art();
    slotRow.appendChild(d);
  }
  st.appendChild(slotRow);

  const tray = el("div","tray");
  let left = NINE_N, focusKey = null, hintNode = null;
  const clearHelp = ()=> tray.querySelectorAll(".opt").forEach(o=>o.classList.remove("dim","pick"));

  r.items.forEach(it=>{
    const wrap = el("div","opt");
    const node = itemNode(it, 50);
    wrap.appendChild(node);
    if(it.correct && !hintNode) hintNode = node;
    node.addEventListener("pointerdown", ()=>{
      if(focusKey !== itemKey(it)){ focusKey = itemKey(it); api.refocus(); clearHelp(); }
    });
    makeDraggable(node, (zone)=>{
      if(!zone) return;
      if(it.correct){
        zone.dataset.full = "1";
        zone.classList.add("done");
        zone.appendChild(itemNode(it, 44));
        wrap.remove();
        api.refocus();
        clearHelp();
        if(--left === 0) api.solved(themeKey);
        return;
      }
      // a decoy: glides back, and the help escalates exactly as it does
      // everywhere else. The options are re-read from the tray each time
      // rather than remembered: the one the hand pointed at first has
      // usually been dragged off by now, and outlining a node that is no
      // longer on screen is the same as no help at all.
      const attempts = api.miss();
      const options = Array.from(tray.querySelectorAll(".opt")).filter(o=>o.firstChild);
      if(attempts >= S.dimAfter) options.forEach(o=>{ if(!o.firstChild._item.correct) o.classList.add("dim"); });
      if(attempts >= S.showAfter){
        const right = options.find(o=>o.firstChild._item.correct);
        if(right) right.classList.add("pick");
      }
    });
    tray.appendChild(wrap);
  });
  st.appendChild(tray);
  if(hintNode) api.hint(hintNode);
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
    "He drags a bee onto every empty hive, then a ladybird onto every empty leaf, until all nine of each " +
    "are full. The tray holds a few more creatures than there are slots, and a couple of decoy bugs, so " +
    "filling them takes counting and looking rather than just emptying the tray.",

  startRound(level, api){
    playScenes(api, NINE_ORDER.map(k => (scene)=> renderNineScene(scene, k)), "bees and ladybirds");
  }
};
