/* ============================ ACTIVITY: SORTING ============================
   "Put each one where it belongs" — drag every item from the tray into the bin
   it matches. A round is only scored once the tray is empty, so one completed
   round is one token regardless of how many items it held.

   THE LADDER
   ----------
   Two axes, the same way Patterns works: how many bins there are (how much the
   task loads working memory) and what the rule is about (how abstract it is).
   Levels are listed with an explicit difficulty load and sorted by it, so a
   demanding rule on few bins sits next to an easy rule on many bins rather
   than one of them gating the other. Adding a level is a line in SORT_LEVELS.

   Throughout, whatever attribute ISN'T the rule is randomised per item, so it
   can never quietly become the thing he sorts on — the guard against picking
   up on one feature and ignoring the rest.
   ========================================================================== */

/* ---- item pools this activity needs beyond the shared themes ---- */
const EAT_POOL  = ["🍎","🍌","🍞","🧀","🍕","🍇","🥕","🍓"];
const WEAR_POOL = ["👕","👖","🧦","👟","🧢","🧥","👗","🧤"];
const LIVING_POOL    = ["🐶","🐱","🐦","🐟","🐰","🦋","🌳","🌷"];
const NONLIVING_POOL = ["🚗","🪑","🔑","📺","🥄","⚽","🎈","🛏️"];

const THEME_NAME = { animals:"ANIMALS", fruits:"FRUITS", vegetables:"VEGETABLES",
                     vehicles:"VEHICLES", weather:"WEATHER" };
const SIZE_NAME  = { small:"SMALL", medium:"MEDIUM", big:"BIG" };
const SIZE_ICON  = { small:0.5, medium:0.72, big:0.95 };

const SORT_LEVELS = [
  { load:1.0, name:"Colour · 2 bins",                rule:"colour",   bins:2 },
  { load:1.5, name:"Shape · 2 bins",                 rule:"shape",    bins:2 },
  { load:2.0, name:"Size · big / small",             rule:"size",     bins:2 },
  { load:2.0, name:"Colour · 3 bins",                rule:"colour",   bins:3 },
  { load:2.5, name:"What it is · 2 bins",            rule:"category", bins:2 },
  { load:2.5, name:"Shape · 3 bins",                 rule:"shape",    bins:3 },
  { load:3.0, name:"Size · small / medium / big",    rule:"size",     bins:3 },
  { load:3.0, name:"Colour · 4 bins",                rule:"colour",   bins:4 },
  { load:3.5, name:"What it is · 3 bins",            rule:"category", bins:3 },
  { load:3.5, name:"Shape · 4 bins",                 rule:"shape",    bins:4 },
  { load:4.0, name:"Eat it / wear it",               rule:"pair",     pair:"eatwear", bins:2 },
  { load:4.0, name:"Alive / not alive",              rule:"pair",     pair:"living",  bins:2 },
  { load:4.5, name:"What it is · 4 bins",            rule:"category", bins:4 },
  { load:4.5, name:"Switching · colour ⇄ shape",     rule:"switch",   dims:["colour","shape"], bins:2 },
  { load:5.0, name:"Switching · colour ⇄ size",      rule:"switch",   dims:["colour","size"],  bins:2 },
  { load:5.0, name:"Switching · shape ⇄ size",       rule:"switch",   dims:["shape","size"],   bins:2 },
  { load:5.5, name:"Colour + shape together",        rule:"matrix",   bins:4 },
  { load:6.0, name:"Switching · colour ⇄ shape ⇄ size", rule:"switch", dims:["colour","shape","size"], bins:2 }
];
SORT_LEVELS.sort((a,b)=>a.load - b.load);   // stable, so declaration order breaks ties
function sortEntry(lv){ return SORT_LEVELS[Math.min(Math.max(lv,1), SORT_LEVELS.length) - 1]; }

/* ---- round builders, one per rule ---- */
const mkShape = (shape,color,size)=>({k:"shape", shape:shape, color:color, size:size||"big"});
function twoEach(list, make){ const out=[]; list.forEach(v=>{ out.push(make(v)); out.push(make(v)); }); return out; }

function sortByColour(n){
  const cols = shuffle(Object.keys(COLORS)).slice(0,n);
  const bins = cols.map(c=>({ id:c, label:COLOR_WORDS[c], icon:shapeSVG("circle",c,.8),
                              tint:COLORS[c], test:it=>it.color===c }));
  // shape is random per item, so only the colour can decide where it goes
  return { bins, items: twoEach(cols, c=>mkShape(pick(SHAPES), c)), head:"Sort by colour" };
}
function sortByShape(n){
  const shs  = shuffle(SHAPES).slice(0,n);
  const cols = Object.keys(COLORS);
  const bins = shs.map(s=>({ id:s, label:SHAPE_WORDS[s], icon:shapeSVG(s,"#b8c4d4",.8),
                             tint:SHAPE_TINT[s], test:it=>it.shape===s }));
  // colour is random per item, so only the shape can decide where it goes
  return { bins, items: twoEach(shs, s=>mkShape(s, pick(cols))), head:"Sort by shape" };
}
function sortBySize(n){
  const sizes = n >= 3 ? ["small","medium","big"] : ["big","small"];
  const iconShape = pick(SHAPES);            // one shape across the bins, so only size differs
  const cols = Object.keys(COLORS);
  const bins = sizes.map(z=>({ id:z, label:SIZE_NAME[z], icon:shapeSVG(iconShape,"#b8c4d4",SIZE_ICON[z]),
                               tint:SIZE_TINT[z], test:it=>it.size===z }));
  // colour AND shape random per item — size is the only thing left to go on
  return { bins, items: twoEach(sizes, z=>mkShape(pick(SHAPES), pick(cols), z)), head:"Sort by size" };
}
function sortByCategory(n){
  // MIXED_THEMES deliberately excludes vegetables: splitting "food" into fruit
  // and vegetable is a blurry call, not a harder one.
  const themes = shuffle(MIXED_THEMES).slice(0, n);
  const bins = [], items = [];
  themes.forEach(t=>{
    const pool = shuffle(THEMES[t]);
    bins.push({ id:t, label:THEME_NAME[t], icon:pool[0], emojiIcon:true,
                tint:THEME_TINT[t], test:it=>it.theme===t });
    pool.slice(1,3).forEach(ch=>items.push({k:"em", ch:ch, theme:t}));   // never the bin's own icon
  });
  return { bins, items, head:"Sort by what they are" };
}
const SORT_PAIRS = {
  eatwear: { head:"Eat it, or wear it?", sides:[
    { id:"eat",  label:"EAT IT",  icon:"🍎", pool:EAT_POOL  },
    { id:"wear", label:"WEAR IT", icon:"👕", pool:WEAR_POOL }]},
  living:  { head:"Alive, or not alive?", sides:[
    { id:"living",    label:"ALIVE",     icon:"🐶", pool:LIVING_POOL    },
    { id:"nonliving", label:"NOT ALIVE", icon:"🪑", pool:NONLIVING_POOL }]}
};
function sortByPair(key){
  const p = SORT_PAIRS[key];
  const bins = [], items = [];
  p.sides.forEach(s=>{
    bins.push({ id:s.id, label:s.label, icon:s.icon, emojiIcon:true,
                tint:CATEGORY_TINT[s.id], test:it=>it.cat===s.id });
    shuffle(s.pool).filter(ch=>ch!==s.icon).slice(0,2).forEach(ch=>items.push({k:"em", ch:ch, cat:s.id}));
  });
  return { bins, items, head:p.head };
}
function sortByMatrix(){
  // double classification: each bin is one colour AND one shape, so neither
  // attribute on its own is enough to place an item.
  const [c1,c2] = shuffle(Object.keys(COLORS)).slice(0,2);
  const [s1,s2] = shuffle(SHAPES).slice(0,2);
  const combos = [[c1,s1],[c1,s2],[c2,s1],[c2,s2]];
  const bins = combos.map(([c,s])=>({
    id: c+"|"+s, label: COLOR_WORDS[c]+" "+SHAPE_WORDS[s], icon: shapeSVG(s,c,.8),
    tint: COLORS[c], test: it=>it.color===c && it.shape===s }));
  return { bins, items: twoEach(combos, ([c,s])=>mkShape(s,c)), head:"Sort by colour AND shape" };
}
function sortBySwitching(dims, ruleIdx){
  const dim  = dims[ruleIdx % dims.length];        // the rule changes every round
  const cols = shuffle(Object.keys(COLORS)).slice(0,2);
  const shs  = shuffle(SHAPES).slice(0,2);
  const szs  = ["big","small"];
  // A balanced set of four: every one of the three attributes splits them 2/2,
  // so the SAME tray is sortable by whichever rule this round asks for.
  const items = [[0,0,0],[0,1,1],[1,0,1],[1,1,0]]
    .map(([ci,si,zi])=>mkShape(shs[si], cols[ci], szs[zi]));
  const iconShape = pick(SHAPES);
  let bins;
  if(dim === "colour")
    bins = cols.map(c=>({id:c, label:COLOR_WORDS[c], icon:shapeSVG("circle",c,.8), tint:COLORS[c], test:it=>it.color===c}));
  else if(dim === "shape")
    bins = shs.map(s=>({id:s, label:SHAPE_WORDS[s], icon:shapeSVG(s,"#b8c4d4",.8), tint:SHAPE_TINT[s], test:it=>it.shape===s}));
  else
    bins = szs.map(z=>({id:z, label:SIZE_NAME[z], icon:shapeSVG(iconShape,"#b8c4d4",SIZE_ICON[z]), tint:SIZE_TINT[z], test:it=>it.size===z}));
  const HEAD = { colour:"Now sort by COLOUR", shape:"Now sort by SHAPE", size:"Now sort by SIZE" };
  return { bins, items, head:HEAD[dim] };
}

function buildSort(level, ruleIdx){
  const e = sortEntry(level);
  let r;
  switch(e.rule){
    case "colour":   r = sortByColour(e.bins); break;
    case "shape":    r = sortByShape(e.bins); break;
    case "size":     r = sortBySize(e.bins); break;
    case "category": r = sortByCategory(e.bins); break;
    case "pair":     r = sortByPair(e.pair); break;
    case "matrix":   r = sortByMatrix(); break;
    case "switch":   r = sortBySwitching(e.dims, ruleIdx); break;
    default:         r = sortByColour(2);
  }
  return { bins:r.bins, items:shuffle(r.items), head:r.head, entry:e };
}

/* ---- the activity itself ---- */
let sortRuleIdx = 0;

const SORTING = {
  id: "sort",
  name: "SORTING",
  icon: "🧺",
  maxLevel: () => SORT_LEVELS.length,
  levelLabel: (lv) => sortEntry(lv).name,
  settingsHint: (lv) =>
    sortEntry(lv).name + " — " + SORT_LEVELS.length + " levels, ordered easiest to hardest across two " +
    "things at once: how many bins there are, and how abstract the rule is. Whatever isn't the rule is " +
    "randomised per item, so he can't sort on the wrong feature by accident.",

  startRound(level, api){
    const r = buildSort(level, sortRuleIdx++);
    const st = api.stage;
    st.appendChild(el("div","prompt-line", r.head));

    const binRow = el("div","bins" + (r.bins.length >= 4 ? " many" : ""));
    const binEls = r.bins.map(b=>{
      const d = el("div","bin dropzone");
      const tint = tintFor(b);
      d.style.setProperty("--bin-bg", hexToRgba(tint, 0.16));
      d.style.setProperty("--bin-border", tint);
      const ic = el("div","bic");
      if(b.emojiIcon) ic.textContent = b.icon; else ic.innerHTML = `<div style="width:38px;height:38px">${b.icon}</div>`;
      d.appendChild(ic);
      d.appendChild(el("div","blabel", b.label));
      const drop = el("div","drop"); d.appendChild(drop);
      d._bin = b; d._drop = drop;
      return d;
    });
    binEls.forEach(b=>binRow.appendChild(b));
    st.appendChild(binRow);

    // more items in the tray means smaller tiles, so a full round still fits
    const px = r.items.length >= 8 ? 56 : (r.items.length >= 6 ? 64 : 72);

    const tray = el("div","tray");
    let left = r.items.length, focusKey = null;
    r.items.forEach(it=>{
      const wrap = el("div","opt");
      const node = itemNode(it, px);
      wrap.appendChild(node);
      node.addEventListener("pointerdown", ()=>{
        if(focusKey !== itemKey(it)){          // switched to a different item: restart prompting
          focusKey = itemKey(it); api.refocus();
          binEls.forEach(b=>b.classList.remove("dim","pulse"));
        }
      });
      makeDraggable(node, (zone)=>{
        if(!zone) return;
        const bin = zone._bin;
        if(bin && bin.test(it)){
          zone._drop.appendChild(itemNode(it, 40));
          wrap.remove();
          api.refocus();
          binEls.forEach(b=>b.classList.remove("dim","pulse"));
          left--;
          // one token per completed round (matches Patterns), not per item —
          // otherwise a 4-item round burns through tokens faster than an 8-item one
          if(left === 0) api.solved(r.entry.rule);
        } else {
          const attempts = api.miss();
          if(attempts >= S.dimAfter) binEls.forEach(b=>{ if(!b._bin.test(it)) b.classList.add("dim"); });
          if(attempts >= S.showAfter) binEls.forEach(b=>{ if(b._bin.test(it)) b.classList.add("pulse"); });
        }
      });
      tray.appendChild(wrap);
    });
    st.appendChild(tray);
    if(r.items.length){
      const firstWrap = tray.children[0];
      const targetBin = binEls.find(b=>b._bin.test(r.items[0]));
      if(targetBin){
        firstWrap.classList.add("pick");
        // point into the empty drop area, not at the bin as a whole — a bin is
        // tall enough that the shell's anchor lands on the colour dot and
        // label, which reads as hovering above the bin rather than "in here"
        api.hint(targetBin.querySelector(".drop") || targetBin);
        setTimeout(()=>firstWrap.classList.remove("pick"), 3200);
      }
    }
  }
};
