/* ============================ ACTIVITY: SKY ============================
   Put your finger on the green dot and follow the line down to the picture
   waiting for it — three rays from the sun, three raindrops from a cloud,
   three kite strings, three flight paths.

   This is the exact same skill as Trace — start on the green dot, follow
   the line, direction enforced, nothing ever fails — just dressed as
   reaching a real thing instead of a plain star. It exists because a
   commercial tracing app teaching this identical skill wraps every finished
   line in a mascot animation, a confetti burst and a full-screen flash —
   exciting in a way that works against a calm activity rather than for it.
   Same skill, same rules as everywhere else in this app: silent, no
   character, no burst — just a small picture sitting still at the end
   instead of a star.

   THREE LINES A ROUND, NOT ONE — MATCHING THE SOURCE MATERIAL
   -------------------------------------------------------------
   The first version gave each theme two interchangeable single lines and
   picked one at random per round, which read as far more repetitive than
   the app it was built to answer: that app shows three (or four) parallel
   lines on screen at once — every guide visible from the start — traced one
   at a time before anything is "done". Trace already supports exactly this
   for a shape with more than one stroke (its "plus" and "cross" work the
   same way): all of a round's strokes draw their guides up front, and the
   green dot plus the end picture both hop to the next stroke as each one
   finishes, with one round only counting as solved once every stroke has.
   So each theme here is ONE shape with three strokes, not two shapes with
   one each — closer to what was actually demonstrated, and a fuller,
   less repetitive-feeling round without inventing extra content to pad it.

   The board, the judge (traceTracker) and all the drawing and pointer
   wiring are the shared engine in src/36-trace-engine.js; this file is only
   the four themes and the ladder over them.

   THE LADDER
   ----------
   Each theme still fades the way every new stroke does elsewhere in this
   app — a wide path with arrows, then a dotted line, then just dots to join
   — because that scaffold is this app's own tested pedagogy for a first
   look at a new line, not something the source material needs to dictate.
   Themes arrive in the order their angle gets harder to hold steady: sun's
   rays are a moderate diagonal; rain is closest to straight down, which
   sounds easier but leaves the least room either side to wander; kite
   strings run a shallower diagonal across more of the board; flight paths
   are shallower still and longest of all, so a drifting hand has the most
   distance to recover over. Twelve levels — four themes of three, matching
   the four scenes actually shown, not a ladder invented on top of them.
   ========================================================================= */

/* Three parallel strokes, same slope, staggered left to right — one shape
   per theme rather than a pool, since the source material shows exactly one
   fixed arrangement per scene. `mkFan` keeps that stagger consistent instead
   of four sets of hand-picked, error-prone coordinates. */
function mkFan(x0, y0, dx, dy, gap, n){
  const out = [];
  for(let i=0;i<n;i++){ const x = x0 + i*gap; out.push(tracePoly([[x,y0],[x+dx,y0+dy]])); }
  return out;
}

const SKY_SHAPES = {
  sun:   { name:"sun's rays",   head:"Follow the sunshine down",
           marker:{emoji:"🌱"}, startMark:{emoji:"☀️"}, strokes: mkFan(28, 16, 46, 68, 26, 3) },
  rain:  { name:"raindrops",    head:"Follow the raindrops down",
           marker:{emoji:"🌷"}, startMark:{emoji:"☁️"}, strokes: mkFan(33, 20, 18, 68, 35, 3) },
  kite:  { name:"kite strings", head:"Follow the kite strings down",
           marker:{emoji:"🪁"}, startMark:{emoji:"🪁"}, strokes: mkFan(18, 16, 62, 62, 30, 3) },
  plane: { name:"flight paths", head:"Follow the flight paths down",
           marker:{emoji:"✈️"}, startMark:{emoji:"✈️"}, strokes: mkFan(26, 24, 70, 38, 26, 3) }
};
const SKY_THEMES = Object.keys(SKY_SHAPES);
SKY_THEMES.forEach(k=>{
  const s = SKY_SHAPES[k];
  s.paths = s.strokes.map(raw => traceResample(raw, 1));
});

const SKY_LEVELS = [
  { stage:1, load:0.0, name:"Sun's rays · wide path",         theme:"sun",   guide:"road" },
  { stage:1, load:1.0, name:"Sun's rays · dotted",            theme:"sun",   guide:"dotted" },
  { stage:1, load:1.4, name:"Sun's rays · join the dots",     theme:"sun",   guide:"dots" },
  { stage:2, load:0.0, name:"Raindrops · wide path",          theme:"rain",  guide:"road" },
  { stage:2, load:1.0, name:"Raindrops · dotted",             theme:"rain",  guide:"dotted" },
  { stage:2, load:1.4, name:"Raindrops · join the dots",      theme:"rain",  guide:"dots" },
  { stage:3, load:0.0, name:"Kite strings · wide path",       theme:"kite",  guide:"road" },
  { stage:3, load:1.2, name:"Kite strings · dotted",          theme:"kite",  guide:"dotted" },
  { stage:3, load:1.6, name:"Kite strings · join the dots",   theme:"kite",  guide:"dots" },
  { stage:4, load:0.0, name:"Flight paths · wide path",       theme:"plane", guide:"road" },
  { stage:4, load:1.4, name:"Flight paths · dotted",          theme:"plane", guide:"dotted" },
  { stage:4, load:1.8, name:"Flight paths · join the dots",   theme:"plane", guide:"dots" }
];
// stage first, then load inside the stage — stable, so declaration order breaks ties
SKY_LEVELS.sort((a,b)=> (a.stage - b.stage) || (a.load - b.load));
function skyEntry(lv){ return SKY_LEVELS[Math.min(Math.max(lv,1), SKY_LEVELS.length) - 1]; }

function buildSky(lv){
  const e = skyEntry(lv);
  const s = SKY_SHAPES[e.theme];
  return { entry:e, name:s.name, strokes:s.paths, raw:s.strokes,
           tol: TRACE_TOL[e.guide], colour: pick(Object.keys(COLORS)),
           marker: s.marker, startMark: s.startMark, head: s.head };
}

const SKY = {
  id: "sky",
  name: "Emergent writing slanting lines",
  section: "Toondemy Games",
  date: "2025-01-02",
  icon: "☀️🪁",
  maxLevel: ()=> SKY_LEVELS.length,
  levelLabel: (lv)=> skyEntry(lv).name,
  settingsHint: (lv)=>{
    const e = skyEntry(lv);
    const s = SKY_SHAPES[e.theme];
    const how = e.guide === "road" ? "on a wide grey path with arrows"
              : e.guide === "dotted" ? "along a dotted line" : "by joining dots";
    return "Traces all three " + s.name + " one at a time, " + how +
           " down to a small picture instead of a star — the same line-tracing skill as Trace. " +
           "He starts each on the green dot; off the line his crayon turns grey, and he can lift and carry on from where he stopped.";
  },

  startRound(level, api){
    renderTraceRound(api, buildSky(level));
  }
};
