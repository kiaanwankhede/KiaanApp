# Think & Sort

A reward-based logical-reasoning practice app for Kiaan, a 4-year-old. Eight
activities so far — Patterns, Sorting, Order, How many, Trace, Match, Sky and
Nine — built as
**one offline HTML file** that runs from a tablet with no network, no install
and no dependencies.

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
  photos/          153 reward photographs (.webp) + credits.json; inlined at build
  35-drag.js       pointer-events drag and drop
  36-trace-engine.js  shared "follow the line" engine: traceTracker (the judge, DOM-free
                   and tested on its own), the board and the pointer wiring. Trace and
                   Sky are both thin catalogues of shapes drawn on top of this.
  40-mastery.js    level up / level down, activity-agnostic
  50-session.js    the play loop AND THE ACTIVITY CONTRACT — read this first
  activities/
    patterns.js    "what comes next?"  — 40 levels
    sorting.js     "put each where it belongs" — 18 levels
    seriate.js     "finish the steps" — size ordering, 26 levels in 6 stages
    count.js       "how many?" — match amounts, 21 levels in 6 stages, up to 10
    trace.js       "follow the line" — strokes, then numbers 0–9, then smaller, 30 levels
    match.js       "what goes with it?" — association pairs, 22 levels
    sky.js         "follow the line" again, dressed as reaching a real thing — three rays,
                   three raindrops, three kite strings, three flight paths — 12 levels
    nine.js        "fill all nine" — bees into hives, ladybirds onto leaves, Sorting's
                   tray-and-bins mechanic reused for a number instead of a rule — 4 levels
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

**Order is the one ladder grouped into stages — deliberately.** It is the
exception to "ordered by real difficulty, not by structure" above. The first
version put a different colour on every piece from level 1, so two things were
changing at once; playing it showed the first levels have to change exactly
one. So the whole first stage is plain bars — one colour, one shape, height is
the only difference — and each later stage adds exactly one thing to look past:
colour, then shapes (back on one colour while shape is new), then mixed shapes,
then pictures, then tiny steps. The cost is accepted on purpose: the easiest
coloured round sits behind the hardest plain one. Inside a stage, levels are
still ordered by load. Don't flatten it back into one sorted list.

Holding colour *the same* for a whole round is as safe against latching as
randomising it — the danger is colour tracking size, and a colour that never
changes tracks nothing. What's never allowed is a colour that goes with a
position. Pictures are one kind per round (five apples, never an apple beside a
banana): emoji fill their boxes unevenly, so across kinds a "bigger" banana can
look smaller than an apple and the right answer stops being clear.

**How many is about knowing how many, not about reciting numbers.** He can
say his numbers to 20; the game builds knowing that three is three however it's
laid out, whatever it's made of and whatever size it comes in. It's staged like
Order, and guards two shortcuts that would let him score without judging number
at all. *Pattern:* from stage 2 no choice — right or wrong — is laid out like
the top card, or "pick the odd one out" would work. *How full a card looks:*
with same-sized dots, three also means more colour than two; from stage 4 each
round decides in advance which choice will look closest in total colour and
which in dot size (the right one only 1 time in 3), so both sit at chance.
Random sizes are not enough — a first version let "looks as full" find the
answer 51% of the time. Don't replace the balancing with plain randomness, and
don't let it fall back to random sizes either: some layout combinations have no
fair sizes, and falling back let 1 "big and few" round in 300 go out with no
decoy. It re-picks layouts until a fair set exists — 100,000 of 100,000 rounds.

**How many's wording changes on purpose; the task doesn't.** The prompt
rotates ("How many?", "Count them", "Find the same number"…, never the same one
twice running) and the home card is COUNT on some launches and HOW MANY on
others. A skill tied to one exact phrase can fail when someone asks it
differently. This is the one place where the "same every time" principle is
deliberately relaxed — for words only. Layout, icon and task never change.

**Trace teaches the movement; paper builds the hand.** The tablet is for
which way a stroke goes and how to steer it. Glass has no friction, so grip
and strength come from chunky crayons on paper — the two are meant to go
together, and the app shouldn't try to be both. Strokes follow the usual
developmental order (lines, curves, circle, joined strokes, slants), then the
numbers 0–9, then the same things smaller — handwriting grows from big arm
movements to small controlled ones. Each stage comes in on a wide path with
arrows, then dotted, then dots, with the allowed distance narrowing.
Direction and stroke order are enforced — top to bottom, left to right, the
circle and 0 from the top the way *o* is written, a 5 down-and-round before its
flag — because that's how letters and numbers form. On dotted and dots levels a
green arrow at each start is the only thing saying which way to go; keep it.

**Trace never fails him, and never goes dead on him.** His line always
follows his hand — in colour on the line, faint grey off it — so the tablet
visibly responds. Lifting is fine; the green dot moves with him to show where
to carry on. Getting close to the star counts once he's nearly there — without
that, a wobbly hand got stuck at 98%, which the tests caught. A touch only
starts drawing on the green dot, so a resting palm does nothing. While a real
pen is in use (seen in the last minute) fingers are ignored entirely — the
minute matters: ignoring fingers for good meant a lost or flat pen left the
game silently dead. The judging lives in `traceTracker()`, free of the DOM, and
`tests/trace.test.js` runs it on every shape at every tolerance — including
that jumping ahead, cutting across a circle or going round the wrong way never
finishes a shape.

**Sky is Trace's engine wearing different art, on purpose, and it stops there.**
A commercial tracing app teaching this identical skill — a line from one thing
to another — wraps every finished line in a mascot animation, a confetti burst
and a full-screen flash. Sky exists to show the same real thing (sunshine
reaching a sprout, one kite's string reaching another) is just as engaging
without any of that: no character, no burst, no sound, nothing full-screen —
the only difference from Trace is a small still picture waiting at the end
instead of a star, and one more waiting at the start purely for flavour,
sat behind the green dot so it's never mistaken for something to touch. Never
add a rewarding animation, sound, or celebratory flash to it, here or to
Trace — that's the whole point of building it this way instead of just
skinning the other app.

**Sky's round is three lines, not one.** The first version gave each theme
two interchangeable single lines and picked one per round, which felt far
more repetitive than what it was built to answer — that app puts three (or
four) parallel lines on screen at once, all their guides visible from the
start, traced one at a time before anything is "done". Trace already
supports exactly this for a shape with more than one stroke ("plus" and
"cross" work the same way), so each Sky theme is one shape with three
parallel strokes rather than a pool of one-line alternatives. A fuller round
with real content beats inventing extra levels to paper over a thin one.

**Toondemy Games is source-lesson-scoped, not a curriculum.** Nine (fill nine
hives with bees, then nine leaves with ladybirds) is the second activity
filed under that section, and like Sky it stays at exactly what its lesson
showed — the number 9, in the two scenes actually recorded — rather than
growing into a 1-to-9 counting ladder that would just duplicate How Many's
job under a different mechanic. That mechanic is Sorting's tray-and-bins,
reused as-is rather than reinvented: nine identical dropzones instead of one
per rule, but the same drag, the same `dataset.full` bookkeeping, the same
CSS. The one thing added beyond the two recorded scenes is this app's own
habit, not the source's: a harder sublevel per theme mixes a couple of decoy
bugs into the tray, so filling every hive takes noticing which creature it
is rather than dragging whatever's nearest — the same shortcut-guard
principle as Sorting's own rounds, applied to a new activity rather than
invented fresh for it. The number itself is a still text tile, exactly like
every other numeral this app shows — no read-aloud, per **Silent** below.

**Mastery: 80% independent across two consecutive blocks moves up; under 50%
in one block moves down.** Each round counts one of three ways: answered with
no miss before the hand appeared → *independent*, counts toward moving up;
answered with no miss after the hand appeared → *prompted*, counts neither way;
any miss → counts against.

**`S.neverDemote` is on by default.** A rough block still resets the streak —
so the two-good-blocks-in-a-row climb still has to restart — it just no longer
drops him back a level while it does. Toggle is in Settings ("Never drop a
level"); the arithmetic itself is untouched, `evaluateMastery()` only skips the
one line that calls `setLevelOf(id, curLevel - 1)`.

**The corner readout during PLAY (`#lvWatermark`) is a report, not a decision.**
`updateLevelWatermark()` in 50-session.js reads the exact counters
`evaluateMastery()` keeps in `progress.perLevel` and echoes them back — current
level, how many rounds into this block, how many blocks confirmed. It never
computes mastery itself, so it can't drift out of sync with when a level
actually moves. Quiet by design (low opacity, `pointer-events:none`) — it's
there for a parent watching over his shoulder, not something the flow is built
to draw a 4-year-old's eye to.

**The assisted hand waits 3 seconds before it appears** (`HINT_DELAY_MS`), and
touching anything first keeps it away for that round. That gap is his chance to
answer alone — the standard time-delay way of fading a prompt. Both halves of
this came from a real bug: the hand used to appear the instant each round
began, so in assisted mode (the default) every round was prompted, no round
ever counted, and he could never move up in any game. Worse, prompted rounds
then counted as failures, so a block of all-right answers read as 0% and
dropped him a level. Never make the hand immediate again, and never let a
prompted round count against him. `tests/progress.test.js` plays every game
through the real page and fails if either comes back. Levels he has already reached before need only one good block, because
the app restarts at level 1 every launch and re-climbing would otherwise cost
hundreds of answers a session.

**Play never stops.** There is no "done for today" and no session cap. It runs
until a parent taps back.

**Every launch picks up two levels below his best** (`WARM_UP_DROP` in
00-state.js), floored at Level 1 — not at Level 1 every time, and not at
whatever level he happened to be mid-climb on when the tablet was closed.
Starting from 1 every session cost hundreds of answers to re-climb; starting
cold at his frontier skips a warm-up he benefits from. The mastery rule already
clears ground he has passed before in one good block instead of two, so those
two levels go quickly. Only auto-advance records a best — moving the stepper by
hand doesn't, because that's a parent's judgement, not something he has shown.

**A confirmation block is 5 answers, not 10** (`itemsPerSession`). Changing a
default here does nothing on its own for a tablet that already has a save:
`save()` writes every key of `S`, so the old value keeps winning. That's what
`SETTINGS_REV` is for — bump it and migrate explicitly in `load()`, and only
when the saved value is still the old default, so a parent's own choice is
never overwritten.

**The reward screen shows photographs; the activities draw with emoji.** These
are two different jobs and they want two different pictures. An activity needs
shapes that fill their boxes evenly and differ on exactly the attribute being
tested, which is what emoji and drawn shapes are good at — photographs there
would wreck the size and category rules above. The reward screen is doing the
opposite job: attaching a word to the thing in the world it names, where a photo
of an actual dog carries over to the dog in the street and a cartoon of one
doesn't. So `src/photos/` holds one photograph per word in `EMOJI_PACK`, and the
emoji stays as the fallback for any word whose photo is missing.

Two things about that pack are load-bearing. **The file name is the word** —
`dog.webp` is DOG, `ice-cream.webp` is ICE CREAM — the same rule Settings uses
for photos a parent adds, so there is one convention, not two. And **the photos
are inlined as data URIs**, not served beside the page: the offline file has to
stay one self-contained thing, and inlining for the hosted build too means the
service worker has a single document to cache and can't end up serving the page
from one build with the pictures from another.

**A reward photo has to be one clear thing, or it teaches the wrong word.**
Sourcing these automatically does not work — an encyclopedia's lead image for
SUN is a NASA photosphere, for SHELL a beach seen from fifty metres, and each
would attach the word to the wrong thing. Every picture in the pack was chosen
by eye from several candidates against one bar: a single subject, plainly lit,
recognisable to a 4-year-old at a glance. Hold anything added later to it.
Attribution is not optional either — most are CC BY / CC BY-SA, so
`PHOTO-CREDITS.md` (regenerate with `node tools/make-credits.js`) is a licence
condition and has to travel with the pictures.

**Silent.** No audio, ever. Visual feedback only.

---

## Tablet notes

The app can't block the home button — browsers prevent that. What it does do:
fullscreen on PLAY, back gesture returns to the home screen instead of leaving,
no pull-to-refresh, screen wake lock. The actual lock is **Android app pinning**
or **iPad Guided Access**, and Settings explains both. Add to Home screen first
so it launches with no browser UI.

## Things deliberately not done

- ~~**No real photos bundled.**~~ Done as of the photo pack — see the reward
  rule above. Parents still add their own via Settings → those go to IndexedDB,
  not the file, and still win over a bundled picture for the same word.
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
