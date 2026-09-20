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
   shared engine (src/36-trace-engine.js) chained by wrapping the `api` this
   file is handed: the wrapped copy's `solved()` starts the next scene
   instead of forwarding to the real one, until the last scene, which calls
   the real `api.solved()` — the one and only point this whole game counts
   as done. Misses and hints from every scene still reach the real api
   untouched, so a mistake on scene one still means the game wasn't
   independent, exactly as it should.
   ========================================================================= */

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
           marker: s.marker, startMark: s.startMark, head: s.head };
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
    const st = api.stage;
    let idx = 0;
    const playScene = ()=>{
      st.innerHTML = "";
      const wrappedApi = Object.assign({}, api, {
        solved(){
          idx++;
          if(idx < SKY_ORDER.length) playScene();
          else api.solved("all four skies");
        }
      });
      renderTraceRound(wrappedApi, buildSkyScene(SKY_ORDER[idx]));
    };
    playScene();
  }
};
