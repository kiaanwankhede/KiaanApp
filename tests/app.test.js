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
