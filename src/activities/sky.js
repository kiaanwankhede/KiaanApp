/* ============================ ACTIVITY: SKY ============================
   Put your finger on the green dot and follow the line down to the picture
   waiting for it — sunshine to a sprout, a raindrop to a flower, one kite's
   string to another, one plane's path to another.

   This is the exact same skill as Trace — start on the green dot, follow
   the line, direction enforced, nothing ever fails — just dressed as
   reaching a real thing instead of a plain star. It exists because a
   commercial tracing app teaching this identical skill (a line from one
   thing to another) wraps every finished line in a mascot animation, a
   confetti burst and a full-screen flash — exciting in a way that works
   against a calm activity rather than for it. Same skill, same rules as
   everywhere else in this app: silent, no character, no burst — just a
   small picture sitting still at the end instead of a star.

   The board, the judge (traceTracker) and all the drawing and pointer
   wiring are the shared engine in src/36-trace-engine.js; this file is only
   the four themes and the ladder over them.

   THE LADDER
   ----------
   Same fade Trace uses for a new stroke: each theme's two line angles are
   introduced alone on a wide path, then together on a dotted line, then
   together as dots to join. Themes then arrive in this order because that's
   the order the strokes themselves get harder to steer: sun and rain are
   short, rain's second angle barely off vertical; kite strings run further
   and at a steeper angle; flight paths are the longest and shallowest, so a
   wandering hand has the most room to drift before reaching the far plane.
   A last stage mixes every theme together at dotted and dots-only support,
   the way Trace closes each of its own stages.
   ========================================================================= */

const SKY_SHAPES = {
  sunRayL:  { name:"sun ray",      theme:"sun",   head:"Follow the sunshine down to the sprout",
              marker:{emoji:"🌱"}, startMark:{emoji:"☀️"}, strokes:[ tracePoly([[112,16],[56,80]]) ] },
  sunRayR:  { name:"sun ray",      theme:"sun",   head:"Follow the sunshine down to the sprout",
              marker:{emoji:"🌱"}, startMark:{emoji:"☀️"}, strokes:[ tracePoly([[56,16],[112,80]]) ] },

  rainNear: { name:"raindrop",     theme:"rain",  head:"Follow the raindrop down to the flower",
              marker:{emoji:"🌷"}, startMark:{emoji:"☁️"}, strokes:[ tracePoly([[64,16],[64,82]]) ] },
  rainFar:  { name:"raindrop",     theme:"rain",  head:"Follow the raindrop down to the flower",
              marker:{emoji:"🌷"}, startMark:{emoji:"☁️"}, strokes:[ tracePoly([[104,16],[96,82]]) ] },

  kiteA:    { name:"kite string",  theme:"kite",  head:"Follow the string down to the kite",
              marker:{emoji:"🪁"}, startMark:{emoji:"🪁"}, strokes:[ tracePoly([[128,14],[42,84]]) ] },
  kiteB:    { name:"kite string",  theme:"kite",  head:"Follow the string down to the kite",
              marker:{emoji:"🪁"}, startMark:{emoji:"🪁"}, strokes:[ tracePoly([[40,18],[122,82]]) ] },

  planeA:   { name:"flight path",  theme:"plane", head:"Follow the flight path to the plane",
              marker:{emoji:"✈️"}, startMark:{emoji:"✈️"}, strokes:[ tracePoly([[22,32],[138,68]]) ] },
  planeB:   { name:"flight path",  theme:"plane", head:"Follow the flight path to the plane",
              marker:{emoji:"✈️"}, startMark:{emoji:"✈️"}, strokes:[ tracePoly([[138,32],[22,68]]) ] }
};
Object.keys(SKY_SHAPES).forEach(k=>{
  const s = SKY_SHAPES[k];
  s.paths = s.strokes.map(raw => traceResample(raw, 1));
});

const SUN = ["sunRayL","sunRayR"], RAIN = ["rainNear","rainFar"];
const KITE = ["kiteA","kiteB"], PLANE = ["planeA","planeB"];
const ALL_SKY = SUN.concat(RAIN, KITE, PLANE);

const SKY_LEVELS = [
  // 1 — sun: shortest, steepest, most direct
  { stage:1, load:0.0, name:"Sun ray · left · wide path",     shapes:["sunRayL"], guide:"road" },
  { stage:1, load:0.3, name:"Sun ray · right · wide path",    shapes:["sunRayR"], guide:"road" },
  { stage:1, load:1.0, name:"Sun rays · dotted",              shapes:SUN, guide:"dotted" },
  { stage:1, load:1.4, name:"Sun rays · join the dots",       shapes:SUN, guide:"dots" },
  // 2 — rain: one line barely off straight down, testing a steadier hand
  { stage:2, load:0.0, name:"Raindrop · straight · wide path", shapes:["rainNear"], guide:"road" },
  { stage:2, load:0.3, name:"Raindrop · slanted · wide path",  shapes:["rainFar"],  guide:"road" },
  { stage:2, load:1.0, name:"Raindrops · dotted",              shapes:RAIN, guide:"dotted" },
  { stage:2, load:1.4, name:"Raindrops · join the dots",       shapes:RAIN, guide:"dots" },
  // 3 — kite strings: longer and further across the board
  { stage:3, load:0.0, name:"Kite string · wide path",         shapes:["kiteA"], guide:"road" },
  { stage:3, load:0.3, name:"Kite string · other way · wide path", shapes:["kiteB"], guide:"road" },
  { stage:3, load:1.2, name:"Kite strings · dotted",           shapes:KITE, guide:"dotted" },
  { stage:3, load:1.6, name:"Kite strings · join the dots",    shapes:KITE, guide:"dots" },
  // 4 — flight paths: longest and shallowest, the most room to drift
  { stage:4, load:0.0, name:"Flight path · wide path",         shapes:["planeA"], guide:"road" },
  { stage:4, load:0.3, name:"Flight path · other way · wide path", shapes:["planeB"], guide:"road" },
  { stage:4, load:1.4, name:"Flight paths · dotted",           shapes:PLANE, guide:"dotted" },
  { stage:4, load:1.8, name:"Flight paths · join the dots",    shapes:PLANE, guide:"dots" },
  // 5 — every theme mixed, on the least support
  { stage:5, load:1.0, name:"All of the sky · dotted",         shapes:ALL_SKY, guide:"dotted" },
  { stage:5, load:1.5, name:"All of the sky · join the dots",  shapes:ALL_SKY, guide:"dots" }
];
// stage first, then load inside the stage — stable, so declaration order breaks ties
SKY_LEVELS.sort((a,b)=> (a.stage - b.stage) || (a.load - b.load));
function skyEntry(lv){ return SKY_LEVELS[Math.min(Math.max(lv,1), SKY_LEVELS.length) - 1]; }

let skyLast = null;
function buildSky(lv){
  const e = skyEntry(lv);
  const choices = e.shapes.length > 1 ? e.shapes.filter(s => s !== skyLast) : e.shapes;
  const shape = pick(choices);
  skyLast = shape;
  const s = SKY_SHAPES[shape];
  return { entry:e, shape, name:s.name, strokes:s.paths, raw:s.strokes,
           tol: TRACE_TOL[e.guide], colour: pick(Object.keys(COLORS)),
           marker: s.marker, startMark: s.startMark, head: s.head };
}

const SKY = {
  id: "sky",
  name: "2 Jan 2025  -  Emergent writing slanting lines",
  section: "Toondemy Games",
  date: "2025-01-02",
  icon: "☀️🪁",
  maxLevel: ()=> SKY_LEVELS.length,
  levelLabel: (lv)=> skyEntry(lv).name,
  settingsHint: (lv)=>{
    const e = skyEntry(lv);
    const kinds = Array.from(new Set(e.shapes.map(k => SKY_SHAPES[k].name)));
    const how = e.guide === "road" ? "on a wide grey path with arrows"
              : e.guide === "dotted" ? "along a dotted line" : "by joining dots";
    return "Traces a " + kinds.join(" or a ") + " " + how + " down to a small picture instead of a star " +
           "— the same line-tracing skill as Trace. He starts on the green dot; off the line his crayon " +
           "turns grey, and he can lift and carry on from where he stopped.";
  },

  startRound(level, api){
    renderTraceRound(api, buildSky(level));
  }
};
