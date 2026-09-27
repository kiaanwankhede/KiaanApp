/* ============================= ACTIVITY: SHAPE FIT =============================
   A shape with a bite out of it, and a few loose pieces. He drags the one that
   fills the hole.

   THE STRAND NOTHING ELSE HERE TOUCHES
   -------------------------------------
   Twelve activities in, the app reasons (Patterns, Sorting, Odd one out,
   Match), counts (How many, Nine), reads letters (Word find, Finish the word),
   moves a hand (Trace, Sky) and knows where things are (Where is it?) — and
   nothing at all asks him to hold a shape in his head and compare it with
   another. Spatial skill is among the better predictors of later maths and
   science, and unusually among the things people try to train, practice at it
   carries over to spatial tasks it wasn't practised on. Where is it? is about
   the relation BETWEEN two things; this is about the form of one thing.

   IT HAS TO STAY GENTLE — HE IS FOUR
   -----------------------------------
   The concept can run a long way (rotation, composition, symmetry) and the
   temptation is to get there quickly. Four rungs of that would be four rungs
   too many at once, so the ladder is 25 levels rather than 8, and every level
   changes one thing:

     - Level 1 is as easy as a puzzle gets: two choices, one of them a plainly
       different shape, nothing turned, one piece.
     - The hole is ALWAYS drawn as the dashed outline of the exact piece that
       fills it. He is never asked to remember a shape — it is on the screen
       next to the pieces, the same support Order gives by leaving four of five
       stairs standing.
     - Nothing needs aiming. The hole is a drop zone the size of the hole, and
       the piece lands in it properly however roughly it is let go.
     - He never has to TURN a piece with his fingers. From the turn levels on
       the right piece is drawn lying at some other angle, and it drops in the
       right way up on its own. Judging which piece is the thinking; steering
       it into place would make this a motor task, and that is Trace's job.
     - The two hardest ideas — a mirror image that never fits, and a hole that
       takes two pieces — sit at the TOP of the ladder, where mastery only
       takes him if he is ready. The first two-piece round is two identical
       rectangles, which is the gentlest form of it.

   THE GUARD: EXACTLY ONE PIECE FITS, AND NOTHING ELSE SINGLES IT OUT
   -------------------------------------------------------------------
   Every piece in a round is the same colour, and — except at the levels where
   size IS the question — the same area. Let the right one be the only blue one
   or plainly the biggest and he answers every round without once looking at
   the hole, which is what "Guard against latching" in CLAUDE.md is about.

   The other half of that guard is that no wrong piece may fit either. A round
   with two defensible answers and one accepted is a round he loses for being
   right — the same rule Finish the word follows when it refuses a decoy letter
   that spells another real word. `fitSameShape()` decides it the way the game
   does: congruent BY ROTATION, since that is the only thing the game turns.
   That is also exactly why a mirror image is a fair decoy and not a trick —
   it is genuinely a different piece, and no amount of turning makes it fit.

   And at turn levels EVERY piece is drawn at some angle, not just the right
   one, or "the wonky one" answers the round without any shape being compared.
   ============================================================================= */

/* ---- points, and the handful of things done to them ------------------------
   Every shape here, curves included, is a list of points. One representation
   means one rotate, one mirror, one scale and one congruence test, and it
   leaves the whole generator free of the DOM so the tests can check the guard
   over every level many times over. */
function fitPath(pts){
  return "M" + pts.map(p => p[0].toFixed(2) + "," + p[1].toFixed(2)).join(" L") + " Z";
}
function fitArc(cx, cy, r, a0, a1, n){
  const out = [];
  for(let i=0;i<=n;i++){
    const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180;
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return out;
}
function fitBox(pts){
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  pts.forEach(p=>{
    if(p[0] < x0) x0 = p[0];
    if(p[0] > x1) x1 = p[0];
    if(p[1] < y0) y0 = p[1];
    if(p[1] > y1) y1 = p[1];
  });
  return { x:x0, y:y0, w:x1 - x0, h:y1 - y0 };
}
function fitCentred(pts){
  const b = fitBox(pts), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  return pts.map(p => [p[0] - cx, p[1] - cy]);
}
function fitMove(pts, dx, dy){ return pts.map(p => [p[0] + dx, p[1] + dy]); }
function fitScale(pts, kx, ky){ return pts.map(p => [p[0] * kx, p[1] * ky]); }
function fitTurn(pts, deg){
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return pts.map(p => [p[0] * c - p[1] * s, p[0] * s + p[1] * c]);
}
function fitFlip(pts){ return pts.map(p => [-p[0], p[1]]); }
/* The same points in the same places, whatever order they are listed in —
   which is how a turn that isn't visible gets caught: a rectangle turned half
   way round lands exactly on itself, so it is not a turn at all. */
function fitSamePlace(a, b){
  if(a.length !== b.length) return false;
  const key = pts => pts.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).sort().join("|");
  return key(a) === key(b);
}
function fitSpin(pts){
  const visible = shuffle([90,180,270]).filter(d => !fitSamePlace(fitCentred(fitTurn(pts, d)), fitCentred(pts)));
  return visible.length ? visible[0] : 90;
}

/* ---- would this piece drop into that hole? ---------------------------------
   Congruent by ROTATION only, which is what the game actually allows. Same
   area, and the same edge lengths in the same cyclic order — mirroring
   reverses that order, so a mirror image correctly comes back false. Every
   shape here is wound the same way round, which is what makes the cyclic
   comparison mean anything. */
function fitSigned(pts){
  let a = 0;
  for(let i=0;i<pts.length;i++){
    const p = pts[i], q = pts[(i + 1) % pts.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}
function fitArea(pts){ return Math.abs(fitSigned(pts)); }
/* Listed the same way round, always. Mirroring a shape turns it inside out
   without moving any of its edges, so comparing edge lengths in the order they
   happen to be stored says a triangle and its mirror are the same piece — the
   one thing the mirror decoy exists to be. Rewinding first is what lets the
   comparison below see the difference. */
function fitWound(pts){ return fitSigned(pts) < 0 ? pts.slice().reverse() : pts; }
function fitEdges(pts){
  const out = [];
  for(let i=0;i<pts.length;i++){
    const p = pts[i], q = pts[(i + 1) % pts.length];
    out.push(Math.hypot(q[0] - p[0], q[1] - p[1]));
  }
  return out;
}
function fitSameShape(a, b){
  const ea = fitEdges(fitWound(a)), eb = fitEdges(fitWound(b));
  if(ea.length !== eb.length) return false;
  if(Math.abs(fitArea(a) - fitArea(b)) > 1.5) return false;
  for(let i=0;i<eb.length;i++){
    if(ea.every((v, k) => Math.abs(v - eb[(k + i) % eb.length]) < 0.4)) return true;
  }
  return false;
}

/* ---- the cuts ---------------------------------------------------------------
   A whole shape, and the piece taken out of it. All wound clockwise on a
   0..100 board; the square ones are cut from 18..82. `turn` says a rotation of
   the piece is visible at all (a square's isn't), `flip` says its mirror image
   is genuinely a different piece (only the scalene triangle's is). */
const FIT_CUTS = {
  corner: {
    solid: [[18,18],[50,18],[50,50],[82,50],[82,82],[18,82]],
    gaps: [ [[50,18],[82,18],[82,50],[50,50]] ],
    turn: false, flip: false
  },
  notch: {
    solid: [[18,18],[37,18],[37,44],[63,44],[63,18],[82,18],[82,82],[18,82]],
    gaps: [ [[37,18],[63,18],[63,44],[37,44]] ],
    turn: false, flip: false
  },
  strip: {
    solid: [[18,40],[82,40],[82,82],[18,82]],
    gaps: [ [[18,18],[82,18],[82,40],[18,40]] ],
    turn: true, flip: false
  },
  wedge: {
    solid: [[18,18],[50,18],[82,40],[82,82],[18,82]],
    gaps: [ [[50,18],[82,18],[82,40]] ],
    turn: true, flip: true
  },
  pie: {
    solid: [[50,50]].concat(fitArc(50, 50, 32, 0, 270, 30)),
    gaps: [ [[50,50]].concat(fitArc(50, 50, 32, -90, 0, 12)) ],
    turn: true, flip: false
  },
  bite: {
    solid: [[18,18]].concat(fitArc(50, 18, 17, 180, 0, 16)).concat([[82,18],[82,82],[18,82]]),
    gaps: [ fitArc(50, 18, 17, 0, 180, 16) ],
    turn: true, flip: false
  }
};
/* Two-piece holes. Both halves of each are congruent, so either piece goes in
   either side — at the top of this ladder a 4-year-old should not also be
   working out which half is which. */
const FIT_PAIRS = {
  striphalf: {
    solid: FIT_CUTS.strip.solid,
    gaps: [ [[18,18],[50,18],[50,40],[18,40]], [[50,18],[82,18],[82,40],[50,40]] ],
    turn: false, flip: false
  },
  cornerhalf: {
    solid: FIT_CUTS.corner.solid,
    gaps: [ [[50,18],[82,18],[50,50]], [[82,18],[82,50],[50,50]] ],
    turn: false, flip: false
  }
};
/* What Settings shows a breakdown of: which shape of hole actually lands. */
const FIT_TAGS = {
  corner:"corner", notch:"notch", strip:"strip", wedge:"triangle",
  pie:"quarter circle", bite:"round bite",
  striphalf:"two halves", cornerhalf:"two triangles"
};

/* Shapes for the easiest decoy: a plainly different thing, scaled to the same
   area as the right piece so size can never be what gives it away. */
const FIT_OTHERS = {
  square:  [[-1,-1],[1,-1],[1,1],[-1,1]],
  wide:    [[-1.6,-0.8],[1.6,-0.8],[1.6,0.8],[-1.6,0.8]],
  tri:     [[0,-1.15],[1,0.58],[-1,0.58]],
  diamond: [[0,-1.3],[1.3,0],[0,1.3],[-1.3,0]],
  disc:    fitArc(0, 0, 1, 0, 342, 19)
};

/* ---- the wrong pieces -------------------------------------------------------
   Dealt from fixed sets rather than drawn at random and re-rolled until they
   pass: with a handful of distinct factors there is nothing to re-roll, no
   loop to run out, and no silent fallback of the kind CLAUDE.md warns about in
   How many. `other`, `ratio` and `mirror` all keep the right piece's area, so
   only the `size` levels — where size IS the question — differ in size. */
const FIT_SIZES = [0.66, 1.38, 0.76, 1.3];
/* Stretches of four strengths, each way round. A square piece makes the two
   ways round the same rectangle, so it really only has four of these — one
   more than the most any level asks for. */
const FIT_RATIOS = [[1.42,0.71],[0.71,1.42],[1.78,0.56],[0.56,1.78],
                    [1.24,0.81],[0.81,1.24],[2.2,0.45],[0.45,2.2]];
function fitDecoys(kind, right, n){
  const out = [];
  const keep = (pts)=>{ if(!fitSameShape(pts, right) && !out.some(o => fitSameShape(o, pts))) out.push(pts); };
  // the mirror is one specific shape, so it can only ever be one of the wrong
  // ones; anything else on a mirror level is an ordinary wrong-proportions piece
  if(kind === "mirror") out.push(fitFlip(right));
  const rest = kind === "mirror" ? "ratio" : kind;
  if(rest === "other"){
    shuffle(Object.keys(FIT_OTHERS)).forEach(name=>{
      if(out.length >= n) return;
      const base = FIT_OTHERS[name], k = Math.sqrt(fitArea(right) / fitArea(base));
      keep(fitScale(base, k, k));
    });
  } else if(rest === "size"){
    shuffle(FIT_SIZES.slice()).forEach(k=>{ if(out.length < n) keep(fitScale(right, k, k)); });
  } else {
    shuffle(FIT_RATIOS.slice()).forEach(r=>{ if(out.length < n) keep(fitScale(right, r[0], r[1])); });
  }
  return out.slice(0, n);
}

/* ---- the ladder -------------------------------------------------------------
   One sorted list scored by load, the way Sorting's, Match's, Odd one out's
   and Where is it?'s are. Four things raise it: how alike the wrong pieces are
   (a different shape, then the wrong size, then the wrong proportions, then a
   mirror image), whether the pieces are lying at an angle, how many there are
   to choose from, and whether the hole takes two pieces. Deliberately 25 rungs
   rather than eight: every level changes one thing, and the two ideas that ask
   the most sit at the top. */
const FIT_DECOY_LOAD = { other:0, size:1, ratio:1.7, mirror:3 };
const FIT_LEVELS = [];
["other","size","ratio"].forEach(decoy=>{
  [2,3,4].forEach(choices=>{
    [false,true].forEach(turn=>{
      FIT_LEVELS.push({ decoy, choices, turn, parts:1,
        load: FIT_DECOY_LOAD[decoy] + (turn ? 1.5 : 0) + (choices - 2) * 0.6 });
    });
  });
});
[3,4].forEach(choices=>{
  [false,true].forEach(turn=>{
    FIT_LEVELS.push({ decoy:"mirror", choices, turn, parts:1,
      load: FIT_DECOY_LOAD.mirror + (turn ? 1.5 : 0) + (choices - 2) * 0.6 });
  });
});
[{ decoy:"other", choices:3 }, { decoy:"size", choices:3 }, { decoy:"ratio", choices:4 }].forEach(o=>{
  FIT_LEVELS.push({ decoy:o.decoy, choices:o.choices, turn:false, parts:2,
    load: FIT_DECOY_LOAD[o.decoy] + 2.6 + (o.choices - 2) * 0.6 });
});
FIT_LEVELS.sort((a, b)=> a.load - b.load);
function fitPlan(level){
  return FIT_LEVELS[Math.max(0, Math.min(FIT_LEVELS.length - 1, level - 1))];
}

/* ---- one round, DOM-free ---------------------------------------------------- */
function fitBuild(plan){
  const set = plan.parts === 2 ? FIT_PAIRS : FIT_CUTS;
  const pool = Object.keys(set).filter(k=>{
    if(plan.decoy === "mirror" && !set[k].flip) return false;
    if(plan.turn && !set[k].turn) return false;
    return true;
  });
  const key = pick(pool);
  const cut = set[key];

  const rights = cut.gaps.map(g => fitCentred(g));
  const opts = rights.map(pts => ({ pts, fits:true }));
  fitDecoys(plan.decoy, rights[0], plan.choices - rights.length)
    .forEach(pts => opts.push({ pts, fits:false }));

  shuffle(opts);
  /* At a turn level EVERY piece is lying at an angle, not only the right one.
     Leave one of the same family sitting square-on and "the one that isn't
     lined up with the hole" points straight at the answer without any shape
     being compared. The angle also has to be one that actually shows: a
     rectangle turned half way round lands back on itself, which is not a turn
     at all, so fitSpin picks one that does — and settles for any of them on a
     shape like a disc, where none of them show. */
  opts.forEach(o=>{
    o.spin = plan.turn ? fitSpin(o.pts) : 0;
    o.draw = fitCentred(o.spin ? fitTurn(o.pts, o.spin) : o.pts);
  });

  return {
    cut: key, solid: cut.solid, gaps: cut.gaps, opts,
    answerAt: opts.map((o, i)=> o.fits ? i : -1).filter(i => i >= 0)
  };
}

/* ---- drawing ---------------------------------------------------------------- */
function fitPieceSVG(pts, colour){
  return '<svg viewBox="0 0 100 100" width="100%" height="100%">' +
    '<path d="' + fitPath(pts) + '" fill="' + colour + '" stroke="' + colour +
    '" stroke-width="2" stroke-linejoin="round"/></svg>';
}
const FIT_GAP_PAD = 3.5;   // room for the dashed outline's own stroke
function fitGapSVG(pts){
  const b = fitBox(pts);
  const vb = (b.x - FIT_GAP_PAD) + " " + (b.y - FIT_GAP_PAD) + " " +
             (b.w + FIT_GAP_PAD * 2) + " " + (b.h + FIT_GAP_PAD * 2);
  return '<svg viewBox="' + vb + '" width="100%" height="100%">' +
    '<path class="fitslot" d="' + fitPath(pts) + '"/></svg>';
}

const FIT = {
  id: "fit",
  name: "SHAPE FIT",
  icon: "🧩",
  maxLevel: ()=> FIT_LEVELS.length,
  levelLabel: (level)=>{
    const p = fitPlan(level);
    const what = { other:"different shapes", size:"wrong size", ratio:"wrong shape", mirror:"a mirror" }[p.decoy];
    return (p.parts === 2 ? "Two pieces · " : p.choices + " choices · ") + what + (p.turn ? " · turned" : "");
  },
  settingsHint: (level)=>{
    const p = fitPlan(level);
    const decoy = {
      other: "The wrong pieces are plainly different shapes.",
      size:  "The wrong pieces are the same shape in the wrong size, so he has to judge how big the hole is.",
      ratio: "The wrong pieces are the same shape with the wrong proportions — a bit too wide or too tall.",
      mirror:"One wrong piece is a mirror image: it looks right until you try to turn it, and it never fits."
    }[p.decoy];
    return "A shape with " + (p.parts === 2 ? "a hole that takes two pieces" : "a piece missing") +
      ", and " + p.choices + " pieces to choose from. " +
      "The hole is drawn as the outline of the piece that fills it, so nothing has to be remembered. " +
      decoy + " " +
      (p.turn ? "Every piece is lying at some angle here — it drops in the right way up on its own, so he judges which piece rather than steering it. "
              : "Nothing is turned at this level. ") +
      (p.parts === 2 ? "Either piece goes in either side, so he is not also working out which half is which." : "");
  },

  startRound(level, api){
    const plan = fitPlan(level);
    const r = fitBuild(plan);
    const st = api.stage;
    const colour = COLORS[pick(Object.keys(COLORS))];   // one colour for every piece — that IS the guard

    st.appendChild(el("div","prompt-line","Which piece fits?"));

    // the board: the shape, with the hole (or holes) as drop zones on top of it
    const board = el("div","fitboard");
    board.innerHTML = '<svg viewBox="0 0 100 100" width="100%" height="100%">' +
      '<path class="fitshape" d="' + fitPath(r.solid) + '"/></svg>';
    const zones = r.gaps.map(g=>{
      const b = fitBox(g), z = el("div","fitgap dropzone");
      z.style.left   = (b.x - FIT_GAP_PAD) + "%";
      z.style.top    = (b.y - FIT_GAP_PAD) + "%";
      z.style.width  = (b.w + FIT_GAP_PAD * 2) + "%";
      z.style.height = (b.h + FIT_GAP_PAD * 2) + "%";
      z.innerHTML = fitGapSVG(g);
      board.appendChild(z);
      return z;
    });
    st.appendChild(board);

    /* One scale for every tile in the round, so the pieces sit at a readable
       size without their sizes relative to each other changing — which would
       quietly neuter the levels where size is the whole question. */
    let span = 1;
    r.opts.forEach(o=>{ const b = fitBox(o.draw); span = Math.max(span, b.w, b.h); });
    const k = 88 / span;
    const px = r.opts.length > 3 ? 74 : 84;

    const opts = el("div","options");
    let answerNode = null, left = zones.length;
    r.opts.forEach((o, i)=>{
      const wrap = el("div","opt");
      const item = { k:"svg", svg: fitPieceSVG(fitMove(fitScale(o.draw, k, k), 50, 50), colour), fits: o.fits };
      const node = itemNode(item, px);
      wrap.appendChild(node);
      if(o.fits && !answerNode) answerNode = node;
      makeDraggable(node, (zone)=>{
        if(!zone || zones.indexOf(zone) < 0) return;
        if(!o.fits){
          const attempts = api.miss();
          // the same escalation as everywhere else: first fade the wrong ones,
          // then outline a right one. Nothing is ever marked wrong.
          if(attempts >= S.dimAfter){
            Array.from(opts.querySelectorAll(".opt")).forEach((el2, j)=>{
              if(!r.opts[j].fits) el2.classList.add("dim");
            });
          }
          if(attempts >= S.showAfter && answerNode) answerNode.parentNode.classList.add("pick");
          return;
        }
        zone.dataset.full = "1";
        zone.classList.add("done");
        // inline style, not an SVG attribute: .fitslot's own rule would win
        // over a presentation attribute and the hole would stay empty, which
        // takes away the one bit of feedback this game has
        const path = zone.querySelector(".fitslot");
        path.style.fill = colour;
        path.style.stroke = colour;
        wrap.classList.add("gone");
        left--;
        if(left === 0){
          opts.querySelectorAll(".opt").forEach(x => x.classList.add("gone"));
          api.solved(FIT_TAGS[r.cut] || r.cut);     // Settings shows which holes land
        } else if(answerNode === node){
          // the hand pointed at the piece he has just used up; move it on to
          // the other one so a prompt still points somewhere real
          answerNode = Array.from(opts.querySelectorAll(".opt:not(.gone) .tile"))
            .find(t => t._item.fits) || null;
        }
      });
      opts.appendChild(wrap);
    });
    st.appendChild(opts);
    api.hint(answerNode);
  }
};
