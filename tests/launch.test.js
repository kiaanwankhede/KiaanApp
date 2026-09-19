/* What a fresh launch picks up.
 *
 * Two rules live here, both of which only show themselves on the SECOND visit,
 * which is exactly the kind of thing that goes unnoticed until it's wrong:
 *
 *   - he starts two levels below his best, not at Level 1 and not at whatever
 *     level he happened to be mid-climb on when the tablet was closed
 *   - a confirmation block is 5 answers, and an existing save that still holds
 *     the old default of 10 is moved to 5 once — while a block size a parent
 *     chose themselves is left alone
 */
const { bootApp, Runner } = require("./_harness");

const R = new Runner("launch");
const check = (c, m) => R.check(c, m);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Boot with a given save file, then read what the home screen offers and what
   a started session shows in its star readout. */
async function launch(settings, progress) {
  const { window, errors } = bootApp({
    localStorage: { settings: settings || {}, progress: progress || { sessions: [], perLevel: {} } },
  });
  await sleep(150);
  const doc = window.document;
  const card = doc.querySelector("#lv-pattern").textContent;
  doc.querySelector('.playbtn[data-kind="pattern"]').dispatchEvent(new window.Event("click", { bubbles: true }));
  await sleep(60);
  return {
    errors,
    card,
    level: Number((card.match(/Level (\d+)/) || [])[1]),
    stars: doc.querySelectorAll("#lvWatermark .lvw-star").length,
  };
}

(async () => {
  const errs = [];

  // ---- where he starts ----
  let r = await launch({}, { sessions: [], perLevel: {} });
  errs.push(...r.errors);
  check(r.level === 1, `a first-ever launch starts at Level 1 (got ${r.level})`);

  r = await launch({}, { sessions: [], perLevel: {}, best: { pattern: 7 } });
  errs.push(...r.errors);
  check(r.level === 5, `a best of 7 picks up at Level 5, two below (got ${r.level})`);

  r = await launch({}, { sessions: [], perLevel: {}, best: { pattern: 2 } });
  errs.push(...r.errors);
  check(r.level === 1, `a best of 2 floors at Level 1 rather than 0 (got ${r.level})`);

  // the level he was mid-climb on is NOT where he resumes — only his best counts
  r = await launch({ levels: { pattern: 20 } }, { sessions: [], perLevel: {}, best: { pattern: 7 } });
  errs.push(...r.errors);
  check(r.level === 5, `a saved mid-climb level of 20 is ignored in favour of best-2 (got ${r.level})`);

  // ---- how big a block is ----
  r = await launch({ itemsPerSession: 10 }, null);            // an old save, no rev
  errs.push(...r.errors);
  check(r.stars === 5, `an old save still on 10 answers a block is moved to 5 (got ${r.stars} stars)`);

  r = await launch({ itemsPerSession: 8 }, null);             // a parent's own choice
  errs.push(...r.errors);
  check(r.stars === 8, `a block size a parent chose is left alone (got ${r.stars} stars)`);

  r = await launch({ itemsPerSession: 10, rev: 2 }, null);    // already migrated, then set back to 10 on purpose
  errs.push(...r.errors);
  check(r.stars === 10, `10 chosen deliberately after the move stays at 10 (got ${r.stars} stars)`);

  r = await launch({}, null);                                  // a brand-new save
  errs.push(...r.errors);
  check(r.stars === 5, `a fresh install gets 5 answers a block (got ${r.stars} stars)`);

  R.finish(errs);
})();
