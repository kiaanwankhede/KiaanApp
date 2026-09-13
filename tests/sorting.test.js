/* Sorting: ladder ordering, round generation, and the confound guards. */
const { pureContext, Runner } = require("./_harness");
const { SORT_LEVELS, sortEntry, buildSort, tintFor, COLORS, SHAPES } =
  pureContext(["20-stimuli.js", "activities/sorting.js"],
    ["SORT_LEVELS", "sortEntry", "buildSort", "tintFor", "COLORS", "SHAPES"]);
const R = new Runner("sorting");
const check = (c, m) => R.check(c, m);

/* ============================ TESTS ============================ */

check(SORT_LEVELS.length === 18, "sorting ladder has 18 levels (was 6)");

// ladder is monotonically non-decreasing in difficulty load
let prev = -1;
SORT_LEVELS.forEach((e,i)=>{
  check(e.load >= prev, `level ${i+1} (${e.name}) is not easier than the one before`);
  prev = e.load;
});
check(sortEntry(1).rule === "colour" && sortEntry(1).bins === 2, "level 1 is still colour, 2 bins");

// every level, many rounds: solvable, unambiguous, and no confounds
for(let lv=1; lv<=SORT_LEVELS.length; lv++){
  const e = sortEntry(lv);
  const seenHeads = new Set();
  for(let t=0;t<120;t++){
    const r = buildSort(lv, t);
    seenHeads.add(r.head);

    check(r.bins.length === e.bins, `L${lv} ${e.name}: ${e.bins} bins`);
    check(r.items.length === r.bins.length*2, `L${lv} ${e.name}: two items per bin (got ${r.items.length})`);

    // EVERY item belongs to exactly one bin — no orphan, no ambiguity
    r.items.forEach(it=>{
      const homes = r.bins.filter(b=>b.test(it)).length;
      check(homes === 1, `L${lv} ${e.name} t${t}: each item fits exactly one bin (got ${homes})`);
    });
    // every bin receives at least one item, so no bin is decorative
    r.bins.forEach(b=>{
      check(r.items.some(it=>b.test(it)), `L${lv} ${e.name} t${t}: bin ${b.id} gets at least one item`);
    });
    // bins are distinct
    check(new Set(r.bins.map(b=>b.id)).size === r.bins.length, `L${lv} ${e.name} t${t}: bins are distinct`);
    // every bin has a label and a tint the shell can render
    r.bins.forEach(b=>{
      check(!!b.label && !!b.icon, `L${lv} ${e.name}: bin ${b.id} has label and icon`);
      check(/^#|rgb/.test(tintFor(b)), `L${lv} ${e.name}: bin ${b.id} resolves to a colour`);
    });

    // CONFOUND GUARDS — whatever isn't the rule must not predict the answer.
    if(e.rule === "colour"){
      // shape must not line up with colour across the round
      const byColour = {};
      r.items.forEach(it=>{ (byColour[it.color] = byColour[it.color] || new Set()).add(it.shape); });
      // (not every round will vary, but across 120 rounds it must)
      if(Object.values(byColour).some(s=>s.size>1)) seenHeads.add("_shapeVaried");
    }
    if(e.rule === "shape"){
      const byShape = {};
      r.items.forEach(it=>{ (byShape[it.shape] = byShape[it.shape] || new Set()).add(it.color); });
      if(Object.values(byShape).some(s=>s.size>1)) seenHeads.add("_colourVaried");
    }
    if(e.rule === "size"){
      const bySize = {};
      r.items.forEach(it=>{ (bySize[it.size] = bySize[it.size] || new Set()).add(it.color+"/"+it.shape); });
      if(Object.values(bySize).some(s=>s.size>1)) seenHeads.add("_sizeConfoundBroken");
    }
    if(e.rule === "matrix"){
      // neither colour alone nor shape alone may identify a bin
      const cols = new Set(r.items.map(i=>i.color)), shs = new Set(r.items.map(i=>i.shape));
      check(cols.size === 2 && shs.size === 2, `L${lv}: matrix uses 2 colours x 2 shapes`);
    }
    if(e.rule === "switch"){
      // the same tray must be sortable by EVERY dimension in the rotation
      ["colour","shape","size"].forEach(d=>{
        const key = d==="colour" ? "color" : d;
        const groups = {};
        r.items.forEach(it=>{ groups[it[key]] = (groups[it[key]]||0)+1; });
        const counts = Object.values(groups);
        check(counts.length===2 && counts.every(c=>c===2),
          `L${lv} ${e.name} t${t}: tray splits 2/2 on ${d} too, so any rule in the rotation works`);
      });
    }
    if(e.rule === "category"){
      // the bin's own icon is never also an item — he can't just match pictures
      r.bins.forEach(b=>{
        check(!r.items.some(it=>it.ch === b.icon),
          `L${lv} t${t}: bin icon ${b.icon} is not also sitting in the tray`);
      });
      check(!r.bins.some(b=>b.id==="vegetables"), `L${lv}: vegetables stay out of category sorting`);
    }
  }
  if(e.rule === "colour") check(seenHeads.has("_shapeVaried"), `L${lv}: shape really does vary within a colour`);
  if(e.rule === "shape")  check(seenHeads.has("_colourVaried"), `L${lv}: colour really does vary within a shape`);
  if(e.rule === "size")   check(seenHeads.has("_sizeConfoundBroken"), `L${lv}: colour/shape vary within a size`);
  if(e.rule === "switch"){
    const rules = [...seenHeads].filter(h=>h.startsWith("Now sort"));
    check(rules.length === e.dims.length, `L${lv} ${e.name}: the rule actually rotates through all ${e.dims.length} dimensions`);
  }
}


R.finish();
