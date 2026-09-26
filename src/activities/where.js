/* ========================== ACTIVITY: WHERE IS IT? ==========================
   A ball ON a box at the top. Underneath, the same ball and box with the ball
   IN it, UNDER it, BESIDE it. He drags the one that matches.

   THE STRAND NOTHING ELSE HERE TOUCHES
   -------------------------------------
   Ten activities in, the app had five reasoning games, three about number,
   three about letters and two about moving a hand — and nothing at all about
   where things are. In, on, under, beside are among the first relations a
   child is asked to act on ("put it under the table"), they are a common
   early-intervention target rather than something that simply arrives, and
   they are the one kind of meaning this app can teach without saying a word.

   NO WORDS, ON PURPOSE — AND IN THE RIGHT ORDER
   ----------------------------------------------
   Nothing here names a position. The task is "find the one arranged like this
   one", which is pure visual matching, so it needs no vocabulary he hasn't
   got. The concept is built first and the words attach to it afterwards, out
   in the world, which is the order they actually arrive in. Don't add labels
   to make it "clearer": the moment a round needs a word read, it stops being
   a round he can do.

   ONLY THE POSITION MAY DIFFER
   -----------------------------
   The guard that makes a round mean anything. Every choice in a round is the
   SAME thing in the SAME container in the SAME colour — the only difference
   between them is where the thing sits. Let the objects vary between choices
   and "find the one with the red ball" answers it without any thought about
   position at all, which is the shortcut this app spends most of its design
   budget closing (see "Guard against latching" in CLAUDE.md).

   THE LADDER — AND WHY ITS TOP IS THE POINT
   ------------------------------------------
   One sorted list scored by load. Three things raise it: how many choices,
   how many positions are in play, and — the one that matters — whether the
   choices are made of the SAME things as the picture he is matching.

   At the bottom they are: a ball and a box up top, the same ball and box
   below, so he can match the arrangement almost as a picture. At the top they
   are not: a ball on a box up top, and a star and a bowl below. Nothing is
   shared except the relation itself, so the relation is the only thing left
   to match on. That is the difference between recognising a picture and
   holding "on-ness" apart from what happens to be on what — and it is the
   whole reason to build this rather than a memory game with boxes in it.
   ============================================================================ */

/* Containers share one bounding box so a position means the same thing in
   either of them; only the drawing differs. `inx/iny` is where a thing sits
   INSIDE, which a bowl needs lower than a box. */
const WHERE_CONTAINERS = {
  box: {
    top:38, bottom:72, right:70, inx:50, iny:57,
    svg: '<rect x="30" y="38" width="40" height="34" rx="6" fill="#eef2f8" stroke="#8fa3bf" stroke-width="3"/>'
  },
  bowl: {
    top:40, bottom:74, right:72, inx:50, iny:60,
    svg: '<path d="M28 40 L33 62 Q50 74 67 62 L72 40" fill="#eef2f8" stroke="#8fa3bf" stroke-width="3" stroke-linejoin="round" fill-rule="evenodd"/>'
  }
};
const WHERE_THINGS = ["circle","square","triangle","star"];
const WHERE_R = 10;

/* Where the thing goes, for a given container. Every position is measured off
   the container's own edges, so it reads the same whichever one is drawn. */
function wherePoint(pos, c){
  if(pos === "in")     return { x:c.inx, y:c.iny };
  if(pos === "on")     return { x:50, y:c.top - WHERE_R - 2 };
  if(pos === "under")  return { x:50, y:c.bottom + WHERE_R + 2 };
  return { x:c.right + WHERE_R + 3, y:(c.top + c.bottom) / 2 };   // beside
}
function whereThingSVG(thing, colour, p){
  const c = COLORS[colour] || colour, r = WHERE_R;
  if(thing === "circle") return `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${c}"/>`;
  if(thing === "square") return `<rect x="${p.x-r}" y="${p.y-r}" width="${r*2}" height="${r*2}" rx="3" fill="${c}"/>`;
  if(thing === "triangle")
    return `<polygon points="${p.x},${p.y-r} ${p.x+r},${p.y+r*0.8} ${p.x-r},${p.y+r*0.8}" fill="${c}" stroke="${c}" stroke-width="3" stroke-linejoin="round"/>`;
  let pts = [];
  for(let i=0;i<10;i++){
    const a = -Math.PI/2 + i*Math.PI/5, rad = i%2 ? r*0.45 : r;
    pts.push((p.x + rad*Math.cos(a)).toFixed(1) + "," + (p.y + rad*Math.sin(a)).toFixed(1));
  }
  return `<polygon points="${pts.join(" ")}" fill="${c}"/>`;
}
/* The container is drawn first for "on", "under" and "beside", and second for
   "in" — otherwise a thing inside it is painted over by its own container. */
function whereSVG(scene){
  const c = WHERE_CONTAINERS[scene.container];
  const thing = whereThingSVG(scene.thing, scene.colour, wherePoint(scene.pos, c));
  return '<svg viewBox="0 0 100 100" width="100%" height="100%">' +
    (scene.pos === "in" ? c.svg + thing : thing + c.svg) + "</svg>";
}
const whereItem = (scene)=> ({ k:"svg", svg: whereSVG(scene), where: scene });

/* Every combination, scored and sorted. `objects` is the one that matters:
   same things below as above, then a different thing, then a different thing
   in a different container — where nothing at all is shared but the relation. */
const WHERE_POOLS = [["in","on","under"], ["in","on","under","beside"]];
const WHERE_SWAPS = [
  { id:"same",      load:0 },
  { id:"swapThing", load:2 },
  { id:"swapBoth",  load:3 }
];
const WHERE_LEVELS = [];
WHERE_POOLS.forEach((pool, pi)=>{
  for(let choices=2; choices<=pool.length; choices++){
    WHERE_SWAPS.forEach(sw=>{
      WHERE_LEVELS.push({
        pool, choices, swap: sw.id,
        load: (choices - 2) + (pi ? 0.5 : 0) + sw.load
      });
    });
  }
});
WHERE_LEVELS.sort((a, b)=> a.load - b.load);
function wherePlan(level){
  return WHERE_LEVELS[Math.max(0, Math.min(WHERE_LEVELS.length - 1, level - 1))];
}

/* DOM-free, so the tests can check the one guard that matters over every level
   many times over: the choices differ from each other in position and nothing
   else. */
function whereBuild(plan){
  const kinds = Object.keys(WHERE_CONTAINERS);
  const ref = {
    container: pick(kinds),
    thing: pick(WHERE_THINGS),
    colour: pick(Object.keys(COLORS)),
    pos: pick(plan.pool)
  };

  // what the CHOICES are made of — one set shared by all of them, so position
  // stays the only thing telling them apart
  const below = { container: ref.container, thing: ref.thing, colour: ref.colour };
  if(plan.swap !== "same"){
    below.thing = pick(WHERE_THINGS.filter(t => t !== ref.thing));
    below.colour = pick(Object.keys(COLORS).filter(c => c !== ref.colour));
  }
  if(plan.swap === "swapBoth"){
    below.container = pick(kinds.filter(k => k !== ref.container));
  }

  const others = shuffle(plan.pool.filter(p => p !== ref.pos)).slice(0, plan.choices - 1);
  const positions = shuffle([ref.pos].concat(others));
  return {
    ref,
    scenes: positions.map(pos => Object.assign({ pos }, below)),
    answerAt: positions.indexOf(ref.pos),
    pos: ref.pos
  };
}

const WHERE = {
  id: "where",
  name: "WHERE IS IT?",
  icon: "📦🔵",
  maxLevel: ()=> WHERE_LEVELS.length,
  levelLabel: (level)=>{
    const p = wherePlan(level);
    const how = { same:"same things", swapThing:"different thing", swapBoth:"all different" }[p.swap];
    return p.choices + " choices · " + how;
  },
  settingsHint: (level)=>{
    const p = wherePlan(level);
    return "He finds the picture arranged like the one on top — something in, on, under or beside a box. " +
      "Nothing is named: it is matching an arrangement, so it needs no words he hasn't got, and the " +
      "concept is built before the words attach to it. Every choice here is the same thing in the same " +
      "place-holder, so only WHERE it sits can tell them apart (" + p.choices + " to choose from). " +
      (p.swap === "same"
        ? "The choices are made of the same things as the picture above, so he can match it almost as a picture."
        : p.swap === "swapThing"
          ? "The choices use a different thing from the picture above, so the arrangement is what has to be matched, not the object."
          : "The choices use a different thing AND a different container, so nothing is shared but the relation itself.");
  },

  startRound(level, api){
    const plan = wherePlan(level);
    const r = whereBuild(plan);
    const st = api.stage;

    st.appendChild(el("div","prompt-line","Find the same one"));

    const px = r.scenes.length > 3 ? 78 : 92;
    const seq = el("div","seq");
    seq.appendChild(itemNode(whereItem(r.ref), px));
    const slot = el("div","slot dropzone");
    slot.style.setProperty("--t", px + "px");
    seq.appendChild(slot);
    st.appendChild(seq);

    const opts = el("div","options");
    let answerNode = null;
    r.scenes.forEach((scene, i)=>{
      const wrap = el("div","opt");
      const node = itemNode(whereItem(scene), px);
      wrap.appendChild(node);
      if(i === r.answerAt) answerNode = node;
      makeDraggable(node, (zone)=>{
        if(!zone) return;
        if(i === r.answerAt){
          slot.classList.add("done");
          slot.dataset.full = "1";
          slot.innerHTML = "";
          slot.appendChild(itemNode(whereItem(scene), px));
          opts.querySelectorAll(".opt").forEach(o=>o.classList.add("gone"));
          api.solved(r.pos);          // Settings shows which positions land
        } else {
          const attempts = api.miss();
          if(attempts >= S.dimAfter){
            Array.from(opts.querySelectorAll(".opt")).forEach((o, j)=>{
              if(j !== r.answerAt) o.classList.add("dim");
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
