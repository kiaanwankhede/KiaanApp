/* The escalating help, across every game that uses the slot-and-options shape.
 *
 * CLAUDE.md states the rule once, for all of them: "After S.dimAfter wrong
 * tries the wrong options dim; after S.showAfter the right one is
 * highlighted." Nothing tested it, and four of the seven games were instead
 * highlighting the empty SLOT — which tells him nothing he doesn't know. He
 * can see the gap; what he is stuck on is which piece goes in it. It also
 * reused `.near`, the class the drag engine puts on whichever zone your finger
 * is over, so the strongest help the app offers looked exactly like "you are
 * hovering here".
 *
 * This is the kind of drift that only shows up when the rule is checked in one
 * place for every game at once, which is why it is checked here rather than in
 * seven separate suites.
 */
const fs = require("fs");
const path = require("path");
const { bootApp, Runner, ROOT } = require("./_harness");

const R = new Runner("help");
const check = (c, m) => R.check(c, m);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Every activity whose round is "one space, some things to choose from". A new
   one of that shape belongs here; a game with its own gesture (a sweep, a
   traced line, bins) does not, and has its own suite. */
const GAMES = ["pattern", "count", "match", "odd", "where", "wordfill", "fit"];
const DIM_AFTER = 2, SHOW_AFTER = 3;

const base = fs.readFileSync(path.join(ROOT, "dist", "app.html"), "utf8");
const HOOK = `
const __realShowHint = showHint;
showHint = function(t){ window.__hintTarget = t; return __realShowHint(t); };
window.__tns = { get sess(){ return sess; } };
`;
const html = base.replace(/\n\n\}\)\(\);\n<\/script>\n?$/, "\n" + HOOK + "\n})();\n</script>\n");
check(html !== base, "the test hook spliced into the built page");

const { window, errors } = bootApp({
  html,
  localStorage: {
    settings: { assistedMode: false, dimAfter: DIM_AFTER, showAfter: SHOW_AFTER, rewardEvery: 99 },
    progress: { sessions: [], perLevel: {}, best: {} },
  },
});
const doc = window.document;
const $ = (s) => doc.querySelector(s);
const click = (el) => el.dispatchEvent(new window.Event("click", { bubbles: true }));
window.Element.prototype.getBoundingClientRect = function () {
  const r = this.__rect || { left: 0, top: 0, width: 60, height: 60 };
  return Object.assign({}, r, { right: r.left + r.width, bottom: r.top + r.height, x: r.left, y: r.top });
};
function ptr(type, x, y) {
  const e = new window.Event(type, { bubbles: true, cancelable: true });
  e.pointerId = 1; e.clientX = x; e.clientY = y;
  return e;
}
function dropOn(node, zone) {
  const zones = Array.from(doc.querySelectorAll(".dropzone"));
  zones.forEach((z, i) => { z.__rect = { left: i * 1000, top: 0, width: 60, height: 60 }; });
  const x = zones.indexOf(zone) * 1000 + 30;
  node.dispatchEvent(ptr("pointerdown", 0, 0));
  node.dispatchEvent(ptr("pointermove", x, 30));
  node.dispatchEvent(ptr("pointerup", x, 30));
}

(async () => {
  await sleep(200);                       // the home grid is built after boot settles
  for (const kind of GAMES) {
    click(doc.querySelector(`.playbtn[data-kind="${kind}"]`));
    await sleep(80);

    const zone = $("#stage .slot.dropzone, #stage .fitgap.dropzone");
    const right = window.__hintTarget;
    const tiles = Array.from(doc.querySelectorAll("#stage .options .opt .tile"));
    const wrong = tiles.filter((t) => t !== right);
    check(!!zone && !!right && wrong.length > 0,
      `${kind}: a round with a space, a right answer and something wrong to try`);
    if (!zone || !right || !wrong.length) continue;

    // wrong tries, one at a time, checking the help arrives when it is due
    for (let i = 1; i <= SHOW_AFTER; i++) {
      dropOn(wrong[(i - 1) % wrong.length], zone);
      await sleep(8);
      const dim = doc.querySelectorAll("#stage .options .opt.dim").length;
      if (i === DIM_AFTER - 1) {
        check(dim === 0, `${kind}: nothing is dimmed before ${DIM_AFTER} tries — the gap is his chance to get there alone`);
      }
      if (i === DIM_AFTER) {
        check(dim > 0, `${kind}: the wrong ones fade after ${DIM_AFTER} tries`);
        check(!right.parentNode.classList.contains("dim"), `${kind}: and the right one never fades`);
      }
    }

    /* THE RULE: after showAfter, THE RIGHT ONE is highlighted. Not the empty
       space — he can already see that. */
    check(right.parentNode.classList.contains("pick"),
      `${kind}: after ${SHOW_AFTER} tries the right answer itself is marked`);
    check(!zone.classList.contains("near"),
      `${kind}: and the drag engine's own hover class is not borrowed to mean something else`);

    // it has to still be there while he is picking things up and putting them down
    dropOn(wrong[0], zone);
    await sleep(8);
    check(right.parentNode.classList.contains("pick"),
      `${kind}: the mark survives another try — help that vanishes mid-round is no help`);

    click($("#back"));
    await sleep(30);
    if ($("#doneHome")) click($("#doneHome"));
    await sleep(30);
  }

  R.finish(errors);
})();
