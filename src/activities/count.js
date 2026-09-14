/* ============================ ACTIVITY: HOW MANY ============================
   A card with some dots on it; drag over the card with the same number.

   This is about knowing HOW MANY, not about reciting numbers. He can say the
   numbers to 20; what this builds is knowing that three dots are three however
   they're laid out, whatever they are, and whatever size they come in. It
   follows from the other two games on purpose: the number idea is usually
   described as growing out of grouping things (Sorting) and putting them in
   order (Order).

   STAGES
   ------
   Like Order, the ladder is grouped into stages, each adding one new thing:

     1. same pattern     both cards laid out exactly alike (dice faces) — the
                         on-ramp, where "these look the same" still works
     2. different pattern the matching card is NEVER laid out like the top one,
                         so how many is the only thing the two share
     3. numbers          a digit to find the dots for, and dots to find the
                         digit for — he already knows his numbers, so they
                         come in early
     4. bigger ≠ more    dot sizes vary, so how full a card looks stops
                         predicting how many are on it
     5. pictures         the same things, different things, then a mix on one
                         card — anything can be counted
     6. up to 10         rows of five first, then scattered, then numbers
                         close together, where counting is the only way

   Every card in a round is the same colour, so colour never helps.

   THE TWO SHORTCUTS IT GUARDS AGAINST
   -----------------------------------
   Matching the PATTERN instead of the number: from stage 2 on, no option is
   laid out the same way as the top card — not just the right answer, the
   wrong ones too. If only the right answer looked different, "pick the odd
   one out" would work.

   Matching HOW FULL A CARD LOOKS: with same-sized dots, three dots also means
   more colour than two. From stage 4 there are two such shortcuts — "the card
   that looks as full" and "the card with dots the same size" — and random
   sizes are not enough to kill them: a first version that picked sizes at
   random still let "looks as full" find the answer about half the time. So
   each round decides in advance which choice will look closest each way (the
   right one only 1 time in 3) and draws sizes until that is true, which puts
   both shortcuts at exactly chance. The "big and few" level goes further: the
   card that looks as full is always a wrong one, with exactly the top card's
   amount of colour.

   THE WORDS CHANGE, THE TASK DOESN'T
   ----------------------------------
   The prompt rotates between different ways of asking — "How many?", "Count
   them", "Find the same number"… — never the same one twice in a row, and the
   home card is called COUNT on some launches and HOW MANY on others. A skill
   tied to one exact phrase can fail the moment someone asks it differently;
   varying the words while the task stays identical guards against that. The
   layout, the icon and what he does never change.
   ========================================================================= */

const COUNT_OPTIONS = 3;
const COUNT_PICTURES = [].concat(THEMES.fruits, THEMES.animals, THEMES.vehicles);
const COUNT_PIC_R = 10.5;            // picture half-size, in the card's 100-unit box

const COUNT_LEVELS = [
  // 1 — same pattern: laid out alike, the on-ramp
  { stage:1, load:0.0, name:"Dots · 1 to 3 · same pattern", range:[1,3], ask:"dots", layout:"same" },
  { stage:1, load:0.4, name:"Dots · 1 to 4 · same pattern", range:[1,4], ask:"dots", layout:"same" },
  { stage:1, load:0.8, name:"Dots · 1 to 5 · same pattern", range:[1,5], ask:"dots", layout:"same" },

  // 2 — different pattern: now only the number matches
  { stage:2, load:1.0, name:"Dots · 1 to 3 · different patterns", range:[1,3], ask:"dots", layout:"different" },
  { stage:2, load:1.3, name:"Dots · 1 to 3 · scattered",          range:[1,3], ask:"dots", layout:"scatter" },
  { stage:2, load:1.6, name:"Dots · 1 to 4 · different patterns", range:[1,4], ask:"dots", layout:"different" },
  { stage:2, load:2.0, name:"Dots · 1 to 5 · different patterns", range:[1,5], ask:"dots", layout:"different" },
  { stage:2, load:2.6, name:"Dots · close numbers (3, 4, 5)",     range:[3,5], ask:"dots", layout:"different" },

  // 3 — numbers: the digits he already knows
  { stage:3, load:1.5, name:"Number → dots · 1 to 5", range:[1,5], ask:"numToDots", layout:"different" },
  { stage:3, load:1.8, name:"Dots → number · 1 to 5", range:[1,5], ask:"dotsToNum", layout:"different" },
  { stage:3, load:2.2, name:"Numbers · both ways",    range:[1,5], ask:"numBoth",   layout:"different" },

  // 4 — bigger doesn't mean more
  { stage:4, load:2.0, name:"Dots · different sizes · 1 to 3", range:[1,3], ask:"dots", layout:"different", size:"vary" },
  { stage:4, load:2.8, name:"Dots · different sizes · 1 to 5", range:[1,5], ask:"dots", layout:"different", size:"vary" },
  { stage:4, load:3.2, name:"Dots · big and few, small and many", range:[1,5], ask:"dots", layout:"different", size:"trap" },

  // 5 — pictures: anything can be counted
  { stage:5, load:1.8, name:"Pictures · the same things", range:[1,5], ask:"dots", layout:"different", pics:"same" },
  { stage:5, load:2.4, name:"Pictures · different things", range:[1,5], ask:"dots", layout:"different", pics:"different" },
  { stage:5, load:3.0, name:"Pictures · mixed on one card", range:[1,5], ask:"dots", layout:"different", pics:"mixed" },

  // 6 — up to 10, where counting is the only way
  { stage:6, load:3.0, name:"Up to 10 · rows of five",   range:[6,10], ask:"numToDots", layout:"frame" },
  { stage:6, load:3.6, name:"Up to 10 · scattered",      range:[6,10], ask:"numToDots", layout:"scatter", spread:"near" },
  { stage:6, load:3.8, name:"Up to 10 · dots → number",  range:[6,10], ask:"dotsToNum", layout:"different", spread:"near" },
  { stage:6, load:4.4, name:"Up to 10 · close numbers",  range:[6,10], ask:"dots",      layout:"different", spread:"near" }
];
// stage first, then load inside the stage — stable, so declaration order breaks ties
COUNT_LEVELS.sort((a,b)=> (a.stage - b.stage) || (a.load - b.load));
function countEntry(lv){ return COUNT_LEVELS[Math.min(Math.max(lv,1), COUNT_LEVELS.length) - 1]; }

/* ---- the words: many ways to ask the same thing ---- */
const COUNT_WORDS = {
  dots:      ["How many?", "Count them", "Find the same number", "Which one is the same?"],
  numToDots: ["Find {n}", "Show me {n}", "Which one has {n}?"],
  dotsToNum: ["How many?", "Count them", "Which number?"]
};
let countLastWords = "";
function countPrompt(ask, n){
  const choices = COUNT_WORDS[ask].filter(w => w !== countLastWords);   // never the same twice running
  const w = pick(choices);
  countLastWords = w;
  return w.replace("{n}", n);
}

/* ---- laying dots out on a card ---- */
const round1 = (v)=> Math.round(v*10)/10;
const COUNT_DICE = {
  1:[[50,50]], 2:[[30,30],[70,70]], 3:[[28,28],[50,50],[72,72]],
  4:[[30,30],[70,30],[30,70],[70,70]], 5:[[30,30],[70,30],[50,50],[30,70],[70,70]]
};
// which layouts exist for a count; pictures skip "line", which can't fit five of them
function countLayoutTypes(n, pics){
  if(n > 5) return ["frame","scatter"];
  return pics ? ["dice","scatter"] : ["dice","line","scatter"];
}
// the biggest dot a layout can hold at this count without dots touching
function countRmax(type, n){
  if(type === "dice")  return n === 5 ? 12.5 : 14.5;
  if(type === "line")  return n < 2 ? 20 : (94 - 2*n) / (2*n);
  if(type === "frame") return 7;
  return n > 5 ? 6.5 : (n >= 4 ? 11 : 14);        // scatter: what reliably fits
}
function countFixedPts(type, n, r){
  if(type === "dice") return COUNT_DICE[n].map(([x,y])=>({x,y}));
  if(type === "line"){
    const s = n < 2 ? 0 : Math.min((92 - 2*r)/(n-1), 2*r + 10);
    const x0 = 50 - s*(n-1)/2;
    return Array.from({length:n}, (_,i)=>({ x: x0 + i*s, y: 50 }));
  }
  // frame: a row of five, then the rest underneath from the left — like two hands
  return Array.from({length:n}, (_,i)=> i < 5 ? { x: 18 + i*16, y: 36 } : { x: 18 + (i-5)*16, y: 64 });
}
function countScatterPts(n, r, room){
  const lo = r + 4, hi = 96 - r, gap = 2*r + room;
  for(let attempt=0; attempt<60; attempt++){
    const pts = [];
    for(let tries=0; pts.length<n && tries<400; tries++){
      const x = lo + Math.random()*(hi-lo), y = lo + Math.random()*(hi-lo);
      if(pts.every(p=>Math.hypot(p.x-x, p.y-y) >= gap)) pts.push({x,y});
    }
    if(pts.length === n) return pts;
  }
  return null;
}

/* One card. kind: null for dots, an emoji for pictures, "mixed" for a
   different picture on every point. */
function countCard(n, type, r, colour, kind){
  // wide pictures (a bus, a bike) fill more of their space than a dot does, so
  // scattered pictures get extra room or neighbours can touch
  let pts = type === "scatter" ? countScatterPts(n, r, kind ? 7 : 3) : null;
  if(type === "scatter" && !pts){ type = n > 5 ? "frame" : "dice"; }        // never seen in practice
  if(!pts) pts = countFixedPts(type, n, r);
  const mixed = kind === "mixed" ? shuffle(COUNT_PICTURES).slice(0, n) : null;
  // radius kept to 3 places: at one decimal, "exactly as much colour" was off by up to 2%
  return { k:"set", n, layout:type, color:colour,
           pts: pts.map((p,i)=>{
             const q = { x:round1(p.x), y:round1(p.y), r:Math.round(r*1000)/1000 };
             if(kind) q.ch = mixed ? mixed[i] : kind;
             return q;
           }) };
}

/* Stage 4's dot sizes. ns[0] is the right answer; caps[i] is the biggest dot
   choice i's layout can hold. Decides up front which choice will look closest
   to the top card in total colour (jA) and which in dot size (jS) — each one
   the right answer only 1 time in 3 — then draws sizes until both come true.
   With trap, the closest in colour is always a wrong card with exactly the top
   card's amount, and the right card is at least 25% away from it. */
const COUNT_MIN_R = 5.5;
function countSizes(target, sampleCap, ns, caps, trap){
  const k = ns.length;
  const nearest = (f)=>{ let b = 0; for(let i=1;i<k;i++) if(f(i) < f(b)) b = i; return b; };
  // some pairings can't all be true at once (a 5-dot decoy for a 1-dot top card
  // can't also have the closest dot size), so re-pick the roles if one won't go
  for(let pickRoles=0; pickRoles<12; pickRoles++){
    const jA = trap ? 1 + rnd(k - 1) : rnd(k);
    const jS = rnd(k);
    for(let tries=0; tries<600; tries++){
      const rs = COUNT_MIN_R + Math.random()*(sampleCap - COUNT_MIN_R);
      const aS = target*rs*rs;
      const ro = caps.map(c => COUNT_MIN_R + Math.random()*(c - COUNT_MIN_R));
      if(trap){
        ro[jA] = Math.sqrt(aS / ns[jA]);
        if(ro[jA] < 5 || ro[jA] > caps[jA]) continue;
        if(Math.abs(ns[0]*ro[0]*ro[0] - aS) / aS < 0.25) continue;
      }
      if(nearest(i => Math.abs(ns[i]*ro[i]*ro[i] - aS)) !== jA) continue;
      if(nearest(i => Math.abs(ro[i] - rs)) !== jS) continue;
      return { rs, ro };
    }
  }
  return null;
}

function countChoices(target, e){
  let pool = [];
  for(let v=e.range[0]; v<=e.range[1]; v++) if(v !== target) pool.push(v);
  pool = shuffle(pool);
  if(e.spread === "near") pool.sort((a,b)=> Math.abs(a-target) - Math.abs(b-target));
  return [target].concat(pool.slice(0, COUNT_OPTIONS - 1));
}

function buildCount(lv){
  const e = countEntry(lv);
  const ask = e.ask === "numBoth" ? pick(["numToDots","dotsToNum"]) : e.ask;
  const target = e.range[0] + rnd(e.range[1] - e.range[0] + 1);
  const counts = countChoices(target, e);
  const colour = pick(Object.keys(COLORS));
  const hex = COLORS[colour];
  const pics = e.pics || "none";
  const size = e.size || "one";
  const plainR = e.range[1] > 5 ? 6 : 8;           // one size fits every layout at these counts
  const sampleKind = pics === "none" ? null : (pics === "mixed" ? "mixed" : pick(COUNT_PICTURES));
  const kindFor = (isSample)=>{
    if(pics === "none") return null;
    if(pics === "same" || pics === "mixed") return sampleKind;
    // "different": no option shares the top card's picture, or "pick the other kind" would work
    return isSample ? sampleKind : pick(COUNT_PICTURES.filter(ch => ch !== sampleKind));
  };
  const typeFor = (n, avoid)=>{
    if(e.layout === "frame" || e.layout === "scatter") return e.layout;
    if(e.layout === "same") return "dice";
    const types = countLayoutTypes(n, pics !== "none").filter(t => t !== avoid);
    return pick(types);
  };

  // layouts first — from stage 2 on NO choice copies the top card's layout,
  // the right one or the wrong ones
  const sampleIsSet = ask !== "numToDots", choicesAreSets = ask !== "dotsToNum";
  const sampleType = sampleIsSet ? typeFor(target, null) : null;
  const types = counts.map(n => choicesAreSets ? typeFor(n, sampleType) : null);

  // then sizes
  let rs = plainR, ro = counts.map(()=>plainR);
  if(pics !== "none"){ rs = COUNT_PIC_R; ro = counts.map(()=>COUNT_PIC_R); }
  else if(size !== "one"){
    const caps = counts.map((n,i)=> countRmax(types[i], n));
    const fit = countSizes(target, countRmax(sampleType, target), counts, caps, size === "trap");
    if(fit){ rs = fit.rs; ro = fit.ro; }
    else ro = caps.map(c => COUNT_MIN_R + Math.random()*(c - COUNT_MIN_R));   // not seen in practice
  }

  const sample = sampleIsSet ? countCard(target, sampleType, rs, colour, kindFor(true))
                             : { k:"text", text:String(target), color:hex };
  const options = counts.map((n, i)=>{
    if(!choicesAreSets) return { k:"text", text:String(n), color:hex };
    if(e.layout === "same" && i === 0) return Object.assign({}, sample, { pts: sample.pts.map(p=>Object.assign({}, p)) });
    return countCard(n, types[i], ro[i], colour, kindFor(false));
  });

  const answer = options[0];
  return { entry:e, ask, target, sample, answer, options: shuffle(options), head: countPrompt(ask, target) };
}

const COUNTING = {
  id: "count",
  // COUNT on some launches, HOW MANY on others — the icon never changes
  name: pick(["COUNT", "HOW MANY"]),
  icon: "🔢",
  maxLevel: ()=> COUNT_LEVELS.length,
  levelLabel: (lv)=> countEntry(lv).name,
  settingsHint: (lv)=>{
    const e = countEntry(lv);
    const what = e.ask === "numToDots" ? "He sees a number and finds the card with that many."
               : e.ask === "dotsToNum" ? "He sees some dots and finds their number."
               : e.ask === "numBoth"   ? "Number to dots, and dots to number, mixed."
               : "He finds the card with the same number of " + (e.pics ? "pictures." : "dots.");
    const how = e.layout === "same" ? " Both cards are laid out alike."
              : e.size === "vary" ? " Dot sizes vary, so a fuller card isn't always more."
              : e.size === "trap" ? " One wrong card always has exactly as much colour as the top card, so \"looks as full\" is always wrong."
              : " The cards are laid out differently, so only the number matches.";
    return what + how + " The wording changes from round to round on purpose.";
  },

  startRound(level, api){
    const r = buildCount(level);
    const st = api.stage;
    st.appendChild(el("div","prompt-line", r.head));

    const px = 112;
    const row = el("div","seq count-pair");
    row.appendChild(itemNode(r.sample, px));
    const slot = el("div","slot dropzone");
    slot.style.setProperty("--t", px+"px");
    row.appendChild(slot);
    st.appendChild(row);

    const opts = el("div","options");
    let answerNode = null;
    const isAnswer = (o)=> o.firstChild && o.firstChild._item === r.answer;
    r.options.forEach(it=>{
      const wrap = el("div","opt");
      const node = itemNode(it, px);
      wrap.appendChild(node);
      if(it === r.answer) answerNode = node;
      makeDraggable(node, (zone)=>{
        if(!zone) return;
        if(it === r.answer){
          slot.dataset.full = "1";
          slot.classList.add("done");
          slot.innerHTML = "";
          slot.appendChild(itemNode(it, px));       // the two amounts end up side by side
          opts.querySelectorAll(".opt").forEach(o=>o.classList.add("gone"));
          api.solved(null);
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
