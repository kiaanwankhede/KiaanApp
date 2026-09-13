/* ============================ ACTIVITY: PATTERNS ============================
   "What comes next?" — extend a repeating sequence by dragging the right tile
   into the blank slot.

   Everything specific to Patterns lives in this file: its 40-level ladder
   (5 structures x 8 content domains, ordered by real difficulty), how a round
   is generated, and how it is drawn. It touches the shell only through the
   `api` handed to startRound.
   ========================================================================== */
/* ---------- Patterns: structure × domain ladder ---------- */
// unit = the repeating group, expressed as role-indices (0=A,1=B,2=C…)
const STRUCTS = [
  { key:"AB",   roles:2, unit:[0,1],     reps:3, nOpt:2 },
  { key:"AAB",  roles:2, unit:[0,0,1],   reps:2, nOpt:3 },
  { key:"ABB",  roles:2, unit:[0,1,1],   reps:2, nOpt:3 },
  { key:"ABC",  roles:3, unit:[0,1,2],   reps:2, nOpt:3 },
  { key:"AABB", roles:2, unit:[0,0,1,1], reps:2, nOpt:4 }
];
const DOMAIN_ORDER = ["colour","shape","size","shapecolour","real","letters","numbers","mixed"];
const DOMAIN_LABEL = {
  colour:"Colour", shape:"Shape", shapecolour:"Shape + Colour", size:"Size",
  real:"Real objects", letters:"Letters", numbers:"Numbers", mixed:"Mixed categories"
};
/* All 40 structure × domain combinations are kept — but they are ordered by how
   hard the combination actually is, not structure-by-structure. The old order ran
   each structure through all eight domains, which parked AB · Mixed categories at
   level 8 and walled off AAB · Colour (far easier, and the real growth edge for a
   4-year-old) behind it. Difficulty = how much the STRUCTURE loads working memory
   + how abstract the DOMAIN is. */
const STRUCT_LOAD = { AB:1, AAB:2, ABB:2, ABC:3, AABB:4 };
const DOMAIN_LOAD = { colour:0, shape:0.5, size:1, shapecolour:1.5, real:1.5, letters:2, numbers:2, mixed:4 };
const LADDER = [];
STRUCTS.forEach(st => DOMAIN_ORDER.forEach(dm => LADDER.push({struct:st.key, domain:dm})));
LADDER.sort((a,b)=>{
  const da = STRUCT_LOAD[a.struct] + DOMAIN_LOAD[a.domain];
  const db = STRUCT_LOAD[b.struct] + DOMAIN_LOAD[b.domain];
  if(da !== db) return da - db;                                    // easier combination first
  if(STRUCT_LOAD[a.struct] !== STRUCT_LOAD[b.struct])
    return STRUCT_LOAD[a.struct] - STRUCT_LOAD[b.struct];          // then the simpler structure
  return DOMAIN_ORDER.indexOf(a.domain) - DOMAIN_ORDER.indexOf(b.domain);
});
function ladderEntry(idx){ return LADDER[Math.min(Math.max(idx,1),LADDER.length)-1]; }
function levelLabel(idx){ const e = ladderEntry(idx); return e.struct + " · " + DOMAIN_LABEL[e.domain]; }

function rolesColour(n){
  return shuffle(Object.keys(COLORS)).slice(0,n).map(c=>({k:"shape",shape:"circle",color:c}));
}
function rolesShape(n){
  const c = pick(Object.keys(COLORS));
  return shuffle(SHAPES).slice(0,n).map(s=>({k:"shape",shape:s,color:c}));
}
function rolesShapeColour(n){
  const shs = shuffle(SHAPES), cols = shuffle(Object.keys(COLORS));
  const out=[]; for(let i=0;i<n;i++) out.push({k:"shape",shape:shs[i%shs.length],color:cols[i%cols.length]});
  return out;
}
function rolesSize(n, allowThree){
  const cycle = allowThree ? ["small","medium","big"] : ["big","small"];
  const shs = shuffle(SHAPES), cols = shuffle(Object.keys(COLORS));
  const out=[]; for(let i=0;i<n;i++) out.push({k:"shape",shape:shs[i%shs.length],color:cols[i%cols.length],size:cycle[i%cycle.length]});
  return out;
}
function rolesReal(n){
  const theme = pick(THEME_KEYS);
  return shuffle(THEMES[theme]).slice(0,n).map(ch=>({k:"em",ch,theme}));
}
function rolesLetters(n){
  return shuffle(ALPHABET).slice(0,n).map(ch=>({k:"text",text:ch,color:pick(Object.values(COLORS))}));
}
function rolesNumbers(n){
  return shuffle(DIGITS).slice(0,n).map(ch=>({k:"text",text:ch,color:pick(Object.values(COLORS))}));
}
function rolesMixed(n){
  // Each role is a CATEGORY, but it only ever shows up as one of TWO pictures in
  // a given round. Drawing freshly from all eight every single time put seven
  // different pictures on screen at once, which buries the pattern under visual
  // noise — two exemplars still forces category recognition (the answer can be
  // the exemplar that hasn't appeared yet) while leaving the beat visible.
  return shuffle(MIXED_THEMES).slice(0,n).map(t=>{
    const vs = shuffle(THEMES[t]).slice(0,2);
    return {k:"em", ch:vs[0], theme:t, variants:vs};
  });
}
function getRoles(domain, n, structKey){
  switch(domain){
    case "colour": return rolesColour(n);
    case "shape": return rolesShape(n);
    case "shapecolour": return rolesShapeColour(n);
    case "size": return rolesSize(n, structKey==="ABC");
    case "real": return rolesReal(n);
    case "letters": return rolesLetters(n);
    case "numbers": return rolesNumbers(n);
    case "mixed": return rolesMixed(n);
    default: return rolesColour(n);
  }
}

/* ============================ PATTERNS ============================ */
function buildPatternForLevel(levelIdx){
  const entry = ladderEntry(levelIdx);
  const st = STRUCTS.find(s=>s.key===entry.struct);
  // "Mixed categories" is the one domain whose roles ARE categories (a theme),
  // not a single fixed item -- so it should test "is this an animal" rather
  // than "is this the exact 🐶 from before". Every other domain keeps its
  // original fixed-per-role identity behaviour untouched.
  const isCategory = entry.domain === "mixed";
  const poolSize = Math.max(st.roles, st.nOpt);
  const allRoles = getRoles(entry.domain, poolSize, st.key);
  const roles = allRoles.slice(0, st.roles);
  const decoyPool = allRoles.slice(st.roles);
  // Draw a fresh concrete exemplar every time a category-role is instantiated
  // (so the specific picture varies occurrence-to-occurrence) while an
  // identity-role just passes through unchanged, exactly as before.
  const instantiate = r => isCategory
    ? {k:"em", ch:pick(r.variants || THEMES[r.theme]), theme:r.theme}
    : r;
  const roleKey = r => isCategory ? "theme:"+r.theme : itemKey(r);

  const unitRoles = st.unit.map(i=>roles[i]);
  let seq=[]; for(let i=0;i<st.reps;i++) unitRoles.forEach(r=>seq.push(instantiate(r)));
  const answerRole = roles[st.unit[st.unit.length-1]];
  const answer = seq[seq.length-1];
  const shown = seq.slice(0, seq.length-1);
  const answerRoleKey = roleKey(answerRole);
  const otherRoles = roles.filter(r=>roleKey(r)!==answerRoleKey);
  const decoyRoles = shuffle(otherRoles.concat(decoyPool));
  const optionRoles = shuffle([answerRole].concat(decoyRoles.slice(0, st.nOpt-1)));
  const options = optionRoles.map(instantiate);
  return {shown, answer, answerRole, options, entry, isCategory};
}
function matchesAnswer(it, r){
  return r.isCategory ? it.theme === r.answerRole.theme : itemKey(it) === itemKey(r.answer);
}

/* ---- the activity itself ---- */
const PATTERNS = {
  id: "pattern",
  name: "PATTERNS",
  icon: "🔷🔶🔷",
  maxLevel: () => LADDER.length,
  levelLabel: (lv) => levelLabel(lv),
  settingsHint: (lv) =>
    levelLabel(lv) + " — " + LADDER.length + " levels: 5 structures (AB, AAB, ABB, ABC, AABB) " +
    "× 8 content types (colour, shape, size, shape+colour, real objects, letters, numbers, mixed categories), " +
    "ordered easiest-to-hardest across both, so an easy structure on hard content sits high up the ladder " +
    "rather than blocking the way to a harder structure on easy content.",

  startRound(level, api){
    const r = buildPatternForLevel(level);
    const st = api.stage;
    st.appendChild(el("div","prompt-line","What comes next?"));

    const n = r.shown.length + 1;
    const px = n > 7 ? 56 : (n > 5 ? 66 : 80);

    const seq = el("div","seq");
    r.shown.forEach(it=>seq.appendChild(itemNode(it, px)));
    const slot = el("div","slot dropzone");
    slot.style.setProperty("--t", px+"px");
    seq.appendChild(slot);
    st.appendChild(seq);

    const opts = el("div","options");
    let answerNode = null;
    r.options.forEach(it=>{
      const wrap = el("div","opt");
      const node = itemNode(it, Math.max(px, 74));
      wrap.appendChild(node);
      if(matchesAnswer(it, r)) answerNode = node;
      makeDraggable(node, (zone)=>{
        if(!zone) return;
        if(matchesAnswer(it, r)){
          slot.classList.add("done");
          slot.dataset.full = "1";
          slot.innerHTML = "";
          slot.appendChild(itemNode(it, px));
          opts.querySelectorAll(".opt").forEach(o=>o.classList.add("gone"));
          // tag real-object rounds by theme so Settings can show which themes land
          api.solved(r.entry.domain === "real" && r.answer.theme ? r.answer.theme : null);
        } else {
          const attempts = api.miss();
          if(attempts >= S.dimAfter){
            opts.querySelectorAll(".opt").forEach(o=>{
              if(!matchesAnswer(o.firstChild._item, r)) o.classList.add("dim");
            });
          }
          if(attempts >= S.showAfter) slot.classList.add("near");
        }
      });
      opts.appendChild(wrap);
    });
    st.appendChild(opts);
    api.hint(answerNode);
  }
};
