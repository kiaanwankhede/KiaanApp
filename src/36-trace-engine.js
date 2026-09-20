/* ============================ TRACE ENGINE ============================
   The generic machinery behind any "put your finger on the dot and follow
   the line" activity: building a stroke out of points, judging whether a
   touch is on it, and drawing + wiring up the board. Trace (src/activities/
   trace.js) was the first thing built on this and it's still where the
   per-shape catalogue and ladder live; this file is only the part that
   doesn't care WHAT is being traced, pulled out here once a second activity
   (Sky) needed the exact same judge and the exact same forgiving behaviour
   rather than a second, drifting copy of it.

   The judge — is he on the line, how far along, did he wander — is
   traceTracker(), kept free of the DOM so it can be tested on its own.
   `tests/trace.test.js` runs it on every shape at every tolerance.
   ======================================================================= */

const TRACE_W = 160, TRACE_H = 100;                    // the board, in its own units
const TRACE_TOL = { road: 11, dotted: 8.5, dots: 7.5, small: 6 };   // how far off still counts
const TRACE_PEN_MEMORY = 60000;                        // fingers ignored for this long after a real pen was seen

/* ---- building strokes ----
   A stroke is a list of points; cornerPts marks the ones "join the dots" must
   always show (corners, and where one piece of a shape meets the next). */
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
        // Reaching the end counts. Without this a wobbly hand could end right
        // beside it, never land on the exact last point, and be stuck at 98%
        // — only allowed once he's traced nearly all the way, so it's no shortcut.
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
// the mark waiting at the end of a stroke: a star by default, or one emoji
// for an activity that wants the target to be a picture instead
function traceEndMark(marker){
  if(marker && marker.emoji){
    const t = traceSvg("text", { x:"0", y:"1", "font-size":"15", "text-anchor":"middle", "dominant-baseline":"central" });
    t.textContent = marker.emoji;
    return t;
  }
  return traceStar();
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
/* the dots for "join the dots": every corner, plus a dot every so often along the way */
function traceDots(path, raw){
  const out = [];
  for(let i=0; i<path.length; i+=14) out.push(path[i]);
  out.push(path[path.length-1]);
  (raw.cornerPts || []).forEach(p => { if(out.every(q => Math.hypot(q.x - p.x, q.y - p.y) > 4)) out.push(p); });
  return out;
}

let tracePenAt = -Infinity;     // when a real pen was last seen — shared across every trace-family activity

/* ---- the whole round ----
   Everything a trace-family activity needs once it has decided WHAT to
   trace: r = { head, name, strokes (resampled paths), raw (their pre-resample
   definitions, for corner dots), tol, colour, entry:{guide,small}, marker? }.
   `marker` is optional — {emoji} draws that instead of the star Trace uses. */
function renderTraceRound(api, r){
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
    // without the path there are no arrows, and on a closed shape nothing
    // would say which way to set off — so one green arrow just past each start
    if(r.entry.guide !== "road") guides.appendChild(traceArrow(p, 12, "#38b000", r.entry.small ? 1 : 1.3));
  });

  // an optional, purely decorative picture at the very start of the whole
  // round — "where this line comes from" — sat a fixed distance behind the
  // first point, back along the direction the stroke itself travels, so no
  // per-shape position ever has to be hand-tuned. Never interactive: only the
  // green dot starts a touch, exactly as everywhere else.
  if(r.startMark){
    const s0 = r.strokes[0], p0 = s0[0], p1 = s0[Math.min(6, s0.length - 1)];
    const dx = p0.x - p1.x, dy = p0.y - p1.y, len = Math.hypot(dx, dy) || 1, k = 15/len;
    const sm = traceSvg("text", { x:(p0.x + dx*k).toFixed(1), y:(p0.y + dy*k).toFixed(1),
      "font-size": "14", "text-anchor":"middle", "dominant-baseline":"central", "pointer-events":"none" });
    sm.textContent = r.startMark.emoji;
    guides.appendChild(sm);
  }

  // the end mark sits in its own group so its pop animation can't disturb its
  // position; on small levels dot and mark shrink too, or on a short stroke
  // they'd cover half the line between them
  const mk = r.entry.small ? 0.7 : 1;
  const markAt = traceSvg("g", {}), mark = traceEndMark(r.marker);
  markAt.appendChild(mark);
  const dot = traceSvg("circle", { r:(5.5*mk).toFixed(2), fill:"#38b000", class:"trace-start" });
  marks.append(markAt, dot);
  let demo = null;

  const hex = COLORS[r.colour];
  let si = 0, tracker = traceTracker(r.strokes[0], r.tol);
  let activeId = null, line = null, drift = null;

  const place = ()=>{
    const p = tracker.at(), end = r.strokes[si][r.strokes[si].length-1];
    dot.setAttribute("cx", p.x.toFixed(1)); dot.setAttribute("cy", p.y.toFixed(1));
    markAt.setAttribute("transform", `translate(${end.x.toFixed(1)},${end.y.toFixed(1)}) scale(${mk})`);
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
      mark.classList.add("trace-won");          // the mark pops; his line stays
      api.solved(r.name);                         // tagged by readable name, for Settings
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
