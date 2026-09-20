/* ============================ ACTIVITY: SKY ============================
   Put your finger on the green dot and follow the line down to the picture
   waiting for it — three rays from the sun, three raindrops from a cloud,
   three kite strings, three flight paths, one after another.

   This is the exact same skill as Trace — start on the green dot, follow
   the line, direction enforced, nothing ever fails — just dressed as
   reaching a real thing instead of a plain star. It exists because a
   commercial tracing app teaching this identical skill wraps every finished
   line in a mascot animation, a confetti burst and a full-screen flash —
   exciting in a way that works against a calm activity rather than for it.
   Same skill, same rules as everywhere else in this app: silent, no
   character, no burst — just a small picture sitting still at the end
   instead of a star.

   ONE GAME, NOT A LADDER
   -----------------------
   Sky is a Toondemy game (`oneShot: true`, see src/50-session.js and
   src/70-home.js): it recreates that one lesson exactly, all four scenes
   back to back in the order the video shows them, at the one guide style
   the video actually uses throughout (a dotted line — never the wide grey
   path Trace warms up on, since nothing here is a first look at a new
   line). No level stepper, no easier or harder version — the reward comes
   the moment the fourth scene finishes, with Repeat and Next on the shell's
   reward screen rather than this file inventing its own.

   Sun, then rain, then kite, then plane are four separate calls into the
   shared engine (src/36-trace-engine.js), handed to playScenes() in
   src/50-session.js — the shell owns running them in order, the beat after
   each one finishes so the picture popping at the end is actually seen, and
   the quiet "Scene 2 of 4" in the corner. This file just says what the four
   scenes are.
   ========================================================================= */

/* Where each fan sits is set by what has to fit around it, not by taste: the
   picture saying where the line comes from is drawn a fixed distance back
   along the line's own direction (src/36-trace-engine.js), so every fan needs
   that much clear board above and behind its first line, or the sun ends up
   sitting on the green dot and hanging off the corner of the card — which is
   exactly what the first version did. The picture waiting at the far end needs
   its own room below and to the right for the same reason. */
const SKY_SHAPES = {
  sun:   { name:"sun's rays",   head:"Follow the sunshine down",
           marker:{emoji:"🌱"}, startMark:{emoji:"☀️"}, strokes: mkFan(28, 21, 46, 62, 26, 3) },
  rain:  { name:"raindrops",    head:"Follow the raindrops down",
           marker:{emoji:"🌷"}, startMark:{emoji:"☁️"}, strokes: mkFan(33, 24, 18, 58, 35, 3) },
  kite:  { name:"kite strings", head:"Follow the kite strings down",
           marker:{emoji:"🪁"}, startMark:{emoji:"🪁"}, strokes: mkFan(24, 20, 62, 62, 30, 3) },
  plane: { name:"flight paths", head:"Follow the flight paths down",
           marker:{emoji:"✈️"}, startMark:{emoji:"✈️"}, strokes: mkFan(26, 34, 70, 38, 26, 3) }
};
/* Three parallel strokes, same slope, staggered left to right — one shape
   per theme rather than a pool, since the source material shows exactly one
   fixed arrangement per scene. `mkFan` keeps that stagger consistent instead
   of four sets of hand-picked, error-prone coordinates. */
function mkFan(x0, y0, dx, dy, gap, n){
  const out = [];
  for(let i=0;i<n;i++){ const x = x0 + i*gap; out.push(tracePoly([[x,y0],[x+dx,y0+dy]])); }
  return out;
}
const SKY_ORDER = ["sun","rain","kite","plane"];
SKY_ORDER.forEach(k=>{
  const s = SKY_SHAPES[k];
  s.paths = s.strokes.map(raw => traceResample(raw, 1));
});

function buildSkyScene(themeKey){
  const s = SKY_SHAPES[themeKey];
  return { entry:{ guide:"dotted" }, strokes:s.paths, raw:s.strokes,
           tol: TRACE_TOL.dotted, colour: pick(Object.keys(COLORS)),
           // all three destinations on screen from the start, each popping as
           // its own line is finished — three lines into empty space read as
           // one journey and two false starts
           marker: s.marker, markEvery: true, startMark: s.startMark, head: s.head };
}

const SKY = {
  id: "sky",
  name: "Emergent writing slanting lines",
  section: "Toondemy Games",
  date: "2025-01-02",
  oneShot: true,
  icon: "☀️🪁",
  maxLevel: ()=> 1,
  levelLabel: ()=> "",
  settingsHint: ()=>
    "Traces three sun rays, three raindrops, three kite strings and three flight paths, one scene after " +
    "another, down to a small picture instead of a star each time — the same line-tracing skill as Trace. " +
    "He starts each line on the green dot; off the line his crayon turns grey, and he can lift and carry " +
    "on from where he stopped.",

  startRound(level, api){
    playScenes(api, SKY_ORDER.map(k => (scene)=> renderTraceRound(scene, buildSkyScene(k))), "all four skies");
  }
};
