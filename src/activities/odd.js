/* ========================== ACTIVITY: ODD ONE OUT ==========================
   Four (or five, or six) things. All but one share something. Drag the one
   that doesn't belong into the space above.

   THE OPERATION NOTHING ELSE HERE ASKS FOR
   -----------------------------------------
   Every other reasoning game in this app hands him the rule and asks him to
   apply it: Sorting's bins say what they want, Patterns shows the beginning of
   the sequence, Match asks for a relation he already knows, Order gives him a
   gradient to continue. This one hands him nothing. He has to work out what
   the others have in common before he can say which one hasn't got it — the
   rule is the answer's hiding place, not part of the question. That is
   induction rather than application, and it is the one gap the reasoning
   strand had.

   THE GUARD HERE RUNS OPPOSITE TO THE USUAL ONE, FOR THE SAME REASON
   -------------------------------------------------------------------
   Everywhere else in this app, whatever is NOT the rule gets randomised per
   item so it can never quietly become what he answers on (see "Guard against
   latching" in CLAUDE.md). Randomising here would break the round outright: if
   the rule is shape and colour varies freely, the odd shape might also happen
   to be the only red one — and then there are two defensible odd ones and only
   one of them is accepted, which is a round he loses for being right.

   So the same principle inverts. Anything that isn't the rule is either held
   IDENTICAL across every item, or varied in such a way that **no value ever
   appears exactly once** — two reds and two blues, never three and one. A
   value that appears twice cannot single anything out, so only the rule can.

   That varying is itself the difficulty step, and it earns its place: with
   every other attribute identical, three of the items are literally the same
   tile and "find the one that isn't a duplicate" answers the round without
   ever noticing which attribute differs. Once the others vary in pairs, that
   shortcut is gone and the attribute has to actually be found.

   THE LADDER
   ----------
   One sorted list ordered by load, the way Sorting's and Match's are — not
   staged. Three things raise it: how abstract the rule is (colour, then shape,
   then size, then category), whether the other attributes vary, and how many
   things there are to scan. Scored and sorted, so an easy rule on a crowded
   board can sit below a hard rule on a sparse one rather than being walled off
   behind it.

   Fruit versus vegetable is deliberately NOT the hardest category round, even
   though it is the obvious "near miss". CLAUDE.md rules it out of category
   work for a reason that applies here too: splitting "food" into fruit and
   vegetable is blurry rather than harder, and a round whose answer a fair
   grown-up could argue with is not a hard round, it is a broken one. Letter
   versus number was considered for the top of the ladder and left out on the
   same test — he meets both, but not yet reliably enough to name which is
   which.
   ============================================================================ */

const ODD_SIZES = ["small","medium","big"];
/* How much each rule taxes him, before the board's own load is added. */
const ODD_RULE_LOAD = { colour:0, shape:1, size:2, category:3 };
const ODD_COUNTS = [4, 5, 6];

/* Every legal combination, scored and sorted — see THE LADDER above. A
   category round has no separable attributes to hold still or vary, so it has
   no "varied" form. */
const ODD_LEVELS = [];
Object.keys(ODD_RULE_LOAD).forEach(rule=>{
  const variants = rule === "category" ? [false] : [false, true];
  ODD_COUNTS.forEach(items=>{
    variants.forEach(varied=>{
      ODD_LEVELS.push({
        rule, items, varied,
        load: ODD_RULE_LOAD[rule] + (varied ? 1.5 : 0) + (items - ODD_COUNTS[0])
      });
    });
  });
});
ODD_LEVELS.sort((a, b)=> a.load - b.load);
function oddPlan(level){
  return ODD_LEVELS[Math.max(0, Math.min(ODD_LEVELS.length - 1, level - 1))];
}

/* A spread of `n` values drawn from `pool` in which **no value appears exactly
   once** — which is the whole point: a value used twice cannot single anything
   out, so a varied attribute can never produce a second odd one. Every value
   starts with two and the remainder is dealt out from there. */
function oddSpread(pool, n){
  const kinds = Math.min(Math.floor(n / 2), n >= 6 ? 3 : 2, pool.length);
  const use = shuffle(pool).slice(0, kinds);
  const counts = use.map(()=> 2);
  for(let left = n - kinds * 2, i = 0; left > 0; left--, i++) counts[i % kinds]++;
  const out = [];
  use.forEach((v, i)=>{ for(let k=0;k<counts[i];k++) out.push(v); });
  return shuffle(out);
}

/* Kept free of the DOM so the tests can build thousands of rounds and check
   both guards directly: exactly one item differs on the rule, and nothing else
   singles anything out. */
function oddBuild(plan){
  const n = plan.items;
  const oddAt = rnd(n);

  if(plan.rule === "category"){
    const themes = shuffle(MIXED_THEMES);
    const many = shuffle(THEMES[themes[0]]).slice(0, n - 1).map(ch => ({ k:"em", ch }));
    const items = many.slice();
    items.splice(oddAt, 0, { k:"em", ch: pick(THEMES[themes[1]]) });
    return { items, oddAt, rule: plan.rule, theme: themes[0], oddTheme: themes[1] };
  }

  const KEY = { colour:"color", shape:"shape", size:"size" };
  const POOL = { color: Object.keys(COLORS), shape: SHAPES.slice(), size: ODD_SIZES.slice() };
  const ruleKey = KEY[plan.rule];

  const items = [];
  for(let i=0;i<n;i++) items.push({ k:"shape" });

  // the rule itself: one item differs, every other shares
  const two = shuffle(POOL[ruleKey]).slice(0, 2);
  items.forEach((it, i)=> { it[ruleKey] = (i === oddAt ? two[1] : two[0]); });

  // and everything that isn't the rule: identical, or spread so nothing is alone
  Object.keys(POOL).forEach(key=>{
    if(key === ruleKey) return;
    if(plan.varied){
      const vals = oddSpread(POOL[key], n);
      items.forEach((it, i)=> { it[key] = vals[i]; });
    } else {
      const v = pick(POOL[key]);
      items.forEach(it => { it[key] = v; });
    }
  });
  return { items, oddAt, rule: plan.rule };
}

const ODD = {
  id: "odd",
  name: "ODD ONE OUT",
  icon: "🔵🔵🔶",
  maxLevel: ()=> ODD_LEVELS.length,
  levelLabel: (level)=>{
    const p = oddPlan(level);
    const what = { colour:"Colour", shape:"Shape", size:"Size", category:"What it is" }[p.rule];
    return what + " · " + p.items + (p.varied ? " · mixed" : "");
  },
  settingsHint: (level)=>{
    const p = oddPlan(level);
    const what = {
      colour:"one is a different colour", shape:"one is a different shape",
      size:"one is a different size", category:"one is a different kind of thing"
    }[p.rule];
    return "He finds the one that doesn't belong among " + p.items + ": " + what + ". " +
      "Nothing tells him what to look for — working out what the others have in common IS the task. " +
      (p.varied
        ? "The other features vary here, but always in pairs, so none of them can single anything out either."
        : "Everything except the rule is the same on every one, so only that one difference stands out.");
  },

  startRound(level, api){
    const plan = oddPlan(level);
    const r = oddBuild(plan);
    const st = api.stage;

    st.appendChild(el("div","prompt-line","Which one is different?"));

    const px = r.items.length > 5 ? 62 : (r.items.length > 4 ? 70 : 78);
    const slot = el("div","slot dropzone");
    slot.style.setProperty("--t", px + "px");
    const seq = el("div","seq");
    seq.appendChild(slot);
    st.appendChild(seq);

    const opts = el("div","options");
    let answerNode = null;
    r.items.forEach((it, i)=>{
      const wrap = el("div","opt");
      const node = itemNode(it, px);
      wrap.appendChild(node);
      if(i === r.oddAt) answerNode = node;
      makeDraggable(node, (zone)=>{
        if(!zone) return;
        if(i === r.oddAt){
          slot.classList.add("done");
          slot.dataset.full = "1";
          slot.innerHTML = "";
          slot.appendChild(itemNode(it, px));
          opts.querySelectorAll(".opt").forEach(o=>o.classList.add("gone"));
          api.solved(r.rule);              // Settings shows which rules land
        } else {
          const attempts = api.miss();
          // the wrong ones are all alike here, so dimming them says "not these"
          if(attempts >= S.dimAfter){
            Array.from(opts.querySelectorAll(".opt")).forEach((o, j)=>{
              if(j !== r.oddAt) o.classList.add("dim");
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
