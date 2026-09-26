/* ========================= ACTIVITY: FINISH THE WORD =========================
   A photograph, and its word with one letter taken out — C _ T — and a few
   letters to choose from underneath. He drags the missing one into the gap.

   THE PICTURE IS THE PROMPT HERE, AND THAT IS NOT A CONTRADICTION
   ---------------------------------------------------------------
   Word find deliberately holds the photograph back, because there the whole
   word's letters are on screen and a picture above them would give away its
   own reveal. Here the opposite is true: C _ T with no picture could be CAT or
   COT or CUT, and a four-year-old has no way to know which was meant. The
   picture is not a spoiler in this game, it IS the question — it is the only
   thing that says which word he is finishing. Never take it away to make this
   harder; that doesn't make it harder, it makes it arbitrary.

   THE STEP UP FROM WORD FIND
   ---------------------------
   Word find is matching letters he can see. This is recalling one he can't:
   he knows from the picture that the word is CAT, and he has to know that CAT
   has an A in the middle. That is genuinely a harder skill and the natural
   next rung, which is why it draws on the same vocabulary — the words he has
   already been shown and found.

   THE ORDER THE GAP MOVES IN IS THE ORDER CHILDREN LEARN SOUNDS
   -------------------------------------------------------------
   First letter, then last letter, then the middle. That is the usual
   developmental order — initial sound, final sound, then the medial vowel,
   which is the last to come and the one that stays hard — and it is the same
   reason Trace runs its strokes in the order handwriting actually develops
   rather than in whatever order looks tidy. Never "simplify" this into always
   blanking the middle because the C_T example looks neat: the middle is the
   end of the ladder, not the start of it.

   TWO GUARDS
   ----------
   The wrong letters are **always the same kind as the right one** — vowels
   offered against a vowel, consonants against a consonant. Mixed, "pick the
   only vowel on screen" would answer every medial-vowel round without knowing
   the word at all, which is exactly the sort of shortcut CLAUDE.md's "guard
   against latching" rule is about.

   And a wrong letter may never turn the word into **another word this app
   teaches**. C_T may offer O (COT is not in the pack) but a gap that could be
   filled to make a second word he has a photograph for would have two
   defensible answers, and only one of them would be accepted.
   ============================================================================= */

const WFILL_VOWELS = ["A","E","I","O","U"];
const WFILL_CONSONANTS = "BCDFGHJKLMNPQRSTVWXYZ".split("");

/* Every word the app teaches, for the "don't make another real word" guard. */
let WFILL_KNOWN = null;
function wfillKnown(){
  if(!WFILL_KNOWN){
    WFILL_KNOWN = {};
    EMOJI_PACK.forEach(p => { WFILL_KNOWN[p[0]] = true; });
  }
  return WFILL_KNOWN;
}

/* Stages are word lengths, steps are where the gap is and how many letters he
   chooses from. Inside a stage exactly one thing gets harder at a time. */
const WFILL_STAGES = [3, 4, 5, 6, 7, 8];
const WFILL_STEPS = [
  { at:"start", opts:2 },   // initial sound — the first one children get
  { at:"end",   opts:2 },   // final sound
  { at:"mid",   opts:2 },   // the medial vowel, the last to come
  { at:"mid",   opts:3 },
  { at:"mid",   opts:4 }
];
const WFILL_LEVELS = [];
WFILL_STAGES.forEach(len => WFILL_STEPS.forEach(step => WFILL_LEVELS.push({ len, step })));
function wfillPlan(level){
  return WFILL_LEVELS[Math.max(0, Math.min(WFILL_LEVELS.length - 1, level - 1))];
}

/* Which letters of this word the gap may sit on. "mid" on a three-letter word
   is its one middle letter; on a longer one it is any letter that is neither
   the first nor the last. */
function wfillGaps(word, at){
  if(at === "start") return [0];
  if(at === "end") return [word.length - 1];
  const out = [];
  for(let i=1;i<word.length-1;i++) out.push(i);
  return out.length ? out : [0];
}

/* One bag per length so a stage works through its words rather than asking for
   the same favourite twice running. */
const WFILL_BAGS = {};
function wfillNextWord(len){
  const pool = wordsOfLength(len);
  if(!pool.length) return null;
  if(!WFILL_BAGS[len] || !WFILL_BAGS[len].length) WFILL_BAGS[len] = shuffle(pool);
  return WFILL_BAGS[len].pop();
}

/* Kept free of the DOM so the tests can run it over every word at every level:
   the gap lands somewhere legal, the right letter is in the options exactly
   once, and every wrong letter is both the same kind and harmless. */
function wfillBuild(word, plan){
  const known = wfillKnown();
  const spots = shuffle(wfillGaps(word, plan.step.at));

  for(const pos of spots){
    const answer = word[pos];
    const vowel = WFILL_VOWELS.indexOf(answer) >= 0;
    const sameKind = (vowel ? WFILL_VOWELS : WFILL_CONSONANTS).filter(ch => ch !== answer);
    // never a letter that would spell another word he has a picture for
    const safe = sameKind.filter(ch => !known[word.slice(0, pos) + ch + word.slice(pos + 1)]);
    if(safe.length < plan.step.opts - 1) continue;      // try another gap
    const options = shuffle([answer].concat(shuffle(safe).slice(0, plan.step.opts - 1)));
    return { word, pos, answer, options, vowel };
  }
  return null;                                          // no fair gap; caller re-draws
}

function wfillRender(api, level){
  const plan = wfillPlan(level);
  let r = null, tries = 0;
  while(!r && tries++ < 30){
    const word = wfillNextWord(plan.len);
    if(!word) return;
    r = wfillBuild(word, plan);
  }
  if(!r) return;

  const st = api.stage;
  st.appendChild(el("div","prompt-line","Finish the word"));

  /* The picture, and under it the word with its gap. Both stay up the whole
     round — see the header: the picture is what says which word this is. */
  const pic = pictureForWord(r.word);
  const shot = el("div","wfillshot");
  if(pic.type === "img"){ const i = el("img"); i.src = pic.url; shot.appendChild(i); }
  else shot.appendChild(el("div","em", pic.em));
  st.appendChild(shot);

  const px = r.word.length > 6 ? 46 : (r.word.length > 4 ? 56 : 66);
  const row = el("div","seq wfillword");
  let slot = null;
  r.word.split("").forEach((ch, i)=>{
    if(i === r.pos){
      slot = el("div","slot dropzone");
      slot.style.setProperty("--t", px + "px");
      row.appendChild(slot);
    } else {
      row.appendChild(itemNode({k:"text", text:ch, color:"var(--ink)"}, px));
    }
  });
  st.appendChild(row);

  const opts = el("div","options");
  let answerNode = null;
  r.options.forEach(ch=>{
    const wrap = el("div","opt");
    const node = itemNode({k:"text", text:ch, color:"var(--accent)"}, Math.max(px, 70));
    wrap.appendChild(node);
    if(ch === r.answer) answerNode = node;
    makeDraggable(node, (zone)=>{
      if(!zone) return;
      if(ch === r.answer){
        slot.classList.add("done");
        slot.dataset.full = "1";
        slot.innerHTML = "";
        slot.appendChild(itemNode({k:"text", text:ch, color:"var(--good)"}, px));
        opts.querySelectorAll(".opt").forEach(o=>o.classList.add("gone"));
        /* Finishing the word shows him the thing. The small picture above the
           gap is the QUESTION — which word is this — and it is too small and
           too incidental to be the answer to anything; without this, spelling
           BUS ended with a green letter and then the next round, and nothing
           ever said "yes, that was a bus". pinReward makes the reward the word
           he just spelled rather than a stranger from the bag, and
           rewardEveryRound below brings it up on this round instead of three
           rounds later, when he would no longer know which word earned it. */
        pinReward(r.word);
        api.solved(r.vowel ? "vowel" : "consonant");
      } else {
        const attempts = api.miss();
        if(attempts >= S.dimAfter){
          opts.querySelectorAll(".opt").forEach(o=>{
            if(o.firstChild._item.text !== r.answer) o.classList.add("dim");
          });
        }
        if(attempts >= S.showAfter) slot.classList.add("near");
      }
    });
    opts.appendChild(wrap);
  });
  st.appendChild(opts);
  api.hint(answerNode);
}

const WORDFILL = {
  id: "wordfill",
  name: "FINISH THE WORD",
  icon: "🔠✏️",
  /* See pinReward() above: the payoff for finishing a word is being shown the
     thing it names, big, with the whole spelling — so the reward is due on the
     round he earned it, not after a block of them. */
  rewardEveryRound: true,
  maxLevel: ()=> WFILL_LEVELS.length,
  levelLabel: (level)=>{
    const p = wfillPlan(level);
    const where = { start:"first letter", end:"last letter", mid:"middle letter" }[p.step.at];
    return p.len + " letters · " + where + " · " + p.step.opts;
  },
  settingsHint: (level)=>{
    const p = wfillPlan(level);
    const where = { start:"first", end:"last", mid:"middle" }[p.step.at];
    return "He sees a photograph and its word with the " + where + " letter missing, and drags the " +
           "right one in from " + p.step.opts + " choices (" + p.len + "-letter words, " +
           wordsOfLength(p.len).length + " of them). The gap moves first letter, then last, then " +
           "middle — the order children pick sounds up in. The wrong choices are always the same " +
           "kind as the right one, vowels against a vowel, so \"pick the only vowel\" never answers it. " +
           "Finishing a word shows him a big photograph of the thing and its whole spelling.";
  },

  startRound(level, api){ wfillRender(api, level); }
};
