/* ============================ STIMULI ============================
   The shared visual vocabulary: colours, shapes, emoji themes, and the
   renderers that turn an item into a DOM node. Activities build rounds out
   of these so everything on screen looks like one app.
   item = {k:'shape',shape,color,size} | {k:'em',ch,theme?} | {k:'text',text,color}
        | {k:'bar',color,scale}
   ================================================================ */
const COLORS = {
  red:"#e8384f", yellow:"#ffc400", green:"#2e9e44", blue:"#2f6fed", purple:"#8338ec"
};
const COLOR_WORDS = { red:"RED", yellow:"YELLOW", green:"GREEN", blue:"BLUE", purple:"PURPLE" };
const SHAPES = ["circle","square","triangle","star"];
const SHAPE_WORDS = { circle:"CIRCLE", square:"SQUARE", triangle:"TRIANGLE", star:"STAR" };

const FOOD = ["🍎","🍌","🍇","🍓","🥕","🍕","🍞","🧀"];
const GO   = ["🚗","🚌","🚲","🚂","🚕","🚚","✈️","🚁"];

const THEMES = {
  animals:    ["🐶","🐱","🐰","🐵","🐸","🐷","🦁","🐻"],
  fruits:     ["🍎","🍌","🍇","🍓","🍊","🍉","🍍","🥝"],
  vegetables: ["🥕","🥦","🌽","🍆","🥔","🫑","🥒","🧅"],
  vehicles:   ["🚗","🚌","🚲","🚂","🚕","🚚","✈️","🚁"],
  // ⭐ and 🌙 used to live here — a star isn't weather, and a category a child
  // can't name reliably makes a category task unfair rather than hard.
  weather:    ["☀️","☁️","🌧️","🌈","❄️","⛄","⛈️","🌪️"]
};
const THEME_KEYS = Object.keys(THEMES);
/* Categories used for the "Mixed categories" domain. Vegetables are deliberately
   left out: pitting 🍓 against 🥕 asks a 4-year-old to split "food" into two
   groups, which is a much harder (and blurrier) judgement than animal vs fruit
   vs vehicle vs weather. Vegetables still appear in Real objects, where only one
   theme is used per round so nothing has to be told apart from anything. */
const MIXED_THEMES = ["animals","fruits","vehicles","weather"];
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const DIGITS = "123456789".split("");
/* Sorting uses three named sizes; Order needs a finer grain than three, so a
   plain number is also accepted and used as the scale directly. */
function sizeScaleOf(size){
  if(typeof size === "number") return size;
  return size==="small" ? 0.55 : (size==="medium" ? 0.78 : 1);
}

/* box tints — colour-sort bins use the real colour being tested; the rest get a
   fixed, arbitrary tint so the box itself is easy to spot without hinting at the
   actual sorting rule */
const SHAPE_TINT = { circle:"#2f6fed", square:"#8338ec", triangle:"#00a6a6", star:"#ffc400" };
const SIZE_TINT  = { big:"#2f6fed", medium:"#8338ec", small:"#00a6a6" };
const THEME_TINT = { animals:"#e8384f", fruits:"#ffc400", vegetables:"#2e9e44", vehicles:"#2f6fed", weather:"#00a6a6" };
const CATEGORY_TINT = { food:"#2e9e44", go:"#8338ec", eat:"#2e9e44", wear:"#8338ec", living:"#2e9e44", nonliving:"#7b8794" };
// A bin may carry its own tint (combination bins have no single id to look up);
// otherwise the id is matched against the tables above.
function tintFor(bin){
  return bin.tint || COLORS[bin.id] || SHAPE_TINT[bin.id] || SIZE_TINT[bin.id] ||
         THEME_TINT[bin.id] || CATEGORY_TINT[bin.id] || "#7b8794";
}
function hexToRgba(hex, a){
  const h = hex.replace("#","");
  const r = parseInt(h.substring(0,2),16), g = parseInt(h.substring(2,4),16), b = parseInt(h.substring(4,6),16);
  return `rgba(${r},${g},${b},${a})`;
}

function shapeSVG(shape, color, scale){
  scale = scale || 1;
  const c = COLORS[color] || color;
  const s = 100, m = 50 - 42*scale, w = 84*scale;
  if(shape==="circle") return `<svg viewBox="0 0 ${s} ${s}" width="100%" height="100%"><circle cx="50" cy="50" r="${42*scale}" fill="${c}"/></svg>`;
  if(shape==="square") return `<svg viewBox="0 0 ${s} ${s}" width="100%" height="100%"><rect x="${m}" y="${m}" width="${w}" height="${w}" rx="${12*scale}" fill="${c}"/></svg>`;
  if(shape==="triangle"){
    const h = 78*scale, cx=50, top=50-h*0.55, bot=50+h*0.45, half=h*0.58;
    return `<svg viewBox="0 0 ${s} ${s}" width="100%" height="100%"><polygon points="${cx},${top} ${cx+half},${bot} ${cx-half},${bot}" fill="${c}" stroke-linejoin="round" stroke="${c}" stroke-width="8"/></svg>`;
  }
  // star
  let pts=[], R=46*scale, r=19*scale;
  for(let i=0;i<10;i++){ const ang = -Math.PI/2 + i*Math.PI/5; const rad = i%2?r:R;
    pts.push((50+rad*Math.cos(ang)).toFixed(1)+","+(50+rad*Math.sin(ang)).toFixed(1)); }
  return `<svg viewBox="0 0 ${s} ${s}" width="100%" height="100%"><polygon points="${pts.join(" ")}" fill="${c}"/></svg>`;
}

/* A bar: fixed width, height proportional to scale, standing on a common
   baseline. Ordering by length is a cleaner judgement than ordering by area —
   one dimension instead of two — and a row of them reads as a staircase. */
function barSVG(color, scale){
  const c = COLORS[color] || color;
  const w = 40, h = Math.max(6, 86*scale), x = 50 - w/2, y = 95 - h;
  return `<svg viewBox="0 0 100 100" width="100%" height="100%"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${c}"/></svg>`;
}

/* item = {k:'shape',shape,color,size} | {k:'em',ch,theme?,scale?} | {k:'text',text,color}
        | {k:'bar',color,scale} */
function itemKey(it){
  if(it.k==="em") return "em:"+it.ch+(typeof it.scale==="number" ? ":"+it.scale : "");
  if(it.k==="text") return "tx:"+it.text;
  if(it.k==="bar") return "bar:"+it.color+":"+it.scale;
  return ["sh",it.shape,it.color,it.size||"big"].join(":");
}
function itemNode(it, px){
  const cls = it.k==="em" ? " emoji" : (it.k==="text" ? " texttile" : (it.k==="bar" ? " bar" : ""));
  const d = el("div","tile"+cls);
  if(px) d.style.setProperty("--t", px+"px");
  if(it.k==="em"){
    d.textContent = it.ch;
    // Order sizes a picture continuously; everywhere else an emoji fills its tile
    if(typeof it.scale === "number") d.style.fontSize = "calc(var(--t,78px) * " + (0.8*it.scale).toFixed(3) + ")";
  }
  else if(it.k==="text"){ d.textContent = it.text; d.style.color = it.color; }
  else if(it.k==="bar") d.innerHTML = barSVG(it.color, it.scale);
  else d.innerHTML = shapeSVG(it.shape, it.color, sizeScaleOf(it.size));
  d._item = it;
  return d;
}

