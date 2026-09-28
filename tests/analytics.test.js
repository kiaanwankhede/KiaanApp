/* The Progress panel's trend half.
 *
 * activityStats() answers "where is he". This is the other question, and the
 * one a parent is actually asking: is any of it moving? Neither the standing
 * picture nor the session log can show that — the log is one row per sitting,
 * and a fortnight's shape is not something you can see in it by eye.
 *
 * So the figures are checked against a session log built to a known shape:
 * a game that climbed this week, one that hasn't been touched in a fortnight,
 * and one never played at all. Each of those is a different thing for a parent
 * to do, and saying the wrong one is worse than saying nothing.
 */
const { bootApp, Runner } = require("./_harness");

const R = new Runner("analytics");
const check = (c, m) => R.check(c, m);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DAY = 86400000;
const ago = (d) => new Date(Date.now() - d * DAY).toISOString();
const sit = (kind, daysAgo, level, correct, firstTry, secs) =>
  ({ at: ago(daysAgo), kind, level, correct, misses: 0, prompts: 0, firstTry, secs });

/* This week: 3 sittings, 30 rounds, 15 alone, 600s. The week before: 2
   sittings, 20 rounds, 10 alone, 300s. So sittings up 50%, time up 100%,
   rounds up 50%, and the share answered alone identical at 50% — one figure
   deliberately flat, because "everything is up" would pass a report that just
   prints arrows. */
const SESSIONS = [
  // two sittings in the PREVIOUS week
  sit("pattern", 9, 3, 10, 5, 150),
  sit("pattern", 10, 3, 10, 5, 150),
  // three this week, climbing 4 -> 7
  sit("pattern", 3, 4, 10, 5, 200),
  sit("pattern", 2, 6, 10, 5, 200),
  sit("pattern", 1, 7, 10, 5, 200),
  // a game not touched in a fortnight
  sit("sort", 14, 5, 8, 4, 120),
];

const { window, errors } = bootApp({
  localStorage: {
    settings: { gate: "246" },
    progress: {
      sessions: SESSIONS,
      perLevel: { "pattern:7": { n: 1, indep: 1, hits: 0, seen: 6 } },
      best: { pattern: 7, sort: 5 },
      tagStats: {},
    },
  },
});
const doc = window.document;
const $ = (s) => doc.querySelector(s);

(async () => {
  await sleep(150);

  // in through the real gate, so this checks what a parent actually sees
  const realST = window.setTimeout.bind(window);
  window.setTimeout = (fn, ms, ...rest) => realST(fn, Math.min(ms || 0, 5), ...rest);
  $("#gear").dispatchEvent(new window.Event("pointerdown", { bubbles: true }));
  await sleep(40);
  "246".split("").forEach((d) => {
    const k = Array.from(doc.querySelectorAll("#gateKeys button")).find((b) => b.textContent === d);
    k.dispatchEvent(new window.Event("click", { bubbles: true }));
  });
  await sleep(60);
  check($("#settings").classList.contains("on"), "the settings panel opened");

  const body = $("#setBody").textContent.replace(/\s+/g, " ");

  /* ---- this week, against last week ---- */
  check(/THIS WEEK/.test(body), "the panel leads with this week rather than a standing total");
  check(/Sittings3 · up 50% on last week|Sittings\s*3\s*· up 50% on last week/.test($("#setBody").textContent.replace(/\n/g, "")),
    "three sittings this week, up 50% on the two before");
  check(/up 100% on last week/.test(body), `time doubled (10 minutes against 5)`);
  check(/Answered alone.*?50%.*?same as last week/.test(body),
    "the share answered alone is reported flat rather than dressed as movement");
  check(!/up 0%|down 0%/.test(body), "an unchanged figure says 'same', not 'up 0%'");

  /* ---- what each game is doing ---- */
  check(/up 3 levels this week/.test(body),
    "a game that climbed 4 to 7 says so — the thing a parent most wants to know");
  check(/not played for 1[34] days/.test(body),
    `a game left alone for a fortnight says so (${(body.match(/not played for \d+ days/) || ["—"])[0]})`);
  /* Games he has never opened share ONE line. Ten of them with a row, a meter
     and a note each is thirty lines of the same nothing, and it pushes the
     games he is actually playing off the screen. */
  check(/Never played/.test(body), "games he has never opened are accounted for");
  check((body.match(/Never played/g) || []).length === 1,
    "on one shared line rather than one block each");
  check(/ORDER/.test(body) && /HOW MANY|COUNT/.test(body),
    "and that line names them, so it is still an answer and not just a count");

  /* Absence has to outrank level talk: a game nobody has touched cannot be
     "same level this week", and saying so would hide the only fact about it
     that a parent can act on. */
  const sortLine = body.slice(body.indexOf("SORTING"), body.indexOf("SORTING") + 160);
  check(!/same level this week/.test(sortLine),
    `an untouched game is not described by its level (\"${sortLine.slice(0, 60)}…\")`);

  /* ---- the meters ---- */
  const meters = Array.from(doc.querySelectorAll("#setBody .meter"));
  check(meters.length > 0, `each graded game gets a meter of where it is on its own ladder (${meters.length})`);
  check(meters.every((m) => m.querySelector("i")), "every meter has a fill");
  const widths = meters.map((m) => parseFloat(m.querySelector("i").style.width));
  check(widths.every((w) => w >= 2 && w <= 100), `no meter draws outside its track (${Math.min(...widths)}–${Math.max(...widths)}%)`);
  /* The bar must draw the level printed beside it. Note that is Level 5, not
     the 7 he reached: a launch picks up two below his best, and a meter drawn
     from the best rather than from where he actually is would quietly flatter
     every game on this screen. */
  /* Read it off the row rather than the flattened text: the two halves of a
     .stat row sit at opposite ends of the line, so in textContent "L5/40" runs
     straight into the "0 here" that follows and would parse as L5/400. */
  const firstRow = Array.from(doc.querySelectorAll("#setBody .stat"))
    .find((x) => /^PATTERNS/.test(x.firstChild.textContent));
  const first = firstRow && firstRow.firstChild.textContent.match(/L(\d+)\/(\d+)/);
  check(!!first, "each row prints the level the meter draws");
  const want = Math.max(2, Math.round((Number(first[1]) / Number(first[2])) * 100));
  check(Math.abs(widths[0] - want) < 1,
    `the first meter draws the level written beside it, L${first[1]}/${first[2]} = ${want}% (got ${widths[0]}%)`);
  check(Number(first[1]) === 5,
    `and that is where a launch actually picks him up, two below his best of 7 (got ${first[1]})`);

  /* ---- the breakdown cannot swamp the panel ----
     Word find tags every word it has ever shown and Trace every stroke by
     name, so uncapped this one loop puts the better part of two hundred rows
     between a parent and everything above it. */
  const many = {};
  for (let i = 0; i < 40; i++) many["word" + i] = { n: 10, indep: i < 3 ? 1 : 9 };
  window.localStorage.setItem("lr_state_v1", JSON.stringify({
    settings: { gate: "246" },
    progress: { sessions: SESSIONS, perLevel: {}, best: { pattern: 7 }, tagStats: { wordfind: many } },
  }));
  const second = bootApp({
    localStorage: {
      settings: { gate: "246" },
      progress: { sessions: SESSIONS, perLevel: {}, best: { pattern: 7 }, tagStats: { wordfind: many } },
    },
  });
  await sleep(150);
  const d2 = second.window.document;
  const st2 = second.window.setTimeout.bind(second.window);
  second.window.setTimeout = (fn, ms, ...rest) => st2(fn, Math.min(ms || 0, 5), ...rest);
  d2.querySelector("#gear").dispatchEvent(new second.window.Event("pointerdown", { bubbles: true }));
  await sleep(40);
  "246".split("").forEach((c) => {
    const k = Array.from(d2.querySelectorAll("#gateKeys button")).find((b) => b.textContent === c);
    k.dispatchEvent(new second.window.Event("click", { bubbles: true }));
  });
  await sleep(60);
  const body2 = d2.querySelector("#setBody").textContent;
  const wordRows = (body2.match(/Word\d+/g) || []).length;
  check(wordRows > 0 && wordRows <= 6, `40 tagged words render as at most six rows (${wordRows})`);
  check(/\+ 34 more/.test(body2), "and the rest are counted rather than listed");
  check(/Word0|Word1|Word2/.test(body2),
    "the ones he gets wrong are the ones shown — weakest first is the only ordering worth reading");
  errors.push(...second.errors);

  R.finish(errors);
})();
