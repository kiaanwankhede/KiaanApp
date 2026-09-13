# Think & Sort

A reward-based logical-reasoning practice app for Kiaan, a 4-year-old. Three
activities so far — Patterns, Sorting and Order — built as **one offline HTML
file** that runs from a tablet with no network, no install and no dependencies.

```
npm install     # jsdom, for the tests
npm run build   # src/ -> dist/{app,think-and-sort,index}.html + manifest + sw.js
npm test        # rebuilds, then runs every suite
```

`dist/think-and-sort.html` is the single self-contained offline file — copy it
straight to a tablet, no network ever required, no external references of any
kind. `dist/app.html` is the same page without the document skeleton (what the
tests boot, and what an Artifact would host).

`dist/index.html` + `dist/manifest.webmanifest` + `dist/sw.js` + `dist/icons/`
are an **addition**, not a replacement: the hosted PWA build, from the exact
same body as app.html, meant to be published to a real URL (see DEPLOY.md).
Opened once online it installs like a native app and then works with zero
network, via the service worker's cache. `tools/make-icons.js` generates the
PNGs in `icons/` (checked in, not regenerated per build — rerun it only if the
mark itself changes).

---

## Architecture

A **shell** plus **one module per activity**. The shell owns everything
reusable; an activity owns only what is unique to it.

```
src/
  10-helpers.js    $ / el / rnd / pick / shuffle, screen switching, hand hint
  00-state.js      settings + progress in localStorage; per-activity accessors
  20-stimuli.js    shared visual vocabulary: colours, shapes, themes, renderers
  30-rewards.js    reward picture + spelling, shuffle bag, IndexedDB photo store
  35-drag.js       pointer-events drag and drop
  40-mastery.js    level up / level down, activity-agnostic
  50-session.js    the play loop AND THE ACTIVITY CONTRACT — read this first
  activities/
    patterns.js    "what comes next?"  — 40 levels
    sorting.js     "put each where it belongs" — 18 levels
    seriate.js     "finish the steps" — size ordering, 20 levels
  60-registry.js   the list of activities. Adding one is a line here.
  70-home.js       home screen, generated from the registry
  75-gate.js       passcode gate for Settings
  80-settings.js   parent settings, generated from the registry
  90-boot.js       fullscreen, back-trap, wake lock, boot
```

### Adding an activity

1. Write `src/activities/<name>.js` exporting one object.
2. Add the file to `ACTIVITY_FILES` in `tools/build.js`.
3. Add the constant to `ACTIVITIES` in `src/60-registry.js`.

Nothing else. It inherits its home card, level stepper, session loop, reward
schedule, assisted hints, mastery/auto-advance and Settings rows automatically.
`tests/contract.test.js` proves this and will fail if it stops being true.

The contract is documented in full at the top of `src/50-session.js`. In short:

```js
{
  id, name, icon,
  maxLevel: () => n,
  levelLabel: (level) => "…",      // shown on the home card
  settingsHint: (level) => "…",    // blurb under its Settings stepper
  startRound(level, api) { … }     // draw one round into api.stage
}
```

`api` gives `stage`, `level`, `attempts()`, `refocus()`, `miss()`, `hint(el)`
and `solved(tag)`. **An activity never decides whether a round was
independent** — the shell works that out from whether there were misses or a
hint, so no activity can get that wrong or forget it.

---

## Design rules — these came from real use, don't undo them

**No failure states.** A wrong answer glides back. Nothing buzzes, nothing is
marked wrong, nothing ends. After `S.dimAfter` wrong tries the wrong options
dim; after `S.showAfter` the right one is highlighted. He always finishes.

**Guard against latching onto one feature.** Whatever attribute is *not* the
rule must be randomised per item, so it can never quietly become what he sorts
or matches on. Sorting by shape randomises colour; sorting by size randomises
both colour and shape. This is deliberate and it is tested — don't "simplify"
it by fixing the irrelevant attribute.

**Ladders are ordered by real difficulty, not by structure.** Both activities
score every level with an explicit load (how much the structure taxes working
memory + how abstract the content is) and sort by it. This exists because the
original Patterns ladder ran each structure through all eight domains, which
parked the hardest content at level 8 and walled off far easier material behind
it. Never reorder into neat structure-major groups again.

**Categories must be nameable.** A category task is only fair if a 4-year-old
can tell what counts. Vegetables are excluded from category work (splitting
"food" into fruit and vegetable is blurry, not harder), and the weather set has
no star or moon in it. Keep that bar for any new category.

**Mixed categories shows two pictures per role, not eight.** Drawing freshly
from a whole theme every occurrence put seven different pictures on screen and
buried the pattern. Two exemplars still forces category recognition — the
answer can be the one that hasn't appeared — while leaving the beat visible.

**Order's staircase is always five wide.** What changes with level is how many
pieces are missing — one, then two, up to all five — never the width. The
screen therefore looks the same at every level, which matters more than the
tidiness of growing 3 → 4 → 5 would have. With four of five already standing,
the ordering rule is visible on screen and can be read off the gradient; the
support fades by removing pieces, not by changing the layout.

**And the hole moves around.** If it were always the big end, "put the fattest
one on the right" would score full marks without any ordering at all. A hole in
the *middle* is the real target: that piece has to be bigger than its left
neighbour and smaller than its right one at the same time. Bars come before
scaled shapes for the same kind of reason — comparing length is one dimension,
comparing area is two.

**Mastery: 80% independent across two consecutive blocks moves up; under 50%
in one block moves down.** "Independent" means no hint and no prior miss that
round. Levels he has already reached before need only one good block, because
the app restarts at level 1 every launch and re-climbing would otherwise cost
hundreds of answers a session.

**Play never stops.** There is no "done for today" and no session cap. It runs
until a parent taps back.

**Every launch starts at Level 1.** Auto-advance climbs during a sitting; it
does not carry over. A parent can jump straight to a level with the steppers.

**Silent.** No audio, ever. Visual feedback only.

---

## Tablet notes

The app can't block the home button — browsers prevent that. What it does do:
fullscreen on PLAY, back gesture returns to the home screen instead of leaving,
no pull-to-refresh, screen wake lock. The actual lock is **Android app pinning**
or **iPad Guided Access**, and Settings explains both. Add to Home screen first
so it launches with no browser UI.

## Things deliberately not done

- **No real photos bundled.** Sourcing them hit licensing and quality problems.
  Parents add their own via Settings → they go to IndexedDB, not the file.
- **No APK yet.** `dist/` is now hosted as a real PWA (installs from the
  browser, updates itself) — see DEPLOY.md. An APK is still just PWABuilder
  pointed at that URL, or Capacitor, whenever a store listing is wanted.
- **No framework.** Vanilla JS keeps the single-file offline property trivial.
  Don't add one without a reason that survives that trade.

## Where this is heading

Many more activities. At roughly a dozen the home screen stops working as a
grid of cards and the app should start choosing what he plays — interleaving
across activities rather than blocking one at a time, which generalises better.
That needs the shell to own progress across all activities, which it now does.
