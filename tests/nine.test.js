/* Nine: the tray-and-bins mechanic is Sorting's, already tested hard there
 * and driven through a full mastery cycle by progress.test.js's generic
 * harness — nine correct items dragged in, decoys missed. This only checks
 * what's actually new here: nine slots and the right item counts at every
 * level, and that the page draws exactly what buildNine describes. */
const { pureContext, bootApp, Runner } = require("./_harness");
const T = pureContext(["activities/nine.js"], ["NINE_N", "NINE_THEMES", "NINE_LEVELS", "nineEntry", "buildNine"]);

const R = new Runner("nine");
const check = (c, m) => R.check(c, m);

check(T.NINE_N === 9, "nine slots, matching the lesson's own number");
check(T.NINE_LEVELS.length === 4, "two themes, each plain then with decoys — nothing padded on top");

Object.keys(T.NINE_THEMES).forEach((k) => {
  const t = T.NINE_THEMES[k];
  check(t.ch !== t.decoy, `${k}: the decoy is a different creature from the real one`);
});

for (let lv = 1; lv <= T.NINE_LEVELS.length; lv++) {
  const e = T.nineEntry(lv);
  check(!!T.NINE_THEMES[e.theme], `level ${lv} (${e.name}): names a real theme`);
  for (let t = 0; t < 50; t++) {
    const r = T.buildNine(lv);
    const correct = r.items.filter((it) => it.correct);
    const wrong = r.items.filter((it) => !it.correct);
    check(correct.length === T.NINE_N, `L${lv} ${e.name}: nine correct items to place`);
    check(wrong.length === e.decoys, `L${lv} ${e.name}: exactly ${e.decoys} decoys, as the level says`);
    check(correct.every((it) => it.ch === r.theme.ch), `L${lv} ${e.name}: every correct item is the theme's own creature`);
    check(wrong.every((it) => it.ch === r.theme.decoy), `L${lv} ${e.name}: every decoy is the theme's own decoy`);
  }
}

/* ---- the page ---- */
const { window, errors } = bootApp();
const doc = window.document;
const $ = (s) => doc.querySelector(s);
const click = (el) => el.dispatchEvent(new window.Event("click", { bubbles: true }));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  await sleep(150);
  check(!!$("#card-nine") && /Revision of number 9/.test($("#card-nine").textContent), "Nine gets its own home card");
  check(/Toondemy Games/.test(doc.querySelector(".section-heading").textContent), "sits in the Toondemy Games section");

  click(doc.querySelector('.playbtn[data-kind="nine"]'));
  check(doc.querySelectorAll("#stage .bin.dropzone").length === 9, "nine empty slots are drawn");
  check(/9/.test($("#stage .seq").textContent), "the number 9 is shown as a still badge, not read aloud");
  check(doc.querySelectorAll("#stage .tray .opt").length === 9, "level 1 (no decoys): the tray holds exactly the nine needed");

  R.finish(errors);
})();
