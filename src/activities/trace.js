/* ============================ ACTIVITY: TRACE ============================
   Put the stylus on the green dot and follow the line to the star.

   This teaches the MOVEMENT of writing — which way, in what order, how to
   steer — on the tablet. Strength and grip are for crayons on paper: glass has
   no friction, so a stylus can't build them. The two go together.

   THE LADDER
   ----------
   Strokes come in roughly the order children manage them, from standard
   developmental norms: lines (2–3 yrs), curves and the circle (~3), joined
   strokes like + and the square (~4–4.5), slants, X and the triangle
   (~4.5–5.5). Then the numbers 0–9, which he already knows by sight, each
   drawn the way it's taught (a 5 goes down, round, then the flag). Last, the
   same things smaller — handwriting grows from big arm movements to small
   controlled ones, and letters on paper are small.

   Each stage brings its strokes in on a wide grey PATH with arrows, then a
   DOTTED line, then just DOTS to join — the classic fade from tracing towards
   drawing on his own — and how far off the line still counts narrows with it.

   Direction matters and is enforced: lines go top to bottom and left to
   right, the circle starts at the top and goes the way o is written. That's
   how letters and numbers are formed, so it's the habit worth building now.
   Where nothing else shows which way to go (dotted and dots), one green arrow
   sits just past each start.

   FORGIVING, LIKE EVERYTHING ELSE
   -------------------------------
   Nothing ever fails. His line always follows his hand: in colour while he's
   on the line, faint grey while he's off it — so the tablet visibly responds,
   and he can see where he drifted. Lifting the stylus is fine; the green dot
   moves along with him to show where to carry on. Getting close to the star
   counts once he's nearly there. Wandering well off the line counts as one
   miss, for levelling only: after a couple the path comes back on dotted
   levels, after a few a moving dot shows the way.

   PALMS
   -----
   Children rest their hand on the screen. A touch only starts drawing if it
   lands on the green dot, so a palm coming down anywhere else does nothing.
   While a real pen is in use, fingers and palms are ignored altogether — but
   only for a minute after the pen was last seen, so a lost or flat pen never
   leaves finger tracing silently switched off. A plain rubber-tip stylus
   looks exactly like a finger, so the green-dot rule is what protects him there.

   The board, the judge, and the drawing/pointer wiring are all shared engine
   now (src/36-trace-engine.js) — Sky uses the exact same rules. This file is
   only what's unique to Trace: the stroke catalogue and the ladder over it.
   ========================================================================= */

const TRACE_SHAPES = {
  // pre-writing strokes
  down:       { name:"down line",        strokes:[ tracePoly([[80,22],[80,78]]) ] },
  across:     { name:"across line",      strokes:[ tracePoly([[45,50],[115,50]]) ] },
  downLong:   { name:"long down line",   strokes:[ tracePoly([[80,12],[80,88]]) ] },
  acrossLong: { name:"long across line", strokes:[ tracePoly([[18,50],[142,50]]) ] },
  hill:       { name:"hill",             strokes:[ traceArc(80,72,46,180,360) ] },   // left, over the top, right
  bowl:       { name:"bowl",             strokes:[ traceArc(80,28,46,180,0) ] },     // left, under the bottom, right
  cCurve:     { name:"C curve",          strokes:[ traceArc(80,50,34,-50,-310) ] },  // from top right, round the way c is written
  wave:       { name:"wave",             strokes:[ traceWave() ] },
  circle:     { name:"circle",           strokes:[ traceArc(80,50,36,-90,-450) ] },  // from the top, the way o is written
  plus:       { name:"plus",             strokes:[ tracePoly([[80,18],[80,82]]), tracePoly([[48,50],[112,50]]) ] },
  zigzag:     { name:"zigzag",           strokes:[ tracePoly([[20,68],[40,32],[60,68],[80,32],[100,68],[120,32],[140,68]]) ] },
  corner:     { name:"corner",           strokes:[ tracePoly([[55,20],[55,78],[112,78]]) ] },
  square:     { name:"square",           strokes:[ tracePoly([[52,22],[52,78],[108,78],[108,22],[52,22]]) ] },
  slash:      { name:"slant /",          strokes:[ tracePoly([[108,20],[52,80]]) ] },
  backslash:  { name:"slant \\",         strokes:[ tracePoly([[52,20],[108,80]]) ] },
  cross:      { name:"X",                strokes:[ tracePoly([[52,20],[108,80]]), tracePoly([[108,20],[52,80]]) ] },
  triangle:   { name:"triangle",         strokes:[ tracePoly([[80,18],[48,78],[112,78],[80,18]]) ] },

  // numbers, each drawn the way it's taught — top down, in the usual stroke order
  n0: { name:"number 0", digit:"0", strokes:[ traceArc(80,50,22,-90,-450,34) ] },            // from the top, round like o
  n1: { name:"number 1", digit:"1", strokes:[ tracePoly([[80,16],[80,84]]) ] },
  n2: { name:"number 2", digit:"2", strokes:[ traceJoin(traceArc(80,34,18,195,380), tracePoly([[96.9,40.2],[58,84],[104,84]])) ] },
  n3: { name:"number 3", digit:"3", strokes:[ traceJoin(traceArc(78,33,16,200,450), traceArc(78,66,18,-90,160)) ] },
  n4: { name:"number 4", digit:"4", strokes:[ tracePoly([[72,16],[58,62],[106,62]]), tracePoly([[94,16],[94,84]]) ] },
  n5: { name:"number 5", digit:"5", strokes:[ traceJoin(tracePoly([[64,16],[62,48]]), traceArc(78,64,19,-148,150)),
                                              tracePoly([[64,16],[102,16]]) ] },                  // down, round, then the flag
  n6: { name:"number 6", digit:"6", strokes:[ traceJoin(traceQuad([98,18],[62,24],[60,66]), traceArc(78,66,18,180,-170)) ] },
  n7: { name:"number 7", digit:"7", strokes:[ tracePoly([[58,18],[102,18],[70,84]]) ] },
  n8: { name:"number 8", digit:"8", strokes:[ traceJoin(traceArc(80,33,17,-90,-270), traceArc(80,67,17,-90,270), traceArc(80,33,17,90,-90)) ] },
  n9: { name:"number 9", digit:"9", strokes:[ traceJoin(traceArc(80,34,17,0,-360), tracePoly([[97,34],[97,84]])) ] }
};

const LINES   = ["down","across","downLong","acrossLong"];
const CURVES  = ["hill","bowl","cCurve","wave"];
const JOINED  = ["plus","zigzag","corner","square"];
const SLANTED = ["slash","backslash","cross","triangle"];
const NUMBERS = ["n0","n1","n2","n3","n4","n5","n6","n7","n8","n9"];

// the same things, smaller — towards the size of writing on paper
const SMALL_OF = ["down","across","hill","cCurve","wave","circle","plus","square","cross","triangle"].concat(NUMBERS);
SMALL_OF.forEach(k=>{
  const s = TRACE_SHAPES[k];
  TRACE_SHAPES["small_" + k] = Object.assign({}, s, { name: "small " + s.name, strokes: s.strokes.map(raw => traceScale(raw, 0.6)) });
});
const SMALL_SHAPES  = ["down","across","hill","cCurve","wave","circle","plus","square","cross","triangle"].map(k => "small_" + k);
const SMALL_NUMBERS = NUMBERS.map(k => "small_" + k);

Object.keys(TRACE_SHAPES).forEach(k=>{
  const s = TRACE_SHAPES[k];
  s.paths = s.strokes.map(raw => traceResample(raw, 1));
});

const TRACE_LEVELS = [
  // 1 — lines
  { stage:1, load:0.0, name:"Down line · wide path",         shapes:["down"],   guide:"road" },
  { stage:1, load:0.3, name:"Across line · wide path",       shapes:["across"], guide:"road" },
  { stage:1, load:0.6, name:"Long lines · wide path",        shapes:["downLong","acrossLong"], guide:"road" },
  { stage:1, load:1.0, name:"Lines · dotted",                shapes:LINES, guide:"dotted" },
  { stage:1, load:1.4, name:"Lines · join the dots",         shapes:LINES, guide:"dots" },
  // 2 — curves
  { stage:2, load:0.4, name:"Hill and bowl · wide path",     shapes:["hill","bowl"], guide:"road" },
  { stage:2, load:0.7, name:"C curve · wide path",           shapes:["cCurve"], guide:"road" },
  { stage:2, load:0.9, name:"Wave · wide path",              shapes:["wave"],   guide:"road" },
  { stage:2, load:1.4, name:"Curves · dotted",               shapes:CURVES, guide:"dotted" },
  { stage:2, load:1.8, name:"Curves · join the dots",        shapes:CURVES, guide:"dots" },
  // 3 — the circle
  { stage:3, load:0.8, name:"Circle · wide path",            shapes:["circle"], guide:"road" },
  { stage:3, load:1.3, name:"Circle · dotted",               shapes:["circle"], guide:"dotted" },
  { stage:3, load:1.7, name:"Circle · join the dots",        shapes:["circle"], guide:"dots" },
  // 4 — joined strokes
  { stage:4, load:0.8, name:"Plus · wide path",              shapes:["plus"],   guide:"road" },
  { stage:4, load:1.0, name:"Zigzag · wide path",            shapes:["zigzag"], guide:"road" },
  { stage:4, load:1.2, name:"Corner and square · wide path", shapes:["corner","square"], guide:"road" },
  { stage:4, load:1.7, name:"Joined · dotted",               shapes:JOINED, guide:"dotted" },
  { stage:4, load:2.1, name:"Joined · join the dots",        shapes:JOINED, guide:"dots" },
  // 5 — slants
  { stage:5, load:1.0, name:"Slants · wide path",            shapes:["slash","backslash"], guide:"road" },
  { stage:5, load:1.3, name:"X · wide path",                 shapes:["cross"], guide:"road" },
  { stage:5, load:1.5, name:"Triangle · wide path",          shapes:["triangle"], guide:"road" },
  { stage:5, load:2.0, name:"Slants · dotted",               shapes:SLANTED, guide:"dotted" },
  { stage:5, load:2.4, name:"Slants · join the dots",        shapes:SLANTED, guide:"dots" },
  // 6 — numbers: straight ones, then round ones, then the ones that mix both
  { stage:6, load:1.0, name:"Numbers 1, 4, 7 · wide path",    shapes:["n1","n4","n7"], guide:"road" },
  { stage:6, load:1.3, name:"Numbers 0, 6, 9 · wide path",    shapes:["n0","n6","n9"], guide:"road" },
  { stage:6, load:1.6, name:"Numbers 2, 3, 5, 8 · wide path", shapes:["n2","n3","n5","n8"], guide:"road" },
  { stage:6, load:2.0, name:"Numbers 0–9 · dotted",           shapes:NUMBERS, guide:"dotted" },
  { stage:6, load:2.4, name:"Numbers 0–9 · join the dots",    shapes:NUMBERS, guide:"dots" },
  // 7 — smaller, towards writing size
  { stage:7, load:1.5, name:"Small shapes · dotted",          shapes:SMALL_SHAPES,  guide:"dotted", small:true },
  { stage:7, load:2.0, name:"Small numbers · dotted",         shapes:SMALL_NUMBERS, guide:"dotted", small:true }
];
// stage first, then load inside the stage — stable, so declaration order breaks ties
TRACE_LEVELS.sort((a,b)=> (a.stage - b.stage) || (a.load - b.load));
function traceEntry(lv){ return TRACE_LEVELS[Math.min(Math.max(lv,1), TRACE_LEVELS.length) - 1]; }

let traceLast = null;
function buildTrace(lv){
  const e = traceEntry(lv);
  const choices = e.shapes.length > 1 ? e.shapes.filter(s => s !== traceLast) : e.shapes;
  const shape = pick(choices);
  traceLast = shape;
  const s = TRACE_SHAPES[shape];
  return { entry:e, shape, name: s.name, strokes: s.paths, raw: s.strokes,
           tol: e.small ? TRACE_TOL.small : TRACE_TOL[e.guide], colour: pick(Object.keys(COLORS)),
           head: s.digit ? "Trace the " + s.digit : (e.guide === "dots" ? "Join the dots" : "Follow the line") };
}

const TRACING = {
  id: "trace",
  name: "TRACE",
  icon: "✏️",
  maxLevel: ()=> TRACE_LEVELS.length,
  levelLabel: (lv)=> traceEntry(lv).name,
  settingsHint: (lv)=>{
    const e = traceEntry(lv);
    const kinds = Array.from(new Set(e.shapes.map(k => TRACE_SHAPES[k].name.replace(/^small /, ""))));
    const what = kinds.length > 6 ? kinds.slice(0, 5).join(", ") + " and more" : kinds.join(", ");
    const how = e.guide === "road" ? "on a wide grey path with arrows"
              : e.guide === "dotted" ? "along a dotted line" : "by joining dots";
    return "Traces " + what + (e.small ? ", drawn smaller," : "") + " " + how + ". He starts on the green dot; " +
           "off the line his crayon turns grey, and he can lift the stylus and carry on from where he stopped.";
  },

  startRound(level, api){
    renderTraceRound(api, buildTrace(level));
  }
};
