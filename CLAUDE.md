# Think & Sort

A reward-based logical-reasoning practice app for Kiaan, a 4-year-old. Eleven
activities so far — Patterns, Sorting, Order, How many, Trace, Match, Odd one
out, Word find, Finish the word, Sky and Nine — built as
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
  30-rewards.js    reward picture + spelling, shuffle bag, IndexedDB photo store;
                   pictureForWord() and pinReward(), for an activity that needs a
                   particular word's picture rather than the next one in the bag;
                   wordsOfLength(), the shared vocabulary both word games draw on
  photos/          153 reward photographs (.webp) + credits.json; inlined at build
  35-drag.js       pointer-events drag and drop
  36-trace-engine.js  shared "follow the line" engine: traceTracker (the judge, DOM-free
                   and tested on its own), the board and the pointer wiring. Trace and
                   Sky are both thin catalogues of shapes drawn on top of this.
  40-mastery.js    level up / level down, activity-agnostic
  50-session.js    the play loop AND THE ACTIVITY CONTRACT — read this first;
                   also playScenes(), the shared runner for a multi-scene one-shot
  activities/
    patterns.js    "what comes next?"  — 40 levels
    sorting.js     "put each where it belongs" — 18 levels
    seriate.js     "finish the steps" — size ordering, 26 levels in 6 stages
    count.js       "how many?" — match amounts, 21 levels in 6 stages, up to 10
    trace.js       "follow the line" — strokes, then numbers 0–9, then smaller, 30 levels
    match.js       "what goes with it?" — association pairs, 22 levels
    odd.js         "which one is different?" — three share something, one doesn't, and
                   nothing says what; 21 levels sorted by load
    wordfind.js    "find the word" — a word's letters, the same letters hidden in a grid,
                   the photo of what it says as the reward for finding them; works through
                   the whole saved vocabulary, 38 levels in 9 stages
    wordfill.js    "finish the word" — a photo and its word with one letter missing (C _ T),
                   drag the right letter in from a few choices; 30 levels in 6 stages
    sky.js         "follow the line" again, dressed as reaching a real thing — three rays,
                   three raindrops, three kite strings, three flight paths, one fixed game
    nine.js        "fill all nine" — bees into hives, ladybirds onto leaves, Sorting's
                   tray-and-bins mechanic reused for a number instead of a rule, one fixed game
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

**Odd one out inverts that guard, for exactly the same reason.** It is the one
game here that hands him no rule at all — Sorting's bins say what they want,
Patterns shows the start of the sequence, Match asks for a relation he knows;
this one makes him work out what the others have in common before he can say
which one hasn't got it. That is induction rather than application, and it is
why randomising the non-rule attributes would **break** the round instead of
protecting it: if the rule is shape and colour varies freely, the odd shape may
also be the only red one, and then there are two defensible odd ones with only
one accepted — a round he loses for being right.

So the same principle turns around. Anything that isn't the rule is either held
identical across every item, or varied so that **no value ever appears exactly
once** — two reds and two blues, never three and one. A value used twice cannot
single anything out, so only the rule can. That varying is itself the
difficulty step and it earns its keep: with everything else identical, three
items are literally the same tile and "find the one that isn't a duplicate"
answers the round without ever noticing which attribute differs.

The third guard is the one a generator gets wrong quietly: **the odd one must
not favour a position**, or "it's usually the last" answers the game without
looking. `tests/odd.test.js` builds thousands of rounds at every level and
checks all three; neutering the spread makes it fail with the ambiguous boards
spelled out.

Its ladder is one sorted list scored by load, like Sorting's and Match's — how
abstract the rule is (colour, shape, size, then what the thing *is*), whether
the other attributes vary, and how many things there are to scan. Fruit versus
vegetable is deliberately NOT its hardest category round even though it is the
obvious near miss: **Categories must be nameable** below rules it out, and a
round a fair grown-up could argue with is not a hard round, it is a broken one.
Letter versus number was considered for the top and left out on the same test.

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

**Word find is letter matching, not reading.** He cannot read, so nothing in
it asks him to. The word's letters stay on screen above the grid the whole
round, so nothing is being remembered — the task is visual discrimination of
letter forms and left-to-right scanning, which is what comes before reading.
Never take those letters off screen to "make him remember the word": that turns
a pre-reading task into a memory test and he will simply stop being able to do
it.

**The photograph is Word find's reveal, not its prompt.** The first version put
the photo above the grid the whole round, reasoning that it kept the task about
the word rather than about abstract shapes. Playing it showed the cost: the
picture sat there giving away its own reveal, so by the time the reward screen
came up it had nothing left to tell him and the reward was no reward. Now the
word is a mystery made of letters until he finds it, and finding it is what
shows him what it says. The word still gets attached to the thing in the world
it names — the whole point of the photo pack — just in the other order. Don't
put the picture back above the grid.

**So the first four levels lightly highlight the word where it sits.** With no
picture up there, a row of letters over a board of letters doesn't say what to
do with either, and the honest cost of holding the photo back is that during
play this really is closer to shape matching. So while he is learning, the
word's own cells carry a pale wash and he picks up the sweep by making it; from
level 5 there is nothing. *Lightly* is the point — plainly not the solid fill
his own sweep makes, so it reads as "look here" rather than as something already
answered. And it is the whole word, never just its first letter: the thing being
taught is that these letters, in a line, are the ones above. On or off by
absolute level rather than per stage, because once he knows what the game is he
knows it — a longer word is not a new game. The cue does neuter the first
stage's decoy-start guard while it is up; levels 1–4 are teaching levels and
every guard starts mattering at level 5.

**Word find works through the saved vocabulary, not a word list of its own.**
The pool is EMOJI_PACK — the same words the reward screen teaches, built from
what `pictureForWord()` can actually show, so a word that loses its picture
drops out on its own instead of appearing with a blank above it. Every
single-word entry of three letters or more is reachable as a target somewhere
on the ladder, and `tests/wordfind.test.js` fails if one stops being. Three are
deliberately out: TV, because a two-cell run in a letter grid is not a find and
it is an abbreviation rather than a spelling; ICE CREAM and FIRE ENGINE,
because a space cannot be a cell he drags through, and hiding ICECREAM under a
target that reads ICE CREAM would teach the wrong spelling of the one word it
was there to teach.

**The word is only ever hidden the way reading goes — and a backwards sweep
still counts.** Left-to-right or top-to-bottom, never backwards, never
diagonally. Reversals are the mistake emergent writers already make on their
own, and a puzzle that hides DOG as GOD to make itself harder spends its
difficulty budget teaching the error — the same reason Trace enforces stroke
direction. But sweeping the right cells right-to-left *is* accepted: he found
the word, and refusing a correct find is a failure state. The direction is
taught by never showing him a mirrored word, not by rejecting him; either way
the word lights up in reading order.

**The word is in the grid exactly once.** The filler can always happen to spell
it a second time, and a stray copy is just as findable as the planted one — so
he would sweep a run that genuinely reads DOG and be told nothing happened.
`wfBuild()` regenerates until `wfCount()` says one, and it counts across AND
down whatever direction the level places along, because he can drag either way.
The same `wfRuns()` both places the word and counts it, so a word can never sit
somewhere the checker doesn't look.

**Word find is staged by word length — the third ladder that is, and for the
same reason.** Length has to grow monotonically to get through the vocabulary,
and it dominates everything else: a three-letter word in a 4x4 grid and a
ten-letter word in an 11x5 one are not the same task. So each stage is one word
length, and inside a stage exactly one thing gets harder at a time, in this
order: direction (across only, then across or down), then the word's first
letter planted elsewhere too so "find the only D" stops working, then the spare
cells drawn from the word's OWN letters so its letters no longer stand out from
the background, then a run that starts like the word and diverges (TIG·B where
he wants TIGER) so the end has to be read and not assumed. The last two only
appear from the five-letter stage on — on a short word in a small grid there is
no room for them to be anything but cruel. Grids stay wide rather than square
once words get long, which also makes the longest words across-only for free:
down is offered only where the word actually fits down the grid.

**Both word games reward the word he just did, every round.** Every other
graded activity rewards after a block (`S.rewardEvery`); these two set
`rewardEveryRound` in the contract and get a target of exactly 1, for reasons
that are related but not the same. In **Word find** the reward screen IS the
content: the word is a mystery made of letters until he sweeps it, and the
photograph is the reveal. In **Finish the word** the small picture above the
gap is the *question*, and far too incidental to be an answer to anything —
without a reward on the round he earned it, spelling BUS ended with a green
letter and then the next round, and nothing ever said "yes, that was a bus".
Either way, waiting a block would put the picture up long after he had
forgotten which word earned it. The activity calls `pinReward(word)`
before it solves, so the picture is of what he found rather than a stranger
from the shuffle bag. It is still an ordinary ladder otherwise: stepper,
mastery and Settings all behave exactly as everywhere else.

**Finish the word shows the photograph, and that is not a contradiction.**
Word find deliberately holds the picture back, because there the whole word's
letters are on screen and a picture above them gives away its own reveal. Here
the opposite holds: `C _ T` with no picture could be CAT or COT or CUT, and a
4-year-old has no way to know which was meant. The picture is not a spoiler in
this game, it **is** the question — the only thing that says which word he is
finishing. Never take it away to make this harder; that doesn't make it harder,
it makes it arbitrary. The two rules point opposite ways because the two games
put a different thing on screen, not because one of them is wrong.

It is also the step up from Word find: that one is matching letters he can see,
this one is recalling one he can't. Both draw on the same vocabulary through
`wordsOfLength()` in src/30-rewards.js — one list, so the two can't drift apart
on what counts as a word.

**The gap moves first letter, then last, then middle.** That is the order
children pick sounds up in — initial sound, final sound, and the medial vowel
last, which is also the one that stays hard — and it is the same reasoning as
Trace running its strokes in the order handwriting actually develops. Don't
"simplify" it into always blanking the middle because the `C_T` example looks
neat: the middle is the end of the ladder, not the start of it. Word length is
the stage; inside a stage the gap moves through those three positions and then
the number of choices grows.

**Its two guards.** The wrong letters are **always the same kind as the right
one** — vowels against a vowel, consonants against a consonant. Mixed, "pick
the only vowel on screen" would answer every medial-vowel round without knowing
the word at all, which is exactly what **Guard against latching** is about. And
a wrong letter may never turn the word into **another word this app teaches**:
a gap with two defensible answers where only one is accepted is a round he
loses for being right. `tests/wordfill.test.js` checks both over every word at
every level — and the second guard is what lets that test read the answer
straight off the page, since exactly one choice can complete a real word.

**Sky is Trace's engine wearing different art, on purpose, and it stops there.**
A commercial tracing app teaching this identical skill — a line from one thing
to another — wraps every finished line in a mascot animation, a confetti burst
and a full-screen flash. Sky exists to show the same real thing (sunshine
reaching a sprout, one kite's string reaching another) is just as engaging
without any of that: no character, no burst, no sound, nothing full-screen —
the only difference from Trace is a small still picture waiting at the end
instead of a star, and one more waiting at the start purely for flavour, sat
behind the green dot so it's never mistaken for something to touch. All three
of a scene's destinations sit on the board from the moment it opens
(`markEvery` in the engine), each popping as its own line reaches it — with
only the live line's target drawn, the other two lines ran off into empty
space and read as one journey plus two false starts. Never add a rewarding
animation, sound, or celebratory flash to it, here or to Trace — that's the
whole point of building it this way instead of just skinning the other app.

**Toondemy Games is one fixed game per lesson, not a ladder.** Every other
activity is a graded curriculum with many levels; a Toondemy game
(`oneShot: true` in the contract, see src/50-session.js) is a single round
that recreates one specific lesson video exactly — all of its scenes, back
to back, in the order the video shows them, at the one guide style or
difficulty the video actually uses throughout. No stepper on its home card
(src/70-home.js hides it when `oneShot` is set) and none in Settings either
(src/80-settings.js gives it the "how it plays" blurb on its own rather than a
1-to-1 stepper with nowhere to go), no easier or harder version. Sky is four
scenes (sun, rain, kite, plane — three parallel lines each, the same fan of
strokes Trace's own multi-stroke shapes like "plus" already support) and Nine
is two (bees into nine hives, then ladybirds onto nine leaves, Sorting's
tray-and-bins mechanic reused rather than reinvented). Never grow a Toondemy
game into a curriculum on top of its lesson — a 1-to-9 counting ladder out of
Nine would just duplicate How Many's job under a different mechanic.

**Chaining those scenes is the shell's job, not each game's.** A game hands
`playScenes(api, scenes, tag)` in src/50-session.js a list of functions and
it owns the rest: it wraps the `api` each scene is given so the wrapped
`solved()` starts the next scene instead of finishing the round, until the
last one calls the real thing. Misses and hints from every scene reach the
real api untouched, so a mistake in the first scene still means the whole
game wasn't independent. Two details in there are load-bearing and came
from watching it: it waits `SCENE_GAP_MS` before wiping the stage, because
clearing it the instant the last line landed destroyed the very pop that
said "you did it"; and it holds the session it started in, so tapping back
mid-beat can't draw the next scene over the home screen. It's also the only
place that knows how many scenes there are, which is why the corner readout
for these games comes from here — see **The corner readout during PLAY**
below.

**The guards a Toondemy game adds are this app's, not the video's.** Nine
always mixes a couple of decoy bugs into the tray (not a harder version to
unlock — just always there), the same shortcut-guard principle as Sorting's
own rounds, and dropping one escalates help exactly as everywhere else:
dim the decoys after `S.dimAfter`, outline a right one after `S.showAfter`.
The tray also holds a few MORE creatures than there are slots — with
exactly nine of each, emptying the tray and filling the nine were the same
act, so the nine-ness of it was never actually load-bearing. And an empty
slot is drawn as the hive or the leaf it is, flat and plain: nine blank
boxes asked him to take "hive" from the prompt line on trust, which a
4-year-old who can't read cannot do.

**Nine counts out loud on screen, because filling nine slots isn't the same
as knowing you filled nine.** Under the badge is a strip of the numbers 1 to
9, and one more lights up per creature he lands. That one element does three
jobs: the last lit number is how many he has done, the pale ones are how many
are left, and the row itself is the number line the lesson is about — ending
on a 9 that matches the badge above it. Three things about it are deliberate.
It lights **strictly left to right, whichever slot he dropped into** — he can
fill any open leaf, so numbering the leaves in the order he chose would
scatter 1…9 around the screen and be uncountable, and counting up a straight
row is the thing being taught. A wrong drop counts nothing, so the number
only ever means creatures actually placed. And each scene counts its own nine
from zero. The badge stays the lesson's target and the strip stays the tally —
don't merge them into one number, and note the lit pip is a dark numeral on a
wash of the theme colour rather than white on solid: the bee theme's amber is
far too light to carry white text at this size.

**A one-shot game's reward waits for a tap, not a timer, and offers Repeat
and Next.** Every other activity shows the reward after a whole block of
correct rounds (`S.rewardEvery`/`itemsPerSession`) and carries straight on
into the next round after a few seconds — because play there never stops.
A Toondemy game's one round already IS the whole game, so
`src/50-session.js` gives it a reward target of exactly 1: the reward
shows the moment that round (however many scenes it's chained from)
solves. And since there's no next round in the same game to carry on
into, `src/30-rewards.js` skips the auto-continue timer for it and shows
two icon buttons instead (`#rwActions` in the reward screen): Repeat
starts the same game fresh, Next starts whichever Toondemy game comes
after it by date (`nextInSection()` in src/70-home.js, wrapping past the
last back to the first). The number badge and every other bit of feedback
in these games stays exactly as calm as the rest of the app — see **Sky is
Trace's engine wearing different art** above and **Silent** below; Repeat
and Next are the one deliberate departure from "play never stops",
because unlike every other activity here, a Toondemy game actually has an
end, the same way its source video does.

**Nothing deferred outlives the session it belonged to.** A parent taps back
whenever they need to — including the half second between a right answer and
whatever the shell had queued next, and while a finger is still holding a tile.
So every callback and timer that runs later asks `sessionGuard()`
(src/50-session.js) whether it is still wanted: the whole `api` handed to a
round, the timer carrying play into the next round or the reward, and the beat
between a one-shot game's scenes. Both halves came from real failures found by
driving the page, not from theory: letting go of a dragged tile after tapping
back threw outright (`Cannot set properties of null`), and tapping back the
instant a Word find round solved put the reward screen up *over* the "N right
today" screen half a second later, overriding the parent's own tap — and since
Word find rewards every round, that window was open on every single round of
it. `endSession()` deliberately keeps `sess` alive to write its record, so it
marks it `over`; going home nulls it. `tests/leaving.test.js` holds both cases
and fails if the guard is taken out.

**A level is clamped to the ladder that exists now.** Ladders do get shorter
between releases — Sky went from 18 levels to a single fixed game — and
`progress.best` remembers the old frontier. Every activity clamps internally so
nothing crashes, but unclamped in `levelOf()` it still showed a parent "Level
97/40" and left mastery unable to advance him ever again (`curLevel < maxLevel`
false forever) until someone noticed and tapped the stepper. Clamped on the way
out rather than healed in storage, so a ladder that grows back can still pick
up the best he actually reached.

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
actually moves. For a one-shot game there is no level and no block to report,
so it says which scene he's on instead ("Scene 2 of 4") — still a report, from
`playScenes()`, which is the only thing that knows; a one-scene game gets
nothing at all rather than a pointless "Scene 1 of 1". Quiet by design (low
opacity, `pointer-events:none`) — it's there for a parent watching over his
shoulder, not something the flow is built to draw a 4-year-old's eye to.

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
until a parent taps back. Toondemy's one-shot games are the one deliberate
exception — see **A one-shot game's reward waits for a tap** above — because
unlike every other activity here, they actually have an end.

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

**The tile IS the button, and each game has its own soft colour.** The first
home screen put five things in every card — icon, name, a level blurb, "Level
1/40", two stepper buttons and a bright PLAY pill — so his one decision
competed with the parent's settings in the same box, and the actual target was
the smallest thing in it. Now the whole tile is what he taps, and **nothing
else tappable goes inside it**: a stepper in there means a tap near "+" does
nothing when he meant to start the game. The parent's level strip sits *under*
the tile instead — two audiences, two places.

Colour does the identifying. Nine white boxes differing only by emoji is the
weakest identifier there is for someone who cannot read the names, and "the
green one" is how he will actually find Sorting. `CARD_TINTS` in src/70-home.js
keys them by id, not by position, so adding an activity never shuffles the
colours he has already learned; an id with no entry falls back to a plain tile
and works, which keeps adding one to the three one-line changes promised above.
All of them are pale on purpose — the screen used to carry nine saturated blue
PLAY pills, which were the loudest thing on it, and a wash at this lightness
gives each tile an identity without raising the contrast of the page at all.

**Everything on the home screen lines up on one left edge, in real columns.**
The first pass centred each row, so seven tiles came out as four centred and
then three centred under them: no two rows shared a column and the whole thing
read as ragged. It is a CSS grid now (`repeat(auto-fill, minmax(140px,1fr))`),
so every row shares the same columns and a short last row is ragged on the
*right*, where a short row belongs — and the title, the subtitle, the section
heading, the date and the first tile of every row all share one left edge
(`tests/app.test.js` measures that in a browser, not by eye). The column is
centred in the viewport rather than pinned to the screen edge, which keeps a
landscape tablet balanced instead of leaving all the empty space on one side;
on the portrait tablet it fills the width anyway. The block is anchored to the
TOP, not floated in the vertical middle: once the grid fitted a tablet again,
centring left it adrift in a field of empty space.

**A tile is flat colour with a hairline edge, and the icon is a label on it,
not the tile itself.** Pale tint plus a big soft drop shadow plus a 22px radius
looked muddy and dated, and with no border the tints bled into the pale
background. So: flat fill, `1px rgba(36,48,68,.08)` (one border value that works
over every tint, so there is still one colour per game to maintain rather than
two), 16px radius, almost no shadow. The icon went from 50px to 32px — at 50 it
was a third of the box and the loud multicolour emoji swamped everything else
in it.

**The level strip under a tile is one line: `− Level 1/40 +`.** `levelLabel`'s
wording used to print here as well, and two lines of 10px grey under every tile
was the noisiest thing on the screen — it also made every strip a different
height, so the rows sat ragged with the +/− buttons at different heights. The
wording lives in Settings and the session history instead. The +/− are small on
purpose, because they are the parent's control and must not compete with his
tile, so their **hit area is grown past the visible button** (`.lvbtn::after`,
inset -7px) rather than the button being made bigger — 26px is below any sane
tap target.

**The home screen scrolls, and is centred only while it fits.** It didn't need
to at three activities. At nine — seven in the plain row plus a section
heading, two date headings and two Toondemy cards — the content is taller than
a tablet, and because each screen is absolutely positioned inside
`body{overflow:hidden}` the overflow was simply clipped: measured in a real
browser, **four of the nine games could not be started at all** on a 768x1024
tablet. Plain `justify-content:center` cannot fix that, because centring an
overflowing flex column pushes its *top* out of reach as well — which is why
the very first card was among the unreachable ones. So `#home` scrolls from the
top and `#homeScroll` carries `min-height:100%`, which fills the screen and
centres inside itself while the content is short, then simply grows past it.
`#gear` stays outside the wrapper so it keeps its corner instead of scrolling
away. Shrinking the cards instead was the wrong trade: fitting nine plus the
headings into 1024px needs roughly 150px cards, and he has to be able to hit
them.

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

Many more activities. This file used to predict the card grid would stop
working at roughly a dozen; it actually stopped fitting a tablet at nine, and
the grid now scrolls (see the rule above). Scrolling buys room, not a solution:
somewhere past a dozen cards, picking from a long scrolling list stops being a
reasonable thing to hand a 4-year-old, and the app should start choosing what he
plays — interleaving across activities rather than blocking one at a time, which
generalises better. That needs the shell to own progress across all activities,
which it now does.
