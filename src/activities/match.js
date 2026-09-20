/* ============================ ACTIVITY: MATCH ============================
   "What goes with it?" — a picture on top, drag the one that belongs with it
   from the choices below. HEN goes with EGG, KEY goes with LOCK: knowing the
   two things belong together, not any perceptual attribute of either one.

   THE LADDER
   ----------
   One sorted list ordered by load, the same way Sorting's is — this is a
   pairing task like Sorting's "pair" rule, not a staged skill like Order or
   How many, so it keeps the general rule: hardest structure never gates
   easiest content just because it was declared first.

   Three things raise the load, in this order of introduction:
     - more choices to pick from (2, then 3, then 4)
     - a "close" choice: at least one wrong option comes from the SAME domain
       as the answer (another food next to a food, another tool next to a
       tool), so "pick the only {x}-ish thing on screen" stops working and he
       has to know the actual pair, not just its neighbourhood. The hardest
       level pushes this all the way — every wrong choice is a neighbour.
     - direction: early levels always go from the thing to what it goes with
       (HEN -> EGG); later levels sometimes ask the reverse (EGG -> HEN), and
       the hardest levels mix both directions round to round so which way
       he's going has to be read fresh each time, not assumed from habit.

   THE PAIRS
   ---------
   MATCH_PAIRS is grouped into six nameable domains (what an animal makes,
   what the weather calls for, things used together, food eaten together,
   an animal and its thing, how something gets around) — the same "must be
   nameable" bar CLAUDE.md sets for Sorting's categories. Every domain has at
   least four pairs, so the hardest level (every wrong choice a neighbour, 4
   choices) always has three same-domain neighbours to draw from without
   ever reusing the answer's own pair.

   Pure emoji throughout, like every other activity — the reward screen is
   where a real photograph earns its keep, not here.
   ========================================================================= */

const MATCH_PAIRS = [
  { a:"🐔", b:"🥚", d:"produce" },
  { a:"🐄", b:"🥛", d:"produce" },
  { a:"🐑", b:"🧶", d:"produce" },
  { a:"🐝", b:"🍯", d:"produce" },
  { a:"🕷️", b:"🕸️", d:"produce" },

  { a:"🧦", b:"👟", d:"wear" },
  { a:"☀️", b:"🕶️", d:"wear" },
  { a:"🌧️", b:"☂️", d:"wear" },
  { a:"❄️", b:"⛄", d:"wear" },

  { a:"🔑", b:"🔒", d:"tool" },
  { a:"🪡", b:"🧵", d:"tool" },
  { a:"✂️", b:"📄", d:"tool" },
  { a:"✏️", b:"📓", d:"tool" },

  { a:"🍞", b:"🧈", d:"food" },
  { a:"🫖", b:"☕", d:"food" },
  { a:"🍔", b:"🍟", d:"food" },
  { a:"🎂", b:"🕯️", d:"food" },

  { a:"🐦", b:"🪺", d:"animal" },
  { a:"🐶", b:"🦴", d:"animal" },
  { a:"🐱", b:"🐟", d:"animal" },
  { a:"🐰", b:"🥕", d:"animal" },

  { a:"⛵", b:"🌊", d:"transport" },
  { a:"✈️", b:"☁️", d:"transport" },
  { a:"🚂", b:"🛤️", d:"transport" },
  { a:"🚗", b:"🛣️", d:"transport" }
];
const MATCH_DOMAINS = ["produce","wear","tool","food","animal","transport"];

const MATCH_LEVELS = [
  { load:1.0, name:"What goes together · 2 choices",                 domains:["produce"],                     options:2 },
  { load:1.3, name:"What goes together · 2 choices",                 domains:["produce","wear"],               options:2 },
  { load:1.6, name:"What goes together · 2 choices",                 domains:["tool"],                         options:2 },
  { load:1.9, name:"What goes together · 2 choices",                 domains:["food"],                         options:2 },
  { load:2.2, name:"What goes together · 2 choices",                 domains:["animal","transport"],           options:2 },
  { load:2.5, name:"What goes together · 3 choices",                 domains:["produce","wear"],               options:3 },
  { load:2.8, name:"What goes together · 3 choices",                 domains:["tool","food"],                  options:3 },
  { load:3.1, name:"What goes together · 3 choices",                 domains:["animal","transport"],           options:3 },
  { load:3.4, name:"What goes together · 3 choices · any kind",      domains:MATCH_DOMAINS,                    options:3 },
  { load:3.7, name:"What goes together · 2 choices · close choice",  domains:MATCH_DOMAINS, options:2, near:true },
  { load:4.0, name:"What goes together · 3 choices · close choice",  domains:["produce","wear","tool"],        options:3, near:true },
  { load:4.3, name:"What goes together · 3 choices · close choice",  domains:["food","animal","transport"],    options:3, near:true },
  { load:4.6, name:"What goes together · 4 choices",                 domains:MATCH_DOMAINS,                    options:4 },
  { load:4.9, name:"What goes together · 4 choices · close choice",  domains:MATCH_DOMAINS, options:4, near:true },
  { load:5.2, name:"Where did it come from? · 2 choices",            domains:MATCH_DOMAINS, options:2, reverse:true },
  { load:5.5, name:"Where did it come from? · 3 choices",            domains:MATCH_DOMAINS, options:3, reverse:true },
  { load:5.8, name:"Where did it come from? · 3 choices · close choice", domains:MATCH_DOMAINS, options:3, near:true, reverse:true },
  { load:6.1, name:"Where did it come from? · 4 choices",            domains:MATCH_DOMAINS, options:4, reverse:true },
  { load:6.4, name:"Where did it come from? · 4 choices · close choice", domains:MATCH_DOMAINS, options:4, near:true, reverse:true },
  { load:6.7, name:"Either way · 3 choices · close choice",          domains:MATCH_DOMAINS, options:3, near:true, reverse:"mixed" },
  { load:7.0, name:"Either way · 4 choices · close choice",          domains:MATCH_DOMAINS, options:4, near:true, reverse:"mixed" },
  { load:7.3, name:"Either way · 4 choices · every choice close",    domains:MATCH_DOMAINS, options:4, near:"all", reverse:"mixed" }
];
MATCH_LEVELS.sort((a,b)=>a.load - b.load);   // stable, so declaration order breaks ties
function matchEntry(lv){ return MATCH_LEVELS[Math.min(Math.max(lv,1), MATCH_LEVELS.length) - 1]; }

/* Fills `need` distinct emoji drawn from `pool` (via `side`), skipping anything
   already in `used`. Mirrors count.js's approach to a fair, collision-free
   draw rather than trusting plain randomness not to repeat a picture. */
function matchDraw(pool, side, used, need){
  const seen = new Set(used), out = [];
  shuffle(pool).forEach(p=>{
    if(out.length >= need) return;
    const v = side(p);
    if(seen.has(v)) return;
    seen.add(v); out.push(v);
  });
  return out;
}

function buildMatch(level){
  const e = matchEntry(level);
  const pool = MATCH_PAIRS.filter(p=>e.domains.includes(p.d));
  const pair = pick(pool);
  const reverse = e.reverse === "mixed" ? Math.random() < 0.5 : !!e.reverse;
  // forward: prompt is the "a" side, choices are drawn from every pair's "b"
  // side. Reversed, the roles simply swap -- the pool and the guard logic
  // below don't care which side is which.
  const side = p => reverse ? p.a : p.b;
  const promptItem = { k:"em", ch: reverse ? pair.b : pair.a };
  const answerCh = side(pair);

  const sameDomain = pool.filter(p=>p.d===pair.d && p!==pair);
  const others = pool.filter(p=>p!==pair);
  const need = e.options - 1;
  let distractors;
  if(e.near === "all"){
    distractors = matchDraw(sameDomain, side, [answerCh], need);
  } else if(e.near){
    const near1 = matchDraw(sameDomain, side, [answerCh], 1);
    distractors = near1.concat(matchDraw(others, side, [answerCh].concat(near1), need - near1.length));
  } else {
    distractors = matchDraw(others, side, [answerCh], need);
  }

  const options = shuffle([answerCh].concat(distractors)).map(ch=>({k:"em", ch}));
  return { entry:e, promptItem, answerCh, options };
}

const MATCHING = {
  id: "match",
  name: "MATCH",
  icon: "🐔🥚",
  maxLevel: () => MATCH_LEVELS.length,
  levelLabel: (lv) => matchEntry(lv).name,
  settingsHint: (lv) => {
    const e = matchEntry(lv);
    let s = "He finds the picture that goes with the one shown, from " + e.options + " choices.";
    if(e.reverse === "mixed") s += " Some rounds ask which it goes with, some ask where it came from -- the direction changes round to round.";
    else if(e.reverse) s += " This asks the other way round: given the picture, find what it goes with.";
    if(e.near === "all") s += " Every wrong choice is from the same kind of thing as the right one, so guessing by category never works.";
    else if(e.near) s += " One wrong choice is always the same kind of thing as the right one, so he can't just pick the odd one out.";
    return s;
  },

  startRound(level, api){
    const r = buildMatch(level);
    const st = api.stage;
    st.appendChild(el("div","prompt-line","What goes with it?"));

    const px = 100;
    const row = el("div","seq");
    row.appendChild(itemNode(r.promptItem, px));
    const slot = el("div","slot dropzone");
    slot.style.setProperty("--t", px+"px");
    row.appendChild(slot);
    st.appendChild(row);

    const opts = el("div","options");
    const isAnswer = (o) => o.firstChild && o.firstChild._item.ch === r.answerCh;
    let answerNode = null;
    r.options.forEach(it=>{
      const wrap = el("div","opt");
      const node = itemNode(it, px);
      wrap.appendChild(node);
      if(it.ch === r.answerCh) answerNode = node;
      makeDraggable(node, (zone)=>{
        if(!zone) return;
        if(it.ch === r.answerCh){
          slot.dataset.full = "1";
          slot.classList.add("done");
          slot.innerHTML = "";
          slot.appendChild(itemNode(it, px));
          opts.querySelectorAll(".opt").forEach(o=>o.classList.add("gone"));
          api.solved(r.entry.domains.length === 1 ? r.entry.domains[0] : null);
        } else {
          const attempts = api.miss();
          if(attempts >= S.dimAfter) opts.querySelectorAll(".opt").forEach(o=>{ if(!isAnswer(o)) o.classList.add("dim"); });
          if(attempts >= S.showAfter) opts.querySelectorAll(".opt").forEach(o=>{ if(isAnswer(o)) o.classList.add("pick"); });
        }
      });
      opts.appendChild(wrap);
    });
    st.appendChild(opts);
    api.hint(answerNode);
  }
};
