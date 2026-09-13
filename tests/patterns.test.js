/* Patterns: ladder ordering, round generation, and category matching. */
const { pureContext, Runner } = require("./_harness");
const { LADDER, STRUCTS, DOMAIN_ORDER, STRUCT_LOAD, DOMAIN_LOAD, THEMES, MIXED_THEMES, buildPatternForLevel, matchesAnswer, itemKey } =
  pureContext(["20-stimuli.js", "activities/patterns.js"],
    ["LADDER", "STRUCTS", "DOMAIN_ORDER", "STRUCT_LOAD", "DOMAIN_LOAD", "THEMES", "MIXED_THEMES", "buildPatternForLevel", "matchesAnswer", "itemKey"]);
const R = new Runner("patterns");
const check = (c, m) => R.check(c, m);

/* ============================ TESTS ============================ */

// 1) Ladder integrity: all 40 combinations present exactly once, nothing dropped
check(LADDER.length === 40, "ladder still has all 40 levels");
const combos = new Set(LADDER.map(e=>e.struct+"|"+e.domain));
check(combos.size === 40, "all 40 structure x domain combinations are unique and present");
STRUCTS.forEach(st=>DOMAIN_ORDER.forEach(dm=>
  check(combos.has(st.key+"|"+dm), `combination ${st.key}/${dm} still exists in the ladder`)));

// 2) Ladder is now monotonically non-decreasing in difficulty load
let prev = -1;
LADDER.forEach((e,i)=>{
  const load = STRUCT_LOAD[e.struct] + DOMAIN_LOAD[e.domain];
  check(load >= prev, `level ${i+1} (${e.struct}/${e.domain}) is not easier than the level before it`);
  prev = load;
});

// 3) The specific gate that was the problem: Mixed must not sit near the bottom
const firstMixed = LADDER.findIndex(e=>e.domain==="mixed") + 1;
check(firstMixed > 20, `the first Mixed categories level is well up the ladder (now ${firstMixed}, was 8)`);
const aabColour = LADDER.findIndex(e=>e.struct==="AAB" && e.domain==="colour") + 1;
check(aabColour < firstMixed, `AAB Colour (now ${aabColour}) comes before any Mixed level`);
check(LADDER[0].struct==="AB" && LADDER[0].domain==="colour", "level 1 is still AB Colour");

// 4) Mixed content is now bounded: no vegetables-vs-fruit, capped exemplar variety
check(!MIXED_THEMES.includes("vegetables"), "vegetables excluded from Mixed categories");
check(MIXED_THEMES.length >= 4, "enough Mixed categories for the 4-option structures");
check(!THEMES.weather.includes("⭐") && !THEMES.weather.includes("🌙"),
  "star and moon removed from the weather category");

LADDER.map((e,i)=>({e,idx:i+1})).filter(x=>x.e.domain==="mixed").forEach(({idx})=>{
  let worstDistinct = 0;
  for(let t=0;t<200;t++){
    const r = buildPatternForLevel(idx);
    const tiles = r.shown.concat([r.answer]);
    worstDistinct = Math.max(worstDistinct, new Set(tiles.map(i=>i.ch)).size);
    r.options.forEach(o=>check(!!o.theme, `L${idx}: option carries a category`));
    check(r.options.filter(o=>matchesAnswer(o,r)).length === 1, `L${idx}: exactly one correct option`);
    const st = STRUCTS.find(s=>s.key===r.entry.struct);
    check(r.options.length === st.nOpt, `L${idx}: full set of ${st.nOpt} options`);
    // no role may draw on more than two pictures in a round
    const byTheme = {};
    tiles.forEach(it=>{ (byTheme[it.theme] = byTheme[it.theme] || new Set()).add(it.ch); });
    Object.entries(byTheme).forEach(([th,set])=>
      check(set.size <= 2, `L${idx}: category ${th} shows at most 2 different pictures (saw ${set.size})`));
  }
  check(worstDistinct <= 6, `L${idx}: at most 6 distinct pictures on screen in 200 rounds (was up to 8; worst seen ${worstDistinct})`);
});

// 5) Whole-ladder smoke test, every level, unchanged invariants
for(let lvl=1; lvl<=LADDER.length; lvl++){
  for(let t=0;t<30;t++){
    const r = buildPatternForLevel(lvl);
    const st = STRUCTS.find(s=>s.key===r.entry.struct);
    check(r.options.length === st.nOpt, `L${lvl} t${t}: option count`);
    check(r.options.filter(o=>matchesAnswer(o,r)).length === 1, `L${lvl} (${r.entry.struct}/${r.entry.domain}) t${t}: exactly one correct option`);
  }
}

// 6) Non-mixed domains still identity-matched, completely untouched
DOMAIN_ORDER.filter(d=>d!=="mixed").forEach(dom=>{
  const idx = LADDER.findIndex(e=>e.domain===dom) + 1;
  for(let t=0;t<15;t++){
    const r = buildPatternForLevel(idx);
    check(!r.isCategory, `L${idx} ${dom}: not a category domain`);
    const correctOpt = r.options.find(o=>matchesAnswer(o,r));
    check(correctOpt && itemKey(correctOpt)===itemKey(r.answer), `L${idx} ${dom}: correct option is identical to the answer`);
  }
});


R.finish();
