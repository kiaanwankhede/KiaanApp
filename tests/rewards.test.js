/* The reward pictures.
 *
 * Each is [WORD, emoji] and the word is spelled out under the picture, so the
 * words have to be readable ones a 4-year-old would hear at home, and every
 * picture has to actually draw on the tablet. The checks that matter:
 *
 *   - no repeats, in either the word or the picture (the shuffle bag would
 *     otherwise show what looks like the same reward twice in one pass)
 *   - no emoji built out of joined parts (ZWJ sequences like a profession or a
 *     family), which fall back to empty boxes on older Android
 *   - the pack total equals the sum of its groups, so a group someone adds but
 *     forgets to wire into EMOJI_PACK is caught here rather than silently
 *     never being shown
 */
const { pureContext, Runner } = require("./_harness");

const GROUPS = ["REWARD_ANIMALS","REWARD_SEA","REWARD_FRUITS","REWARD_VEGETABLES","REWARD_FOOD",
  "REWARD_VEHICLES","REWARD_FAMILIAR","REWARD_HOUSE","REWARD_NATURE","REWARD_PLAY",
  "REWARD_CLOTHES","REWARD_BODY"];
const X = pureContext(["30-rewards.js"], GROUPS.concat(["EMOJI_PACK"]));

const R = new Runner("rewards");
const check = (c, m) => R.check(c, m);

const pack = X.EMOJI_PACK;
check(pack.length === 152, "the reward pool holds 152 pictures (got " + pack.length + ")");

const groupTotal = GROUPS.reduce((n, g) => n + X[g].length, 0);
check(groupTotal === pack.length,
  "every group is wired into EMOJI_PACK (groups add to " + groupTotal + ", pack holds " + pack.length + ")");

GROUPS.forEach((g) => check(X[g].length > 0, g + " has pictures in it"));

const words = pack.map((p) => p[0]), pics = pack.map((p) => p[1]);
check(new Set(words).size === words.length,
  "no word appears twice (" + (words.length - new Set(words).size) + " repeats)");
check(new Set(pics).size === pics.length,
  "no picture appears twice (" + (pics.length - new Set(pics).size) + " repeats)");

const WORD_OK = new RegExp("^[A-Z][A-Z ]*[A-Z]$");
const badWord = words.filter((w) => !WORD_OK.test(w) || w.length > 18);
check(badWord.length === 0, "every word is plain capitals he could read out: " + JSON.stringify(badWord));

const ZWJ = String.fromCharCode(0x200D);
const joined = pack.filter(([, e]) => e.indexOf(ZWJ) !== -1).map(([w]) => w);
check(joined.length === 0,
  "no picture is a joined-up emoji, which would show as a box on an older tablet: " + JSON.stringify(joined));

// a plain picture is one or two code points (the second being a variation
// selector); anything longer is a sequence that may not render
const longOnes = pack.filter(([, e]) => Array.from(e).length > 2).map(([w]) => w);
check(longOnes.length === 0, "every picture is a single emoji, not a sequence: " + JSON.stringify(longOnes));

const vegWords = X.REWARD_VEGETABLES.map((v) => v[0]);
check(vegWords.indexOf("CARROT") !== -1 && X.REWARD_VEGETABLES.length >= 10,
  "vegetables are in, with a decent spread (" + X.REWARD_VEGETABLES.length + ")");
check(X.REWARD_SEA.length >= 12, "sea creatures have a group of their own (" + X.REWARD_SEA.length + ")");

/* names asked for in full rather than shortened, and none of the ones taken out
   should be able to creep back in */
["HIPPOPOTAMUS","RHINOCEROS","COOKIE"].forEach((w) =>
  check(words.indexOf(w) !== -1, w + " is in the pool under that name"));
["HIPPO","RHINO","BISCUIT","RICE","JUICE","HONEY","POLICE CAR","BASKETBALL","PAINT"].forEach((w) =>
  check(words.indexOf(w) === -1, w + " is not in the pool"));

R.finish();
