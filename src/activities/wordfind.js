/* ============================ ACTIVITY: WORD FIND ============================
   A word's letters sit at the top; the same letters are hidden somewhere in a
   grid below. He drags across them to find it — and finding it is what shows
   him the photograph of what the word says.

   THIS IS LETTER MATCHING, NOT READING
   -------------------------------------
   He is four and cannot read, so nothing here asks him to. The letters he has
   to match are on screen the whole time, right above the grid, so nothing is
   being remembered — the task is visual discrimination of letter forms and
   left-to-right scanning, which is what comes before reading.

   THE PICTURE IS THE REVEAL, NOT THE PROMPT
   ------------------------------------------
   The photograph is deliberately NOT shown above the grid. The first version
   put it there, reasoning that it kept the task about the word rather than
   about abstract shapes — but it also sat there giving away its own reveal for
   the whole round, so the reward screen had nothing left to tell him. Now the
   word is a mystery made of letters until he finds it, and then the picture
   says what he found. The word still gets attached to the thing in the world
   it names, which is the whole point of the reward pack; it just happens in
   the other order.

   The cost of that is real and accepted: during play this IS closer to shape
   matching, because a four-year-old reads nothing in D-O-G. What makes that
   survivable is the first four levels lightly highlighting the word where it
   sits, so he learns what the game is by doing it — see wfRender().

   WHY THE WHOLE VOCABULARY
   ------------------------
   The pool is EMOJI_PACK — the same words the reward screen teaches, the ones
   with a photograph saved for them. Every one of them turns up as a target
   somewhere on the ladder, so the game works through the vocabulary he is
   already being shown, rather than inventing a word list of its own. Three
   entries are left out, each for a reason:

     - TV is two letters. In a grid of letters a two-cell run is not a find,
       and TV is an abbreviation rather than a spelling worth learning.
     - ICE CREAM and FIRE ENGINE have a space in them. A space cannot be a cell
       he drags through, and hiding ICECREAM in the grid while the target above
       reads ICE CREAM would teach the wrong spelling of the one word it was
       supposed to teach.

   That leaves 150 of the 153. If a word ever loses its picture it drops out on
   its own — the pool is built from what pictureForWord() can actually show,
   the same rule the reward screen follows.

   DIRECTION: ONLY THE WAY READING GOES
   -------------------------------------
   The word is only ever hidden left-to-right or top-to-bottom. Never
   backwards, never diagonally. Reversals are the mistake emergent writers
   already make on their own (the b/d, the mirrored 3), and a game that hides
   DOG as GOD to make itself harder spends its difficulty budget teaching the
   error. It is the same reason Trace enforces stroke direction.

   Dragging the other way along the right cells still counts, though. He has
   found the word either way, and refusing a correct find would be a failure
   state — the direction is taught by never showing him a mirrored word, not
   by rejecting him when he sweeps right to left. Whichever way he drags, the
   word lights up in reading order.

   THE LADDER — STAGED, LIKE ORDER AND HOW MANY
   ---------------------------------------------
   Word length has to grow to get through the vocabulary, and it dominates
   difficulty: a three-letter word in a 4x4 grid and a ten-letter word in an
   11x5 one are not the same task at all. So the ladder is stages of one word
   length, and inside a stage exactly one thing gets harder at a time, in this
   order:

     1. direction      horizontal only, then horizontal or vertical
     2. decoy starts   the word's first letter planted elsewhere too, so
                       "find the only D on screen" stops being the whole game
     3. hostile filler the spare cells drawn from the word's OWN letters, so
                       its letters no longer stand out from the background
     4. a near miss    a run that starts like the word and then diverges
                       (DO-N where he wants DOG), so the end has to be checked
                       and not assumed from the start

   Steps 3 and 4 only appear from the five-letter stage on: on a short word in
   a small grid there is not enough room for them to be anything but cruel.
   ============================================================================= */

/* Grids stay wide rather than square once the words get long: a twelve-letter
   word needs twelve columns, but making it twelve rows too would put 144 cells
   in front of him. Rows are capped instead, which also means the longest words
   are horizontal-only for free — vertical is offered only where the word
   actually fits down the grid. */
const WF_STAGES = [
  { len:3,  cols:4,  rows:4, steps:["dir-h","dir-v","decoy"] },
  { len:4,  cols:5,  rows:5, steps:["dir-h","dir-v","decoy","filler"] },
  { len:5,  cols:6,  rows:6, steps:["dir-h","dir-v","decoy","filler","near"] },
  { len:6,  cols:7,  rows:6, steps:["dir-h","dir-v","decoy","filler","near"] },
  { len:7,  cols:8,  rows:6, steps:["dir-h","dir-v","decoy","filler","near"] },
  { len:8,  cols:9,  rows:6, steps:["dir-h","decoy","filler","near"] },
  { len:9,  cols:10, rows:5, steps:["dir-h","decoy","filler","near"] },
  { len:10, cols:11, rows:5, steps:["dir-h","decoy","filler","near"] },
  { len:12, cols:13, rows:5, steps:["dir-h","decoy","filler","near"] }
];

/* level (1-based) -> { stage, step } */
const WF_LEVELS = [];
WF_STAGES.forEach((stage, si)=>{
  stage.steps.forEach((step, pi)=> WF_LEVELS.push({ stage, si, step, stepIndex:pi }));
});
function wfPlan(level){
  return WF_LEVELS[Math.max(0, Math.min(WF_LEVELS.length - 1, level - 1))];
}

/* How long the game teaches itself — see the cue in wfRender(). */
const WF_CUE_LEVELS = 4;       // up to here the word is lightly highlighted; then nothing

const WF_ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/* The pool is whatever the reward screen could actually put a picture under,
   at this word length — so a missing picture drops a word from the game
   instead of showing him a blank. */
function wfWords(len){
  const out = [];
  EMOJI_PACK.forEach(p=>{
    const w = p[0];
    if(w.length !== len || /[^A-Z]/.test(w)) return;     // no spaces, no punctuation
    if(pictureForWord(w)) out.push(w);
  });
  return out;
}

/* One bag per word length, so a stage works through its words rather than
   asking for the same favourite twice running. */
const WF_BAGS = {};
function wfNextWord(len){
  const pool = wfWords(len);
  if(!pool.length) return null;
  if(!WF_BAGS[len] || !WF_BAGS[len].length) WF_BAGS[len] = shuffle(pool);
  return WF_BAGS[len].pop();
}

/* ---- the grid ----
   Built as a flat array of letters plus where the answer sits. Kept free of
   the DOM so tests can hammer it directly: every level, every word, checking
   the answer is placed in a legal direction, lands on the board, and turns up
   exactly once. */
function wfBlankGrid(cols, rows){
  const cells = new Array(cols * rows).fill("");
  return { cols, rows, cells };
}
function wfAt(g, r, c){ return g.cells[r * g.cols + c]; }
function wfSet(g, r, c, ch){ g.cells[r * g.cols + c] = ch; }

/* Every run of `len` cells that reads left-to-right or top-to-bottom. The
   answer is placed along one of these, and the same list is what counts
   occurrences afterwards — one function, so a word can never be placed
   somewhere the checker doesn't look. */
function wfRuns(g, len, dirs){
  const out = [];
  if(dirs.indexOf("h") >= 0 && g.cols >= len){
    for(let r=0;r<g.rows;r++) for(let c=0;c+len<=g.cols;c++){
      const run = []; for(let i=0;i<len;i++) run.push({r, c:c+i});
      out.push(run);
    }
  }
  if(dirs.indexOf("v") >= 0 && g.rows >= len){
    for(let c=0;c<g.cols;c++) for(let r=0;r+len<=g.rows;r++){
      const run = []; for(let i=0;i<len;i++) run.push({r:r+i, c});
      out.push(run);
    }
  }
  return out;
}
function wfReads(g, run){ return run.map(p => wfAt(g, p.r, p.c)).join(""); }

/* How many times the word is in there, looking every way he could drag —
   including the ones this level doesn't place along, since a stray second
   copy would be just as findable as the planted one. */
function wfCount(g, word){
  let n = 0;
  wfRuns(g, word.length, ["h","v"]).forEach(run=>{
    const s = wfReads(g, run);
    if(s === word) n++;
  });
  return n;
}

function wfBuild(word, plan){
  const { stage, step } = plan;
  const dirs = (step === "dir-h" || stage.steps.indexOf("dir-v") < 0) ? ["h"] : ["h","v"];
  const decoys = step === "decoy" || step === "filler" || step === "near";
  const hostile = step === "filler" || step === "near";
  const near = step === "near";

  /* Regenerating is cheaper than reasoning about it: the fill can always
     happen to spell the word a second time, and one clean grid is one retry
     away. The last attempt falls back to plain random filler, which almost
     never collides. */
  for(let attempt=0; attempt<200; attempt++){
    const g = wfBlankGrid(stage.cols, stage.rows);
    const spots = wfRuns(g, word.length, dirs);
    const answer = spots[rnd(spots.length)];
    answer.forEach((p, i)=> wfSet(g, p.r, p.c, word[i]));

    const open = [];
    for(let r=0;r<g.rows;r++) for(let c=0;c<g.cols;c++) if(!wfAt(g, r, c)) open.push({r, c});
    const free = shuffle(open);
    let fi = 0;
    const takeFree = ()=> fi < free.length ? free[fi++] : null;

    // a run that starts like the word and then doesn't, so the end has to be read
    if(near && attempt < 190){
      const share = Math.min(word.length - 1, Math.max(2, word.length - 2));
      const lure = wfRuns(g, share + 1, dirs).filter(run =>
        run.every(p => !wfAt(g, p.r, p.c)));
      if(lure.length){
        const run = lure[rnd(lure.length)];
        for(let i=0;i<share;i++) wfSet(g, run[i].r, run[i].c, word[i]);
        let ch = WF_ALPHA[rnd(26)];
        while(ch === word[share]) ch = WF_ALPHA[rnd(26)];
        wfSet(g, run[share].r, run[share].c, ch);
      }
    }

    // extra copies of the first letter, so spotting it isn't the whole task
    if(decoys){
      const want = word.length <= 4 ? 2 : 3;
      for(let i=0;i<want;i++){
        const p = takeFree();
        if(p && !wfAt(g, p.r, p.c)) wfSet(g, p.r, p.c, word[0]);
      }
    }

    // the rest: random letters, or the word's own letters once the level is
    // hostile — with the word's letters everywhere, its letters stop standing
    // out from the background and the shape of the whole word is what's left
    const own = word.split("");
    for(let r=0;r<g.rows;r++) for(let c=0;c<g.cols;c++){
      if(wfAt(g, r, c)) continue;
      const useOwn = hostile && attempt < 190 && Math.random() < 0.7;
      wfSet(g, r, c, useOwn ? own[rnd(own.length)] : WF_ALPHA[rnd(26)]);
    }

    if(wfCount(g, word) === 1) return { grid:g, answer, word, dirs };
  }
  return null;                                   // unreachable in practice; tested
}

/* ---- the round ---- */
function wfRender(api, level){
  const plan = wfPlan(level);
  const word = wfNextWord(plan.stage.len);
  if(!word) return;                              // no vocabulary at this length
  const built = wfBuild(word, plan);
  if(!built) return;
  const g = built.grid;
  const st = api.stage;

  st.appendChild(el("div","prompt-line","Find the word"));

  /* The target is the letters, and only the letters. The photograph is NOT
     shown here — it is what he gets for finding them, and a picture sitting
     above the grid the whole time gives away its own reveal. He still has
     everything he needs in front of him: the shapes to match are right there,
     so nothing is being remembered. */
  const target = el("div","wftarget");
  const spell = el("div","wfspell");
  const spellCells = word.split("").map(ch=>{
    const s = el("span", null, ch);
    spell.appendChild(s);
    return s;
  });
  target.appendChild(spell);
  st.appendChild(target);

  const grid = el("div","wfgrid");
  grid.style.setProperty("--wf-cols", g.cols);
  const nodes = [];
  for(let r=0;r<g.rows;r++){
    nodes.push([]);
    for(let c=0;c<g.cols;c++){
      const cell = el("div","wfcell", wfAt(g, r, c));
      grid.appendChild(cell);
      nodes[r].push(cell);
    }
  }
  st.appendChild(grid);

  const nodeAt = (p)=> nodes[p.r][p.c];
  const answerNodes = built.answer.map(nodeAt);
  let done = false, anchor = null, run = [];

  /* Teaching the game, on the first four levels only. With no picture above the
     grid, a row of letters over a board of letters doesn't say what to DO with
     either — so while he is learning, the word itself is lightly highlighted
     where it sits and he picks up the sweep by making it. From level 5 there is
     nothing.

     Lightly is the whole point: a pale wash, plainly not the solid fill his own
     sweep makes, so it reads as "look here" and not as something already
     answered. And it's the whole word, not just its first letter — the thing
     being taught is that these letters, in a line, are the ones above.

     On or off by absolute level, not per stage: once he knows what the game is
     he knows it, and a longer word is not a new game needing teaching again.

     Note this overlaps the first stage's own steps, so the decoy-start guard on
     level 3 doesn't really bite — the cue points straight at which of the
     several D's is the right one. That is on purpose rather than a hole in the
     guard: levels 1-4 are teaching levels, and every guard starts mattering at
     level 5 when the cue is gone. */
  if(level <= WF_CUE_LEVELS) built.answer.forEach(p => nodeAt(p).classList.add("tip"));

  const paint = (list, cls)=> list.forEach(p => nodeAt(p).classList.add(cls));
  const clearRun = ()=>{
    run.forEach(p => nodeAt(p).classList.remove("on"));
    run = [];
  };

  /* A straight line from the anchor, or nothing: a diagonal or a bend isn't a
     word, so the highlight simply doesn't follow him there rather than
     flashing something wrong at him. */
  function lineFrom(a, b){
    if(a.r === b.r){
      const lo = Math.min(a.c, b.c), hi = Math.max(a.c, b.c), out = [];
      for(let c=lo;c<=hi;c++) out.push({r:a.r, c});
      return a.c <= b.c ? out : out.reverse();
    }
    if(a.c === b.c){
      const lo = Math.min(a.r, b.r), hi = Math.max(a.r, b.r), out = [];
      for(let r=lo;r<=hi;r++) out.push({r, c:a.c});
      return a.r <= b.r ? out : out.reverse();
    }
    return null;
  }

  /* Geometry rather than per-cell listeners: a touch pointer is captured by
     whatever it went down on, so pointermove never reaches the cell underneath
     it. The shared drag engine works out its drop zones the same way. */
  function cellFromPoint(x, y){
    const box = grid.getBoundingClientRect();
    if(!box.width || !box.height) return null;
    const c = Math.floor((x - box.left) / (box.width / g.cols));
    const r = Math.floor((y - box.top) / (box.height / g.rows));
    if(r < 0 || r >= g.rows || c < 0 || c >= g.cols) return null;
    return { r, c };
  }

  function found(){
    done = true;
    clearRun();
    answerNodes.forEach(n => n.classList.remove("tip"));
    answerNodes.forEach(n => n.classList.add("won"));
    spellCells.forEach(s => s.classList.add("won"));
    /* The reward is this word, not a random one from the bag — in this game
       the vocabulary IS the content, so the picture he gets is the picture of
       what he just found. */
    pinReward(word);
    api.solved(word);
  }

  function settle(){
    if(run.length < 2){ return; }                // a single tap stays armed
    const said = wfReads(g, run);
    const back = run.slice().reverse().map(p => wfAt(g, p.r, p.c)).join("");
    if(said === word || back === word){ found(); return; }

    const attempts = api.miss();
    clearRun();
    anchor = null;
    // narrow the search to the line the word is on, then outline the word
    if(attempts >= S.dimAfter){
      const line = built.answer[0].r === built.answer[1].r
        ? (p)=> p.r === built.answer[0].r
        : (p)=> p.c === built.answer[0].c;
      for(let r=0;r<g.rows;r++) for(let c=0;c<g.cols;c++){
        if(!line({r, c})) nodes[r][c].classList.add("dim");
      }
    }
    if(attempts >= S.showAfter) paint(built.answer, "pick");
  }

  grid.addEventListener("pointerdown", (e)=>{
    if(done) return;
    const p = cellFromPoint(e.clientX, e.clientY);
    if(!p) return;
    e.preventDefault();
    // a second tap in line with the first completes the word, so he can tap
    // the two ends instead of dragging the whole way
    if(anchor && !(anchor.r === p.r && anchor.c === p.c)){
      const line = lineFrom(anchor, p);
      if(line){ clearRun(); run = line; paint(run, "on"); settle(); return; }
    }
    clearRun();
    anchor = p; run = [p];
    paint(run, "on");
    /* No api.refocus() here, and the help stays put. refocus() exists for an
       activity where he can switch to a different piece and start that piece
       fresh — there is only one thing being worked on all round here, so
       calling it on every touch would zero the attempt count and the
       escalating help below could never arrive. And once he has been given the
       narrowed line or the outline, touching the grid again must not take it
       away; it goes when the word is found. */
  });
  grid.addEventListener("pointermove", (e)=>{
    if(done || !anchor || e.buttons === 0) return;
    const p = cellFromPoint(e.clientX, e.clientY);
    if(!p) return;
    const line = lineFrom(anchor, p);
    if(!line) return;
    clearRun(); run = line; paint(run, "on");
  });
  grid.addEventListener("pointerup", ()=>{ if(!done) settle(); });

  api.hint(answerNodes[0]);
}

const WORDFIND = {
  id: "wordfind",
  name: "WORD FIND",
  icon: "🔠🔍",
  /* The reward is due every round, not every fifth: the picture and its
     spelling are what this game is teaching, so the word he just found has to
     come up while he still knows which word it was. */
  rewardEveryRound: true,
  maxLevel: ()=> WF_LEVELS.length,
  levelLabel: (level)=>{
    const p = wfPlan(level);
    const how = { "dir-h":"across", "dir-v":"across or down", decoy:"decoy letters",
                  filler:"hard letters", near:"near misses" }[p.step];
    return p.stage.len + " letters · " + how;
  },
  settingsHint: (level)=>{
    const p = wfPlan(level);
    const words = wfWords(p.stage.len).length;
    const dirs = (p.step === "dir-h" || p.stage.steps.indexOf("dir-v") < 0)
      ? "hidden across the grid" : "hidden across or down the grid";
    const extra = {
      "dir-h": "",
      "dir-v": "",
      decoy:   " Its first letter is planted elsewhere too, so finding that letter isn't the whole answer.",
      filler:  " The spare cells are filled from the word's own letters, so its letters no longer stand out.",
      near:    " One run starts like the word and then changes, so the end has to be checked too."
    }[p.step];
    const cue = level <= WF_CUE_LEVELS
      ? " While he is learning the game the word is lightly highlighted where it sits."
      : "";
    return "He sees a word's letters, then finds the same letters " + dirs +
           " (" + p.stage.cols + " by " + p.stage.rows + ", " + words + " words this length)." +
           " The photograph of what the word says is the reward for finding it, not a clue" +
           " sitting above the grid. Never backwards or diagonally — only the way reading goes." +
           cue + extra;
  },

  startRound(level, api){ wfRender(api, level); }
};
