/* ============================ REWARDS ============================
   The reward picture + spelling shown every few correct rounds, the shuffle
   bag that stops repeats, and the IndexedDB store of photos added from the
   tablet. Shared by every activity via the session loop.
   ================================================================ */
const REWARD_ANIMALS = [
  ["DOG","🐶"],["CAT","🐱"],["COW","🐮"],["LION","🦁"],["TIGER","🐯"],["ELEPHANT","🐘"],
  ["MONKEY","🐵"],["ZEBRA","🦓"],["GIRAFFE","🦒"],["HORSE","🐴"],["PIG","🐷"],["SHEEP","🐑"],
  ["RABBIT","🐰"],["BEAR","🐻"],["PANDA","🐼"],["FOX","🦊"],["FROG","🐸"],
  ["DUCK","🦆"],["OWL","🦉"],["PENGUIN","🐧"],["PARROT","🦜"],["SNAKE","🐍"],
  ["BUTTERFLY","🦋"],["BEE","🐝"],
  ["CAMEL","🐫"],["DEER","🦌"],["GOAT","🐐"],["HEN","🐔"],["SNAIL","🐌"],["KOALA","🐨"],
  ["WOLF","🐺"],["HIPPOPOTAMUS","🦛"],["RHINOCEROS","🦏"],["PEACOCK","🦚"]
];
/* Everything that lives in water, kept together rather than scattered through
   the animals — easier to review, and it reads as a set when he sees them. */
const REWARD_SEA = [
  ["FISH","🐠"],["CRAB","🦀"],["OCTOPUS","🐙"],["WHALE","🐳"],["DOLPHIN","🐬"],["TURTLE","🐢"],
  ["SHARK","🦈"],["CROCODILE","🐊"],["PRAWN","🦐"],["LOBSTER","🦞"],["SQUID","🦑"],
  ["SEAL","🦭"],["OTTER","🦦"],["SHELL","🐚"]
];
const REWARD_FRUITS = [
  ["APPLE","🍎"],["BANANA","🍌"],["GRAPES","🍇"],["ORANGE","🍊"],["STRAWBERRY","🍓"],
  ["WATERMELON","🍉"],["PINEAPPLE","🍍"],["KIWI","🥝"],["MANGO","🥭"],["PEACH","🍑"],
  ["CHERRY","🍒"],["LEMON","🍋"],["COCONUT","🥥"],["PEAR","🍐"]
];
/* Vegetables — note this is the REWARD pool, nothing to do with the sorting
   themes: CLAUDE.md keeps vegetables out of category SORTING because "food"
   splitting into fruit and vegetable is a blurry call for a 4-year-old. As a
   reward picture with its name under it there's no such judgement to make. */
const REWARD_VEGETABLES = [
  ["CARROT","🥕"],["BROCCOLI","🥦"],["CORN","🌽"],["TOMATO","🍅"],["POTATO","🥔"],
  ["ONION","🧅"],["CUCUMBER","🥒"],["CAPSICUM","🫑"],["BRINJAL","🍆"],["CABBAGE","🥬"],
  ["GARLIC","🧄"],["MUSHROOM","🍄"],["CHILLI","🌶️"],["PUMPKIN","🎃"]
];
const REWARD_FOOD = [
  ["PIZZA","🍕"],["BREAD","🍞"],["CHEESE","🧀"],["EGG","🥚"],["COOKIE","🍪"],
  ["ICE CREAM","🍦"],["CAKE","🍰"],["MILK","🥛"],["CHOCOLATE","🍫"]
];
const REWARD_VEHICLES = [
  ["CAR","🚗"],["BUS","🚌"],["BICYCLE","🚲"],["TRAIN","🚂"],["TAXI","🚕"],["TRUCK","🚚"],
  ["AIRPLANE","✈️"],["HELICOPTER","🚁"],["BOAT","⛵"],["SHIP","🚢"],["SCOOTER","🛵"],
  ["TRACTOR","🚜"],["AMBULANCE","🚑"]
];
/* things he sees around him here, rather than the generic set */
const REWARD_FAMILIAR = [
  ["AUTO","🛺"],["FIRE ENGINE","🚒"],["DIYA","🪔"]
];
const REWARD_HOUSE = [
  ["CHAIR","🪑"],["BED","🛏️"],["SOFA","🛋️"],["DOOR","🚪"],["WINDOW","🪟"],["LAMP","💡"],
  ["CLOCK","🕰️"],["TV","📺"],["MIRROR","🪞"],["BATHTUB","🛁"],["BASKET","🧺"],["KEY","🔑"]
];
const REWARD_NATURE = [
  ["SUN","☀️"],["MOON","🌙"],["STAR","⭐"],["RAINBOW","🌈"],["CLOUD","☁️"],
  ["RAIN","🌧️"],["SNOW","❄️"],["TREE","🌳"],["FLOWER","🌸"],["LEAF","🍃"],
  ["FIRE","🔥"],["WATER","💧"]
];
const REWARD_PLAY = [
  ["BALL","⚽"],["BALLOON","🎈"],["KITE","🪁"],["TEDDY","🧸"],
  ["DICE","🎲"],["ROCKET","🚀"],["GIFT","🎁"],["DRUM","🥁"],
  ["GUITAR","🎸"],["CRICKET","🏏"]
];
const REWARD_CLOTHES = [
  ["SHIRT","👕"],["PANTS","👖"],["SOCKS","🧦"],["SHOES","👟"],["CAP","🧢"],
  ["COAT","🧥"],["GLOVES","🧤"],["DRESS","👗"],["BAG","🎒"],["SHORTS","🩳"]
];
const REWARD_BODY = [
  ["EYE","👁️"],["EAR","👂"],["NOSE","👃"],["MOUTH","👄"],["HAND","🖐️"],
  ["FOOT","🦶"],["TOOTH","🦷"]
];

/* Every group goes in here, and rewards.test.js checks the total against the
   sum of the groups — so a new group that someone forgets to add is caught. */
const EMOJI_PACK = [
  ...REWARD_ANIMALS, ...REWARD_SEA, ...REWARD_FRUITS, ...REWARD_VEGETABLES, ...REWARD_FOOD,
  ...REWARD_VEHICLES, ...REWARD_FAMILIAR, ...REWARD_HOUSE, ...REWARD_NATURE,
  ...REWARD_PLAY, ...REWARD_CLOTHES, ...REWARD_BODY
];

/* tiny IndexedDB for photos added from the tablet */
const DB_NAME="lrapp", STORE="animals";
function idb(){
  return new Promise((res,rej)=>{
    const r = indexedDB.open(DB_NAME,1);
    r.onupgradeneeded = ()=>{ r.result.createObjectStore(STORE,{keyPath:"id",autoIncrement:true}); };
    r.onsuccess = ()=>res(r.result);
    r.onerror = ()=>rej(r.error);
  });
}
async function dbAll(){
  try{
    const db = await idb();
    return await new Promise((res,rej)=>{
      const tx = db.transaction(STORE,"readonly").objectStore(STORE).getAll();
      tx.onsuccess=()=>res(tx.result||[]); tx.onerror=()=>rej(tx.error);
    });
  }catch(e){ return []; }
}
async function dbAdd(rec){
  const db = await idb();
  return new Promise((res,rej)=>{
    const tx = db.transaction(STORE,"readwrite").objectStore(STORE).add(rec);
    tx.onsuccess=()=>res(tx.result); tx.onerror=()=>rej(tx.error);
  });
}
async function dbDel(id){
  const db = await idb();
  return new Promise((res,rej)=>{
    const tx = db.transaction(STORE,"readwrite").objectStore(STORE).delete(id);
    tx.onsuccess=()=>res(); tx.onerror=()=>rej(tx.error);
  });
}
function wordFromFile(name){
  return name.replace(/\.[^.]+$/,"").replace(/[_\-]+/g," ").replace(/\d+/g,"")
             .trim().toUpperCase().slice(0,18) || "ANIMAL";
}
let CUSTOM = [];           // [{id, word, url}]
async function loadCustom(){
  const recs = await dbAll();
  CUSTOM.forEach(c=>{ try{URL.revokeObjectURL(c.url);}catch(e){} });
  CUSTOM = recs.map(r=>({id:r.id, word:r.word, url:URL.createObjectURL(r.blob)}));
}

/* The built-in pictures are real photographs — one per word in EMOJI_PACK,
   inlined by tools/build.js from src/photos/. A photograph of the actual thing
   beats a cartoon of it for learning what the word points at, which is the
   whole job of this screen; the emoji stays as the fallback for any word whose
   photo is missing, and is still what the activities themselves draw with. */
function pictureFor(pair){
  const url = (typeof PHOTO_PACK !== "undefined") && PHOTO_PACK[pair[0]];
  return url ? {type:"img", word:pair[0], url:url}
             : {type:"em",  word:pair[0], em:pair[1]};
}

/* shuffle bag so the same animal doesn't repeat */
let bag = [];
function nextAnimal(){
  if(!bag.length){
    const pool = [];
    CUSTOM.forEach(c=>pool.push({type:"img", word:c.word, url:c.url}));
    if(S.useEmojiPack || !CUSTOM.length) EMOJI_PACK.forEach(p=>pool.push(pictureFor(p)));
    if(!pool.length) pool.push({type:"em", word:"STAR", em:"⭐"});
    for(let i=pool.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [pool[i],pool[j]]=[pool[j],pool[i]]; }
    bag = pool;
  }
  return bag.pop();
}

let rewardTimer = null;
function showReward(){
  const a = nextAnimal();
  sess.sinceReward = 0;
  sess.target = rewardTarget();
  const img = $("#rwImg"); img.innerHTML = "";
  if(a.type === "img"){ const i = el("img"); i.src = a.url; img.appendChild(i); }
  else { img.appendChild(el("div","em", a.em)); }
  const w = $("#rwWord"); w.innerHTML = "";
  a.word.split("").forEach((ch,i)=>{
    const s = el("span", null, ch === " " ? "&nbsp;" : ch);
    w.appendChild(s);
    setTimeout(()=>s.classList.add("in"), 220 + i*170);
  });
  show("#reward");
  clearTimeout(rewardTimer);
  rewardTimer = setTimeout(continueFromReward, 5000); // shows for 5s, then carries straight on — no tap needed
}
function continueFromReward(){
  clearTimeout(rewardTimer); rewardTimer = null;
  show("#play");
  renderTokens();
  if(!sess.roundDone) return;                       // resume a half-finished sorting round
  nextRound();
}
