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

   The judging — is he on the line, how far along, did he wander — is
   traceTracker(), kept free of the DOM so it can be tested on its own.
   ========================================================================= */

const TRACE_W = 160, TRACE_H = 100;                    // the board, in its own units
const TRACE_TOL = { road: 11, dotted: 8.5, dots: 7.5, small: 6 };   // how far off still counts
const TRACE_PEN_MEMORY = 60000;                        // fingers ignored for this long after the pen was seen

/* ---- building strokes ----
   A stroke is a list of points; cornerPts marks the ones "join the dots" must
   always show (corners, and where one piece of a number meets the next). */
function tracePoly(vs){ const a = vs.map(([x,y])=>({x,y})); a.cornerPts = a.slice(); return a; }
// angles in screen terms (y grows downward): -90 is the top, 90 the bottom; ry makes an oval
function traceArc(cx, cy, r, a0, a1, ry){
  const out = [], n = Math.max(8, Math.ceil(Math.abs(a1 - a0) / 2)), rv = ry || r;
  for(let i=0;i<=n;i++){ const a = (a0 + (a1 - a0)*i/n) * Math.PI/180; out.push({ x: cx + r*Math.cos(a), y: cy + rv*Math.sin(a) }); }
  return out;
}
function traceQuad(p0, p1, p2){
  const out = [];
  for(let i=0;i<=40;i++){ const t = i/40, u = 1 - t;
    out.push({ x: u*u*p0[0] + 2*u*t*p1[0] + t*t*p2[0], y: u*u*p0[1] + 2*u*t*p1[1] + t*t*p2[1] }); }
  return out;
}
function traceWave(){
  const out = [];
  for(let x=18; x<=142; x++) out.push({ x, y: 50 - 16*Math.sin(2*Math.PI*(x-18)/62) });   // up first
  return out;
}
// one continuous stroke made of pieces; where the pieces meet is a corner
function traceJoin(...parts){
  const a = [].concat(...parts);
  a.cornerPts = [];
  parts.forEach((p, i)=>{ if(i > 0) a.cornerPts.push(p[0]); (p.cornerPts || []).forEach(q => a.cornerPts.push(q)); });
  return a;
}
function traceScale(raw, f){
  const s = (p)=>({ x: 80 + (p.x - 80)*f, y: 50 + (p.y - 50)*f });
  const a = raw.map(s);
  if(raw.cornerPts) a.cornerPts = raw.cornerPts.map(s);
  return a;
}
/* evenly spaced points, one unit apart, so "how far along" is just an index */
function traceResample(raw, step){
  const out = [{ x: raw[0].x, y: raw[0].y }];
  let carry = 0;
  for(let i=1;i<raw.length;i++){
    const a = raw[i-1], b = raw[i], seg = Math.hypot(b.x - a.x, b.y - a.y);
    if(seg === 0) continue;
    let t = step - carry;
    while(t <= seg){ out.push({ x: a.x + (b.x - a.x)*t/seg, y: a.y + (b.y - a.y)*t/seg }); t += step; }
    carry = seg - (t - step);
  }
  const last = raw[raw.length-1], end = out[out.length-1];
  if(Math.hypot(end.x - last.x, end.y - last.y) > 0.01) out.push({ x: last.x, y: last.y });
  return out;
}

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

/* ---- the judge ----
   pts: one stroke, one unit between points. Progress k only ever moves
   forward, and only a short way at a time, so he can't skip ahead by lifting
   and landing further on, cut across a circle, or go round the wrong way. */
function traceTracker(pts, tol){
  let k = 0, drawing = false, wandered = false, done = false;
  const startR = Math.max(tol*1.3, 9);        // how close a touch must land to where he's up to
  const missR  = tol*2;                        // wandering past this counts as one miss
  const reach  = Math.round(tol*2);            // how many points one movement may claim
  const nearestAhead = (x, y)=>{
    let j = k, best = Infinity;
    for(let i=k; i<=Math.min(pts.length-1, k+reach); i++){
      const d = Math.hypot(pts[i].x - x, pts[i].y - y);
      if(d < best){ best = d; j = i; }
    }
    return { j, d: best };
  };
  const t = {
    get k(){ return k; }, get done(){ return done; }, get drawing(){ return drawing; },
    at(){ return pts[k]; },
    down(x, y){
      if(done || Math.hypot(pts[k].x - x, pts[k].y - y) > startR) return { accepted:false };
      drawing = true; wandered = false;
      return Object.assign({ accepted:true }, t.move(x, y));
    },
    move(x, y){
      if(!drawing || done) return { ink:false, miss:false, done:false };
      const n = nearestAhead(x, y);
      if(n.d <= tol){
        wandered = false;
        if(n.j > k) k = n.j;
        // Reaching the star counts. Without this a wobbly hand could end right
        // beside the star, never land on the exact last point, and be stuck at
        // 98% — only allowed once he's traced nearly all the way, so it's no shortcut.
        const end = pts[pts.length - 1];
        if(k >= pts.length - 1 - reach && Math.hypot(end.x - x, end.y - y) <= tol) k = pts.length - 1;
        if(k >= pts.length - 1){ done = true; drawing = false; }
        return { ink:true, miss:false, done };
      }
      if(n.d > missR && !wandered){ wandered = true; return { ink:false, miss:true, done:false }; }
      return { ink:false, miss:false, done:false };
    },
    up(){ drawing = false; wandered = false; }
  };
  return t;
}

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

/* the dots for "join the dots": every corner, plus a dot every so often along the way */
function traceDots(path, raw){
  const out = [];
  for(let i=0; i<path.length; i+=14) out.push(path[i]);
  out.push(path[path.length-1]);
  (raw.cornerPts || []).forEach(p => { if(out.every(q => Math.hypot(q.x - p.x, q.y - p.y) > 4)) out.push(p); });
  return out;
}

/* ---- drawing it ---- */
const TRACE_NS = "http://www.w3.org/2000/svg";
function traceSvg(tag, attrs){
  const n = document.createElementNS(TRACE_NS, tag);
  for(const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}
const tracePts = (path)=> path.map(p => p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" ");
function traceStar(){
  const pts = [];
  for(let i=0;i<10;i++){ const a = -Math.PI/2 + i*Math.PI/5, r = i % 2 ? 2.6 : 6.2; pts.push((r*Math.cos(a)).toFixed(2) + "," + (r*Math.sin(a)).toFixed(2)); }
  return traceSvg("polygon", { points: pts.join(" "), fill:"#ffc400", stroke:"#f0b429", "stroke-width":"0.8" });
}
/* one arrow a little way along a path, pointing the way to go */
function traceArrow(path, i, colour, size){
  const a = Math.atan2(path[i+2].y - path[i-2].y, path[i+2].x - path[i-2].x);
  const c = Math.cos(a), s = Math.sin(a), z = size || 1;
  const pt = (u, v)=> (path[i].x + (u*c - v*s)*z).toFixed(2) + "," + (path[i].y + (u*s + v*c)*z).toFixed(2);
  return traceSvg("polyline", { points: [pt(-2.4,-2.8), pt(1.6,0), pt(-2.4,2.8)].join(" "), fill:"none",
    stroke: colour, "stroke-width":"1.5", "stroke-linecap":"round", "stroke-linejoin":"round" });
}
function traceRoad(path, tol){
  const g = traceSvg("g", {});
  g.appendChild(traceSvg("polyline", { points: tracePts(path), fill:"none", stroke:"#e6ecf5",
    "stroke-width": String(tol*2), "stroke-linecap":"round", "stroke-linejoin":"round" }));
  g.appendChild(traceSvg("polyline", { points: tracePts(path), fill:"none", stroke:"#c3cddb",
    "stroke-width":"1.2", "stroke-dasharray":"3 3", "stroke-linecap":"round" }));
  // arrows along the path, pointing the way to go
  for(let i=13; i < path.length - 8; i += 24) g.appendChild(traceArrow(path, i, "#8fa1ba"));
  return g;
}

let tracePenAt = -Infinity;     // when a real pen was last seen

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
    const r = buildTrace(level);
    const st = api.stage;
    st.appendChild(el("div","prompt-line", r.head));

    const svg = traceSvg("svg", { viewBox:`0 0 ${TRACE_W} ${TRACE_H}`, class:"trace-board" });
    const guides = traceSvg("g", {}), inkLayer = traceSvg("g", {}), marks = traceSvg("g", {});
    svg.append(guides, inkLayer, marks);
    st.appendChild(svg);

    // guides for every stroke of the shape; on dotted and dots levels the path
    // is there but hidden, and comes back if he's wandering a lot
    const road = traceSvg("g", { class: r.entry.guide === "road" ? "" : "trace-road-hidden" });
    r.strokes.forEach(p => road.appendChild(traceRoad(p, r.tol)));
    guides.appendChild(road);
    r.strokes.forEach((p, i)=>{
      if(r.entry.guide === "dotted"){
        guides.appendChild(traceSvg("polyline", { points: tracePts(p), fill:"none", stroke:"#a9b8cc",
          "stroke-width":"3", "stroke-dasharray":"0.01 5.5", "stroke-linecap":"round" }));
      } else if(r.entry.guide === "dots"){
        traceDots(p, r.raw[i]).forEach(d => guides.appendChild(traceSvg("circle", { cx:d.x.toFixed(1), cy:d.y.toFixed(1), r:"2.4", fill:"#a9b8cc" })));
      }
      // without the path there are no arrows, and on a circle nothing would say
      // which way to set off — so one green arrow just past each start
      if(r.entry.guide !== "road") guides.appendChild(traceArrow(p, 12, "#38b000", r.entry.small ? 1 : 1.3));
    });

    // the star sits in its own group so its pop animation can't disturb its
    // position; on small levels dot and star shrink too, or on a short stroke
    // they'd cover half the line between them
    const mk = r.entry.small ? 0.7 : 1;
    const starAt = traceSvg("g", {}), star = traceStar();
    starAt.appendChild(star);
    const dot = traceSvg("circle", { r:(5.5*mk).toFixed(2), fill:"#38b000", class:"trace-start" });
    marks.append(starAt, dot);
    let demo = null;

    const hex = COLORS[r.colour];
    let si = 0, tracker = traceTracker(r.strokes[0], r.tol);
    let activeId = null, line = null, drift = null;

    const place = ()=>{
      const p = tracker.at(), end = r.strokes[si][r.strokes[si].length-1];
      dot.setAttribute("cx", p.x.toFixed(1)); dot.setAttribute("cy", p.y.toFixed(1));
      starAt.setAttribute("transform", `translate(${end.x.toFixed(1)},${end.y.toFixed(1)}) scale(${mk})`);
    };
    const clearDemo = ()=>{ if(demo){ demo.remove(); demo = null; } };
    const showDemo = ()=>{
      clearDemo();
      const rest = r.strokes[si].slice(tracker.k);
      if(rest.length < 2) return;
      demo = traceSvg("circle", { r:"3.6", fill:"#3a86ff", opacity:"0.85" });
      demo.appendChild(traceSvg("animateMotion", { dur: Math.max(1.2, rest.length/40).toFixed(1) + "s", repeatCount:"indefinite",
        path: "M" + rest.map(p => p.x.toFixed(1) + " " + p.y.toFixed(1)).join(" L") }));
      marks.appendChild(demo);
    };
    const addPoint = (pl, p)=> pl.setAttribute("points", (pl.getAttribute("points") + " " + p.x.toFixed(1) + "," + p.y.toFixed(1)).trim());
    const newLine = (colour, width)=>{
      const pl = traceSvg("polyline", { points:"", fill:"none", stroke:colour, "stroke-width":width,
                                        "stroke-linecap":"round", "stroke-linejoin":"round" });
      inkLayer.appendChild(pl);
      return pl;
    };
    const strokeDone = ()=>{
      activeId = null; line = null; drift = null; clearDemo();
      si++;
      api.refocus();
      if(si >= r.strokes.length){
        dot.remove();
        star.classList.add("trace-won");          // the star pops; his line stays
        api.solved(r.name);                        // tagged by readable name, for Settings
        return;
      }
      tracker = traceTracker(r.strokes[si], r.tol);
      place();
    };
    const handle = (res, p)=>{
      if(res.ink){
        if(!line) line = newLine(hex, "4.5");
        if(drift){ addPoint(drift, p); drift = null; }       // join the grey back up to where the colour resumes
        addPoint(line, p);
        place();
      } else if(tracker.drawing){
        // off the line: his line still follows his hand, just in grey
        if(!drift){ drift = newLine("#c7d0dd", "3"); if(line){ const pp = line.getAttribute("points").split(" ").pop(); if(pp) drift.setAttribute("points", pp); } }
        line = null;
        addPoint(drift, p);
      }
      if(res.miss){
        const attempts = api.miss();
        if(attempts >= S.dimAfter) road.classList.add("show");
        if(attempts >= S.showAfter) showDemo();
      }
      if(res.done) strokeDone();
    };
    // screen -> board units, allowing for the board being letterboxed
    const toBoard = (e)=>{
      const b = svg.getBoundingClientRect();
      if(!b.width || !b.height) return null;
      const s = Math.min(b.width/TRACE_W, b.height/TRACE_H);
      const ox = b.left + (b.width - TRACE_W*s)/2, oy = b.top + (b.height - TRACE_H*s)/2;
      return { x:(e.clientX - ox)/s, y:(e.clientY - oy)/s };
    };
    const penNearby = ()=> Date.now() - tracePenAt < TRACE_PEN_MEMORY;

    svg.addEventListener("pointerdown", e=>{
      e.preventDefault();
      if(e.pointerType === "pen") tracePenAt = Date.now();
      if(e.pointerType === "touch" && penNearby()) return;       // a pen is in use: ignore fingers and palms
      if(activeId !== null) return;                                // one hand at a time
      const p = toBoard(e); if(!p) return;
      const res = tracker.down(p.x, p.y);
      if(!res.accepted) return;                                    // not on the green dot — a palm, or a stray tap
      activeId = e.pointerId;
      try{ svg.setPointerCapture(e.pointerId); }catch(err){}
      line = null; drift = null;
      handle(res, p);
    });
    svg.addEventListener("pointermove", e=>{
      if(e.pointerType === "pen") tracePenAt = Date.now();         // a hovering pen still counts as in use
      if(e.pointerId !== activeId) return;
      e.preventDefault();
      const evs = (e.getCoalescedEvents && e.getCoalescedEvents().length) ? e.getCoalescedEvents() : [e];
      for(const ev of evs){
        if(activeId === null) break;
        const p = toBoard(ev); if(p) handle(tracker.move(p.x, p.y), p);
      }
    });
    const end = e=>{
      if(e.pointerId !== activeId) return;
      activeId = null; line = null; drift = null;
      tracker.up();
      place();
    };
    svg.addEventListener("pointerup", end);
    svg.addEventListener("pointercancel", end);

    // for tests and the progress simulation: where the current stroke is and how far he's got
    svg._trace = { stroke: ()=> ({ pts: r.strokes[si], k: tracker.k, index: si, count: r.strokes.length }), tol: r.tol };

    place();
    api.hint(dot);
  }
};
