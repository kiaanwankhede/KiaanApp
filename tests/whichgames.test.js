/* Which games are on HIS screen.
 *
 * Fourteen tiles is more than a 4-year-old can choose from, so the set is
 * short — but it is also FIXED, and those two together are the whole point.
 * An automatic rule ("hide anything past level 5") would have shortened it and
 * broken the second half: levelOf() is best-minus-two at launch and mastery
 * moves it mid-sitting, so one good block would be the difference between a
 * game being on his screen and not, and a game could vanish while he played
 * it. It would also have taken away the games he is BEST at, which are the
 * ones he likes.
 *
 * So the set is the parent's, through the Settings switches that already
 * existed — and switched off now means GONE from his screen rather than
 * greyed, because a grey tile is still a thing to press that then does
 * nothing, which for someone who cannot read why is worse than no tile.
 */
const { bootApp, Runner, registeredActivities } = require("./_harness");

const R = new Runner("whichgames");
const check = (c, m) => R.check(c, m);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const OFF = ["sort", "trace", "wordfind", "sky", "nine"];   // incl. BOTH one-shots, so their headings empty out

const { window, errors } = bootApp({
  localStorage: {
    settings: {
      gate: "246",
      enabled: OFF.reduce((o, id) => { o[id] = false; return o; }, {}),
      // a best well past level 5 in a game that stays ON, which the rejected
      // rule would have hidden precisely because he is good at it
      levels: {},
    },
    progress: { sessions: [], perLevel: {}, best: { pattern: 20 } },
  },
});
const doc = window.document;
const $ = (s) => doc.querySelector(s);
const shown = (el) => !!el && window.getComputedStyle(el).display !== "none";
const cellOf = (id) => { const c = $("#card-" + id); return c && c.parentNode; };

(async () => {
  await sleep(200);

  /* ---- his screen ---- */
  check(!doc.body.classList.contains("parentmode"), "the app opens on his screen");
  OFF.forEach((id) => {
    check(!!$("#card-" + id), `${id}: the card is still built, so no grid is rebuilt when a switch flips`);
    check(!shown(cellOf(id)), `${id}: switched off, so it is not on his screen at all`);
  });
  const onIds = registeredActivities()
    .map((c) => ({ PATTERNS:"pattern", SORTING:"sort", SERIATION:"seriate", COUNTING:"count", TRACING:"trace",
                   MATCHING:"match", ODD:"odd", WHERE:"where", FIT:"fit", WORDFIND:"wordfind",
                   WORDFILL:"wordfill", SKY:"sky", NINE:"nine" }[c]))
    .filter((id) => id && OFF.indexOf(id) < 0);
  onIds.forEach((id) => check(shown(cellOf(id)), `${id}: switched on, so it is there`));
  check(onIds.length > 0 && onIds.length < registeredActivities().length,
    `a short set rather than all of them (${onIds.length} of ${registeredActivities().length})`);

  /* Being GOOD at a game must not remove it — the rejected rule's real cost.
     Patterns has a best of 20 here and is still on his screen. */
  check(shown(cellOf("pattern")),
    "a game he is far past level 5 in is still there — mastery never costs him a game");

  /* ---- headings don't stand over an empty space ---- */
  const heads = Array.from(doc.querySelectorAll("#homeCards .section-heading, #homeCards .date-heading"));
  check(heads.length > 0, "the Toondemy headings exist");
  check(heads.every((h) => !shown(h)),
    "with both of its games off, the section and date headings go too rather than standing over nothing");

  /* ---- Mix follows the same rule ---- */
  check(shown(cellOf("mix")), "Mix is there while there are games to mix");

  /* ---- flipping a switch changes his screen without leaving Settings ---- */
  const realST = window.setTimeout.bind(window);
  window.setTimeout = (fn, ms, ...rest) => realST(fn, Math.min(ms || 0, 5), ...rest);
  $("#gear").dispatchEvent(new window.Event("pointerdown", { bubbles: true }));
  await sleep(40);
  "246".split("").forEach((d) => {
    const k = Array.from(doc.querySelectorAll("#gateKeys button")).find((b) => b.textContent === d);
    k.dispatchEvent(new window.Event("click", { bubbles: true }));
  });
  await sleep(60);
  check($("#settings").classList.contains("on"), "settings opened");

  const body = $("#setBody").textContent;
  check(/on his screen/.test(body),
    `the switches say what they add up to, where the choice is made ("${(body.match(/\d+ of \d+ on his screen[^.]*/) || ["—"])[0].slice(0, 60)}")`);

  // switch Sorting back on from inside Settings
  const rows = Array.from(doc.querySelectorAll("#setBody .row"));
  const sortRow = rows.find((r) => /^Sorting$/.test((r.querySelector("label") || {}).textContent || ""));
  check(!!sortRow, "Sorting has its own switch");
  sortRow.querySelector(".sw").dispatchEvent(new window.Event("click", { bubbles: true }));
  await sleep(20);
  check(shown(cellOf("sort")),
    "flipping it on puts the tile back immediately, without waiting for a rebuild");
  check(/\d+ of \d+ on his screen/.test($("#setBody").textContent), "and the tally moved with it");

  R.finish(errors);
})();
