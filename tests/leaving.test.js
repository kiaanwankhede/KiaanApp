/* Leaving in the middle of things.
 *
 * A parent taps back whenever they need to — including the half second between
 * a right answer and whatever the shell had queued to happen next, and while a
 * finger is still holding a tile. Everything deferred from a round therefore
 * has to check it is still wanted (sessionGuard() in src/50-session.js).
 *
 * Both cases here were real, found by driving the page in a browser:
 *
 *   - Tapping back the instant a Word find round solved put the REWARD screen
 *     up over the "N right today" screen half a second later, overriding the
 *     parent's own tap. Word find rewards every round, so that window was open
 *     on every single round of it.
 *   - Letting go of a dragged tile after going home threw outright — "Cannot
 *     set properties of null (setting 'attempts')" — because the drop still
 *     called into the api and the session was gone.
 */
const { bootApp, Runner } = require("./_harness");

const R = new Runner("leaving");
const check = (c, m) => R.check(c, m);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function boot() {
  const { window, errors } = bootApp({
    localStorage: { settings: { assistedMode: false }, progress: { sessions: [], perLevel: {}, best: {} } },
  });
  return { window, errors };
}
const click = (win, el) => el.dispatchEvent(new win.Event("click", { bubbles: true }));
function ptr(win, type, x, y) {
  const e = new win.Event(type, { bubbles: true, cancelable: true });
  e.pointerId = 1; e.clientX = x; e.clientY = y;
  return e;
}
const saved = (win) => {
  try { return JSON.parse(win.localStorage.getItem("lr_state_v1") || "null") || {}; }
  catch (e) { return {}; }
};

(async () => {
  /* ---- 1. back the moment a Word find round solves ---- */
  {
    const { window, errors } = boot();
    const doc = window.document;
    await sleep(150);
    click(window, doc.querySelector('.playbtn[data-kind="wordfind"]'));

    const grid = doc.querySelector("#stage .wfgrid");
    const cols = Number(grid.style.getPropertyValue("--wf-cols"));
    const cells = Array.from(grid.children);
    const rows = cells.length / cols;
    const word = Array.from(doc.querySelectorAll("#stage .wfspell span")).map((s) => s.textContent).join("");
    grid.getBoundingClientRect = () => ({ left: 0, top: 0, width: cols * 10, height: rows * 10, right: cols * 10, bottom: rows * 10, x: 0, y: 0 });
    const at = (r, c) => cells[r * cols + c].textContent;
    let a = null;
    for (let r = 0; r < rows && !a; r++) for (let c = 0; c + word.length <= cols && !a; c++)
      if (Array.from({ length: word.length }, (_, i) => at(r, c + i)).join("") === word) a = [{ r, c }, { r, c: c + word.length - 1 }];
    for (let c = 0; c < cols && !a; c++) for (let r = 0; r + word.length <= rows && !a; r++)
      if (Array.from({ length: word.length }, (_, i) => at(r + i, c)).join("") === word) a = [{ r, c }, { r: r + word.length - 1, c }];
    check(!!a, `the word is on the board (${word})`);

    const send = (type, p) => grid.dispatchEvent(ptr(window, type, p.c * 10 + 5, p.r * 10 + 5));
    send("pointerdown", a[0]); send("pointermove", a[1]); send("pointerup", a[1]);
    check(doc.querySelectorAll("#stage .wfcell.won").length === word.length, "he found it");
    check(doc.querySelectorAll("#tokens .tok.full").length === 1, "and it counted");

    click(window, doc.querySelector("#back"));            // ...and back, at once
    check(doc.querySelector("#done").classList.contains("on"), "back shows the done screen, since he got one right");

    await sleep(900);                                     // the reward was queued 500ms out
    check(doc.querySelector("#done").classList.contains("on"),
      "and the done screen is STILL up — the queued reward must not override the parent's own tap");
    check(!doc.querySelector("#reward").classList.contains("on"),
      "the reward screen never takes over a session that has been ended");
    check(errors.length === 0, "and nothing threw on the way (" + errors.join(" | ") + ")");
  }

  /* ---- 2. a drop that lands after the parent has gone home ---- */
  {
    const { window, errors } = boot();
    const doc = window.document;
    await sleep(150);
    click(window, doc.querySelector('.playbtn[data-kind="nine"]'));

    const tile = Array.from(doc.querySelectorAll("#stage .tray .opt .tile")).find((t) => t._item.correct);
    const zone = doc.querySelector("#stage .numslot.dropzone");
    check(!!tile && !!zone, "a creature to drag and a slot to drag it to");

    /* jsdom does no layout, and after going home the play screen is display:none
       anyway — which is exactly the real case: every zone then measures as
       nothing at the origin, so a finger that lets go near the corner of the
       screen still finds one. */
    zone.__rect = { left: 0, top: 0, width: 60, height: 60 };
    window.Element.prototype.getBoundingClientRect = function () {
      const r = this.__rect || { left: 0, top: 0, width: 0, height: 0 };
      return Object.assign({}, r, { right: r.left + r.width, bottom: r.top + r.height, x: r.left, y: r.top });
    };

    tile.dispatchEvent(ptr(window, "pointerdown", 0, 0));
    tile.dispatchEvent(ptr(window, "pointermove", 30, 30));
    click(window, doc.querySelector("#back"));            // nothing right yet, so straight home
    check(doc.querySelector("#home").classList.contains("on"), "back with nothing scored goes straight home");

    tile.dispatchEvent(ptr(window, "pointerup", 30, 30)); // the finger finally lifts
    await sleep(300);
    check(errors.length === 0, "letting go after going home is a no-op, not a crash (" + errors.join(" | ") + ")");
    check(doc.querySelector("#home").classList.contains("on"), "and it leaves him on the home screen");
    const p = saved(window).progress || {};
    check(!Object.keys(p.perLevel || {}).some((k) => k.indexOf("nine:") === 0),
      "a drop that lands after the session ended scores nothing");

    R.finish(errors);
  }
})();
