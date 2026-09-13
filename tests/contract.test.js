/* THE IMPORTANT ONE.
 *
 * Builds the app with an extra throwaway activity written only against the
 * documented contract in src/50-session.js, and checks it inherits everything
 * from the shell — home card, level stepper, session, reward tokens, settings
 * rows — with no change anywhere else. If this fails, adding activity number
 * fifty has stopped being cheap. */
const fs = require("fs");
const path = require("path");
const { bootApp, Runner, registeredActivities } = require("./_harness");
const build = require("../tools/build");
const REGISTERED = registeredActivities().length;

const R = new Runner("contract");
const check = (c, m) => R.check(c, m);

/* A minimal activity: "which one did you just see?" */
const FAKE = `
const FAKE_ACTIVITY = {
  id: "fake",
  name: "MEMORY",
  icon: "🧠",
  maxLevel: () => 4,
  levelLabel: (lv) => (lv + 1) + " to choose from",
  settingsHint: (lv) => "Remember one picture, then find it among " + (lv + 1) + ".",
  startRound(level, api){
    const pool = shuffle(Object.keys(COLORS)).slice(0, level + 1)
      .map(c => ({k:"shape", shape:"circle", color:c}));
    const target = pool[0];
    api.stage.appendChild(el("div","prompt-line","Which one did you see?"));
    const row = el("div","options");
    let hit = null;
    shuffle(pool).forEach(it=>{
      const wrap = el("div","opt");
      const node = itemNode(it, 74);
      wrap.appendChild(node);
      if(itemKey(it) === itemKey(target)) hit = node;
      makeDraggable(node, (zone)=>{
        if(!zone) return;
        if(itemKey(it) === itemKey(target)) api.solved(it.color); else api.miss();
      });
      row.appendChild(wrap);
    });
    api.stage.appendChild(row);
    api.hint(hit);
  }
};
`;

// Splice the fake activity in exactly the way a real one would be added:
// a file in src/activities/, plus a line in the registry.
const tmp = path.join(build.SRC, "activities", "__contract_fake.js");
fs.writeFileSync(tmp, FAKE);
let html;
try {
  build.ACTIVITY_FILES.push("activities/__contract_fake.js");
  // append to whatever the registry currently lists, so this keeps working as
  // activities are added rather than needing an edit each time
  html = build.buildBody().replace(
    /const ACTIVITIES\s*=\s*\[([^\]]*)\];/,
    "const ACTIVITIES = [$1, FAKE_ACTIVITY ];"
  );
} finally {
  fs.unlinkSync(tmp);
}

const { window, errors } = bootApp({ html });
const doc = window.document;
const $ = (s) => doc.querySelector(s);
const click = (el) => el.dispatchEvent(new window.Event("click", { bubbles: true }));

setTimeout(() => {
  // a home card, with no markup written for it
  check(doc.querySelectorAll(".card").length === REGISTERED + 1,
    "one more home card appears purely from the registry");
  check(!!$("#card-fake"), "the new activity gets its own card");
  check(/MEMORY/.test($("#card-fake").textContent), "the card shows the activity's name");
  check(/2 to choose from/.test($("#lv-fake").textContent), "the card shows the activity's own level label");
  check(/Level 1\/4/.test($("#lv-fake").textContent), "the shell adds the counter from the activity's maxLevel");

  // the stepper drives it with no per-activity wiring
  click(doc.querySelector('.lvbtn[data-kind="fake"][data-dir="1"]'));
  check(/3 to choose from/.test($("#lv-fake").textContent), "the +/- stepper drives the new activity too");
  click(doc.querySelector('.lvbtn[data-kind="fake"][data-dir="-1"]'));

  // it plays, using the shared drag/render vocabulary and the reward strip
  click(doc.querySelector('.playbtn[data-kind="fake"]'));
  check($("#play").classList.contains("on"), "the new activity starts a session");
  check(/Which one did you see/.test($("#stage").textContent), "its round drew into the shared stage");
  check($("#tokens").children.length > 0, "it inherits the reward token strip");
  check(doc.querySelectorAll("#stage .opt").length === 2, "level 1 offered the 2 choices the activity defined");

  // and Settings grew rows for it
  click($("#back"));
  $("#gear").dispatchEvent(new window.Event("pointerdown", { bubbles: true }));
  setTimeout(() => {
    ["1", "3", "5"].forEach((d) =>
      click(Array.from(doc.querySelectorAll("#gateKeys button")).find((b) => b.textContent === d)));
    setTimeout(() => {
      const body = $("#setBody").textContent;
      check(/Memory/.test(body), "Settings grew an on/off row for the new activity");
      check(/Remember one picture/.test(body), "Settings shows the activity's own hint");
      R.finish(errors);
    }, 60);
  }, 1300);
}, 150);
