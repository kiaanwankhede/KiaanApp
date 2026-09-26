/* The built page in a browser: it boots, both activities play, the parent gate
   works, a launch picks up below his best, and the tablet lockdown behaves. */
const { bootApp, Runner, registeredActivities } = require("./_harness");
const R = new Runner("app");
const check = (c, m) => R.check(c, m);

const { window, errors, spies } = bootApp({
  // a previous sitting that had climbed to pattern 12 / sort 4, and a best of
  // 12 / 4 recorded by auto-advance along the way
  localStorage: {
    settings: { levels: { pattern: 12, sort: 4 }, autoAdvance: true, itemsPerSession: 10 },
    progress: {
      sessions: [], perLevel: { "pattern:12": { n: 9, indep: 9, hits: 1 } },
      best: { pattern: 12, sort: 4 },
    },
  },
});
const doc = window.document;
const $ = (s) => doc.querySelector(s);
const click = (el) => el.dispatchEvent(new window.Event("click", { bubbles: true }));
const back = () => window.dispatchEvent(new window.PopStateEvent("popstate", { state: null }));

setTimeout(() => {
  // ---- boot ----
  check($("#home").classList.contains("on"), "boots to the home screen");
  check(doc.querySelectorAll(".card").length === registeredActivities().length,
    "every registered activity has a home card");

  /* ...and every one of them can actually be reached. Nine cards plus the
     section and date headings are taller than a tablet, and the home screen is
     absolutely positioned inside body{overflow:hidden}: before it was made a
     scroller the overflow was clipped away, and four of the nine games could
     not be started at all on a 768x1024 screen. jsdom does no layout, so what
     is checked here is the structure that makes scrolling possible — the real
     measurement was done in a browser. */
  const scroller = $("#homeScroll");
  check(!!scroller, "the home screen has an inner scrolling wrapper");
  check(!!scroller && scroller.contains($("#homeCards")),
    "the cards live inside it, so a list too tall for the screen can be scrolled to");
  check(!!$("#gear") && !scroller.contains($("#gear")),
    "the settings gear stays outside it, so it keeps its corner instead of scrolling away");
  const css = doc.querySelector("style") ? doc.querySelector("style").textContent : "";
  const homeRule = (css.match(/#home\{([^}]*)\}/) || [])[1] || "";
  check(/overflow-y:\s*auto/.test(homeRule),
    "and #home is a scroll container rather than clipping what doesn't fit (got \"" + homeRule + "\")");
  check(!/justify-content:\s*center/.test(homeRule),
    "not centred while overflowing either — centring an overflowing column puts its top out of reach too");

  /* ---- the tile IS the button, and the parent's controls are outside it ----
     There used to be a PLAY pill inside each card, so his one decision competed
     with four other things in the same box and the real target was the smallest
     of them. The whole tile is now what he taps, which only stays true if
     nothing else tappable lives inside it: a stepper in there would mean a tap
     near "+" does nothing when he meant to start the game. */
  const tile = $("#card-pattern");
  check(tile && tile.tagName === "BUTTON", "a home card is itself the button that starts the game");
  check(tile && tile.querySelectorAll("button").length === 0,
    "with nothing else tappable inside it, so every part of the tile starts the game");
  const cell = tile && tile.closest(".cardcell");
  check(!!cell && !!cell.querySelector(".lvrow") && !tile.querySelector(".lvrow"),
    "the parent's level control sits beside the tile, not inside it");
  /* A soft colour per game, because nine white boxes differing only by emoji is
     the weakest identifier there is for someone who can't read the names.
     Checked as "mostly distinct" rather than "all nine present": an activity
     added without a line in CARD_TINTS falls back to a plain tile and works,
     which is what keeps adding one to the three one-line changes CLAUDE.md
     promises. What this catches is the tints being dropped or collapsed. */
  const cards = Array.from(doc.querySelectorAll(".card"));
  const tints = new Set(cards.map((c) => c.style.getPropertyValue("--tint")).filter(Boolean));
  check(tints.size >= cards.length - 1,
    `the games are told apart by colour, not just by name (${tints.size} distinct tints across ${cards.length} cards)`);

  // ---- a launch picks up two below his best, not where he left off ----
  check($("#lv-pattern").textContent.includes("Level 10/"),
    "Patterns starts two below its best of 12, not at the 12 he was mid-climb on");
  check($("#lv-sort").textContent.includes("Level 2/"), "Sorting starts two below its best of 4");

  // ---- level stepper ----
  const before = $("#lv-pattern").textContent;
  click(doc.querySelector('.lvbtn[data-kind="pattern"][data-dir="1"]'));
  check($("#lv-pattern").textContent !== before, "the + stepper changes the level shown");
  click(doc.querySelector('.lvbtn[data-kind="pattern"][data-dir="-1"]'));

  check(!!$("#assistToggleHome .sw"), "the assisted-mode toggle renders on the home screen");

  // ---- Patterns plays ----
  click(doc.querySelector('.playbtn[data-kind="pattern"]'));
  check($("#play").classList.contains("on"), "Patterns starts a session");
  check(!!$("#stage .seq"), "a pattern sequence strip is drawn");
  check(!!$("#stage .options .opt"), "pattern answer options are drawn");
  check($("#tokens").children.length > 0, "the reward token strip is drawn");
  check(spies.fullscreen === 1, "tapping PLAY requests fullscreen, hiding the browser furniture");
  check(spies.wakeLock >= 1, "tapping PLAY takes a screen wake lock");

  // ---- back gesture stays inside the app ----
  back();
  check(!$("#play").classList.contains("on"), "the back gesture leaves the play screen");
  check(window.location.href.startsWith("https://example.com/"), "the back gesture does not navigate away");
  back();
  check($("#home").classList.contains("on"), "back is re-armed, so repeated presses stay in the app");

  // ---- Sorting plays ----
  click(doc.querySelector('.playbtn[data-kind="sort"]'));
  check(!!$("#stage .bins .bin"), "sorting bins are drawn");
  check(!!$("#stage .tray .opt"), "sorting tray items are drawn");
  click($("#back"));

  // ---- parent gate ----
  $("#gear").dispatchEvent(new window.Event("pointerdown", { bubbles: true }));
  setTimeout(() => {
    ["1", "3", "5"].forEach((d) =>
      click(Array.from(doc.querySelectorAll("#gateKeys button")).find((b) => b.textContent === d)));
    setTimeout(() => {
      check($("#settings").classList.contains("on"), "the settings panel opens after the passcode");
      const body = $("#setBody").textContent;
      check(doc.querySelectorAll("#setBody .sgroup").length >= 5, "settings groups render");
      check(/Guided Access/.test(body), "settings explains Guided Access / app pinning");
      check(/Add to Home screen/i.test(body), "settings explains Add to Home screen");
      back();
      check($("#home").classList.contains("on"), "back from settings returns home");
      R.finish(errors);
    }, 60);
  }, 1300);
}, 150);
